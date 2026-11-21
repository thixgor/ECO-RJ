import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldAlert, RefreshCw } from 'lucide-react';
import { loadMercadoPago } from '../utils/mercadoPago';
import { useTheme } from '../contexts/ThemeContext';

export interface BrickPayer {
  email: string;
  firstName?: string;
  lastName?: string;
  cpf?: string;
}

export interface BrickMetodos {
  pix: boolean;
  cartaoCredito: boolean;
  cartaoDebito: boolean;
  boleto: boolean;
}

interface MercadoPagoBrickProps {
  publicKey: string;
  amount: number;
  payer: BrickPayer;
  metodos: BrickMetodos;
  parcelasMaximas?: number;
  /**
   * Recebe o `formData` gerado pelo Brick (token do cartão / método escolhido),
   * já acrescido de `selected_payment_method` — o tipo escolhido pelo comprador
   * (`credit_card`, `debit_card`, `ticket`, `bank_transfer`). Sem esse campo o
   * back-end não consegue distinguir crédito de débito.
   * Deve retornar `{ ok: true }` quando o pagamento foi aceito pelo backend
   * (aprovado ou pendente — ex.: Pix/boleto) ou `{ ok: false }` para que o Brick
   * mantenha o formulário e permita nova tentativa.
   */
  onPay: (formData: any) => Promise<{ ok: boolean; message?: string }>;
}

/** Tempo máximo para o Brick avisar que está pronto antes de oferecermos "tentar de novo". */
const READY_TIMEOUT_MS = 30000;
/** Espera máxima pelo Brick anterior na fila de montagem. */
const QUEUE_WAIT_MS = 8000;

/**
 * Fila de montagem: só um Brick é criado por vez na página.
 *
 * `bricks.create()` é assíncrono. Se o componente desmontava (ou remontava —
 * o React.StrictMode faz isso de propósito em desenvolvimento) antes de o
 * `create()` terminar, o cleanup não tinha controller para desmontar e o Brick
 * antigo terminava de nascer no mesmo container do novo. Com dois Payment Bricks
 * na página, os iframes dos campos seguros do cartão (número, validade, CVV)
 * colidem e o formulário de cartão fica no skeleton para sempre — Pix e boleto,
 * que não usam campos seguros, continuavam aparecendo normalmente.
 */
let mountQueue: Promise<void> = Promise.resolve();

let instanceSeq = 0;

const MercadoPagoBrick: React.FC<MercadoPagoBrickProps> = ({
  publicKey, amount, payer, metodos, parcelasMaximas = 12, onPay
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Valores mais recentes sem re-montar o Brick (re-montar apagaria o que o
  // comprador já digitou no cartão).
  const onPayRef = useRef(onPay);
  useEffect(() => { onPayRef.current = onPay; }, [onPay]);
  const optsRef = useRef({ payer, metodos, parcelasMaximas, theme });
  optsRef.current = { payer, metodos, parcelasMaximas, theme };

  useEffect(() => {
    let cancelled = false;
    let controller: any = null;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;

    setErro(null);
    setLoading(true);

    // Cada tentativa ganha um container NOVO, com id único. Um Brick antigo que
    // ainda esteja terminando de nascer cai num nó já removido da página, nunca
    // no container do Brick atual.
    const container = document.createElement('div');
    container.id = `mercadopago-brick-${++instanceSeq}`;
    wrapperRef.current?.appendChild(container);

    const falhar = (msg: string) => {
      if (cancelled) return;
      if (readyTimer) clearTimeout(readyTimer);
      setErro(msg);
      setLoading(false);
    };

    const mount = async () => {
      const { payer: p, metodos: m, parcelasMaximas: parcelas, theme: tema } = optsRef.current;
      if (!publicKey) {
        falhar('Pagamento indisponível: chave pública do Mercado Pago não configurada.');
        return;
      }

      const MercadoPago = await loadMercadoPago();
      if (cancelled) return;

      const mp = new MercadoPago(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      const paymentMethods: any = { maxInstallments: Math.max(1, parcelas) };
      if (m.cartaoCredito) paymentMethods.creditCard = 'all';
      if (m.cartaoDebito) paymentMethods.debitCard = 'all';
      if (m.boleto) paymentMethods.ticket = 'all';
      if (m.pix) paymentMethods.bankTransfer = 'all';

      readyTimer = setTimeout(() => {
        falhar('O formulário de pagamento está demorando para carregar. Verifique sua conexão e tente novamente.');
      }, READY_TIMEOUT_MS);

      const ctrl = await bricksBuilder.create('payment', container.id, {
        initialization: {
          amount,
          payer: {
            email: p.email,
            entityType: 'individual',
            firstName: p.firstName,
            lastName: p.lastName,
            ...(p.cpf ? { identification: { type: 'CPF', number: p.cpf } } : {})
          }
        },
        customization: {
          visual: { style: { theme: tema === 'dark' ? 'dark' : 'default' } },
          paymentMethods
        },
        callbacks: {
          onReady: () => {
            if (cancelled) return;
            if (readyTimer) clearTimeout(readyTimer);
            setErro(null); // ficou pronto depois do aviso de demora: some o aviso
            setLoading(false);
          },
          onError: (error: any) => {
            console.error('Payment Brick error:', error);
            // Erro crítico = o Brick não consegue continuar (ex.: falha ao
            // carregar os campos seguros do cartão). Sem isso o comprador ficava
            // olhando para um skeleton sem saber o que fazer.
            if (error?.type === 'critical') {
              falhar('Não foi possível carregar o formulário de pagamento. Tente novamente.');
            } else if (!cancelled) {
              setLoading(false);
            }
          },
          onSubmit: ({ selectedPaymentMethod, formData }: any) =>
            new Promise<void>((resolve, reject) => {
              // `selectedPaymentMethod` é o único lugar em que o Brick informa o
              // TIPO (crédito x débito x boleto x Pix) — o `formData` só traz o
              // `payment_method_id` (visa, debvisa, bolbradesco...).
              onPayRef.current({ ...formData, selected_payment_method: selectedPaymentMethod })
                .then((r) => (r.ok ? resolve() : reject(new Error(r.message || 'rejeitado'))))
                .catch((e) => reject(e));
            })
        }
      });

      if (cancelled) {
        // O componente saiu enquanto o Brick nascia: desmonta agora.
        try { ctrl?.unmount?.(); } catch { /* noop */ }
        return;
      }
      controller = ctrl;
    };

    // Espera o Brick anterior (se houver) terminar de nascer/morrer antes de
    // criar outro — com teto, para um create() travado não bloquear a fila.
    const anterior = Promise.race([mountQueue, new Promise<void>((r) => setTimeout(r, QUEUE_WAIT_MS))]);
    const run = anterior.then(() => mount()).catch((e) => {
      console.error(e);
      falhar('Não foi possível carregar o checkout do Mercado Pago. Verifique sua conexão e tente novamente.');
    });
    mountQueue = run;

    return () => {
      cancelled = true;
      if (readyTimer) clearTimeout(readyTimer);
      try { controller?.unmount?.(); } catch { /* noop */ }
      controller = null;
      container.remove();
    };
    // Monta uma única vez por pedido (amount fixo nesta etapa) e a cada "tentar novamente".
  }, [publicKey, amount, tentativa]);

  return (
    <div>
      {erro && (
        <div className="flex flex-col gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-sm text-red-700 dark:text-red-400">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
          {publicKey && (
            <button
              type="button"
              onClick={() => setTentativa((t) => t + 1)}
              className="self-start inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          )}
        </div>
      )}
      {loading && !erro && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
          <p className="text-sm text-[var(--color-text-muted)]">Carregando formas de pagamento...</p>
        </div>
      )}
      <div ref={wrapperRef} className={erro ? 'hidden' : undefined} />
    </div>
  );
};

export default MercadoPagoBrick;

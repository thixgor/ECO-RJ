import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
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
   * Recebe o `formData` gerado pelo Brick (token do cartão / método escolhido).
   * Deve retornar `{ ok: true }` quando o pagamento foi aceito pelo backend
   * (aprovado ou pendente — ex.: Pix/boleto) ou `{ ok: false }` para que o Brick
   * mantenha o formulário e permita nova tentativa.
   */
  onPay: (formData: any) => Promise<{ ok: boolean; message?: string }>;
}

const CONTAINER_ID = 'mercadopago-brick-container';

const MercadoPagoBrick: React.FC<MercadoPagoBrickProps> = ({
  publicKey, amount, payer, metodos, parcelasMaximas = 12, onPay
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const controllerRef = useRef<any>(null);
  // Mantém o callback mais recente sem re-montar o Brick
  const onPayRef = useRef(onPay);
  useEffect(() => { onPayRef.current = onPay; }, [onPay]);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      if (!publicKey) {
        setErro('Pagamento indisponível: chave pública do Mercado Pago não configurada.');
        setLoading(false);
        return;
      }
      try {
        const MercadoPago = await loadMercadoPago();
        if (cancelled) return;

        const mp = new MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();

        const paymentMethods: any = { maxInstallments: Math.max(1, parcelasMaximas) };
        if (metodos.cartaoCredito) paymentMethods.creditCard = 'all';
        if (metodos.cartaoDebito) paymentMethods.debitCard = 'all';
        if (metodos.boleto) paymentMethods.ticket = 'all';
        if (metodos.pix) paymentMethods.bankTransfer = 'all';

        controllerRef.current = await bricksBuilder.create('payment', CONTAINER_ID, {
          initialization: {
            amount,
            payer: {
              email: payer.email,
              firstName: payer.firstName,
              lastName: payer.lastName,
              ...(payer.cpf ? { identification: { type: 'CPF', number: payer.cpf } } : {})
            }
          },
          customization: {
            visual: { style: { theme: theme === 'dark' ? 'dark' : 'default' } },
            paymentMethods
          },
          callbacks: {
            onReady: () => { if (!cancelled) setLoading(false); },
            onError: (error: any) => {
              console.error('Payment Brick error:', error);
              if (!cancelled) setLoading(false);
            },
            onSubmit: ({ formData }: any) =>
              new Promise<void>((resolve, reject) => {
                onPayRef.current(formData)
                  .then((r) => (r.ok ? resolve() : reject(new Error(r.message || 'rejeitado'))))
                  .catch((e) => reject(e));
              })
          }
        });
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setErro('Não foi possível carregar o checkout do Mercado Pago. Recarregue a página e tente novamente.');
          setLoading(false);
        }
      }
    };

    mount();
    return () => {
      cancelled = true;
      try { controllerRef.current?.unmount?.(); } catch { /* noop */ }
      controllerRef.current = null;
    };
    // Monta uma única vez por conjunto de dados do pedido (amount fixo nesta etapa).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, amount]);

  if (erro) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-sm text-red-700 dark:text-red-400">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>{erro}</span>
      </div>
    );
  }

  return (
    <div>
      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
          <p className="text-sm text-[var(--color-text-muted)]">Carregando formas de pagamento...</p>
        </div>
      )}
      <div id={CONTAINER_ID} />
    </div>
  );
};

export default MercadoPagoBrick;

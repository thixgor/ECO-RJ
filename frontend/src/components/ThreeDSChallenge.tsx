import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { GlassModal, GlassButton } from './ui';

export interface ThreeDsChallengeData {
  externalResourceUrl: string;
  creq: string;
}

interface ThreeDSChallengeProps {
  challenge: ThreeDsChallengeData;
  /**
   * Consulta o status atual do pedido no back-end. Deve devolver o status
   * (`aprovado`, `rejeitado`, `pendente`, ...) ou `null` se a consulta falhar.
   */
  checkStatus: () => Promise<string | null>;
  /** Chamado quando o pagamento sai do estado pendente. */
  onResolved: (status: string) => void;
  /** Chamado quando o comprador fecha o desafio sem concluí-lo. */
  onCancel: () => void;
}

const IFRAME_NAME = 'eco-3ds-challenge';
const POLL_MS = 4000;

/**
 * Desafio 3-D Secure do emissor do cartão.
 *
 * O Mercado Pago devolve `status_detail: "pending_challenge"` com uma URL e um
 * `creq` quando o banco exige autenticação adicional — situação que é a regra
 * no CARTÃO DE DÉBITO no Brasil. É preciso submeter o `creq` via POST para a
 * URL do emissor dentro de um iframe; sem isso o pagamento nunca sai de
 * "pendente" e o comprador fica preso numa tela de espera.
 *
 * Como o iframe é de outro domínio, não há como observar seu conteúdo: o
 * desfecho é detectado consultando o status do pedido no nosso back-end.
 */
const ThreeDSChallenge: React.FC<ThreeDSChallengeProps> = ({
  challenge, checkStatus, onResolved, onCancel
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [verificando, setVerificando] = useState(false);
  // Callbacks/consulta mais recentes sem reiniciar o polling
  const checkRef = useRef(checkStatus);
  const resolvedRef = useRef(onResolved);
  useEffect(() => { checkRef.current = checkStatus; resolvedRef.current = onResolved; });

  // Submete o desafio para o emissor assim que o modal abre (uma única vez).
  useEffect(() => {
    formRef.current?.submit();
  }, [challenge.externalResourceUrl, challenge.creq]);

  // Enquanto o desafio está aberto, acompanha o desfecho pelo nosso back-end.
  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(async () => {
      const status = await checkRef.current();
      if (cancelled || !status) return;
      if (status !== 'pendente' && status !== 'em_processo') {
        clearInterval(timer);
        resolvedRef.current(status);
      }
    }, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const verificarAgora = async () => {
    setVerificando(true);
    try {
      const status = await checkStatus();
      if (status && status !== 'pendente' && status !== 'em_processo') {
        onResolved(status);
      }
    } finally {
      setVerificando(false);
    }
  };

  return (
    <GlassModal
      isOpen
      onClose={onCancel}
      title="Verificação do seu banco"
      description="Seu banco pediu uma confirmação extra para autorizar este cartão. Conclua a verificação abaixo — não feche esta janela."
      size="xl"
      closeOnOverlayClick={false}
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between w-full">
          <GlassButton variant="secondary" onClick={onCancel}>
            Cancelar e escolher outra forma
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={verificarAgora}
            isLoading={verificando}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Já concluí a verificação
          </GlassButton>
        </div>
      }
    >
      <div className="relative rounded-xl overflow-hidden border border-[var(--glass-border)] bg-white">
        <iframe
          name={IFRAME_NAME}
          title="Autenticação 3-D Secure"
          className="w-full h-[520px] border-0"
        />
        <form
          ref={formRef}
          action={challenge.externalResourceUrl}
          method="POST"
          target={IFRAME_NAME}
          className="hidden"
        >
          <input type="hidden" name="creq" value={challenge.creq} />
        </form>
      </div>
      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Confirmaremos o pagamento automaticamente assim que o seu banco responder.
      </p>
    </GlassModal>
  );
};

export default ThreeDSChallenge;

// Carregamento sob demanda do SDK do Mercado Pago (Checkout Transparente).
// O script só é injetado uma vez e reutilizado entre páginas.

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const SDK_TIMEOUT_MS = 20000;

let sdkPromise: Promise<any> | null = null;

/**
 * Garante que o SDK MercadoPago.js v2 esteja carregado e retorna o construtor
 * global `window.MercadoPago`.
 *
 * Se o carregamento falhar (rede, bloqueador, timeout), a tag do script é
 * removida e o cache zerado: assim a próxima tentativa injeta o script de novo.
 * Antes, uma tag que já tinha falhado ficava no DOM e a nova tentativa esperava
 * para sempre por um evento `load` que nunca mais ia acontecer.
 */
export function loadMercadoPago(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mercado Pago SDK indisponível fora do navegador'));
  }
  if ((window as any).MercadoPago) {
    return Promise.resolve((window as any).MercadoPago);
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    // Tag sem o SDK disponível = tentativa anterior falhou: recomeça do zero.
    document.querySelectorAll<HTMLScriptElement>(`script[src="${SDK_URL}"]`).forEach((s) => s.remove());

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;

    const fail = (msg: string) => {
      clearTimeout(timer);
      script.remove();
      sdkPromise = null;
      reject(new Error(msg));
    };
    const timer = setTimeout(() => fail('Tempo esgotado ao carregar o SDK do Mercado Pago'), SDK_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timer);
      if ((window as any).MercadoPago) resolve((window as any).MercadoPago);
      else fail('SDK do Mercado Pago carregado sem o objeto esperado');
    };
    script.onerror = () => fail('Falha ao carregar o SDK do Mercado Pago');
    document.head.appendChild(script);
  });

  return sdkPromise;
}

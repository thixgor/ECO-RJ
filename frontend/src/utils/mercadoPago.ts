// Carregamento sob demanda do SDK do Mercado Pago (Checkout Transparente).
// O script só é injetado uma vez e reutilizado entre páginas.

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

let sdkPromise: Promise<any> | null = null;

/**
 * Garante que o SDK MercadoPago.js v2 esteja carregado e retorna o construtor
 * global `window.MercadoPago`.
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
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).MercadoPago));
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o SDK do Mercado Pago')));
      if ((window as any).MercadoPago) resolve((window as any).MercadoPago);
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if ((window as any).MercadoPago) resolve((window as any).MercadoPago);
      else reject(new Error('SDK do Mercado Pago carregado sem o objeto esperado'));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Falha ao carregar o SDK do Mercado Pago'));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

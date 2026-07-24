import { IMaterialConteudo } from '../models/Material';

/**
 * Serviço de storage de arquivos dos materiais.
 *
 * VERCEL BLOB APLICADO (acesso público).
 * -------------------------------------------------------------------------
 * Os arquivos podem ser referenciados de duas formas, ambas resolvidas por
 * `getSignedUrl`:
 *   - `arquivoUrl`: URL direta (compatível com o modo antigo — imgur, etc.).
 *   - `blobKey`   : pathname/URL de um blob no Vercel Blob.
 *
 * Uploads:
 *   - Arquivos GRANDES (> 4.5 MB) usam Client Upload (navegador → Blob direto),
 *     via `controllers/blobUploadController.ts`. É o caminho recomendado no
 *     painel admin, pois contorna o limite de 4.5 MB das funções serverless.
 *   - `uploadFile` abaixo faz upload pelo servidor (`put`), útil para uploads
 *     programáticos pequenos — mas continua sujeito ao limite de 4.5 MB.
 *
 * Como os blobs são criados com acesso PÚBLICO e sufixo aleatório, a `url`
 * retornada já é diretamente acessível (não-listada/não-adivinhável) e o
 * download por redirect (302) continua funcionando sem mudanças.
 *
 * Requer a env `BLOB_READ_WRITE_TOKEN` (Project → Storage → Blob → Connect).
 */

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Resolve a URL de download de um conteúdo de arquivo.
 *
 * - Se houver `blobKey` e o Blob estiver configurado, retornaria uma URL
 *   assinada/temporária (a implementar quando o Blob for aplicado).
 * - Caso contrário, usa a `arquivoUrl` direta cadastrada pelo admin.
 *
 * Retorna null quando não há arquivo disponível.
 */
export async function getSignedUrl(conteudo: IMaterialConteudo): Promise<string | null> {
  // Blobs são públicos (com sufixo aleatório): a URL salva já é acessível.
  // A `arquivoUrl` guarda a URL pública do blob (ou uma URL direta legada).
  if (conteudo.arquivoUrl && conteudo.arquivoUrl.trim()) {
    return conteudo.arquivoUrl.trim();
  }
  if (conteudo.blobKey && conteudo.blobKey.trim()) {
    // blobKey pode ser uma URL pública completa; se for só o pathname, ainda
    // assim é retornada (compatibilidade).
    return conteudo.blobKey.trim();
  }
  return null;
}

/**
 * Upload de um arquivo pelo SERVIDOR (put no Vercel Blob).
 *
 * ATENÇÃO: passa pela função serverless, então está sujeito ao limite de
 * 4.5 MB de body da Vercel. Para arquivos grandes, use o Client Upload
 * (navegador → Blob direto) exposto em `controllers/blobUploadController.ts`.
 */
export async function uploadFile(
  fileName: string,
  data: Buffer | Uint8Array,
  contentType?: string
): Promise<{ url: string; blobKey: string }> {
  if (!isBlobConfigured()) {
    throw new Error(
      'Vercel Blob não configurado. Defina BLOB_READ_WRITE_TOKEN ' +
      '(Project → Storage → Blob → Connect).'
    );
  }
  const { put } = await import('@vercel/blob');
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const blob = await put(fileName, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType
  });
  return { url: blob.url, blobKey: blob.pathname };
}

import { upload } from '@vercel/blob/client';

/**
 * Upload de arquivo direto do navegador para o Vercel Blob (Client Upload).
 *
 * Contorna o limite de 4.5 MB das funções serverless: o arquivo NÃO passa pelo
 * nosso backend — vai direto para o Blob. O backend (`/materials/admin/blob-upload`)
 * apenas valida que o usuário é Administrador e emite um token de upload.
 *
 * A autenticação do admin é feita enviando o JWT (do localStorage) como
 * `clientPayload`, verificado no backend em `onBeforeGenerateToken`.
 */

export interface BlobUploadResult {
  url: string;       // URL pública do arquivo
  pathname: string;  // chave (blobKey) no Vercel Blob
  contentType?: string;
}

const sanitize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")  // remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '-')    // só chars seguros
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'arquivo';

export async function uploadToBlob(
  file: File,
  opts?: {
    prefix?: string;                              // pasta lógica, ex.: 'materiais'
    onProgress?: (percentage: number) => void;    // 0–100
    signal?: AbortSignal;
  }
): Promise<BlobUploadResult> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const prefix = (opts?.prefix || 'materiais').replace(/^\/+|\/+$/g, '');
  const pathname = `${prefix}/${Date.now()}-${sanitize(file.name)}`;

  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/materials/admin/blob-upload',
    clientPayload: token,
    multipart: true, // divide arquivos grandes em partes (mais robusto)
    contentType: file.type || undefined,
    abortSignal: opts?.signal,
    onUploadProgress: opts?.onProgress
      ? (e) => opts.onProgress!(Math.round(e.percentage))
      : undefined
  });

  return { url: blob.url, pathname: blob.pathname, contentType: blob.contentType };
}

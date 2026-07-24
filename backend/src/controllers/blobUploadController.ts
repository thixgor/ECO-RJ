import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import User from '../models/User';

/**
 * Client Upload do Vercel Blob (arquivos grandes, > 4.5 MB).
 *
 * Por que existe: uploads que passam pelo servidor (put no backend) estão
 * limitados a 4.5 MB pelo limite de body das funções serverless da Vercel.
 * Aqui o arquivo vai DIRETO do navegador para o Vercel Blob; o backend só
 * emite um token de upload de curta duração após validar que quem pede é um
 * Administrador.
 *
 * Acesso (público/privado) é escolhido no cliente (`upload({ access })`):
 * arquivos de material são PRIVADOS (download por URL assinada) e a capa é
 * PÚBLICA. Como só admins chegam aqui, confiar nessa escolha é aceitável.
 *
 * Esta rota atende dois tipos de requisição do SDK `@vercel/blob/client`:
 *   1. `blob.generate-client-token`  → vinda do navegador (com clientPayload).
 *   2. `blob.upload-completed`       → callback dos servidores da Vercel.
 *
 * Por isso a rota NÃO usa os middlewares `protect`/`adminOnly` (o callback da
 * Vercel não carrega o nosso JWT). A autenticação do admin é feita dentro de
 * `onBeforeGenerateToken`, verificando o JWT enviado como `clientPayload`.
 *
 * Requer a env `BLOB_READ_WRITE_TOKEN` (Project → Storage → Blob → Connect).
 */

// Limite por arquivo (o SDK divide em partes/multipart automaticamente).
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

// Tipos aceitos na Loja de Materiais (documentos, imagens de capa e vídeos).
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4'
];

export const handleBlobUpload = async (req: Request, res: Response) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      message:
        'Upload indisponível: Vercel Blob não configurado. Conecte o Blob Store ao projeto para injetar BLOB_READ_WRITE_TOKEN.'
    });
  }

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // clientPayload = JWT do admin (enviado pelo frontend).
        if (!clientPayload) {
          throw new Error('Não autorizado: token ausente.');
        }

        let userId: string;
        try {
          const decoded = jwt.verify(
            clientPayload,
            process.env.JWT_SECRET || 'secret'
          ) as { id: string };
          userId = decoded.id;
        } catch {
          throw new Error('Não autorizado: token inválido.');
        }

        const user = await User.findById(userId).select('cargo ativo');
        if (!user || !user.ativo || user.cargo !== 'Administrador') {
          throw new Error('Acesso restrito a administradores.');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true, // URL pública não-adivinhável (mantém acesso "não listado")
          tokenPayload: JSON.stringify({ userId })
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Vercel chama isto após o upload concluir (apenas em URL pública/produção;
        // em localhost não é chamado). Nada a persistir aqui: o frontend recebe a
        // URL no retorno de `upload()` e a salva no material via fluxo normal.
        console.log('Vercel Blob upload concluído:', blob.pathname);
      }
    });

    return res.json(jsonResponse);
  } catch (error: any) {
    // Erros de autorização de onBeforeGenerateToken chegam aqui.
    return res.status(400).json({ message: error?.message || 'Falha no upload' });
  }
};

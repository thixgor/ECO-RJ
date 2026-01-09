import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { createDatabaseIndexes } from './config/database-indexes';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware para garantir conexão com o banco no Vercel (Serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erro de conexão com o banco de dados' });
  }
});

// Middlewares
app.use(compression()); // Compressão gzip para melhor performance
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cabeçalhos de segurança OWASP (exigidos pelo Zoom SDK)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-src 'self' https:; media-src 'self' https: blob:; object-src 'none'; base-uri 'self'; form-action 'self';");
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Rotas
app.use('/api', routes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ECO RJ API is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Conditionally start server only if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   ECO RJ - Centro de Treinamento em Ecocardiografia   ║
    ║                                                       ║
    ║   Servidor rodando na porta ${PORT}                       ║
    ║   API: http://localhost:${PORT}/api                       ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    `);

    // Criar índices do banco de dados para otimização
    await createDatabaseIndexes();
  });
}

export default app;

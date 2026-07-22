# 🛍️ Loja de Materiais — ECO RJ

Sistema de **venda de materiais** (`/materiais`) integrado ao **Mercado Pago**,
para compra **logado** e **não logado (convidado)**, com máxima segurança e
salvaguardas anti-perda do produto.

Reaproveita toda a infraestrutura de pagamentos já existente (Checkout Pro do
Mercado Pago, taxa operacional, cupons, termos, config única de vendas).

---

## 🎯 O que foi implementado

| Requisito | Status |
|-----------|--------|
| Página `/materiais` (loja) com busca e filtros por tipo | ✅ |
| Tipos de produto: **Aulas**, **Material em PDF**, **Arquivo** e **Conjunto** (misto) | ✅ |
| Descrição, **capa** e **avaliações (estrelas)** por produto | ✅ |
| Avaliação **apenas para quem comprou** (1 por usuário) | ✅ |
| Integração com o **Mercado Pago atual** (Checkout Pro) | ✅ |
| Compra **logado** → material anexado à conta + e‑mail com link + comprovante | ✅ |
| Compra **convidado** → e‑mail com **serial key** + **PDF anexado** + comprovante | ✅ |
| Botão de **baixar/acessar** em `/materiais/:id` e via link do convidado | ✅ |
| **Anti-perda de produto** (nunca fica sem receber) | ✅ (ver abaixo) |
| **Vercel Blob** deixado preparado (ainda não aplicado) | ✅ |
| Painel admin de materiais e de vendas | ✅ |

---

## 🔐 Garantia anti-perda do produto (convidado)

Cenário crítico tratado: *convidado compra → e‑mail falha → nunca recebe o produto.*

Salvaguardas em camadas (o acesso **nunca** depende do e‑mail):

1. **Entitlement é a fonte da verdade.** Na entrega (idempotente, com *claim*
   atômico), é criado um `MaterialEntitlement` com `accessToken` (link seguro) e
   `serialKey` (código), **persistidos antes de qualquer tentativa de e‑mail**.
2. **Página de status** (`/materiais/compra/status`) exibe o **código** e o
   **botão de acesso/download** imediatamente após a aprovação — sem depender do e‑mail.
3. **Recuperação por e‑mail** (`/materiais` → “Já comprei e não recebi o e‑mail”):
   reenvia todos os acessos aprovados daquele e‑mail (endpoint `POST /materials/recover`).
4. **Alerta ao admin**: pedidos entregues com `emailEnviado=false` aparecem
   destacados no painel (contador “E‑mails não enviados”), com botão **reprocessar/reenviar**.
5. **Auto-reivindicação por e‑mail**: ao criar conta/entrar com o mesmo e‑mail da
   compra, o material aparece automaticamente em **Perfil → Meus Materiais**.
6. O envio de e‑mail registra `emailTentativas` e `ultimoEmailErro` para auditoria.

---

## 🧱 Arquitetura

### Backend (`backend/src`)
- **Models**: `Material`, `MaterialOrder`, `MaterialEntitlement`, `MaterialReview`.
- **Serviços**:
  - `materialFulfillmentService.ts` — entrega idempotente (acesso, cupom, venda, e‑mail com anexos).
  - `blobStorageService.ts` — **abstração do Vercel Blob** (`getSignedUrl`, `uploadFile`) — hoje resolve por URL direta.
  - `pricingService.ts` — `computeMaterialPricing` + `validateCouponForMaterial` (cupons globais).
  - `emailService.ts` — `sendMaterialPurchaseEmail` com anexos (PDF) + comprovante HTML.
  - `mercadoPagoService.ts` — `createPreference` generalizado (`statusUrl`, `itemDescription`).
- **Controllers**: `materialController.ts` (público/usuário), `adminMaterialController.ts` (admin), `materialReviewController.ts`.
- **Rotas**: `routes/materialRoutes.ts` → `/api/materials/*` (webhook próprio: `/api/materials/webhook`).

### Frontend (`frontend/src`)
- `pages/Materiais.tsx` — loja `/materiais`.
- `pages/MaterialDetail.tsx` — `/materiais/:id` (detalhe, avaliações, compra e acesso).
- `pages/MaterialCheckout.tsx` — `/materiais/comprar/:id`.
- `pages/MaterialPaymentStatus.tsx` — `/materiais/compra/status`.
- `pages/MaterialAccess.tsx` — `/materiais/acesso?token=...` (acesso do convidado).
- `pages/admin/AdminMaterials.tsx` — `/admin/materiais` (CRUD + vendas + reprocessar).
- `components/materials/MaterialContentViewer.tsx` — player/downloads do conteúdo.
- `Profile.tsx` — aba **Meus Materiais**.
- Links no `Header`, `Sidebar` e rotas em `App.tsx`. `materialService` em `services/api.ts`.

---

## 🔒 Segurança
- **Preço recalculado no servidor** em toda cotação/checkout (o cliente nunca envia valores).
- **Webhook assinado** (HMAC), pagamento consultado na API do MP (fonte da verdade), **conferência de valor** antes de liberar.
- **Idempotência + claim atômico** na entrega (webhooks duplicados não duplicam acessos/vendas/cupons).
- **CPF, e‑mail e telefone validados**; **aceite de termos** com versão/data/IP.
- **Acesso por token** (`crypto.randomBytes(32)`) e serial de uso pessoal; validade e revogação suportadas.
- Conteúdo (URLs de arquivo/embed) só é exposto a quem tem acesso válido; downloads passam por endpoint que valida o acesso e redireciona.
- Anti‑abuso: limite de pedidos pendentes por e‑mail.
- Exclusão de material com vendas faz **soft‑delete** (preserva o acesso dos compradores).

---

## 📦 Vercel Blob (preparado, ainda não aplicado)
Tudo passa por `services/blobStorageService.ts`. Hoje os arquivos são cadastrados por
**URL direta**. Para aplicar o Blob depois:
1. Definir `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Blob).
2. `npm i @vercel/blob` no backend.
3. Implementar `uploadFile` (`put`) e `getSignedUrl` (a partir de `blobKey`).
Nenhuma outra parte do código precisa mudar.

---

## 🔌 Endpoints principais (`/api/materials`)
| Método | Rota | Acesso |
|--------|------|--------|
| GET | `/` | Público (lista) |
| GET | `/:id` | Público (detalhe) |
| POST | `/quote` | Público (cotação) |
| POST | `/checkout` | Público (optionalAuth) |
| ALL | `/webhook` | Mercado Pago (assinado) |
| GET | `/order/:numeroPedido` | Público (status) |
| POST | `/order/:numeroPedido/sync` | Público (fallback) |
| POST | `/recover` | Público (reenvio por e‑mail) |
| GET | `/access/:token` | Convidado (token) |
| GET | `/access/:token/download/:index` | Convidado (token) |
| GET | `/my` | Usuário logado |
| POST | `/claim` | Usuário logado |
| GET | `/:id/content` | Usuário logado (com acesso) |
| GET/POST/DELETE | `/:id/reviews` | Público / logado com compra |
| `/admin/*` | — | Admin (CRUD, vendas, stats, refulfill, grant) |

---

**ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70**

# 💳 Sistema de Pagamentos — ECO RJ (Mercado Pago)

Documentação completa do sistema de pagamentos implementado para a plataforma
**ECO RJ — Centro de Treinamento em Ecocardiografia**.

Permite a **compra de cursos** com entrega automática de acesso, tanto para
usuários **logados** quanto para **convidados** (sem conta), com **máxima
segurança**, cupons, lotes de desconto, desconto ativado, taxa operacional,
CPF obrigatório, aceite de termos e registro completo de compras.

---

## 📑 Sumário

1. [Visão geral](#-visão-geral)
2. [Arquitetura e arquivos criados](#-arquitetura-e-arquivos-criados)
3. [Variáveis de ambiente (obrigatório configurar)](#-variáveis-de-ambiente-obrigatório-configurar)
4. [Como funciona (fluxos)](#-como-funciona-fluxos)
5. [Cálculo de preço e taxa operacional](#-cálculo-de-preço-e-taxa-operacional)
6. [Segurança](#-segurança-implementada)
7. [Painel do administrador](#-painel-do-administrador)
8. [Painel do usuário (/perfil)](#-painel-do-usuário-perfil)
9. [Endpoints da API](#-endpoints-da-api)
10. [Configuração do Mercado Pago (passo a passo)](#-configuração-do-mercado-pago-passo-a-passo)
11. [Próximos passos](#-próximos-passos)

---

## 🎯 Visão geral

| Requisito | Status |
|-----------|--------|
| Comprar cursos e receber acesso na conta (logado) | ✅ Entrega automática |
| Comprar sem estar logado (convidado) | ✅ E-mail com serial key + link de ativação + comprovante |
| Taxa de 1% somada ao produto como **taxa operacional** | ✅ Configurável pelo admin |
| Sistema de **cupom** | ✅ CRUD completo no admin |
| Sistema de **lotes de desconto** | ✅ CRUD completo no admin |
| Sistema de **desconto ativado** (por curso) | ✅ Percentual ou fixo |
| **CPF obrigatório** na compra | ✅ Validado (dígito verificador) |
| **Aceite de termos** extenso e pró-empresa | ✅ Editável pelo admin |
| Compras registradas no **painel do admin** | ✅ Com filtros, detalhes e estatísticas |
| Compras registradas no **/perfil** com comprovante | ✅ Aba "Minhas Compras" |
| Gerenciar **métodos de pagamento** no admin | ✅ Pix, crédito, débito, boleto |
| **Máxima segurança / anti-burla** | ✅ Ver seção de Segurança |

O **produto vendido é o Curso**. Ao aprovar o pagamento, o sistema gera uma
**serial key** vinculada ao curso (cargo `Aluno`) e libera o acesso — reaproveitando
toda a infraestrutura de serial keys já existente na plataforma.

---

## 🏗️ Arquitetura e arquivos criados

### Backend (`backend/src`)

**Models**
- `models/Order.ts` — pedido/compra (comprador, valores, status, dados MP, entrega, aceite de termos, auditoria).
- `models/Coupon.ts` — cupons de desconto (percentual/fixo, validade, limites, anti-abuso por e-mail).
- `models/PriceLot.ts` — lotes de desconto por curso (preço promocional por quantidade).
- `models/Course.ts` — **estendido** com o campo `venda` (disponível, preço, desconto ativado, validade do acesso).

**Serviços**
- `services/pricingService.ts` — **fonte única da verdade** do cálculo de preço (lote → desconto ativado → cupom → taxa operacional). Validação de cupom e lote vigente.
- `services/mercadoPagoService.ts` — integração com o Checkout Pro (criação de preferência, consulta de pagamento). Credenciais **apenas** via env.
- `services/emailService.ts` — e-mail transacional (nodemailer) com comprovante HTML + serial key + link de ativação. Degrada graciosamente sem SMTP.
- `services/fulfillmentService.ts` — **entrega** do pedido (gera serial key, libera acesso, contabiliza cupom/lote, envia e-mail) — idempotente e com **claim atômico** anti-duplicação.

**Config**
- `config/paymentConfig.ts` — configuração de pagamento (taxa, métodos, parcelas, termos, vendas ativas) persistida em `SystemSettings`. Contém o **texto padrão dos termos**.

**Controllers**
- `controllers/paymentController.ts` — público/usuário: config, cotação, checkout, **webhook**, status do pedido, sincronização, minhas compras.
- `controllers/adminPaymentController.ts` — admin: pedidos, estatísticas, reprocessar entrega, config, preços por curso.
- `controllers/couponController.ts` — CRUD de cupons.
- `controllers/priceLotController.ts` — CRUD de lotes.

**Rotas** (registradas em `routes/index.ts`)
- `routes/paymentRoutes.ts` → `/api/payments/*`
- `routes/couponRoutes.ts` → `/api/coupons/*`
- `routes/priceLotRoutes.ts` → `/api/price-lots/*`

### Frontend (`frontend/src`)

- `pages/Checkout.tsx` — `/comprar/:cursoId` — formulário de compra, cupom, resumo de valores, aceite de termos.
- `pages/PaymentStatus.tsx` — `/compra/status?pedido=...` — retorno do pagamento (polling), serial key para convidados.
- `pages/Ativar.tsx` — `/ativar?codigo=...` — ativação da serial key (logado ou após login/registro).
- `pages/admin/AdminPayments.tsx` — `/admin/pagamentos` — abas: Pedidos, Preços, Cupons, Lotes, Configurações.
- `pages/Profile.tsx` — **nova aba "Minhas Compras"** com comprovante imprimível.
- `pages/CourseDetail.tsx` — **botão "Comprar Curso"** quando o curso está à venda.
- `services/api.ts` — `paymentService`, `couponService`, `priceLotService`.
- `types/index.ts` — tipos `CourseVenda`, `Order`, `Coupon`, `PriceLot`, `PaymentConfig`.
- Rotas em `App.tsx` e item no `Sidebar.tsx`.

---

## 🔐 Variáveis de ambiente (OBRIGATÓRIO configurar)

Adicione ao `backend/.env` (ver `backend/.env.example`):

```env
# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx      # Token privado (produção) ou TEST-... (sandbox)
MP_PUBLIC_KEY=APP_USR-xxxxxxxx        # Chave pública
MP_WEBHOOK_SECRET=xxxxxxxx            # Segredo de assinatura do webhook

# URL pública da aplicação (back_urls, webhook e links de ativação)
APP_BASE_URL=https://www.cursodeecocardiografia.com

# SMTP (envio de comprovante e serial key)
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario_smtp
SMTP_PASS=senha_smtp
SMTP_FROM=ECO RJ <contato@cursodeecocardiografia.com>
```

> ⚠️ **Sem `MP_ACCESS_TOKEN`** o checkout retorna "pagamentos indisponíveis" (nenhuma cobrança é feita).
> **Sem SMTP** as compras funcionam, mas o e-mail é apenas registrado no log (não enviado). Configure o SMTP para produção.

No **Vercel**, cadastre essas variáveis em *Project → Settings → Environment Variables*.

---

## 🔄 Como funciona (fluxos)

### A) Usuário **logado** compra um curso
1. Na página do curso, clica em **"Comprar Curso"** → `/comprar/:cursoId`.
2. Dados (nome, e-mail, CPF) já vêm preenchidos; informa telefone e aceita os termos.
3. Opcionalmente aplica um **cupom**.
4. Clica em **Pagar** → é redirecionado ao **Checkout Pro do Mercado Pago**.
5. Após o pagamento, o **webhook** confirma e o sistema **libera o acesso automaticamente**:
   - Promove para `Aluno` (se era Visitante), inscreve no curso, autoriza acesso e marca a serial key como usada.
6. Recebe **e-mail com comprovante**. O curso aparece no **Dashboard** e a compra no **/perfil → Minhas Compras**.

### B) **Convidado** (sem conta) compra um curso
1. Acessa `/comprar/:cursoId` (sem login).
2. Informa **nome, e-mail, telefone e CPF** e aceita os termos.
3. Paga no Mercado Pago.
4. Após aprovação, recebe **e-mail** com:
   - **Serial key** de ativação,
   - **Link de ativação** (`/ativar?codigo=...`),
   - **Comprovante de compra**.
5. Na página de retorno (`/compra/status`), a serial key também é exibida.
6. Para acessar: cria a conta (ou faz login) e a chave é **aplicada automaticamente**
   (guardada em `sessionStorage` e ativada no `/ativar`).

### C) Webhook (confirmação de pagamento)
- O Mercado Pago chama `POST /api/payments/webhook`.
- A **assinatura é validada** (HMAC), o pagamento é **consultado na API do MP** (fonte da verdade),
  o **valor é conferido** contra o pedido e, se aprovado, a **entrega é processada**.
- Fallback: a página de status também chama `/sync` para reconsultar caso o webhook atrase.

---

## 🧮 Cálculo de preço e taxa operacional

Ordem determinística (calculada **sempre no servidor**, nunca no cliente):

```
1. Preço base do curso
2. − Lote ativo (substitui o preço base, se menor)
3. − Desconto ativado do curso (percentual ou fixo)
4. − Cupom (percentual ou fixo)
   = SUBTOTAL
5. + Taxa operacional (padrão 1% sobre o subtotal)  → "Taxa operacional (1%)"
   = TOTAL cobrado
```

- A **taxa operacional** (1% por padrão, editável) é somada ao produto e exibida como linha separada no checkout, no comprovante e no painel.
- Um cupom de **100%** gera compra **gratuita** (cortesia), entregue sem passar pelo Mercado Pago.
- Valor mínimo de cobrança: **R$ 1,00** (limite do Mercado Pago).

---

## 🛡️ Segurança implementada

- **Preço recalculado no servidor** em toda cotação e checkout — o cliente **nunca** envia valores.
- **Validação de assinatura do webhook** (HMAC-SHA256, comparação em tempo constante, tolerância de 300s contra replay).
- **Consulta do pagamento na API do MP** como fonte da verdade (não confia no payload do webhook).
- **Conferência de valor**: se o valor pago divergir do total do pedido, a entrega é **bloqueada** e um alerta é logado.
- **Idempotência + claim atômico** na entrega: webhooks duplicados/concorrentes **não** geram serial keys duplicadas nem liberam acesso duas vezes.
- **CPF validado** com dígito verificador; e-mail e telefone validados.
- **Aceite de termos** obrigatório, com **versão, data e IP** registrados por pedido (auditoria/LGPD).
- **Serial key de uso único** (infra existente) — não transferível e some ao ser deletada.
- **Anti-abuso**: limite de pedidos pendentes por e-mail em janela curta; incremento de uso de cupom/lote **atômico** e idempotente.
- **Credenciais do Mercado Pago apenas em variáveis de ambiente** — nunca no banco, nunca no front-end.
- **PCI**: os dados do cartão são digitados **no ambiente do Mercado Pago** (Checkout Pro) — a plataforma nunca recebe dados sensíveis do cartão.
- Serial key só é exposta na página pública de status para **convidados** (usuários logados recebem acesso direto na conta).

---

## 🧑‍💼 Painel do administrador

Acesse **Admin → Pagamentos** (`/admin/pagamentos`):

- **Pedidos** — lista com busca (pedido/nome/e-mail/CPF) e filtro por status; estatísticas de receita; detalhe do pedido (dados, valores, MP, serial key, aceite de termos); **reprocessar entrega / reenviar e-mail**.
- **Preços** — por curso: disponível para venda, **preço**, **validade do acesso** e **desconto ativado** (percentual/fixo).
- **Cupons** — criar/editar/excluir: código, tipo, valor, validade, usos máximos, usos por e-mail, valor mínimo, curso específico.
- **Lotes** — por curso: nome, preço, quantidade, ordem, ativo, quantidade vendida.
- **Configurações** — **vendas ativas**, **taxa operacional (%)**, parcelas máximas, **métodos de pagamento** (Pix/crédito/débito/boleto) e o **texto dos Termos de Compra** (com versão e restaurar padrão).

---

## 👤 Painel do usuário (/perfil)

Nova aba **"Minhas Compras"**:
- Lista de pedidos com curso, número, data, método, status e valor.
- **Comprovante imprimível** (abre versão pronta para impressão/PDF) para compras aprovadas.
- Exibe a **serial key** da compra.

---

## 🔌 Endpoints da API

### Público
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/payments/config` | Config pública (métodos, taxa, termos, vendas ativas) |
| POST | `/api/payments/quote` | Cotação de preço (com cupom) |
| POST | `/api/payments/checkout` | Cria pedido + preferência MP (optionalAuth) |
| ALL | `/api/payments/webhook` | Webhook do Mercado Pago |
| GET | `/api/payments/order/:numeroPedido` | Status público do pedido |
| POST | `/api/payments/order/:numeroPedido/sync` | Reconsulta o pagamento (fallback) |

### Usuário logado
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/payments/my-orders` | Minhas compras |

### Admin
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/payments/admin/orders` | Listar pedidos |
| GET | `/api/payments/admin/orders/:id` | Detalhe do pedido |
| GET | `/api/payments/admin/stats` | Estatísticas de vendas |
| POST | `/api/payments/admin/orders/:id/refulfill` | Reprocessar entrega |
| GET/PUT | `/api/payments/admin/config` | Config de pagamento |
| POST | `/api/payments/admin/config/reset-terms` | Restaurar termos padrão |
| GET | `/api/payments/admin/courses-pricing` | Cursos com config de venda |
| PUT | `/api/payments/admin/course/:id/pricing` | Atualizar venda do curso |
| GET/POST/PUT/DELETE | `/api/coupons` | CRUD de cupons |
| GET/POST/PUT/DELETE | `/api/price-lots` | CRUD de lotes |

---

## ⚙️ Configuração do Mercado Pago (passo a passo)

1. Crie/entre em uma conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers).
2. Crie uma **aplicação** (Checkout Pro).
3. Copie **Access Token** e **Public Key** (use as credenciais de **teste** para sandbox).
4. Configure as **variáveis de ambiente** (ver acima).
5. Em **Webhooks/Notificações**, cadastre a URL:
   `https://SEU_DOMINIO/api/payments/webhook` e selecione o evento **Pagamentos**.
   Copie o **segredo de assinatura** para `MP_WEBHOOK_SECRET`.
6. **Teste** com [cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards).
7. Ao validar, troque para as **credenciais de produção**.

> Configure o **curso à venda** em *Admin → Pagamentos → Preços* (marque "Disponível para compra" e defina o preço).

---

## 🚀 Próximos passos

**Recomendados antes de produção**
- [ ] Configurar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `APP_BASE_URL` e SMTP no ambiente.
- [ ] Cadastrar a URL do webhook no painel do Mercado Pago e testar em sandbox.
- [ ] Definir preços/validade dos cursos à venda no admin.
- [ ] Revisar o texto dos **Termos de Compra** com apoio jurídico.
- [ ] Testar os 3 fluxos: logado, convidado e cupom 100% (cortesia).

**Melhorias futuras (opcionais)**
- [ ] **Reembolso/estorno** direto pelo painel (a API `PaymentRefund` já está disponível no SDK).
- [ ] **Exportar pedidos em CSV** (como já existe para serial keys).
- [ ] **Notas fiscais** automáticas (integração com emissor de NF-e).
- [ ] **Assinaturas/recorrência** (o SDK suporta `PreApproval`).
- [ ] **Comprovante em PDF** anexado ao e-mail (hoje o comprovante vai no corpo do e-mail e é imprimível no /perfil).
- [ ] **Reconciliação agendada** (cron) para pedidos pendentes que não receberam webhook.
- [ ] **Rate limiting** dedicado (ex.: `express-rate-limit`) nas rotas públicas de pagamento.

---

**ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70**

# 💳 Sistema de Pagamentos — ECO RJ (Mercado Pago · Checkout Transparente)

Documentação completa do sistema de pagamentos implementado para a plataforma
**ECO RJ — Centro de Treinamento em Ecocardiografia**.

A integração usa o **Checkout Transparente** do Mercado Pago (Payment Brick): o
cliente paga **dentro da própria plataforma**, sem redirecionamento para o site
do Mercado Pago. Aceita **cartão de crédito/débito, Pix e boleto**.

Permite a **compra de cursos e materiais** com entrega automática de acesso,
tanto para usuários **logados** quanto para **convidados** (sem conta), com
**máxima segurança**, cupons, lotes de desconto, desconto ativado, taxa
operacional, CPF obrigatório, aceite de termos e registro completo de compras.

---

## 📑 Sumário

1. [Visão geral](#-visão-geral)
2. [Arquitetura e arquivos criados](#-arquitetura-e-arquivos-criados)
3. [Variáveis de ambiente (obrigatório configurar)](#-variáveis-de-ambiente-obrigatório-configurar)
4. [Como funciona (fluxos)](#-como-funciona-fluxos)
5. [Meios de pagamento (individualmente)](#-meios-de-pagamento-individualmente)
6. [Compra sem login depende do e-mail](#-compra-sem-login-depende-do-e-mail)
7. [Cálculo de preço e taxa operacional](#-cálculo-de-preço-e-taxa-operacional)
8. [Segurança](#-segurança-implementada)
9. [Painel do administrador](#-painel-do-administrador)
10. [Painel do usuário (/perfil)](#-painel-do-usuário-perfil)
11. [Endpoints da API](#-endpoints-da-api)
12. [Configuração do Mercado Pago (passo a passo)](#-configuração-do-mercado-pago-passo-a-passo)
13. [Reconciliação automática (cron-job.org)](#-reconciliação-automática-cron-joborg)
14. [Próximos passos](#-próximos-passos)

---

## 🎯 Visão geral

| Requisito | Status |
|-----------|--------|
| Comprar cursos e receber acesso na conta (logado) | ✅ Entrega automática |
| Comprar sem estar logado (convidado) | ✅ E-mail com serial key + link de ativação + comprovante |
| **Bloquear compra de convidado quando o e-mail está desativado** | ✅ Exige login (ver [Compra sem login](#-compra-sem-login-depende-do-e-mail)) |
| Cartão de crédito, cartão de débito (com 3-D Secure), boleto e Pix | ✅ Validados individualmente ([detalhes](#-meios-de-pagamento-individualmente)) |
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
- `services/mercadoPagoService.ts` — integração com o Mercado Pago: **`createPayment`** (Checkout Transparente — cartão via token do Brick com **3-D Secure**, Pix e boleto), **`cancelPayment`** (troca de meio de pagamento) e consulta de pagamento (fonte da verdade). Mantém `createPreference` (Checkout Pro) como fallback. Credenciais **apenas** via env.
- `services/paymentMethodService.ts` — resolve e valida o **meio de pagamento escolhido** (crédito, débito, boleto, Pix) contra a config do admin, normaliza o endereço exigido pelo boleto e limita as parcelas por meio.
- `services/emailService.ts` — e-mail transacional (nodemailer) com comprovante HTML + serial key + link de ativação. Degrada graciosamente sem SMTP.
- `services/fulfillmentService.ts` — **entrega** do pedido (gera serial key, libera acesso, contabiliza cupom/lote, envia e-mail) — idempotente e com **claim atômico** anti-duplicação.
- `services/reconciliationService.ts` — **reconciliação** dos pedidos pendentes (cursos + materiais) contra o Mercado Pago e reprocessamento de entregas presas. É a rede de segurança para o pedido "pago que ficou pendente" ([detalhes](#-reconciliação-automática-cron-joborg)).

**Config**
- `config/paymentConfig.ts` — configuração de pagamento (taxa, métodos, parcelas, termos, vendas ativas) persistida em `SystemSettings`. Contém o **texto padrão dos termos**.

**Controllers**
- `controllers/paymentController.ts` — público/usuário: config, cotação, checkout, **webhook**, status do pedido, sincronização, minhas compras.
- `controllers/adminPaymentController.ts` — admin: pedidos, estatísticas, reprocessar entrega, config, preços por curso.
- `controllers/couponController.ts` — CRUD de cupons.
- `controllers/priceLotController.ts` — CRUD de lotes.
- `controllers/cronController.ts` — rotina agendada: endpoint do **cron externo** (autenticado por `CRON_SECRET`) e a versão manual usada pelo botão "Sincronizar pendentes" do painel.

**Rotas** (registradas em `routes/index.ts`)
- `routes/paymentRoutes.ts` → `/api/payments/*`
- `routes/couponRoutes.ts` → `/api/coupons/*`
- `routes/priceLotRoutes.ts` → `/api/price-lots/*`

### Frontend (`frontend/src`)

- `components/MercadoPagoBrick.tsx` — **componente reutilizável do Payment Brick** (Checkout Transparente): carrega o SDK, renderiza cartão/Pix/boleto tematizados (light/dark), tokeniza o cartão no cliente e envia o `formData` ao backend. Usado por cursos e materiais.
- `components/ThreeDSChallenge.tsx` — **desafio 3-D Secure** do emissor (obrigatório na prática no cartão de débito): submete o `creq` num iframe e acompanha o desfecho pelo status do pedido.
- `utils/mercadoPago.ts` — carregamento sob demanda do SDK `MercadoPago.js v2`.
- `pages/Checkout.tsx` — `/comprar/:cursoId` — formulário de compra + **etapa de pagamento embutida** (Payment Brick), cupom, resumo de valores, aceite de termos.
- `pages/PaymentStatus.tsx` — `/compra/status?pedido=...` — retorno do pagamento (polling), **QR Code do Pix / boleto** quando pendente, serial key para convidados.
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
MP_PUBLIC_KEY=APP_USR-xxxxxxxx        # Chave pública — OBRIGATÓRIA (usada pelo Payment Brick no front-end)
MP_WEBHOOK_SECRET=xxxxxxxx            # Segredo de assinatura do webhook

# URL pública da aplicação (back_urls, webhook e links de ativação)
APP_BASE_URL=https://www.cursodeecocardiografia.com

# Segredo da rotina agendada de reconciliação (cron-job.org) — ver seção própria
CRON_SECRET=uma_chave_longa_e_aleatoria

# SMTP (envio de comprovante e serial key)
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario_smtp
SMTP_PASS=senha_smtp
SMTP_FROM=ECO RJ <contato@cursodeecocardiografia.com>
```

> ⚠️ **Sem `MP_ACCESS_TOKEN`** o checkout retorna "pagamentos indisponíveis" (nenhuma cobrança é feita).
> ⚠️ **Sem `MP_PUBLIC_KEY`** o Payment Brick não renderiza no front-end (o Checkout Transparente exige a chave pública).
> ⚠️ **Sem SMTP** a compra de quem está **logado** continua funcionando (o acesso é liberado direto na conta e o e-mail é apenas registrado no log), mas a **compra sem login é bloqueada** — não haveria como entregar a serial key/o PDF ao convidado. Configure o SMTP para produção.

No **Vercel**, cadastre essas variáveis em *Project → Settings → Environment Variables*.

---

## 🔄 Como funciona (fluxos)

### A) Usuário **logado** compra um curso
1. Na página do curso, clica em **"Comprar Curso"** → `/comprar/:cursoId`.
2. Dados (nome, e-mail, CPF) já vêm preenchidos; informa telefone e aceita os termos.
3. Opcionalmente aplica um **cupom**.
4. Clica em **Pagar** → o pedido é criado (pendente) e o **Payment Brick** aparece **na própria página** (sem redirecionamento).
5. Escolhe cartão / Pix / boleto e paga. O `formData` (com o **token do cartão**, gerado no navegador) vai para `POST /order/:numero/process`, que cria o pagamento no Mercado Pago com o **valor recalculado no servidor**.
6. Se aprovado, o sistema **libera o acesso automaticamente** (promove para `Aluno`, inscreve no curso, autoriza acesso e marca a serial key como usada); o **webhook** confirma de forma assíncrona (Pix/boleto).
7. Recebe **e-mail com comprovante**. O curso aparece no **Dashboard** e a compra no **/perfil → Minhas Compras**.

### B) **Convidado** (sem conta) compra um curso
1. Acessa `/comprar/:cursoId` (sem login).
2. Informa **nome, e-mail, telefone e CPF** e aceita os termos.
3. Paga **dentro da plataforma** (Payment Brick). Para **Pix**, o QR Code e o "copia e cola" aparecem na página de status; para **boleto**, o link do boleto.
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

## 💳 Meios de pagamento (individualmente)

Cada meio tem um interruptor próprio em *Admin → Pagamentos → Configurações* e é
validado **individualmente no servidor** (não basta o Brick escondê-lo na tela).

| Meio | `payment_method_id` típico | Config | Particularidades |
|------|---------------------------|--------|------------------|
| **Cartão de crédito** | `visa`, `master`, `elo`, `amex`, `hipercard` | `metodos.cartaoCredito` | Parcelado até o teto do admin (`parcelasMaximas`); 3-D Secure `optional` |
| **Cartão de débito** | `debvisa`, `debmaster`, `debelo`, `debcabal`, `maestro` | `metodos.cartaoDebito` | **Sempre 1x**; 3-D Secure `optional` — o desafio do emissor é exibido na própria página (ver abaixo) |
| **Boleto** | `bolbradesco` | `metodos.boleto` | Exige **endereço completo** do pagador (CEP, rua, número, bairro, cidade, UF); compensa em até 2 dias úteis |
| **Pix** | `pix` | `metodos.pix` | QR Code + copia-e-cola exibidos na página de status |

Como o `formData` do Payment Brick só traz o `payment_method_id`, o front-end
envia também o `selected_payment_method` (`credit_card` / `debit_card` /
`ticket` / `bank_transfer`) — sem ele **não há como separar crédito de débito**.
O servidor deriva o tipo do `payment_method_id` + presença do token e usa o
campo declarado apenas para desempatar crédito x débito.

### 3-D Secure (essencial no cartão de débito)

Cartões de débito no Brasil praticamente sempre exigem a autenticação do
emissor. Nesse caso o Mercado Pago devolve o pagamento com
`status_detail: "pending_challenge"` e um `three_ds_info` (`external_resource_url` + `creq`).

- O backend envia `three_d_secure_mode: 'optional'` em **todo pagamento com cartão**
  (o desafio só aparece quando o banco exige) e repassa o `threeDs` na resposta de
  `/process`.
- O front-end abre o componente `ThreeDSChallenge`, que faz o **POST do `creq`**
  para a URL do emissor dentro de um iframe e acompanha o desfecho consultando o
  status do pedido (o iframe é de outro domínio e não pode ser inspecionado).
- Sem esse tratamento o pagamento **nunca sai de "pendente"** — era o motivo de o
  cartão de débito não funcionar.

### Troca de meio de pagamento no mesmo pedido

Se o comprador gerou um boleto (ou Pix) e resolveu pagar no cartão, o pagamento
anterior é **cancelado no Mercado Pago** antes de criar o novo — assim ele não
consegue pagar as duas cobranças. Pagamentos **aprovados ou em análise** nunca
são recriados (idempotência: jamais cobrar duas vezes).

---

## 📧 Compra sem login depende do e-mail

Quem compra **sem conta** recebe *tudo* por e-mail: a serial key, o link de
ativação, o material em PDF (loja de materiais) e o comprovante. Se o **SMTP não
estiver configurado**, essa entrega simplesmente não acontece — a compra ficaria
órfã.

Por isso, quando `isEmailConfigured()` é `false`:

- `GET /api/payments/config` devolve `emailConfigurado: false` e
  `compraSemLoginPermitida: false`;
- os checkouts de **curso** e de **material** exibem uma tela pedindo
  **login / criar conta** (com retorno automático para o checkout depois);
- o backend recusa o checkout de convidado com **HTTP 401** e
  `loginObrigatorio: true` — a proteção não depende do front-end;
- *Admin → Pagamentos → Configurações* mostra um aviso explicando a situação e
  quais variáveis configurar.

Usuários **logados** continuam comprando normalmente: o acesso é liberado direto
na conta, sem depender de e-mail.

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
- Não há valor mínimo imposto pela plataforma (útil para testes com valores baixos). O Mercado Pago pode recusar valores muito pequenos conforme o meio de pagamento.

---

## 🛡️ Segurança implementada

- **Preço recalculado no servidor** em toda cotação e checkout — o cliente **nunca** envia valores.
- **Validação de assinatura do webhook** (HMAC-SHA256, comparação em tempo constante, tolerância de 300s contra replay).
- **Consulta do pagamento na API do MP** como fonte da verdade (não confia no payload do webhook).
- **Conferência de valor**: se o valor pago divergir do total do pedido, a entrega é **bloqueada** e um alerta é logado.
- **Idempotência + claim atômico** na entrega: webhooks duplicados/concorrentes **não** geram serial keys duplicadas nem liberam acesso duas vezes.
- **Anti-cobrança dupla ao trocar de meio de pagamento**: pagamento aprovado/em análise nunca é recriado; boleto ou Pix ainda pendente é **cancelado no Mercado Pago** antes de emitir a nova cobrança.
- **Cada meio de pagamento validado no servidor** contra a config do admin (crédito, débito, boleto e Pix separadamente) — desligar um método no painel realmente o bloqueia, mesmo em chamada direta à API.
- **Parcelamento controlado no servidor**: débito, boleto e Pix sempre à vista; crédito limitado ao teto configurado (o cliente não escolhe além disso).
- **Compra de convidado exigindo login quando o SMTP está desativado** — evita a venda sem entrega possível.
- **CPF validado** com dígito verificador; e-mail e telefone validados.
- **Aceite de termos** obrigatório, com **versão, data e IP** registrados por pedido (auditoria/LGPD).
- **Serial key de uso único** (infra existente) — não transferível e some ao ser deletada.
- **Anti-abuso**: limite de pedidos pendentes por e-mail em janela curta; incremento de uso de cupom/lote **atômico** e idempotente.
- **Credenciais do Mercado Pago apenas em variáveis de ambiente** — nunca no banco, nunca no front-end.
- **PCI**: no Checkout Transparente os dados do cartão são digitados nos campos seguros do **Payment Brick** e **tokenizados no navegador pelo SDK do Mercado Pago** — o backend recebe apenas o **token**, nunca o número do cartão/CVV (mantém o nível **PCI SAQ-A**).
- **Reconciliação agendada** com segredo próprio (`CRON_SECRET`, comparação em tempo constante) e desligada por padrão quando a variável não existe. A rotina apenas **consulta** o Mercado Pago — nunca cria cobrança.
- **Notificação atrasada não reverte pedido pago**: o desfecho de uma tentativa antiga (boleto abandonado, cartão recusado) não muda o status de um pedido já aprovado — só estorno faz isso.
- Serial key só é exposta na página pública de status para **convidados** (usuários logados recebem acesso direto na conta).

---

## 🧑‍💼 Painel do administrador

Acesse **Admin → Pagamentos** (`/admin/pagamentos`):

- **Pedidos** — lista com busca (pedido/nome/e-mail/CPF) e filtro por status; estatísticas de receita; detalhe do pedido (dados, valores, MP, serial key, aceite de termos); **reprocessar entrega / reenviar e-mail**; botão **"Sincronizar pendentes"**, que reconsulta o Mercado Pago e aprova na hora os pedidos que já foram pagos.
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
| POST | `/api/payments/checkout` | Cria o pedido (pendente) e devolve dados do Payment Brick (optionalAuth) |
| POST | `/api/payments/order/:numeroPedido/process` | **Processa o pagamento** com o `formData` do Brick — Checkout Transparente (optionalAuth) |
| ALL | `/api/payments/webhook` | Webhook do Mercado Pago |
| GET | `/api/payments/order/:numeroPedido` | Status público do pedido |
| POST | `/api/payments/order/:numeroPedido/sync` | Reconsulta o pagamento (fallback) |

### Rotina agendada (cron externo)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/payments/cron/reconcile` | Reconcilia **todos** os pedidos pendentes com o Mercado Pago. Autenticado por `CRON_SECRET` |

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
| POST | `/api/payments/admin/reconcile` | Sincronizar pendentes agora (botão do painel) |
| GET | `/api/payments/admin/courses-pricing` | Cursos com config de venda |
| PUT | `/api/payments/admin/course/:id/pricing` | Atualizar venda do curso |
| GET/POST/PUT/DELETE | `/api/coupons` | CRUD de cupons |
| GET/POST/PUT/DELETE | `/api/price-lots` | CRUD de lotes |

---

## ⚙️ Configuração do Mercado Pago (passo a passo)

1. Crie/entre em uma conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers).
2. Crie uma **aplicação** escolhendo **Checkout Transparente** (produto "Pagamentos on-line" / integração via API + Payment Brick).
3. Copie **Access Token** e **Public Key** (use as credenciais de **teste** para sandbox). A **Public Key é obrigatória** para o Payment Brick.
4. Configure as **variáveis de ambiente** (ver acima).
5. Em **Webhooks/Notificações**, cadastre a URL:
   `https://SEU_DOMINIO/api/payments/webhook` e selecione o evento **Pagamentos**.
   Copie o **segredo de assinatura** para `MP_WEBHOOK_SECRET`.
6. **Teste** com [cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards).
7. Ao validar, troque para as **credenciais de produção**.

> Configure o **curso à venda** em *Admin → Pagamentos → Preços* (marque "Disponível para compra" e defina o preço).

---

## ⏰ Reconciliação automática (cron-job.org)

### O problema: "o cliente pagou, mas o pedido continua PENDENTE"

O status de um pedido só mudava em duas situações: quando o **webhook** do
Mercado Pago chegava, ou quando o **próprio comprador** estava com a página
`/compra/status` aberta (que chama o `/sync`). Se as duas falham, o dinheiro
entra e o pedido fica **"Pendente" para sempre** no painel — e o aluno não
recebe o acesso.

Isso acontece em cenários bem comuns:

| Causa | O que acontece |
|-------|----------------|
| Webhook não cadastrado / URL errada no painel do MP | Nenhuma notificação chega |
| `MP_WEBHOOK_SECRET` diferente do painel | Webhook recusado com 401 (assinatura inválida) |
| Função serverless indisponível / deploy no momento do envio | Notificação perdida |
| **Pix ou boleto pago depois** que o comprador fechou a página | O `/sync` nunca roda |
| Resposta do `createPayment` perdida (timeout) | O pedido fica **sem `paymentId`** — nem o `/sync` recuperava |
| Pagamento aprovado mas a entrega falhou | Pedido aprovado e **não entregue** |

### A solução

1. **Rotina de reconciliação** (`services/reconciliationService.ts`): varre os
   pedidos de **cursos e materiais** em aberto e consulta o Mercado Pago (fonte
   da verdade) por `payment_id` **e por `external_reference`** — é a consulta
   por referência que recupera o pedido que ficou sem `paymentId`. Aprovou?
   Libera o acesso na hora. Também **reprocessa entregas** de pedidos aprovados
   que ficaram sem entregar.
2. **Endpoint para o cron externo**: `GET|POST /api/payments/cron/reconcile`,
   autenticado por `CRON_SECRET` (comparação em tempo constante).
3. **Botão "Sincronizar pendentes"** em *Admin → Pagamentos → Pedidos*, para
   disparar a mesma rotina na hora.
4. **`/sync` reforçado**: a página de status também passou a consultar por
   `external_reference` e a reprocessar a entrega de pedido pago e não entregue.
5. **Proteção contra "des-aprovar" pedido pago**: a notificação atrasada de uma
   tentativa antiga (ex.: o boleto abandonado depois de o cartão ser aprovado)
   **não** reverte mais um pedido já aprovado.

Tudo é **idempotente**: rodar a cada 15 minutos não gera chave duplicada, não
entrega duas vezes e **não cobra ninguém de novo** (a rotina só consulta).

### Passo a passo no cron-job.org

1. Gere o segredo: `openssl rand -hex 32`.
2. Cadastre no ambiente do servidor (Vercel → *Project → Settings → Environment
   Variables*) a variável **`CRON_SECRET`** com esse valor e **faça o redeploy**.
   *Sem essa variável o endpoint responde `503` e fica desligado — nunca aberto.*
3. Em [cron-job.org](https://console.cron-job.org) → **Create cronjob**:
   - **Title**: `ECO RJ — Reconciliar pagamentos`
   - **URL**: `https://www.cursodeecocardiografia.com/api/payments/cron/reconcile`
   - **Schedule**: a cada **15 minutos** (`Every 15 minutes`)
   - **Advanced → Request method**: `POST` (o `GET` também funciona)
   - **Advanced → Headers**: adicione
     `Authorization: Bearer SEU_CRON_SECRET`
   - **Enable job** e salvar.
4. Use **Test run** para conferir: a resposta deve ser `200` com um JSON de resumo.

> Prefira o segredo no **header** `Authorization`. A query `?token=` também é
> aceita (útil em painéis que não deixam configurar headers), mas o valor fica
> registrado no histórico de execuções do cron e nos logs de acesso.

### Testando pelo terminal

```bash
# Recomendado (segredo no header)
curl -X POST "https://www.cursodeecocardiografia.com/api/payments/cron/reconcile" \
  -H "Authorization: Bearer SEU_CRON_SECRET"

# Alternativa (segredo na URL)
curl -X POST "https://www.cursodeecocardiografia.com/api/payments/cron/reconcile?token=SEU_CRON_SECRET"
```

Parâmetros opcionais (query): `?dias=30` (janela de varredura, 1–180) e
`?limite=40` (máximo de pedidos por execução, 1–200). A execução também respeita
um **orçamento de tempo** (20 s por padrão, ajustável em `RECONCILE_BUDGET_MS`)
para caber no tempo máximo da função serverless: ao estourar, ela para e devolve
`interrompidoPorTempo: true` — o que sobrou é varrido na execução seguinte, sem
perder nada.

Resposta:

```json
{
  "ok": true,
  "verificados": 12,
  "atualizados": 2,
  "aprovados": 2,
  "entregasReprocessadas": 0,
  "erros": 0,
  "interrompidoPorTempo": false,
  "duracaoMs": 2841,
  "alteracoes": [
    { "origem": "curso", "numeroPedido": "ECO-PED-20250105-A7K9B2X5",
      "de": "pendente", "para": "aprovado", "paymentId": "1234567890", "entregue": true }
  ]
}
```

| Código | Significado |
|--------|-------------|
| `200` | Rodou (veja o resumo no corpo) |
| `401` | Segredo ausente ou incorreto |
| `503` | `CRON_SECRET` não configurado no servidor |

> ⚠️ A reconciliação é uma **rede de segurança**, não substitui o webhook.
> Mantenha a URL `https://SEU_DOMINIO/api/payments/webhook` cadastrada no painel
> do Mercado Pago com o `MP_WEBHOOK_SECRET` correto — o webhook confirma em
> segundos; o cron cobre o que escapar.

---

## 🚀 Próximos passos

**Recomendados antes de produção**
- [ ] Configurar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `APP_BASE_URL` e SMTP no ambiente.
- [ ] Cadastrar a URL do webhook no painel do Mercado Pago e testar em sandbox.
- [ ] Configurar `CRON_SECRET` e o job de 15 em 15 minutos no cron-job.org (ver [Reconciliação automática](#-reconciliação-automática-cron-joborg)).
- [ ] Definir preços/validade dos cursos à venda no admin.
- [ ] Revisar o texto dos **Termos de Compra** com apoio jurídico.
- [ ] Testar os 3 fluxos: logado, convidado e cupom 100% (cortesia).

**Melhorias futuras (opcionais)**
- [ ] **Reembolso/estorno** direto pelo painel (a API `PaymentRefund` já está disponível no SDK).
- [ ] **Exportar pedidos em CSV** (como já existe para serial keys).
- [ ] **Notas fiscais** automáticas (integração com emissor de NF-e).
- [ ] **Assinaturas/recorrência** (o SDK suporta `PreApproval`).
- [ ] **Comprovante em PDF** anexado ao e-mail (hoje o comprovante vai no corpo do e-mail e é imprimível no /perfil).
- [ ] **Rate limiting** dedicado (ex.: `express-rate-limit`) nas rotas públicas de pagamento.

---

**ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70**

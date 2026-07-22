# 📧 Sistema de E-mails — ECO RJ

Documentação completa do sistema de e-mails da plataforma ECO RJ: painel
administrativo de envio, templates personalizáveis, e-mails automáticos
(cadastro, compra e término de curso), configuração de SMTP e segurança.

---

## 📑 Índice

1. [Visão geral](#-visão-geral)
2. [Como configurar (SMTP)](#-como-configurar-smtp)
3. [Modo simulado](#-modo-simulado-sem-configuração)
4. [Painel do administrador](#-painel-do-administrador)
5. [E-mails automáticos do sistema](#-e-mails-automáticos-do-sistema)
6. [Templates e variáveis](#-templates-e-variáveis)
7. [Referência da API](#-referência-da-api)
8. [Segurança](#-segurança)
9. [Arquitetura / arquivos](#-arquitetura--arquivos)
10. [Integração com Mercado Pago (futuro)](#-integração-com-mercado-pago-futuro)
11. [Agendamento do e-mail de término](#-agendamento-do-e-mail-de-término)
12. [FAQ / resolução de problemas](#-faq--resolução-de-problemas)

---

## 🔎 Visão geral

O sistema de e-mails oferece:

| Recurso | Descrição |
|---------|-----------|
| **Envio em massa** | O admin envia e-mails para usuários filtrados por cargo, por acesso a um curso ou por busca de nome/e-mail. |
| **Templates** | Vários modelos prontos com identidade visual do ECO RJ, totalmente editáveis. |
| **Pré-visualização** | Renderização real do e-mail (em `iframe` isolado) antes de enviar. |
| **Histórico** | Registro de todos os e-mails enviados/simulados/com falha, com filtros. |
| **E-mails automáticos** | Boas-vindas (cadastro), comprovante de compra e término de curso. |
| **Modo simulado** | Funciona mesmo sem SMTP configurado — registra sem enviar, garantindo que a plataforma nunca quebre. |

Tudo é acessível em **Admin → E-mails** (`/admin/emails`).

---

## ⚙️ Como configurar (SMTP)

O envio real depende de variáveis de ambiente no **backend**. Adicione ao seu
`.env` (veja `backend/.env.example`):

```bash
# Servidor SMTP
SMTP_HOST=smtp.seuprovedor.com      # ex.: smtp.gmail.com, smtp.sendgrid.net, smtp-relay.brevo.com
SMTP_PORT=587                       # 587 (STARTTLS) ou 465 (SSL)
SMTP_SECURE=false                   # true apenas para porta 465
SMTP_USER=usuario_ou_apikey
SMTP_PASS=senha_ou_apikey

# Remetente exibido
EMAIL_FROM=contato@cursodeecocardiografia.com
EMAIL_FROM_NAME=ECO RJ

# URL pública da plataforma (usada nos links dos e-mails)
APP_URL=https://www.cursodeecocardiografia.com
```

> **Dica:** use um provedor transacional (SendGrid, Brevo, Amazon SES, Mailgun)
> em produção. Contas pessoais de Gmail têm limites baixos e podem bloquear
> envios em massa.

Após definir as variáveis, **reinicie o backend**. O painel deixará de mostrar
o aviso de "modo simulado".

### Provedores comuns

| Provedor | Host | Porta | Secure |
|----------|------|-------|--------|
| Gmail / Google Workspace | `smtp.gmail.com` | 587 | false |
| SendGrid | `smtp.sendgrid.net` | 587 | false |
| Brevo (Sendinblue) | `smtp-relay.brevo.com` | 587 | false |
| Amazon SES | `email-smtp.<região>.amazonaws.com` | 587 | false |
| Mailgun | `smtp.mailgun.org` | 587 | false |

---

## 🧪 Modo simulado (sem configuração)

Se `SMTP_HOST`, `SMTP_USER` ou `SMTP_PASS` **não** estiverem definidos, o sistema
entra em **modo simulado**:

- Nenhum e-mail é realmente enviado.
- Cada e-mail é **registrado no histórico** com status `simulado`.
- O painel exibe um aviso amarelo.
- Nenhum fluxo quebra (o cadastro de usuário, por exemplo, continua funcionando
  normalmente mesmo sem SMTP).

Isso permite desenvolver, testar templates e validar segmentações sem enviar
e-mails de verdade.

---

## 🖥️ Painel do administrador

Acesse **Admin → E-mails**. Há três abas:

### 1. Enviar

Fluxo em duas colunas para uma UX simples:

**Coluna 1 — Conteúdo**
1. Escolha um **template** (Comunicado, Nova aula, Promoção, Personalizado...).
2. Preencha os campos que aparecem (ex.: *Título* e *Mensagem*). O nome do
   destinatário e os links são inseridos automaticamente.
3. Clique em **Pré-visualizar** para ver o e-mail final.

**Coluna 2 — Destinatários**
1. Filtre por **Cargo** (Visitante, Aluno, Instrutor, Administrador).
2. Filtre por **Acesso a um curso** (inscritos + autorizados naquele curso).
3. Busque por **nome ou e-mail**.
4. Veja a contagem e a lista. Você pode:
   - **Não selecionar ninguém** → envia para **todos** que batem no filtro; ou
   - **Marcar usuários específicos** → envia só para os marcados.
5. Clique em **Enviar para N destinatário(s)** e confirme.

> Por padrão, apenas **contas ativas** recebem e-mails.

### 2. Templates

- Lista os **e-mails automáticos** (boas-vindas, compra, término) e os
  **templates manuais**.
- **Editar**: altere assunto, corpo (HTML) e descrição.
- **Desativar** (só automáticos): impede o disparo automático sem apagar o texto.
- **Restaurar padrão**: volta o template ao conteúdo original de fábrica.
- **Pré-visualizar**: vê o resultado com dados de amostra.

### 3. Histórico

- Tabela com destinatário, assunto, origem (automático/manual), status e data.
- Filtros por status (`enviado`/`falhou`/`simulado`), origem e busca.
- Botão **Limpar** para remover registros (respeita o filtro de status).

---

## 🤖 E-mails automáticos do sistema

| Template | Quando dispara | Origem no código |
|----------|----------------|------------------|
| **Boas-vindas** (`boas_vindas`) | Logo após o cadastro do usuário. | `authController.register` → `sendWelcomeEmailAsync` |
| **Comprovante de compra** (`compra_curso`) | Após confirmação de compra de um curso. *(placeholder — ver Mercado Pago)* | `courseController.purchaseCourse` → `sendCoursePurchaseEmail` |
| **Término de curso** (`termino_curso`) | Quando a **data de término** de um curso do aluno é atingida (apenas cursos com `dataTermino`). | `emailController.processCourseCompletions` → `sendCourseCompletionEmail` |

### Boas-vindas
Enviado em *background* — se o SMTP falhar, **o cadastro não é afetado**.
Inclui o e-mail, o cargo e um botão para acessar a plataforma.

### Comprovante de compra
Inclui **comprovante de pagamento** e todos os dados do curso: nome, descrição,
**data de início**, **data de término** (se houver) e **duração**, além de
valor, método, ID da transação e data do pagamento.

> Enquanto o Mercado Pago não é integrado, os dados de pagamento são
> *placeholders*. O e-mail pode ser disparado por:
> - `POST /api/courses/:id/purchase` (simula a compra: inscreve + envia), ou
> - **Admin → E-mails → API** `POST /api/emails/purchase-receipt` (reenvio manual).

### Término de curso
Enviado uma única vez por aluno/curso (com **deduplicação** via histórico).
Parabeniza o aluno e aponta para os certificados.

---

## 🧩 Templates e variáveis

O corpo dos e-mails é **HTML** e usa variáveis no formato `{{variavel}}`.
O layout (cabeçalho com logo + rodapé institucional com CNPJ e endereço) é
aplicado automaticamente — você edita apenas o **miolo** do e-mail.

### Variáveis automáticas (sempre disponíveis nos envios manuais)

| Variável | Valor |
|----------|-------|
| `{{nome}}` | Primeiro nome do destinatário |
| `{{nomeCompleto}}` | Nome completo |
| `{{email}}` | E-mail do destinatário |
| `{{cargo}}` | Cargo atual |
| `{{linkPlataforma}}` | Link para o dashboard |

### Variáveis por template

| Template | Variáveis específicas |
|----------|-----------------------|
| `boas_vindas` | `email`, `cargo`, `linkPlataforma` |
| `compra_curso` | `curso`, `descricaoCurso`, `dataInicio`, `dataTermino`, `duracao`, `valor`, `metodoPagamento`, `idTransacao`, `dataPagamento`, `linkCurso` |
| `termino_curso` | `curso`, `dataInicio`, `dataTermino`, `linkCertificado`, `linkPlataforma` |
| `comunicado` | `titulo`, `mensagem` |
| `nova_aula` | `tituloAula`, `curso`, `mensagem`, `linkAula` |
| `promocao` | `titulo`, `mensagem`, `textoBotao`, `linkOferta` |
| `personalizado` | `titulo`, `mensagem` |

> Variáveis sem valor são simplesmente removidas na renderização.

---

## 🔌 Referência da API

Todas as rotas exigem autenticação **e** cargo **Administrador**
(`protect` + `adminOnly`). Base: `/api/emails`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/config` | Status do SMTP (`configured`, `modo`, remetente, `appUrl`). |
| `GET` | `/stats` | Totais por status e últimos 30 dias. |
| `GET` | `/templates` | Lista templates (filtro `?categoria=sistema|manual`). |
| `GET` | `/templates/:id` | Detalhe de um template. |
| `PUT` | `/templates/:id` | Edita `assunto`, `corpoHtml`, `descricao`, `ativo` (e `nome` se manual). |
| `POST` | `/templates/:id/reset` | Restaura o template ao padrão. |
| `POST` | `/preview` | Renderiza `{ templateKey \| assunto+corpoHtml, vars }` → `{ subject, html }`. |
| `GET` | `/recipients` | Lista destinatários por `cargo`, `cursoId`, `ativo`, `search`. |
| `POST` | `/send` | Envio em massa (ver payload abaixo). |
| `POST` | `/purchase-receipt` | Dispara comprovante de compra para `{ userId, cursoId, ... }`. |
| `POST` | `/process-course-completions` | Processa cursos vencidos e envia e-mails de término. |
| `GET` | `/logs` | Histórico paginado (filtros `status`, `categoria`, `templateKey`, `search`). |
| `DELETE` | `/logs` | Limpa o histórico (filtro opcional `?status=`). |

### Payload de `POST /api/emails/send`

```jsonc
{
  "templateKey": "comunicado",        // template base
  "assunto": "Opcional (sobrescreve)",
  "corpoHtml": "Opcional (sobrescreve)",
  "vars": { "titulo": "Aviso", "mensagem": "Texto..." },

  // Alvo — use userIds OU filtro:
  "userIds": ["<id1>", "<id2>"],       // destinatários específicos, OU
  "filtro": { "cargo": "Aluno", "cursoId": "<id>", "search": "" }
}
```

Resposta:
```jsonc
{
  "message": "E-mails processados: 42 enviado(s), 0 falha(s).",
  "loteId": "a1b2c3d4",
  "total": 42, "enviados": 42, "simulados": 0, "falhas": 0,
  "modo": "ativo"
}
```

### Endpoint público de compra (placeholder)

`POST /api/courses/:id/purchase` (usuário autenticado) — simula a compra:
inscreve o usuário no curso e envia o comprovante. Corpo opcional:
`{ valor, metodoPagamento, idTransacao, duracao }`.

---

## 🔒 Segurança

- **Acesso restrito**: todas as rotas de e-mail são `protect` + `adminOnly`.
- **Escape de HTML**: todo valor de variável é escapado (`escapeHtml`) antes de
  entrar no HTML, evitando injeção/XSS no conteúdo dos e-mails.
- **Assuntos sanitizados**: tags HTML e quebras de linha são removidas do
  assunto (`renderSubject`).
- **Pré-visualização isolada**: o preview roda em `<iframe sandbox="">`, sem
  permissão de scripts.
- **Validação de destinatário**: e-mails inválidos são rejeitados e registrados
  como falha, sem interromper o lote.
- **Segredos fora do frontend**: credenciais SMTP existem apenas no backend
  (variáveis de ambiente); o frontend só sabe se está `configured` ou não.
- **Limite por envio**: máximo de `MAX_DESTINATARIOS = 2000` por disparo.
- **Somente contas ativas**: usuários desativados não recebem e-mails.
- **Não bloqueia fluxos críticos**: falhas de e-mail nunca derrubam o cadastro
  ou a compra — o envio é resiliente e sempre registrado.
- **Deduplicação**: o e-mail de término não é enviado duas vezes para o mesmo
  aluno/curso.

---

## 🏗️ Arquitetura / arquivos

### Backend

```
backend/src/
├── models/
│   ├── EmailTemplate.ts     # Templates persistidos (editáveis pelo admin)
│   └── EmailLog.ts          # Histórico de cada e-mail (status, erro, etc.)
├── utils/
│   ├── emailTemplates.ts    # Layout base + templates padrão (identidade ECO RJ)
│   └── emailService.ts      # Transporte SMTP, render, envio e helpers de sistema
├── controllers/
│   ├── emailController.ts   # Painel admin: templates, envio, recipients, logs
│   ├── authController.ts    # → dispara boas-vindas no register
│   └── courseController.ts  # → purchaseCourse (placeholder) + dataTermino
└── routes/
    └── emailRoutes.ts       # /api/emails/*  (protect + adminOnly)
```

- `Course` ganhou o campo opcional **`dataTermino`**.
- `seed.ts` cria os templates padrão automaticamente (idempotente).

### Frontend

```
frontend/src/
├── pages/admin/AdminEmails.tsx   # Painel (abas Enviar / Templates / Histórico)
├── pages/admin/AdminCourses.tsx  # Campo "Data de Término" adicionado
├── services/api.ts               # emailService (+ courseService.purchase)
├── types/index.ts                # EmailTemplate, EmailLog, EmailRecipient, ...
├── App.tsx                       # Rota /admin/emails
└── components/Layout/Sidebar.tsx # Link "E-mails" no menu admin
```

---

## 💳 Integração com Mercado Pago (futuro)

O comprovante de compra já está pronto; falta apenas conectá-lo ao gateway.
Quando o Mercado Pago for implementado, no **webhook de pagamento aprovado**:

```ts
import { sendCoursePurchaseEmail } from '../utils/emailService';

// dentro do handler do webhook, após validar o pagamento:
await sendCoursePurchaseEmail(user, course, {
  valor: 'R$ 497,00',
  metodoPagamento: 'Cartão de crédito (Mercado Pago)',
  idTransacao: pagamento.id,          // ID real da transação
  dataPagamento: pagamento.date_approved,
  duracao: '40 horas'
});
```

Nada mais precisa mudar: o template, o histórico e a segurança já funcionam.

---

## ⏰ Agendamento do e-mail de término

Como a hospedagem é **serverless (Vercel)**, não há um processo contínuo de
`cron`. O e-mail de término é disparado ao chamar:

```
POST /api/emails/process-course-completions
```

Esse endpoint busca cursos com `dataTermino <= agora`, envia o e-mail para os
alunos com acesso e **deduplica** (não reenvia). Formas de acionar:

1. **Manual**: um administrador chama o endpoint (via ferramenta/API).
2. **Automático (recomendado)**: configure um **Vercel Cron** (ou serviço
   externo de agendamento) para chamá-lo uma vez por dia. Exemplo em
   `vercel.json`:

   ```jsonc
   {
     "crons": [
       { "path": "/api/emails/process-course-completions", "schedule": "0 9 * * *" }
     ]
   }
   ```

   > O endpoint exige admin; para uso via cron, proteja-o com um token de
   > serviço (ex.: header secreto) conforme sua estratégia de segurança.

---

## ❓ FAQ / resolução de problemas

**Os e-mails aparecem como "simulado".**
O SMTP não está configurado. Defina `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` e
reinicie o backend.

**O status ficou "falhou". O que vejo?**
A coluna de assunto no histórico mostra a mensagem de erro (ex.: credenciais
inválidas, host incorreto, e-mail do destinatário inválido).

**Editei um template e quero voltar ao original.**
Abra o template e clique em **Padrão** (restaura o conteúdo de fábrica).

**Um aluno não recebeu o e-mail de término.**
Verifique se o curso tem **Data de Término**, se o aluno está **inscrito/autorizado**
e **ativo**, e se `process-course-completions` foi executado após a data.

**Quero desativar o e-mail de boas-vindas.**
Em **Templates**, abra "Boas-vindas" e desmarque *Disparo automático ativo*.

**Posso mandar para todos os alunos de um curso específico?**
Sim: na aba **Enviar**, selecione o curso em "Com acesso ao curso" e não marque
ninguém individualmente — o envio abrange todos do filtro.

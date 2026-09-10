# 🔐 Recuperação de Senha — ECO RJ

> Como funciona o "Esqueci minha senha", por que cada decisão de segurança
> existe e o que muda para quem já tem conta.

---

## 📑 Sumário

1. [Visão geral](#-visão-geral)
2. [Os dois caminhos de recuperação](#-os-dois-caminhos-de-recuperação)
3. [Fluxo passo a passo (link por e-mail)](#-fluxo-passo-a-passo-link-por-e-mail)
4. [As 9 decisões de segurança](#-as-9-decisões-de-segurança)
5. [Política de senha](#-política-de-senha)
6. [Rate limiting](#-rate-limiting)
7. [Endpoints da API](#-endpoints-da-api)
8. [Arquivos envolvidos](#-arquivos-envolvidos)
9. [Como testar](#-como-testar)

---

## 🎯 Visão geral

Antes, a única forma de recuperar a senha era o **token permanente** exibido no
cadastro (baixado num `.txt`). Quem perdia o arquivo perdia a conta.

Agora existe o caminho padrão da indústria: **link de redefinição enviado por
e-mail**, de uso único e validade curta. O caminho antigo continua funcionando
como alternativa para quem perdeu o acesso à caixa de e-mail.

---

## 🔀 Os dois caminhos de recuperação

Em `/login` → **"Esqueci minha senha"**, o usuário escolhe:

| Caminho | Quando usar | Como funciona |
|---------|-------------|---------------|
| **Receber link por e-mail** *(recomendado)* | Caso normal | Informa o e-mail → recebe um link válido por **30 minutos**, de **uso único** |
| **Usar meu token de recuperação** | Perdeu o acesso ao e-mail | Informa e-mail + token do cadastro + nova senha |

A opção do link só aparece quando o servidor tem **SMTP configurado**
(`GET /api/auth/recovery-options` informa isso ao front-end).

---

## 🧭 Fluxo passo a passo (link por e-mail)

```
1. Usuário informa o e-mail            POST /api/auth/forgot-password
        │
        ├── Não existe conta ──►  registra a tentativa (só o HASH do e-mail)
        │                         e responde a MESMA mensagem genérica
        │
        └── Existe conta ──►  invalida links anteriores
                              gera token (32 bytes aleatórios)
                              grava apenas o SHA-256 do token
                              envia o e-mail com o link

2. Usuário abre o link                 /redefinir-senha?token=...
                                       POST /api/auth/reset-password/validate
   (a página só mostra o formulário se o link ainda for válido)

3. Usuário define a nova senha         POST /api/auth/reset-password/confirm
        │
        ├── consome o token ATOMICAMENTE (uso único garantido)
        ├── grava a nova senha (bcrypt) e carimba `senhaAlteradaEm`
        ├── invalida QUALQUER outro link pendente
        ├── derruba TODAS as sessões abertas com a senha antiga
        └── envia o e-mail "sua senha foi alterada"

4. Usuário entra com a senha nova      (não há login automático — de propósito)
```

---

## 🛡️ As 9 decisões de segurança

| # | Decisão | Por quê |
|---|---------|---------|
| 1 | **Token de 32 bytes** (`crypto.randomBytes`, 256 bits) | Adivinhar por força bruta é inviável |
| 2 | **Só o hash SHA-256 vai para o banco** | Um vazamento do banco não permite redefinir a senha de ninguém. E a busca é *pelo hash*, então não há comparação vulnerável a ataque de timing |
| 3 | **Validade de 30 minutos** | Reduz a janela de um link interceptado (encaminhamento, backup de caixa postal) |
| 4 | **Uso único + um pedido novo invalida os anteriores** | Só o último link funciona, e só uma vez. O consumo é atômico (`findOneAndUpdate`), então abrir o link em dois lugares ao mesmo tempo não redefine duas vezes |
| 5 | **Resposta sempre genérica** | Não revela quais e-mails têm conta (evita enumeração de usuários) |
| 6 | **Rate limit por e-mail e por IP** | Impede inundar a caixa de uma pessoa e impede varredura em massa |
| 7 | **Sessões antigas são derrubadas** (`senhaAlteradaEm` + `iat` do JWT) | Se alguém invadiu a conta, redefinir a senha **expulsa o invasor na hora** — antes o token roubado continuaria válido por 7 dias |
| 8 | **Senha forte obrigatória** | Trocar por "123456" mantém a conta vulnerável |
| 9 | **E-mail de aviso após a troca** | A vítima de um acesso indevido percebe e reage |

**Bônus:** não há **login automático** depois de redefinir. Quem intercepta o
link precisaria também saber a nova senha para entrar.

---

## 🔑 Política de senha

Aplicada em **redefinição por e-mail**, **recuperação por token** e **troca de
senha no perfil** (`validarForcaSenha`, em `backend/src/utils/validators.ts`):

- mínimo de **8 caracteres**;
- pelo menos **uma letra** e **um número**;
- não pode ser uma senha da lista de mais usadas (`123456789`, `senha123`, ...);
- não pode conter o usuário do e-mail;
- não pode ser igual à senha atual.

> O **cadastro** continua aceitando 6 caracteres para não invalidar contas
> antigas. A regra forte entra sempre que a senha é **trocada**.

---

## ⏱️ Rate limiting

Contadores persistidos no MongoDB (`RateLimit`, com índice TTL) — memória de
processo não serve, porque no Vercel cada requisição pode cair numa instância
diferente.

| Ação | Limite | Janela |
|------|--------|--------|
| Pedir link de redefinição (por e-mail) | 3 | 1 hora |
| Pedir link de redefinição (por IP) | 10 | 1 hora |
| Validar link (por IP) | 30 | 1 hora |
| Confirmar redefinição (por IP) | 20 | 1 hora |
| Recuperação pelo token do cadastro (IP / e-mail) | 20 / 10 | 1 hora |
| **Login** (por conta / por IP) | 10 / 50 | 15 min |
| Verificar e-mail no checkout (por IP) | 30 | 10 min |
| Reenviar e-mail de compra (por pedido / IP) | 3 / 10 | 30 min |

Um login bem-sucedido **zera** o contador daquela conta.

Se o banco falhar, o limitador **libera** a requisição: uma falha de
infraestrutura não pode derrubar o login de todo mundo.

---

## 🔌 Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/auth/recovery-options` | Diz se a recuperação por e-mail está disponível (SMTP ativo) |
| POST | `/api/auth/forgot-password` | Solicita o link. Resposta **sempre genérica** |
| POST | `/api/auth/reset-password/validate` | Verifica se o link ainda vale (antes de exibir o formulário) |
| POST | `/api/auth/reset-password/confirm` | Redefine a senha com o token do link |
| POST | `/api/auth/reset-password` | *(legado)* Redefine com o token permanente do cadastro |

---

## 📂 Arquivos envolvidos

**Backend**
- `models/PasswordReset.ts` — pedidos de redefinição (token hasheado + TTL)
- `models/RateLimit.ts` — contadores de rate limiting (TTL)
- `services/rateLimitService.ts` — `consumirLimite` / `limparLimite`
- `services/emailService.ts` — e-mails de redefinição e de aviso de troca
- `controllers/authController.ts` — `forgotPassword`, `validateResetToken`, `confirmPasswordReset`
- `middleware/auth.ts` — recusa JWTs anteriores a `senhaAlteradaEm`
- `models/User.ts` — campo `senhaAlteradaEm`
- `utils/validators.ts` — `validarForcaSenha`

**Frontend**
- `pages/Login.tsx` — escolha do método + envio do link
- `pages/ResetPassword.tsx` — página `/redefinir-senha` (medidor de força incluído)
- `services/api.ts` — `forgotPassword`, `validateResetToken`, `confirmPasswordReset`

---

## 🧪 Como testar

1. **Configure o SMTP** no `.env` (sem ele o caminho por e-mail fica oculto).
2. Em `/login`, clique em **Esqueci minha senha → Receber link por e-mail**.
3. Confira: o e-mail chega com um link `…/redefinir-senha?token=…`.
4. Abra o link, defina uma senha forte e confirme.
5. Verifique as garantias:
   - abrir o **mesmo link de novo** → "já foi usado";
   - **outra aba logada** com a senha antiga → cai no login na próxima ação;
   - chega o e-mail **"sua senha foi alterada"**;
   - pedir **4 links em uma hora** para o mesmo e-mail → o 4º não envia (mas a
     resposta continua genérica).

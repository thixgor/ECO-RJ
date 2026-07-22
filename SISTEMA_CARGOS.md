# Sistema de Cargos (Roles) — ECO RJ

Este documento explica, de forma objetiva, como funcionam os cargos da plataforma
e por que existem. É a referência oficial sobre o assunto.

## Os 4 cargos

Existem **4 cargos**, em ordem crescente de acesso:

| Cargo | Para quem | O que pode fazer |
|-------|-----------|------------------|
| **Visitante** | Todo mundo que se cadastra (padrão) | Ver o catálogo de cursos e páginas públicas. **Não** assiste às aulas, não faz exercícios e não usa o fórum. |
| **Aluno** | O estudante que comprou/ativou um curso | Assistir às aulas dos cursos que possui, responder exercícios e provas, participar do fórum, baixar o app e solicitar certificados. |
| **Instrutor** | Professores (atribuído pelo admin) | Tudo o que um Aluno faz **+** criar/editar aulas e responder no fórum como instrutor. |
| **Administrador** | Equipe ECO RJ | Acesso total, incluindo o painel administrativo. |

> Observação de nomenclatura: internamente e no banco de dados o cargo do estudante
> se chama **"Aluno"**. É o mesmo que algumas pessoas chamam de "Estudante".

## Visitante × Aluno — a diferença que importa

A dúvida mais comum é a diferença entre **Visitante** e **Aluno**:

- **Visitante** é o estado inicial. A pessoa se cadastrou, mas ainda **não pagou/ativou**
  nenhum curso. Ela consegue navegar e ver o que a plataforma oferece, mas o conteúdo
  de aprendizado fica bloqueado.
- **Aluno** é o estado de quem **tem acesso ao conteúdo**. É o que "libera" a plataforma.

## Como um Visitante vira Aluno

Existem **duas formas — e as duas passam pelo mesmo mecanismo (serial key)**:

### 1. Comprando um curso (fluxo automático)
1. A pessoa compra um curso no checkout.
2. Quando o pagamento é aprovado, o sistema **gera automaticamente uma serial key**
   de cargo "Aluno", vinculada àquele curso (`fulfillOrder`).
3. Se o comprador **estava logado**, a chave é **aplicada automaticamente**: o cargo
   vira "Aluno", ele é inscrito no curso e recebe o acesso na hora.
4. Se a compra foi como **convidado** (sem login), a chave fica **pendente** e é enviada
   por e-mail com um link `/ativar?codigo=...`. Ele ativa depois de entrar/criar a conta.

### 2. Ativando uma chave manualmente
1. A pessoa recebe uma serial key — por e-mail (após a compra) ou entregue pelo admin.
2. Vai em **Perfil → Serial Key** ou na página **/ativar** e informa o código.
3. O sistema valida a chave e **promove o cargo** (`applySerialKey`).

**Resumo:** a *serial key* é o mecanismo único. Comprar um curso é apenas a maneira
automatizada de gerar e aplicar uma chave de Aluno.

## Regras importantes

- **Promoção, nunca rebaixamento.** Ao aplicar uma chave, o cargo só sobe. Uma chave de
  "Aluno" nunca rebaixa um Instrutor ou Administrador que porventura a ativar
  (função `maiorCargo`, em `config/roles.ts`).
- **Cada chave é usada uma única vez** e tem validade (em dias).
- **Chave vinculada a curso** também inscreve o usuário nesse curso automaticamente.
  Se o curso for de acesso restrito, o usuário entra na lista de autorizados.
- O acesso às aulas de um **curso restrito** exige estar autorizado naquele curso; em
  cursos **não restritos**, qualquer Aluno tem acesso.

## Fonte única de verdade (código)

Para evitar divergências, os cargos são definidos em um único lugar em cada camada:

- **Backend:** [`backend/src/config/roles.ts`](backend/src/config/roles.ts)
  — tipos, hierarquia (`CARGO_RANK`), descrições (`CARGO_DESCRICAO`),
  validação (`isCargoValido`) e promoção sem rebaixamento (`maiorCargo`).
- **Frontend:** [`frontend/src/config/roles.ts`](frontend/src/config/roles.ts)
  — rótulos, resumos, descrições, classes de badge (`ROLE_INFO`, `getRoleInfo`)
  e checagem de acesso (`hasAlunoAccess`).

Qualquer nova tela ou regra deve importar desses módulos em vez de repetir as listas
`['Visitante', 'Aluno', ...]` no meio do código.

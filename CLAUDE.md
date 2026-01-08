# PROMPT PARA CRIAÇÃO DE PLATAFORMA DE CURSOS - ECO RJ

## 🎯 OBJETIVO GERAL
Criar uma plataforma web de aprendizado (LMS) profissional para o **ECO RJ - Centro de Treinamento em Ecocardiografia**, onde médicos podem se atualizar em ecocardiografia com integração de conceitos clínicos e de imagem.

---

## 📋 INFORMAÇÕES INSTITUCIONAIS

### Dados da Empresa
- **Nome**: ECO RJ - Centro de Treinamento em Ecocardiografia
- **CNPJ**: 21.847.609/0001-70
- **Endereço**: Avenida das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ
- **E-mail**: contato@cursodeecocardiografia.com
- **Direitos**: CENTRO DE TREINAMENTO EM ECOCARDIOGRAFIA · CNPJ: 21.847.609/0001-70 TODOS OS DIREITOS RESERVADOS

### Instrutor Principal
- **Nome**: Prof. Ronaldo Campos Rodrigues
- **Titulação**: Mestre em Cardiologia
- **Foto**: [ESPAÇO PARA IMAGEM - Usar link do Imgur ou placeholder]

---

## 🎨 DESIGN & ESTÉTICA

### Paleta de Cores Primária
- **Cor Principal**: Azul Claro (#87CEEB, #ADD8E6 ou similar)
- **Cor Secundária**: Branco (#FFFFFF)
- **Cor de Acentos**: Tons de azul mais escuro para botões e destaques (#1E90FF)
- **Texto**: Cinza escuro (#333333)
- **Fundo**: Branco ou cinza bem claro (#F8F9FA)

### Tipografia
- **Headings (H1, H2, H3)**: Fontes modernas e limpas (Exemplo: Poppins, Montserrat, Inter)
- **Body Text**: Fontes legíveis (Exemplo: Roboto, Open Sans, Lato)
- **Tamanho mínimo**: 14px para corpo, 24px para títulos principais

### Animações
- **Hover em botões**: Transição suave (0.3s) com mudança de cor ou elevação
- **Carregamento de conteúdo**: Skeleton loading ou fade-in suave
- **Transições de página**: Fade-in/fade-out ou slide suave
- **Cards**: Efeito de elevação ao passar o mouse
- **Scroll**: Animações de entrada ao chegar na seção (opcional mas recomendado)

### Profissionalismo
- Espaçamento generoso (whitespace)
- Ícones consistentes (usar biblioteca como Font Awesome ou Feather Icons)
- Design responsivo (mobile, tablet, desktop)
- Sem excesso de elementos visuais

---

## 👤 SISTEMA DE AUTENTICAÇÃO

### Conta Administradora Pré-criada
```
E-mail: contato@cursodeecocardiografia.com
Senha: [Definida na instalação - exemplo: Admin@123]
Cargo: Administrador
Status: Ativo desde a criação do banco de dados
```

### Registro de Usuários
- **Qualquer pessoa pode se registrar** na plataforma
- Ao registrar, o usuário recebe o cargo padrão: **"Visitante"** (apenas leitura limitada)
- **Apenas usuários com cargo "Aluno" e "Administrador"** podem acessar aulas completas
- Email de confirmação enviado após registro

---

## 🏗️ ESTRUTURA DE CARGOS (ROLES)

### Cargos Pré-definidos (Editáveis pelo Admin)
1. **Visitante** - Acesso limitado (página inicial, informações públicas)
2. **Aluno** - Acesso total a aulas, exercícios e fórum (se tiver serial key válida)
3. **Instrutor** - Pode criar aulas (requer aprovação do admin)
4. **Administrador** - Acesso total ao sistema

### Sistema de Serial Keys
- **Criação**: Admin gera serial keys específicas para um cargo
- **Atribuição**: Usuário aplica a chave no seu perfil → recebe o cargo associado
- **Validações**:
  - Cada chave pode ser usada **apenas UMA VEZ**
  - Chave não pode ser transferida após uso
  - Chave expira após X dias (configurável)
- **Histórico**: Admin visualiza todas as serial keys geradas, datas e quem as usou

---

## 📚 SISTEMA DE CURSOS

### Estrutura
- **Cursos Múltiplos**: Plataforma suporta vários cursos simultaneamente
- **Cada curso tem**: Título, Descrição, Instrutor, Data de início, Imagem de capa
- **Inscrição**: Alunos se inscrevem em cursos (verificar se tem cargo de Aluno)

---

## 📖 SEÇÃO DE AULAS

### Funcionalidades para Administrador

#### Criar Nova Aula
- **Campo: Título** (ex: "Fundamentos da Ecocardiografia Transtorácica")
- **Campo: Descrição** (conteúdo introdutório da aula)
- **Campo: Tipo** 
  - Aula Ao Vivo
  - Aula Gravada
- **Campo: Embed de Vídeo** (integrar YouTube, Vimeo, etc.)
  - Exemplo: `<iframe src="https://www.youtube.com/embed/..."></iframe>`
- **Campo: Data/Hora de Início** (obrigatório se for ao vivo)
- **Campo: Duração** (em minutos)
- **Campo: Selecionar Cargos com Acesso**
  - Checkboxes: Visitante ☐ | Aluno ☑ | Instrutor ☐ | Administrador ☑
  - Exemplo: Aula "Avançado em Doppler" → apenas Alunos + Admin
- **Campo: Curso Associado** (dropdown com cursos disponíveis)
- **Botão: Salvar Aula**
- **Botão: Cancelar**

#### Visualizar Aulas Criadas
- Lista com:
  - Título
  - Tipo (Ao Vivo / Gravada)
  - Data de início (se ao vivo)
  - Cargos com acesso
  - Botões: Editar | Deletar | Visualizar
  - Status: Ativa | Inativa | Expirada (se ao vivo passou)

### Funcionalidades para Alunos
- Visualizar apenas aulas que seu cargo tem permissão
- Assistir vídeo integrado
- Notas de aula (opcional)
- Marcar como concluída

---

## 🧠 SEÇÃO DE EXERCÍCIOS

### Funcionalidades para Administrador
- Criar exercícios (múltipla escolha, verdadeiro/falso, dissertativo)
- Associar a uma aula
- Definir cargos que podem responder
- Visualizar respostas dos alunos

### Funcionalidades para Alunos
- Responder exercícios
- Ver nota após submeter
- Revisar respostas corretas
- Tentar novamente (se permitido)

---

## 💬 SEÇÃO DE FÓRUM

### Funcionalidades
- **Criar Tópico**: Alunos abrem discussões
- **Responder**: Alunos e instrutores respondem
- **Admin Moderar**: Deletar tópicos, responder como moderador
- **Filtros**: Por curso, por data, por autor
- **Notificações**: Quando respondido um tópico do usuário

---

## 👤 SEÇÃO DE PERFIL (Usuário)

### Informações Exibidas
- Nome completo
- Email
- Cargo atual
- Data de cadastro
- Cursos inscritos
- Progresso nas aulas (%)
- Histórico de serial keys usadas

### Funcionalidades
- **Editar Informações Pessoais**
  - Nome, foto de perfil, bio
- **Aplicar Serial Key**
  - Campo de entrada: `[____________________]`
  - Botão: Validar Chave
  - Feedback: "Chave inválida", "Chave já usada", "Cargo atualizado com sucesso!"
- **Alterar Senha**
- **Dados de Acesso**: Último login, IPs de acesso

---

## ⚙️ SEÇÃO ADMINISTRATIVA

### 1️⃣ GERENCIAMENTO DE USUÁRIOS

#### Tabela de Usuários
| Nome | Email | Cargo | Último Login | Ações |
|------|-------|-------|--------------|-------|
| João Silva | joao@email.com | Aluno | 2025-01-05 14:32 | [Editar Cargo] [Deletar] |
| Maria Santos | maria@email.com | Visitante | 2025-01-04 09:15 | [Editar Cargo] [Deletar] |
| Prof. Ronaldo | ronaldo@eco.com | Instrutor | 2025-01-06 10:00 | [Editar Cargo] [Deletar] |

**Funcionalidades:**
- Filtrar por cargo, status (ativo/inativo), data de cadastro
- Buscar por email ou nome
- Editar cargo em tempo real (dropdown)
- Deletar usuário (com confirmação)
- Visualizar detalhes do usuário

### 2️⃣ ESTATÍSTICAS

**Painéis de Dados:**
- **Total de Usuários**: 247 (em tempo real)
- **Usuários Ativos (últimos 30 dias)**: 89
- **Distribuição por Cargo**: 
  - Visitantes: 120
  - Alunos: 100
  - Instrutores: 5
  - Administradores: 1
- **Aulas Criadas**: 23
- **Exercícios Respondidos**: 456
- **Taxa de Conclusão**: 67%
- **Tópicos no Fórum**: 34

**Gráficos:**
- Gráfico de linha: Novos usuários por semana
- Gráfico de pizza: Distribuição de cargos
- Gráfico de barras: Aulas mais assistidas

### 3️⃣ SERIAL KEYS (Chaves de Ativação)

#### Criar Nova Serial Key
- **Campo: Quantidade de Chaves**: `[___]` (gerar 5, 10, 50 chaves de uma vez)
- **Campo: Cargo Atribuído**: Dropdown
  - Visitante
  - Aluno
  - Instrutor
  - [Cargos customizados]
- **Campo: Validade** (em dias): `[___]` (30, 60, 90, etc)
- **Campo: Descrição**: (ex: "Chaves Março 2025 - Turma A")
- **Botão: Gerar Chaves**

#### Tabela de Serial Keys
| Chave Gerada | Cargo | Data Criação | Data Validade | Status | Usada Por | Data Uso |
|--------------|-------|--------------|---------------|--------|-----------|----------|
| ECO-2025-A7K9 | Aluno | 2025-01-01 | 2025-03-31 | ✅ Usada | joao@email.com | 2025-01-05 |
| ECO-2025-B2X5 | Aluno | 2025-01-01 | 2025-03-31 | ⏳ Pendente | - | - |
| ECO-2025-C8M3 | Instrutor | 2025-01-03 | 2025-04-30 | ✅ Usada | prof@eco.com | 2025-01-03 |

**Funcionalidades:**
- Copiar chave para clipboard
- Deletar chave não utilizada
- Renovar validade de chave
- Exportar lista de chaves (CSV)
- Filtrar por status (usada, pendente, expirada)

### 4️⃣ GERENCIAMENTO DE CARGOS

#### Tabela de Cargos
| Cargo | Descrição | Permissões | Ações |
|-------|-----------|------------|-------|
| Administrador | Acesso total | Todas | [Editar] [Deletar] |
| Aluno | Acesso a aulas | Ver aulas, responder exercícios, usar fórum | [Editar] [Deletar] |
| Instrutor | Criar conteúdo | Criar aulas, responder fórum | [Editar] [Deletar] |
| Visitante | Acesso limitado | Ver informações públicas | [Editar] [Deletar] |

#### Criar Novo Cargo
- **Campo: Nome do Cargo**: `[____________________]`
- **Campo: Descrição**: `[____________________________________]`
- **Checkboxes de Permissões**:
  - ☐ Visualizar Aulas
  - ☐ Criar Aulas
  - ☐ Editar Aulas
  - ☐ Deletar Aulas
  - ☐ Responder Exercícios
  - ☐ Criar Exercícios
  - ☐ Usar Fórum
  - ☐ Moderar Fórum
  - ☐ Acessar Admin
- **Botão: Salvar Cargo**

**Funcionalidades:**
- Editar nome, descrição e permissões
- Deletar cargo (se nenhum usuário possui)
- Duplicar cargo para criar variação
- Ver quantos usuários têm esse cargo

---

## 🔒 PÁGINAS LEGAIS

### Termos de Serviço
**Localização**: `/termos`

**Conteúdo Sugerido:**
- Aceitação dos termos
- Descrição do serviço
- Direitos e responsabilidades do usuário
- Proibições (cópia não autorizada de conteúdo, etc)
- Cancelamento de conta
- Limitação de responsabilidade
- Alterações nos termos
- Lei aplicável (Lei Brasileira)

**Exemplo de estrutura:**
```
1. ACEITAÇÃO DOS TERMOS
   1.1 Ao acessar e usar esta plataforma...
   
2. DESCRIÇÃO DO SERVIÇO
   2.1 ECO RJ oferece cursos de ecocardiografia...
   
3. DIREITOS INTELECTUAIS
   3.1 Todo conteúdo é protegido por lei de direitos autorais...
   
4. CÓDIGO DE CONDUTA
   4.1 Usuários concordam em não...
   
[... mais seções]
```

### Política de Privacidade
**Localização**: `/privacidade`

**Conteúdo Sugerido:**
- Coleta de dados (que informações coletamos)
- Uso de dados (como usamos as informações)
- Compartilhamento de dados (compartilhamos com terceiros?)
- Segurança (como protegemos dados)
- Cookies
- Direitos do usuário (LGPD - Lei Geral de Proteção de Dados)
- Contato para privacidade
- Histórico de alterações

---

## 🎨 DASHBOARD (Página Inicial - Após Login)

### Layout Principal
```
┌─────────────────────────────────────────┐
│  LOGO ECO RJ  |  Bem-vindo, João Silva  │
├─────────────────────────────────────────┤
│ [Menu Lateral]     │   [Conteúdo Principal]
│                    │
│ • Aulas            │  ┌──────────────────┐
│ • Exercícios       │  │  SEUS CURSOS     │
│ • Fórum            │  ├──────────────────┤
│ • Perfil           │  │ 📚 Ecocardiografia│
│ • [Admin Panel]    │  │    Básica        │
│ • Sair             │  │    Progresso: 45%│
│                    │  │                  │
│                    │  │ 📚 Doppler       │
│                    │  │    Avançado      │
│                    │  │    Progresso: 12%│
│                    │  └──────────────────┘
│                    │
│                    │  ┌──────────────────┐
│                    │  │ PRÓXIMAS AULAS   │
│                    │  ├──────────────────┤
│                    │  │ • Segunda 14h: Eco
│                    │  │ • Quarta 10h: Exer
│                    │  └──────────────────┘
│                    │
│                    │  ┌──────────────────┐
│                    │  │ ESTATÍSTICAS     │
│                    │  ├──────────────────┤
│                    │  │ Aulas: 8/23      │
│                    │  │ Exerc.: 12/30    │
│                    │  │ Tóp. Fór.: 2     │
│                    │  └──────────────────┘
└─────────────────────────────────────────┘
```

**Elementos:**
- **Saudação Personalizada**: "Bem-vindo de volta, [Nome]"
- **Cards de Cursos**: Mostrar cursos inscritos com progresso em barra
- **Aulas Recomendadas**: "Continuar de onde parou"
- **Atividades Recentes**: Últimas aulas assistidas, exercícios respondidos
- **Notificações**: Novas respostas no fórum, próximas aulas ao vivo
- **Botões de Ação Rápida**: "Assistir Aula", "Responder Exercício", "Acessar Fórum"

---

## 🎯 FLUXO DE USUÁRIO - EXEMPLO PRÁTICO

### Cenário 1: Novo Usuário
1. Acessa `www.cursodeecocardiografia.com`
2. Clica em "Registrar"
3. Preenche: Email, Senha, Nome, Profissão
4. Recebe email de confirmação
5. Login com email e senha
6. **Cargo padrão**: Visitante
7. Vê página inicial com informações sobre cursos
8. **Compra uma serial key** (ou recebe de admin)
9. Vai em Perfil → "Aplicar Serial Key"
10. Insere chave: `ECO-2025-A7K9`
11. Sistema valida → Cargo atualizado para "Aluno"
12. Agora pode acessar todas as aulas, exercícios e fórum
13. Vai em "Aulas" e começa a assistir

### Cenário 2: Administrador Criando Conteúdo
1. Login com `contato@cursodeecocardiografia.com`
2. Clica em "Admin Panel"
3. Acessa "Aulas"
4. Clica em "Nova Aula"
5. Preenche:
   - Título: "Bases Anatômicas do Coração"
   - Tipo: Aula Gravada
   - Embed: Cola link do YouTube
   - Cargos: Aluno + Administrador
   - Curso: Ecocardiografia Básica
6. Salva aula
7. Aula aparece no dashboard dos alunos inscritos nesse curso

### Cenário 3: Admin Gerando Serial Keys
1. Acessa "Admin Panel" → "Serial Keys"
2. Clica "Gerar Novas Chaves"
3. Quantidade: 10
4. Cargo: Aluno
5. Validade: 90 dias
6. Descrição: "Turma Março 2025"
7. Gera chaves
8. Exporta em CSV ou copia uma por uma
9. Distribui para clientes via email
10. Clientes usam as chaves nos respectivos perfis

---

## 🛠️ REQUISITOS TÉCNICOS

### Frontend
- Framework: React, Vue ou similar
- Responsivo (Mobile First)
- Componentes reutilizáveis

### Backend
- Banco de dados relacional (PostgreSQL, MySQL)
- API REST ou GraphQL
- Autenticação JWT
- Validação de dados

### Segurança
- Senhas hasheadas (bcrypt)
- HTTPS obrigatório
- Proteção contra SQL Injection
- CORS configurado

### Hospedagem
- Suportar múltiplas aulas simultâneas
- Streaming de vídeo otimizado
- Backup automático

---

## ✨ DETALHES DE PROFISSIONALISMO

1. **Consistência Visual**: Mesma paleta de cores em toda plataforma
2. **Feedback Visual**: Botões mudam cor ao clicar, loading spinners, toasts de sucesso/erro
3. **Acessibilidade**: Contraste adequado, texto alt em imagens
4. **Performance**: Carregamento rápido, otimização de imagens
5. **Documentação**: Ajuda in-app, tutoriais para novos usuários
6. **Suporte**: Formulário de contato, FAQ

---

## 📄 RODAPÉ (Footer) EM TODAS AS PÁGINAS

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  © 2025 ECO RJ - Centro de Treinamento em     │
│  Ecocardiografia · CNPJ: 21.847.609/0001-70   │
│  TODOS OS DIREITOS RESERVADOS                  │
│                                                 │
│  Avenida das Américas 19.019 - Recreio Shopping│
│  Sala 336 - Recreio dos Bandeirantes - RJ     │
│                                                 │
│  contato@cursodeecocardiografia.com            │
│                                                 │
│  [Termos de Serviço] [Política de Privacidade] │
│  [Facebook] [LinkedIn] [Instagram]             │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🚀 PRÓXIMOS PASSOS APÓS DESENVOLVIMENTO

1. Testar com usuários reais (médicos)
2. Coletar feedback
3. Iterar design e funcionalidades
4. Implementar sistema de pagamento (se necessário)
5. Criar certificados de conclusão
6. Monitorar performance e segurança

---

**FIM DO PROMPT**

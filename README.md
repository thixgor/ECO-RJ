# ECO RJ - Centro de Treinamento em Ecocardiografia

Plataforma de cursos online para médicos especializados em ecocardiografia.

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB

## Pré-requisitos

- Node.js 18+
- MongoDB instalado e rodando localmente (porta 27017)

## Instalação

### 1. Clone o repositório e instale as dependências

```bash
cd "ECO RJ"
npm run install:all
```

### 2. Configure o MongoDB

Certifique-se que o MongoDB está rodando em `mongodb://localhost:27017`

### 3. Inicialize o banco de dados

```bash
cd backend
npm run seed
```

Isso criará:
- Cargos padrão (Visitante, Aluno, Instrutor, Administrador)
- Conta administradora:
  - **Email**: contato@cursodeecocardiografia.com
  - **Senha**: Admin@123

### 4. Inicie o servidor de desenvolvimento

```bash
# Na pasta raiz do projeto
npm run dev
```

Isso iniciará:
- Backend em http://localhost:5000
- Frontend em http://localhost:3000

## Estrutura do Projeto

```
ECO RJ/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuração do banco
│   │   ├── controllers/   # Controladores da API
│   │   ├── middleware/    # Middlewares (auth, etc)
│   │   ├── models/        # Modelos MongoDB
│   │   ├── routes/        # Rotas da API
│   │   ├── utils/         # Utilitários
│   │   └── server.ts      # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Contextos (Auth)
│   │   ├── pages/         # Páginas
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Entry point
│   └── package.json
└── package.json
```

## Funcionalidades

### Usuários
- Registro com validação de CPF, CRM e Email únicos
- Login com JWT
- Perfil editável
- Sistema de cargos (Visitante, Aluno, Instrutor, Administrador)
- Aplicação de Serial Keys para upgrade de cargo

### Cursos
- Listagem de cursos disponíveis
- Inscrição em cursos
- Acompanhamento de progresso

### Aulas
- Aulas gravadas e ao vivo
- Embed de vídeos (YouTube, Vimeo)
- Controle de acesso por cargo
- Marcação de aulas assistidas

### Exercícios
- Múltipla escolha
- Verdadeiro/Falso
- Dissertativo
- Sistema de tentativas

### Fórum
- Criação de tópicos
- Respostas
- Moderação (admin)

### Painel Administrativo
- Dashboard com estatísticas
- Gerenciamento de usuários
- Gerenciamento de cursos e aulas
- Geração de Serial Keys
- Exportação de dados (CSV)

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Perfil do usuário logado
- `PUT /api/auth/profile` - Atualizar perfil
- `PUT /api/auth/password` - Alterar senha

### Usuários (Admin)
- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Detalhes do usuário
- `PUT /api/users/:id/cargo` - Alterar cargo
- `DELETE /api/users/:id` - Deletar usuário
- `POST /api/users/apply-key` - Aplicar Serial Key

### Cursos
- `GET /api/courses` - Listar cursos
- `GET /api/courses/:id` - Detalhes do curso
- `POST /api/courses` - Criar curso (Admin)
- `PUT /api/courses/:id` - Atualizar curso (Admin)
- `DELETE /api/courses/:id` - Deletar curso (Admin)
- `POST /api/courses/:id/enroll` - Inscrever-se
- `GET /api/courses/:id/progress` - Progresso

### Aulas
- `GET /api/lessons/course/:courseId` - Aulas do curso
- `GET /api/lessons/:id` - Detalhes da aula
- `POST /api/lessons` - Criar aula (Admin)
- `POST /api/lessons/:id/watched` - Marcar como assistida

### Serial Keys (Admin)
- `GET /api/serial-keys` - Listar chaves
- `POST /api/serial-keys/generate` - Gerar chaves
- `GET /api/serial-keys/export` - Exportar CSV

### Fórum
- `GET /api/forum` - Listar tópicos
- `GET /api/forum/:id` - Detalhes do tópico
- `POST /api/forum` - Criar tópico
- `POST /api/forum/:id/reply` - Responder

### Estatísticas (Admin)
- `GET /api/stats` - Estatísticas gerais

## Informações da Empresa

- **Nome**: ECO RJ - Centro de Treinamento em Ecocardiografia
- **CNPJ**: 21.847.609/0001-70
- **Endereço**: Avenida das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ
- **Email**: contato@cursodeecocardiografia.com

## Licença

Todos os direitos reservados - ECO RJ - Centro de Treinamento em Ecocardiografia

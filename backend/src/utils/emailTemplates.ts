/**
 * Definições padrão de templates de e-mail do ECO RJ.
 *
 * Os e-mails usam HTML compatível com clientes de e-mail (layout baseado em
 * tabelas + estilos inline). O corpo suporta variáveis no formato {{variavel}}
 * que são substituídas em runtime (ver emailService.renderTemplate).
 */

// Dados institucionais (usados no cabeçalho/rodapé de todos os e-mails)
export const EMAIL_BRAND = {
  nome: 'ECO RJ - Centro de Treinamento em Ecocardiografia',
  nomeCurto: 'ECO RJ',
  cnpj: '21.847.609/0001-70',
  endereco: 'Avenida das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ',
  email: 'contato@cursodeecocardiografia.com',
  site: 'https://www.cursodeecocardiografia.com',
  logo: 'https://i.imgur.com/B1SnAtD.png', // Logo claro (fundo claro do e-mail)
  corPrimaria: '#1E90FF',
  corPrimariaEscura: '#1567b8',
  corClara: '#EAF4FD',
  corTexto: '#333333',
  corTextoSuave: '#6b7280',
  corFundo: '#f4f7fa'
};

/**
 * Envolve o conteúdo interno no layout padrão de e-mail (cabeçalho com logo,
 * corpo em card branco e rodapé institucional). Recebe HTML já renderizado.
 */
export function renderBaseLayout(innerHtml: string, opts?: { preheader?: string }): string {
  const b = EMAIL_BRAND;
  const preheader = opts?.preheader || '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${b.nomeCurto}</title>
</head>
<body style="margin:0; padding:0; background-color:${b.corFundo}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${b.corFundo}; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:8px 0 24px 0;">
              <img src="${b.logo}" alt="${b.nomeCurto}" width="150" style="display:block; max-width:150px; height:auto;">
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff; border-radius:16px; box-shadow:0 4px 24px rgba(30,144,255,0.08); overflow:hidden;">
              <!-- Faixa superior -->
              <div style="height:6px; background:linear-gradient(90deg, ${b.corPrimaria}, #87CEEB);"></div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 40px; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:${b.corTexto}; font-size:16px; line-height:1.6;">
                    ${innerHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:28px 24px; text-align:center; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:${b.corTextoSuave}; font-size:12px; line-height:1.7;">
              <p style="margin:0 0 6px 0; font-weight:600; color:${b.corTexto};">${b.nome}</p>
              <p style="margin:0 0 6px 0;">CNPJ: ${b.cnpj} · TODOS OS DIREITOS RESERVADOS</p>
              <p style="margin:0 0 6px 0;">${b.endereco}</p>
              <p style="margin:0 0 12px 0;">
                <a href="mailto:${b.email}" style="color:${b.corPrimaria}; text-decoration:none;">${b.email}</a>
              </p>
              <p style="margin:0; color:#9aa4b2; font-size:11px;">
                Você recebeu este e-mail porque possui uma conta na plataforma ${b.nomeCurto}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Botão de call-to-action reutilizável para os corpos de e-mail. */
export function ctaButton(texto: string, url: string): string {
  const b = EMAIL_BRAND;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td align="center" style="border-radius:10px; background:${b.corPrimaria};">
        <a href="${url}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">${texto}</a>
      </td>
    </tr>
  </table>`;
}

export interface DefaultTemplateDef {
  key: string;
  nome: string;
  descricao: string;
  categoria: 'sistema' | 'manual';
  sistema: boolean;
  assunto: string;
  variaveis: string[];
  // corpoHtml aqui é apenas o CONTEÚDO interno; o layout é aplicado no envio.
  corpoHtml: string;
}

const b = EMAIL_BRAND;

/**
 * Templates padrão criados no seed / primeira inicialização.
 * O corpoHtml contém apenas o conteúdo do miolo (o layout com cabeçalho/rodapé
 * é aplicado automaticamente no momento do envio).
 */
export const DEFAULT_TEMPLATES: DefaultTemplateDef[] = [
  // ===================== SISTEMA (automáticos) =====================
  {
    key: 'boas_vindas',
    nome: 'Boas-vindas (cadastro)',
    descricao: 'Enviado automaticamente logo após o usuário se cadastrar na plataforma.',
    categoria: 'sistema',
    sistema: true,
    assunto: 'Bem-vindo(a) ao ECO RJ, {{nome}}!',
    variaveis: ['nome', 'email', 'cargo', 'linkPlataforma'],
    corpoHtml: `<h1 style="margin:0 0 16px 0; font-size:24px; color:${b.corPrimariaEscura};">Seja bem-vindo(a), {{nome}}! 👋</h1>
<p style="margin:0 0 16px 0;">É um prazer ter você no <strong>${b.nome}</strong>. Sua conta foi criada com sucesso e você já pode acessar a plataforma.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.corClara}; border-radius:12px; margin:8px 0 8px 0;">
  <tr><td style="padding:18px 22px;">
    <p style="margin:0 0 6px 0; font-size:14px;"><strong>E-mail:</strong> {{email}}</p>
    <p style="margin:0; font-size:14px;"><strong>Perfil atual:</strong> {{cargo}}</p>
  </td></tr>
</table>
<p style="margin:16px 0 0 0;">Para acessar todas as aulas e conteúdos exclusivos, aplique sua <strong>chave de acesso (serial key)</strong> na seção "Meu Perfil". Caso ainda não tenha uma, entre em contato conosco.</p>
${ctaButton('Acessar a plataforma', '{{linkPlataforma}}')}
<p style="margin:8px 0 0 0; color:${b.corTextoSuave}; font-size:14px;">Bons estudos! 🫀<br>Equipe ${b.nomeCurto}</p>`
  },
  {
    key: 'compra_curso',
    nome: 'Confirmação de compra (comprovante)',
    descricao: 'Enviado automaticamente após a confirmação da compra de um curso. Inclui o comprovante de pagamento e os dados do curso. (Placeholder — integração Mercado Pago pendente.)',
    categoria: 'sistema',
    sistema: true,
    assunto: 'Compra confirmada: {{curso}} 🎉',
    variaveis: [
      'nome', 'curso', 'descricaoCurso', 'dataInicio', 'dataTermino', 'duracao',
      'valor', 'metodoPagamento', 'idTransacao', 'dataPagamento', 'linkCurso'
    ],
    corpoHtml: `<h1 style="margin:0 0 16px 0; font-size:24px; color:${b.corPrimariaEscura};">Pagamento confirmado! 🎉</h1>
<p style="margin:0 0 16px 0;">Olá {{nome}}, sua inscrição no curso abaixo foi confirmada. Guarde este e-mail como comprovante.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5eaf0; border-radius:12px; margin:8px 0 20px 0;">
  <tr><td style="padding:20px 22px;">
    <p style="margin:0 0 4px 0; font-size:13px; color:${b.corTextoSuave}; text-transform:uppercase; letter-spacing:0.5px;">Curso</p>
    <p style="margin:0 0 14px 0; font-size:18px; font-weight:700; color:${b.corTexto};">{{curso}}</p>
    <p style="margin:0 0 16px 0; font-size:14px; color:${b.corTextoSuave};">{{descricaoCurso}}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr>
        <td style="padding:6px 0; color:${b.corTextoSuave};">Data de início</td>
        <td style="padding:6px 0; text-align:right; font-weight:600;">{{dataInicio}}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:${b.corTextoSuave};">Data de término</td>
        <td style="padding:6px 0; text-align:right; font-weight:600;">{{dataTermino}}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:${b.corTextoSuave};">Duração</td>
        <td style="padding:6px 0; text-align:right; font-weight:600;">{{duracao}}</td>
      </tr>
    </table>
  </td></tr>
</table>

<p style="margin:0 0 8px 0; font-size:13px; color:${b.corTextoSuave}; text-transform:uppercase; letter-spacing:0.5px;">Comprovante de pagamento</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.corClara}; border-radius:12px; margin:0 0 20px 0;">
  <tr><td style="padding:18px 22px; font-size:14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:5px 0; color:${b.corTextoSuave};">Valor pago</td>
        <td style="padding:5px 0; text-align:right; font-weight:700; color:${b.corPrimariaEscura};">{{valor}}</td>
      </tr>
      <tr>
        <td style="padding:5px 0; color:${b.corTextoSuave};">Método</td>
        <td style="padding:5px 0; text-align:right; font-weight:600;">{{metodoPagamento}}</td>
      </tr>
      <tr>
        <td style="padding:5px 0; color:${b.corTextoSuave};">ID da transação</td>
        <td style="padding:5px 0; text-align:right; font-weight:600;">{{idTransacao}}</td>
      </tr>
      <tr>
        <td style="padding:5px 0; color:${b.corTextoSuave};">Data do pagamento</td>
        <td style="padding:5px 0; text-align:right; font-weight:600;">{{dataPagamento}}</td>
      </tr>
    </table>
  </td></tr>
</table>

${ctaButton('Acessar o curso', '{{linkCurso}}')}
<p style="margin:8px 0 0 0; color:${b.corTextoSuave}; font-size:14px;">Qualquer dúvida, responda este e-mail ou fale com <a href="mailto:${b.email}" style="color:${b.corPrimaria};">${b.email}</a>.<br>Equipe ${b.nomeCurto}</p>`
  },
  {
    key: 'termino_curso',
    nome: 'Término de curso',
    descricao: 'Enviado automaticamente quando a data de término de um curso do aluno é atingida (apenas para cursos com data de término definida).',
    categoria: 'sistema',
    sistema: true,
    assunto: 'O curso {{curso}} chegou ao fim 🎓',
    variaveis: ['nome', 'curso', 'dataInicio', 'dataTermino', 'linkCertificado', 'linkPlataforma'],
    corpoHtml: `<h1 style="margin:0 0 16px 0; font-size:24px; color:${b.corPrimariaEscura};">Parabéns por concluir esta jornada, {{nome}}! 🎓</h1>
<p style="margin:0 0 16px 0;">O curso <strong>{{curso}}</strong> chegou à sua data de término ({{dataTermino}}). Esperamos que a experiência tenha enriquecido sua prática em ecocardiografia.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.corClara}; border-radius:12px; margin:8px 0 16px 0;">
  <tr><td style="padding:18px 22px; font-size:14px;">
    <p style="margin:0 0 6px 0;"><strong>Início:</strong> {{dataInicio}}</p>
    <p style="margin:0;"><strong>Término:</strong> {{dataTermino}}</p>
  </td></tr>
</table>
<p style="margin:0 0 8px 0;">Se você concluiu as atividades, seu certificado pode já estar disponível na plataforma.</p>
${ctaButton('Ver meus certificados', '{{linkCertificado}}')}
<p style="margin:8px 0 0 0; color:${b.corTextoSuave}; font-size:14px;">Continue evoluindo conosco. 🫀<br>Equipe ${b.nomeCurto}</p>`
  },

  // ===================== MANUAL (envio em massa) =====================
  {
    key: 'comunicado',
    nome: 'Comunicado geral',
    descricao: 'Template flexível para comunicados e avisos enviados manualmente pelo painel.',
    categoria: 'manual',
    sistema: false,
    assunto: '{{titulo}}',
    variaveis: ['nome', 'titulo', 'mensagem', 'linkPlataforma'],
    corpoHtml: `<h1 style="margin:0 0 16px 0; font-size:23px; color:${b.corPrimariaEscura};">{{titulo}}</h1>
<p style="margin:0 0 16px 0;">Olá {{nome}},</p>
<div style="margin:0 0 16px 0;">{{mensagem}}</div>
${ctaButton('Acessar a plataforma', '{{linkPlataforma}}')}
<p style="margin:8px 0 0 0; color:${b.corTextoSuave}; font-size:14px;">Equipe ${b.nomeCurto}</p>`
  },
  {
    key: 'nova_aula',
    nome: 'Nova aula disponível',
    descricao: 'Avisa os alunos que uma nova aula/conteúdo foi publicado em um curso.',
    categoria: 'manual',
    sistema: false,
    assunto: 'Nova aula disponível: {{tituloAula}} 🎥',
    variaveis: ['nome', 'tituloAula', 'curso', 'mensagem', 'linkAula'],
    corpoHtml: `<h1 style="margin:0 0 16px 0; font-size:23px; color:${b.corPrimariaEscura};">Novidade no seu curso! 🎥</h1>
<p style="margin:0 0 16px 0;">Olá {{nome}}, uma nova aula foi adicionada ao curso <strong>{{curso}}</strong>:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.corClara}; border-radius:12px; margin:8px 0 16px 0;">
  <tr><td style="padding:18px 22px;">
    <p style="margin:0; font-size:17px; font-weight:700; color:${b.corTexto};">{{tituloAula}}</p>
  </td></tr>
</table>
<div style="margin:0 0 8px 0;">{{mensagem}}</div>
${ctaButton('Assistir agora', '{{linkAula}}')}
<p style="margin:8px 0 0 0; color:${b.corTextoSuave}; font-size:14px;">Bons estudos!<br>Equipe ${b.nomeCurto}</p>`
  },
  {
    key: 'promocao',
    nome: 'Promoção / Oferta',
    descricao: 'Template para divulgar promoções, novos cursos ou ofertas especiais.',
    categoria: 'manual',
    sistema: false,
    assunto: '{{titulo}}',
    variaveis: ['nome', 'titulo', 'mensagem', 'textoBotao', 'linkOferta'],
    corpoHtml: `<h1 style="margin:0 0 16px 0; font-size:24px; color:${b.corPrimariaEscura};">{{titulo}}</h1>
<p style="margin:0 0 16px 0;">Olá {{nome}},</p>
<div style="margin:0 0 16px 0;">{{mensagem}}</div>
${ctaButton('{{textoBotao}}', '{{linkOferta}}')}
<p style="margin:8px 0 0 0; color:${b.corTextoSuave}; font-size:14px;">Equipe ${b.nomeCurto}</p>`
  },
  {
    key: 'personalizado',
    nome: 'Personalizado (em branco)',
    descricao: 'Escreva livremente o assunto e a mensagem. Ideal para comunicações pontuais.',
    categoria: 'manual',
    sistema: false,
    assunto: '{{titulo}}',
    variaveis: ['nome', 'titulo', 'mensagem'],
    corpoHtml: `<p style="margin:0 0 16px 0;">Olá {{nome}},</p>
<div style="margin:0 0 8px 0;">{{mensagem}}</div>
<p style="margin:20px 0 0 0; color:${b.corTextoSuave}; font-size:14px;">Equipe ${b.nomeCurto}</p>`
  }
];

/**
 * Termos de download de material protegido por direitos autorais.
 *
 * Exibidos ao usuário ANTES de qualquer download de PDF/arquivo. O aceite é
 * registrado no entitlement (versão, data e IP) como evidência, e cada cópia
 * baixada leva marca d'água com nome, CPF e e-mail do titular.
 *
 * Ao alterar o texto, incremente a VERSÃO — assim o aceite antigo não é
 * confundido com o novo.
 */

export const DOWNLOAD_TERMS_VERSION = '1.0';

export const DOWNLOAD_TERMS_TITLE = 'Termo de Licença de Uso e Direitos Autorais';

export const DOWNLOAD_TERMS_SECTIONS: Array<{ titulo: string; texto: string }> = [
  {
    titulo: '1. Titularidade',
    texto:
      'Todo o conteúdo deste arquivo é de propriedade do CENTRO DE TREINAMENTO EM ECOCARDIOGRAFIA ' +
      '(ECO RJ), CNPJ 21.847.609/0001-70, e é protegido pela Lei nº 9.610/1998 (Lei de Direitos ' +
      'Autorais) e pela Lei nº 9.279/1996. O download não transfere a titularidade da obra.'
  },
  {
    titulo: '2. Licença concedida',
    texto:
      'É concedida ao titular do acesso uma licença pessoal, individual, intransferível, não exclusiva ' +
      'e revogável, limitada ao uso próprio para fins de estudo. A licença não autoriza uso comercial, ' +
      'institucional, didático em terceiros ou qualquer forma de exploração econômica do material.'
  },
  {
    titulo: '3. Condutas vedadas',
    texto:
      'É expressamente proibido reproduzir, copiar, imprimir para distribuição, compartilhar, ceder, ' +
      'emprestar, revender, publicar em redes sociais, repositórios, grupos de mensagens ou sites de ' +
      'compartilhamento, bem como criar obras derivadas, traduzir, editar ou remover marcas d\'água, ' +
      'assinaturas e metadados de identificação.'
  },
  {
    titulo: '4. Identificação da cópia (marca d\'água)',
    texto:
      'Esta cópia é personalizada e rastreável: o arquivo contém marca d\'água visível e metadados com ' +
      'o nome completo, o CPF e o e-mail do titular do acesso. Qualquer cópia encontrada em circulação ' +
      'indevida permite a identificação inequívoca da origem do vazamento.'
  },
  {
    titulo: '5. Responsabilidade',
    texto:
      'O titular declara-se ciente de que a violação deste termo caracteriza infração de direitos ' +
      'autorais, sujeitando-o à revogação imediata do acesso, sem reembolso, e às sanções civis e ' +
      'penais cabíveis, incluindo perdas e danos, lucros cessantes e as penas do art. 184 do Código Penal.'
  },
  {
    titulo: '6. Proteção de dados (LGPD)',
    texto:
      'Ao aceitar, o titular autoriza a inserção de seus dados de identificação no arquivo e o registro ' +
      'da data, hora e endereço IP deste aceite, com a finalidade legítima de proteção de direitos ' +
      'autorais, nos termos do art. 7º, IX, e do art. 10 da Lei nº 13.709/2018 (LGPD).'
  }
];

/** Frase final do checkbox de aceite. */
export const DOWNLOAD_TERMS_CONFIRMATION =
  'Declaro que li e aceito o Termo de Licença de Uso, que este material é para meu uso pessoal e ' +
  'exclusivo, e que estou ciente de que a cópia baixada é identificada com meus dados pessoais.';

import SystemSettings from '../models/SystemSettings';

export interface PaymentMethodsConfig {
  pix: boolean;
  cartaoCredito: boolean;
  cartaoDebito: boolean;
  boleto: boolean;
}

export interface PaymentConfig {
  taxaOperacionalPercentual: number; // padrão 1 (%)
  metodos: PaymentMethodsConfig;
  parcelasMaximas: number; // máximo de parcelas no cartão
  termosVersao: string;
  termosCompra: string; // texto completo dos termos de compra
  vendasAtivas: boolean; // interruptor geral de vendas
}

const TERMOS_PADRAO = `TERMOS E CONDIÇÕES DE COMPRA — ECO RJ · CENTRO DE TREINAMENTO EM ECOCARDIOGRAFIA
CNPJ: 21.847.609/0001-70

Ao finalizar a compra você declara ter lido, compreendido e aceito integralmente
os termos abaixo, que regem a aquisição de cursos, materiais e serviços digitais
oferecidos pela plataforma ECO RJ ("Plataforma").

1. OBJETO E NATUREZA DIGITAL DO PRODUTO
1.1. O produto adquirido consiste em acesso a conteúdo educacional digital
(aulas gravadas e/ou ao vivo, exercícios, materiais complementares), de natureza
estritamente pessoal, intransferível e para uso individual do comprador.
1.2. Por se tratar de produto digital de fruição imediata, disponibilizado
instantaneamente após a confirmação do pagamento, o comprador reconhece e concorda
que o acesso ao conteúdo caracteriza o início da execução do serviço.

2. LICENÇA DE USO, PROPRIEDADE INTELECTUAL E PROIBIÇÕES
2.1. A compra concede uma licença de uso pessoal, limitada, revogável, não exclusiva
e intransferível, exclusivamente para fins educacionais próprios do comprador.
2.2. Todo o conteúdo é protegido pela legislação de direitos autorais (Lei nº 9.610/98)
e permanece de titularidade exclusiva do ECO RJ e/ou de seus licenciadores.
2.3. É EXPRESSAMENTE PROIBIDO, sob pena de responsabilização civil e criminal:
gravar, capturar, reproduzir, distribuir, compartilhar credenciais de acesso, revender,
sublicenciar, exibir publicamente, ou de qualquer forma disponibilizar o conteúdo a
terceiros. O compartilhamento de conta acarreta o bloqueio imediato do acesso, sem direito
a reembolso, e sujeita o infrator ao pagamento de multa não compensatória equivalente a
20 (vinte) vezes o valor pago, sem prejuízo das perdas e danos apuráveis.
2.4. A serial key (chave de ativação) é de uso único e pessoal. Qualquer tentativa de
fraude, uso de chave de terceiros, chargeback indevido ou burla ao sistema de pagamento
resultará no cancelamento imediato e definitivo do acesso, sem reembolso.

3. PREÇO, TAXA OPERACIONAL E PAGAMENTO
3.1. O valor total exibido no checkout inclui o preço do curso acrescido de uma taxa
operacional destinada a cobrir custos de processamento e operação da Plataforma.
3.2. O pagamento é processado por intermédio do provedor Mercado Pago, não tendo o ECO RJ
acesso aos dados sensíveis do cartão do comprador.
3.3. Cupons, lotes promocionais e descontos são concedidos por mera liberalidade do ECO RJ,
podendo ser alterados, suspensos ou cancelados a qualquer tempo, sem aviso prévio.

4. POLÍTICA DE REEMBOLSO E ARREPENDIMENTO
4.1. O comprador declara ciência de que, autorizando o acesso imediato ao conteúdo digital,
concorda expressamente com a execução imediata do serviço.
4.2. Eventuais solicitações de reembolso serão analisadas isoladamente e a exclusivo
critério do ECO RJ, podendo ser integralmente indeferidas quando houver consumo do conteúdo,
indício de compartilhamento, fraude ou violação destes termos.
4.3. Chargebacks ou disputas de pagamento efetuados sem prévio contato e tentativa de solução
amigável serão considerados de má-fé, autorizando o ECO RJ a adotar as medidas cabíveis.

5. ACESSO, VALIDADE E DISPONIBILIDADE
5.1. O prazo de validade do acesso é aquele informado na página do curso.
5.2. O ECO RJ empreenderá esforços razoáveis para manter a Plataforma disponível, não
respondendo, contudo, por indisponibilidades decorrentes de força maior, falhas de terceiros,
de conexão do usuário ou de manutenções programadas.

6. DADOS PESSOAIS (LGPD)
6.1. Os dados fornecidos (nome, e-mail, telefone e CPF) serão tratados exclusivamente para
processamento da compra, emissão de comprovante, entrega do produto e cumprimento de obrigações
legais, nos termos da Lei nº 13.709/2018 (LGPD) e da Política de Privacidade da Plataforma.

7. LIMITAÇÃO DE RESPONSABILIDADE
7.1. O conteúdo tem finalidade educacional e não substitui julgamento clínico profissional.
7.2. Na máxima extensão permitida pela lei, a responsabilidade total do ECO RJ, por qualquer
causa, fica limitada ao valor efetivamente pago pelo comprador na respectiva transação.

8. DISPOSIÇÕES GERAIS
8.1. O ECO RJ poderá alterar estes termos a qualquer tempo, aplicando-se à compra a versão
vigente na data da respectiva contratação.
8.2. Fica eleito o foro da Comarca da Capital do Estado do Rio de Janeiro para dirimir
quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.

Ao marcar a caixa de aceite e concluir o pagamento, o comprador manifesta seu consentimento
livre, informado e inequívoco com todos os termos acima.`;

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  taxaOperacionalPercentual: 1,
  metodos: {
    pix: true,
    cartaoCredito: true,
    cartaoDebito: false,
    boleto: false
  },
  parcelasMaximas: 12,
  termosVersao: '1.0',
  termosCompra: TERMOS_PADRAO,
  vendasAtivas: true
};

const CONFIG_KEY = 'payment_config';

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const setting = await SystemSettings.findOne({ key: CONFIG_KEY });
  if (!setting?.value) return { ...DEFAULT_PAYMENT_CONFIG };
  // Mescla com defaults para garantir que novos campos sempre existam
  const stored = setting.value as Partial<PaymentConfig>;
  return {
    ...DEFAULT_PAYMENT_CONFIG,
    ...stored,
    metodos: { ...DEFAULT_PAYMENT_CONFIG.metodos, ...(stored.metodos || {}) }
  };
}

export async function setPaymentConfig(config: PaymentConfig, userId?: string): Promise<PaymentConfig> {
  await SystemSettings.findOneAndUpdate(
    { key: CONFIG_KEY },
    { value: config, updatedBy: userId },
    { upsert: true, new: true }
  );
  return config;
}

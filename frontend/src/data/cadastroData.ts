// =============================================================================
// Dados de cadastro — ECO RJ (atualizado 2026)
// -----------------------------------------------------------------------------
// Fontes de referência:
//  - Estados: IBGE (27 unidades federativas)
//  - Especialidades: Resolução CFM nº 2.380/2024 (lista oficial de especialidades)
//  - Áreas de residência: Programas credenciados CNRM/MEC (acesso direto + pré-requisito)
//  - Faculdades de Medicina: e-MEC / relação de cursos de Medicina por estado
//  - Hospitais: hospitais de ensino e principais hospitais por estado
//
// Observação: as listas de hospitais e instituições são amplas, porém a Medicina
// brasileira possui milhares de serviços. Por isso TODOS os seletores oferecem a
// opção "Outro(a) — não listado(a)" com campo de texto livre, garantindo que
// qualquer hospital/instituição possa ser informado.
// =============================================================================

export interface Estado {
  uf: string;
  nome: string;
}

export const ESTADOS: Estado[] = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' }
];

export const UF_LIST = ESTADOS.map((e) => e.uf);

export const OUTRO = 'Outro(a) — não listado(a)';

// -----------------------------------------------------------------------------
// Especialidades médicas — Resolução CFM nº 2.380/2024
// -----------------------------------------------------------------------------
export const ESPECIALIDADES_MEDICAS: string[] = [
  'Acupuntura',
  'Alergia e Imunologia',
  'Anestesiologia',
  'Angiologia',
  'Cardiologia',
  'Cirurgia Cardiovascular',
  'Cirurgia da Mão',
  'Cirurgia de Cabeça e Pescoço',
  'Cirurgia do Aparelho Digestivo',
  'Cirurgia Geral',
  'Cirurgia Oncológica',
  'Cirurgia Pediátrica',
  'Cirurgia Plástica',
  'Cirurgia Torácica',
  'Cirurgia Vascular',
  'Coloproctologia',
  'Dermatologia',
  'Endocrinologia e Metabologia',
  'Endoscopia',
  'Gastroenterologia',
  'Genética Médica',
  'Geriatria',
  'Ginecologia e Obstetrícia',
  'Hematologia e Hemoterapia',
  'Homeopatia',
  'Infectologia',
  'Mastologia',
  'Medicina de Emergência',
  'Medicina de Família e Comunidade',
  'Medicina do Trabalho',
  'Medicina de Tráfego',
  'Medicina Esportiva',
  'Medicina Física e Reabilitação',
  'Medicina Intensiva',
  'Medicina Legal e Perícia Médica',
  'Medicina Nuclear',
  'Medicina Preventiva e Social',
  'Nefrologia',
  'Neurocirurgia',
  'Neurologia',
  'Nutrologia',
  'Oftalmologia',
  'Oncologia Clínica',
  'Ortopedia e Traumatologia',
  'Otorrinolaringologia',
  'Patologia',
  'Patologia Clínica/Medicina Laboratorial',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Radiologia e Diagnóstico por Imagem',
  'Radioterapia',
  'Reumatologia',
  'Urologia',
  'Clínica Médica',
  'Cancerologia Pediátrica',
  'Cirurgia do Trauma',
  'Neurologia Pediátrica'
];

// -----------------------------------------------------------------------------
// Áreas de Residência Médica — programas credenciados CNRM/MEC
// (acesso direto + especialidades com pré-requisito + áreas de atuação frequentes)
// -----------------------------------------------------------------------------
export const AREAS_RESIDENCIA: string[] = [
  // Acesso direto
  'Anestesiologia',
  'Cirurgia Geral',
  'Clínica Médica',
  'Dermatologia',
  'Genética Médica',
  'Ginecologia e Obstetrícia',
  'Infectologia',
  'Medicina de Emergência',
  'Medicina de Família e Comunidade',
  'Medicina do Trabalho',
  'Medicina Física e Reabilitação',
  'Medicina Legal e Perícia Médica',
  'Medicina Nuclear',
  'Medicina Preventiva e Social',
  'Neurocirurgia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia e Traumatologia',
  'Otorrinolaringologia',
  'Patologia',
  'Patologia Clínica/Medicina Laboratorial',
  'Pediatria',
  'Psiquiatria',
  'Radiologia e Diagnóstico por Imagem',
  'Radioterapia',
  // Com pré-requisito
  'Alergia e Imunologia',
  'Angiologia',
  'Cardiologia',
  'Cirurgia Cardiovascular',
  'Cirurgia da Mão',
  'Cirurgia de Cabeça e Pescoço',
  'Cirurgia do Aparelho Digestivo',
  'Cirurgia do Trauma',
  'Cirurgia Oncológica',
  'Cirurgia Pediátrica',
  'Cirurgia Plástica',
  'Cirurgia Torácica',
  'Cirurgia Vascular',
  'Coloproctologia',
  'Endocrinologia e Metabologia',
  'Endoscopia',
  'Gastroenterologia',
  'Geriatria',
  'Hematologia e Hemoterapia',
  'Hepatologia',
  'Mastologia',
  'Medicina Intensiva',
  'Medicina Intensiva Pediátrica',
  'Nefrologia',
  'Neonatologia',
  'Nutrologia',
  'Oncologia Clínica',
  'Pneumologia',
  'Reumatologia',
  'Urologia'
];

// -----------------------------------------------------------------------------
// Ano de residência (rotação por semestre/ano)
// -----------------------------------------------------------------------------
export const ANOS_RESIDENCIA: string[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

export const SEMESTRES_RESIDENCIA: string[] = ['1º semestre', '2º semestre'];

// -----------------------------------------------------------------------------
// Período do curso de Medicina (Acadêmico) — rotação semestral
// -----------------------------------------------------------------------------
export const PERIODOS_ACADEMICOS: string[] = [
  '1º Período',
  '2º Período',
  '3º Período',
  '4º Período',
  '5º Período',
  '6º Período',
  '7º Período',
  '8º Período',
  '9º Período',
  '10º Período',
  '11º Período',
  '12º Período (Internato)'
];

// -----------------------------------------------------------------------------
// Faculdades de Medicina por estado (e-MEC)
// -----------------------------------------------------------------------------
export const FACULDADES_MEDICINA: Record<string, string[]> = {
  AC: [
    'Universidade Federal do Acre (UFAC)',
    'Centro Universitário Uninorte (UNINORTE)'
  ],
  AL: [
    'Universidade Federal de Alagoas (UFAL)',
    'Universidade Estadual de Ciências da Saúde de Alagoas (UNCISAL)',
    'Centro Universitário Cesmac (CESMAC)',
    'Centro Universitário Tiradentes (UNIT-AL)',
    'Centro Universitário Mário Pontes Jucá (UMJ) — Arapiraca'
  ],
  AP: [
    'Universidade Federal do Amapá (UNIFAP)',
    'Faculdade Estácio de Macapá'
  ],
  AM: [
    'Universidade Federal do Amazonas (UFAM)',
    'Universidade do Estado do Amazonas (UEA)',
    'Universidade Nilton Lins (UNINILTONLINS)',
    'Centro Universitário do Norte (UNINORTE)'
  ],
  BA: [
    'Universidade Federal da Bahia (UFBA)',
    'Universidade Estadual de Feira de Santana (UEFS)',
    'Universidade Estadual do Sudoeste da Bahia (UESB) — Vitória da Conquista',
    'Universidade Estadual de Santa Cruz (UESC) — Ilhéus',
    'Escola Bahiana de Medicina e Saúde Pública (EBMSP)',
    'Universidade Salvador (UNIFACS)',
    'Faculdade de Tecnologia e Ciências (UniFTC) — Salvador',
    'União Metropolitana de Educação e Cultura (UNIME)',
    'Faculdade Zarns / AGES Medicina',
    'Universidade Federal do Oeste da Bahia (UFOB) — Barreiras',
    'Faculdade Santo Agostinho de Vitória da Conquista'
  ],
  CE: [
    'Universidade Federal do Ceará (UFC)',
    'Universidade Federal do Ceará — Campus Sobral',
    'Universidade Estadual do Ceará (UECE)',
    'Universidade de Fortaleza (UNIFOR)',
    'Centro Universitário Christus (Unichristus)',
    'Faculdade de Medicina de Juazeiro do Norte (Estácio FMJ)',
    'Centro Universitário Católica de Quixadá (UNICATÓLICA)'
  ],
  DF: [
    'Universidade de Brasília (UnB)',
    'Escola Superior de Ciências da Saúde (ESCS)',
    'Centro Universitário de Brasília (CEUB)',
    'Universidade Católica de Brasília (UCB)',
    'Centro Universitário do Distrito Federal (UDF)',
    'Centro Universitário Euro-Americano (Unieuro)'
  ],
  ES: [
    'Universidade Federal do Espírito Santo (UFES)',
    'Escola Superior de Ciências da Santa Casa de Misericórdia de Vitória (EMESCAM)',
    'Universidade Vila Velha (UVV)',
    'Centro Universitário do Espírito Santo (UNESC) — Colatina',
    'Faculdade Brasileira Multivix'
  ],
  GO: [
    'Universidade Federal de Goiás (UFG)',
    'Pontifícia Universidade Católica de Goiás (PUC-GO)',
    'Universidade de Rio Verde (UniRV)',
    'Centro Universitário de Anápolis (UniEVANGÉLICA)',
    'Centro Universitário Alfredo Nasser (UNIFAN)',
    'Pontifícia Universidade Católica de Goiás — Campus II',
    'Universidade de Rio Verde — Campus Aparecida de Goiânia'
  ],
  MA: [
    'Universidade Federal do Maranhão (UFMA)',
    'Universidade Estadual do Maranhão (UEMA)',
    'Universidade CEUMA (UNICEUMA)',
    'Faculdade de Medicina de Imperatriz (FACIMP)',
    'Centro Universitário UNDB'
  ],
  MT: [
    'Universidade Federal de Mato Grosso (UFMT)',
    'Universidade Federal de Mato Grosso — Campus Sinop',
    'Universidade de Cuiabá (UNIC)',
    'Centro Universitário de Várzea Grande (UNIVAG)',
    'Faculdade de Medicina de Rondonópolis (AFA)'
  ],
  MS: [
    'Universidade Federal de Mato Grosso do Sul (UFMS)',
    'Universidade Estadual de Mato Grosso do Sul (UEMS)',
    'Universidade Católica Dom Bosco (UCDB)',
    'Universidade Anhanguera-Uniderp (UNIDERP)',
    'Faculdade Insted / Fundação Universidade Federal da Grande Dourados (UFGD)'
  ],
  MG: [
    'Universidade Federal de Minas Gerais (UFMG)',
    'Universidade Federal de Juiz de Fora (UFJF)',
    'Universidade Federal de Uberlândia (UFU)',
    'Universidade Federal de Ouro Preto (UFOP)',
    'Universidade Federal de São João del-Rei (UFSJ)',
    'Universidade Federal dos Vales do Jequitinhonha e Mucuri (UFVJM) — Diamantina',
    'Universidade Federal de Viçosa (UFV)',
    'Universidade Federal de Lavras (UFLA)',
    'Universidade Federal de Alfenas (UNIFAL)',
    'Faculdade de Ciências Médicas de Minas Gerais (FCMMG)',
    'Faculdade de Medicina de Barbacena (FAME)',
    'Faculdade de Medicina de Itajubá (FMIt)',
    'Universidade José do Rosário Vellano (UNIFENAS) — Alfenas / Belo Horizonte',
    'Universidade de Itaúna (UIT)',
    'Universidade Vale do Rio Doce (UNIVALE) — Governador Valadares',
    'Pontifícia Universidade Católica de Minas Gerais (PUC Minas)',
    'Faculdade da Saúde e Ecologia Humana (FASEH) — Vespasiano',
    'Centro Universitário de Belo Horizonte (UniBH)',
    'Centro Universitário de Patos de Minas (UNIPAM)',
    'Universidade de Uberaba (UNIUBE)',
    'Faculdades Unidas do Norte de Minas (FUNORTE) — Montes Claros',
    'Universidade Estadual de Montes Claros (UNIMONTES)'
  ],
  PA: [
    'Universidade Federal do Pará (UFPA)',
    'Universidade do Estado do Pará (UEPA)',
    'Centro Universitário do Estado do Pará (CESUPA)',
    'Universidade Federal do Oeste do Pará (UFOPA) — Santarém',
    'Centro Universitário Metropolitano da Amazônia (UNIFAMAZ)'
  ],
  PB: [
    'Universidade Federal de Campina Grande (UFCG)',
    'Universidade Federal da Paraíba (UFPB)',
    'Faculdade de Ciências Médicas da Paraíba (FCM-PB)',
    'Centro Universitário de João Pessoa (UNIPÊ)',
    'Faculdade de Ciências Médicas de Campina Grande (FCM-CG)'
  ],
  PR: [
    'Universidade Federal do Paraná (UFPR)',
    'Universidade Estadual de Londrina (UEL)',
    'Universidade Estadual de Maringá (UEM)',
    'Universidade Estadual de Ponta Grossa (UEPG)',
    'Universidade Estadual do Oeste do Paraná (UNIOESTE) — Cascavel',
    'Pontifícia Universidade Católica do Paraná (PUCPR)',
    'Faculdade Evangélica Mackenzie do Paraná (FEMPAR)',
    'Universidade Positivo (UP)',
    'Faculdades Pequeno Príncipe (FPP)',
    'Universidade Federal do Paraná — Campus Toledo'
  ],
  PE: [
    'Universidade Federal de Pernambuco (UFPE)',
    'Universidade de Pernambuco (UPE)',
    'Universidade Federal do Vale do São Francisco (UNIVASF) — Petrolina',
    'Faculdade Pernambucana de Saúde (FPS)',
    'Centro Universitário Maurício de Nassau (UNINASSAU)',
    'Universidade Católica de Pernambuco (UNICAP)',
    'Centro Universitário Tabosa de Almeida (ASCES-UNITA) — Caruaru'
  ],
  PI: [
    'Universidade Federal do Piauí (UFPI)',
    'Universidade Estadual do Piauí (UESPI)',
    'Universidade Federal do Delta do Parnaíba (UFDPar)',
    'Centro Universitário UNINOVAFAPI',
    'Faculdade Integral Diferencial (FACID Wyden)'
  ],
  RJ: [
    'Universidade Federal do Rio de Janeiro (UFRJ)',
    'Universidade do Estado do Rio de Janeiro (UERJ)',
    'Universidade Federal Fluminense (UFF) — Niterói',
    'Universidade Federal do Estado do Rio de Janeiro (UNIRIO)',
    'Pontifícia Universidade Católica do Rio de Janeiro (PUC-Rio)',
    'Fundação Técnico-Educacional Souza Marques (FTESM)',
    'Universidade Estácio de Sá (UNESA)',
    'Universidade Iguaçu (UNIG) — Nova Iguaçu',
    'Universidade de Vassouras (UV)',
    'Centro Universitário de Volta Redonda (UniFOA)',
    'Centro Universitário Serra dos Órgãos (UNIFESO) — Teresópolis',
    'Faculdade de Medicina de Petrópolis (FMP/UNIFASE)',
    'Universidade do Grande Rio (UNIGRANRIO)',
    'Universidade Federal do Rio de Janeiro — Campus Macaé',
    'Centro Universitário Arthur Sá Earp Neto'
  ],
  RN: [
    'Universidade Federal do Rio Grande do Norte (UFRN)',
    'Universidade do Estado do Rio Grande do Norte (UERN) — Mossoró',
    'Universidade Federal Rural do Semi-Árido (UFERSA)',
    'Universidade Potiguar (UnP)',
    'Centro Universitário do Rio Grande do Norte (UNI-RN)',
    'Liga Norte-Riograndense Contra o Câncer / FACISA-UFRN — Santa Cruz'
  ],
  RS: [
    'Universidade Federal do Rio Grande do Sul (UFRGS)',
    'Universidade Federal de Ciências da Saúde de Porto Alegre (UFCSPA)',
    'Universidade Federal de Pelotas (UFPel)',
    'Universidade Federal de Santa Maria (UFSM)',
    'Universidade Federal do Rio Grande (FURG)',
    'Pontifícia Universidade Católica do Rio Grande do Sul (PUCRS)',
    'Universidade de Caxias do Sul (UCS)',
    'Universidade de Passo Fundo (UPF)',
    'Universidade do Vale do Rio dos Sinos (UNISINOS)',
    'Universidade Luterana do Brasil (ULBRA) — Canoas',
    'Universidade de Santa Cruz do Sul (UNISC)',
    'Universidade Regional Integrada (URI) — Erechim',
    'Universidade Regional do Noroeste do Estado do RS (UNIJUÍ) — Ijuí',
    'Universidade Católica de Pelotas (UCPel)',
    'Universidade Federal do Pampa (UNIPAMPA) — Uruguaiana',
    'Universidade de Cruz Alta (UNICRUZ)',
    'Universidade Franciscana (UFN) — Santa Maria'
  ],
  RO: [
    'Universidade Federal de Rondônia (UNIR)',
    'Centro Universitário São Lucas (UniSL) — Porto Velho',
    'Faculdade de Ciências Biomédicas de Cacoal (FACIMED)',
    'Centro Universitário Aparício Carvalho (FIMCA)'
  ],
  RR: [
    'Universidade Federal de Roraima (UFRR)',
    'Centro Universitário Estácio da Amazônia'
  ],
  SC: [
    'Universidade Federal de Santa Catarina (UFSC)',
    'Universidade Federal de Santa Catarina — Campus Araranguá',
    'Universidade do Sul de Santa Catarina (UNISUL)',
    'Universidade do Vale do Itajaí (UNIVALI)',
    'Universidade Comunitária da Região de Chapecó (UNOCHAPECÓ)',
    'Universidade do Oeste de Santa Catarina (UNOESC) — Joaçaba',
    'Universidade Regional de Blumenau (FURB)',
    'Universidade da Região de Joinville (UNIVILLE)',
    'Universidade do Extremo Sul Catarinense (UNESC) — Criciúma',
    'Universidade do Planalto Catarinense (UNIPLAC) — Lages',
    'Universidade do Contestado (UnC)'
  ],
  SP: [
    'Universidade de São Paulo — Faculdade de Medicina (FMUSP)',
    'Universidade de São Paulo — Faculdade de Medicina de Ribeirão Preto (FMRP-USP)',
    'Universidade de São Paulo — Bauru (FMB-USP)',
    'Universidade Estadual de Campinas (UNICAMP)',
    'Universidade Estadual Paulista (UNESP) — Botucatu',
    'Universidade Federal de São Paulo (UNIFESP/EPM)',
    'Universidade Federal de São Carlos (UFSCar)',
    'Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP)',
    'Faculdade de Medicina do ABC (FMABC) — Santo André',
    'Faculdade de Medicina de Jundiaí (FMJ)',
    'Faculdade de Medicina de Marília (FAMEMA)',
    'Faculdade de Medicina de São José do Rio Preto (FAMERP)',
    'Pontifícia Universidade Católica de São Paulo (PUC-SP) — Sorocaba',
    'Pontifícia Universidade Católica de Campinas (PUC-Campinas)',
    'Universidade de Ribeirão Preto (UNAERP)',
    'Universidade de Mogi das Cruzes (UMC)',
    'Universidade Santo Amaro (UNISA)',
    'Universidade Metropolitana de Santos (UNIMES)',
    'Universidade São Francisco (USF) — Bragança Paulista',
    'Universidade de Marília (UNIMAR)',
    'Centro Universitário São Camilo',
    'Universidade Nove de Julho (UNINOVE)',
    'Universidade Cidade de São Paulo (UNICID)',
    'Universidade Anhembi Morumbi (UAM)',
    'Universidade de Taubaté (UNITAU)',
    'Universidade de Sorocaba (UNISO)',
    'Centro Universitário FMABC',
    'Centro Universitário das Faculdades Associadas de Ensino (UNIFAE) — São João da Boa Vista',
    'Universidade Brasil — Fernandópolis',
    'Universidade do Oeste Paulista (UNOESTE) — Presidente Prudente',
    'Universidade de Franca (UNIFRAN)',
    'Universidade Municipal de São Caetano do Sul (USCS)',
    'Centro Universitário Barão de Mauá — Ribeirão Preto'
  ],
  SE: [
    'Universidade Federal de Sergipe (UFS)',
    'Universidade Federal de Sergipe — Campus Lagarto',
    'Universidade Tiradentes (UNIT-SE)',
    'Centro Universitário de Sergipe (UNINASSAU Aracaju)'
  ],
  TO: [
    'Universidade Federal do Tocantins (UFT)',
    'Instituto Tocantinense Presidente Antônio Carlos (ITPAC) — Araguaína',
    'Centro Universitário Luterano de Palmas (CEULP/ULBRA)',
    'Faculdade de Medicina de Gurupi (UnirG)'
  ]
};

// -----------------------------------------------------------------------------
// Hospitais por estado — hospitais de ensino e principais serviços
// -----------------------------------------------------------------------------
export const HOSPITAIS: Record<string, string[]> = {
  AC: [
    'Fundação Hospital Estadual do Acre (FUNDHACRE)',
    'Hospital das Clínicas do Acre (HC-AC)',
    'Hospital de Urgência e Emergência de Rio Branco (HUERB)',
    'Hospital da Criança de Rio Branco',
    'Maternidade Bárbara Heliodora',
    'Hospital do Juruá (Cruzeiro do Sul)'
  ],
  AL: [
    'Hospital Universitário Prof. Alberto Antunes (HUPAA/UFAL)',
    'Hospital Geral do Estado (HGE) — Maceió',
    'Hospital Escola Dr. Hélvio Auto (HEHA)',
    'Santa Casa de Misericórdia de Maceió',
    'Hospital do Coração de Alagoas',
    'Maternidade Escola Santa Mônica',
    'Hospital Universitário de Arapiraca'
  ],
  AP: [
    'Hospital de Clínicas Dr. Alberto Lima (HCAL) — Macapá',
    'Hospital de Emergência de Macapá (HE)',
    'Hospital da Criança e do Adolescente (HCA)',
    'Maternidade Mãe Luzia',
    'Hospital Geral de Santana'
  ],
  AM: [
    'Hospital Universitário Getúlio Vargas (HUGV/UFAM)',
    'Fundação de Medicina Tropical Dr. Heitor Vieira Dourado (FMT-HVD)',
    'Hospital Universitário Francisca Mendes (HUFM)',
    'Fundação Hospital Adriano Jorge (FHAJ)',
    'Hospital e Pronto-Socorro João Lúcio Pereira Machado',
    'Instituto da Criança do Amazonas (ICAM)',
    'Fundação Cecon (Centro de Controle de Oncologia)',
    'Maternidade Ana Braga',
    'Hospital Universitário Francisca Mendes'
  ],
  BA: [
    'Complexo Hospitalar Universitário Prof. Edgard Santos (HUPES/UFBA)',
    'Hospital Ana Nery — Salvador',
    'Hospital Geral Roberto Santos (HGRS)',
    'Hospital do Subúrbio — Salvador',
    'Hospital Santa Izabel — Santa Casa da Bahia',
    'Hospital Geral Ernesto Simões Filho',
    'Hospital Espanhol',
    'Obras Sociais Irmã Dulce (OSID)',
    'Hospital Universitário da UEFS — Feira de Santana',
    'Hospital Geral de Vitória da Conquista',
    'Hospital São Rafael',
    'Maternidade Climério de Oliveira'
  ],
  CE: [
    'Hospital Universitário Walter Cantídio (HUWC/UFC)',
    'Maternidade Escola Assis Chateaubriand (MEAC/UFC)',
    'Hospital Geral de Fortaleza (HGF)',
    'Hospital Geral Dr. César Cals',
    'Instituto Dr. José Frota (IJF)',
    'Hospital de Messejana Dr. Carlos Alberto Studart Gomes',
    'Hospital Infantil Albert Sabin',
    'Hospital São José de Doenças Infecciosas',
    'Hospital Universitário da UFC — Sobral (Santa Casa de Sobral)',
    'Hospital do Coração de Messejana'
  ],
  DF: [
    'Hospital de Base do Distrito Federal (IGESDF)',
    'Hospital Universitário de Brasília (HUB/UnB)',
    'Hospital Regional da Asa Norte (HRAN)',
    'Hospital Regional da Asa Sul (HRAS)',
    'Hospital Regional de Taguatinga (HRT)',
    'Hospital Regional de Ceilândia (HRC)',
    'Hospital Regional do Gama (HRG)',
    'Hospital Materno Infantil de Brasília (HMIB)',
    'Hospital da Criança de Brasília José Alencar',
    'Instituto Hospital de Base (IHBDF)'
  ],
  ES: [
    'Hospital Universitário Cassiano Antônio Moraes (HUCAM/UFES)',
    'Hospital Estadual Central (HEC) — Vitória',
    'Hospital Santa Casa de Misericórdia de Vitória',
    'Hospital Infantil Nossa Senhora da Glória (HINSG)',
    'Hospital Estadual Dr. Jayme Santos Neves — Serra',
    'Hospital Dório Silva',
    'Hospital das Clínicas — EMESCAM',
    'Hospital Evangélico de Vila Velha'
  ],
  GO: [
    'Hospital das Clínicas da UFG (HC/UFG-EBSERH)',
    'Hospital Geral de Goiânia Dr. Alberto Rassi (HGG)',
    'Hospital de Urgências de Goiânia (HUGO)',
    'Hospital das Clínicas — PUC Goiás',
    'Santa Casa de Misericórdia de Goiânia',
    'Hospital Materno-Infantil de Goiânia (HMI)',
    'Hospital Estadual de Doenças Tropicais Dr. Anuar Auad',
    'Hospital de Urgências de Aparecida de Goiânia (HUAPA)',
    'Hospital Estadual de Urgências de Trindade'
  ],
  MA: [
    'Hospital Universitário da UFMA (HU-UFMA)',
    'Hospital Presidente Vargas — São Luís',
    'Hospital Geral Tarquínio Lopes Filho',
    'Hospital da Criança Dr. Odorico Amaral de Matos',
    'Hospital do Servidor (HSPE-MA)',
    'Santa Casa de Misericórdia do Maranhão',
    'Hospital Municipal Djalma Marques (Socorrão I)',
    'Hospital de Imperatriz — Hospital Municipal de Imperatriz'
  ],
  MT: [
    'Hospital Universitário Júlio Müller (HUJM/UFMT)',
    'Hospital Geral Universitário (HGU) — Cuiabá',
    'Hospital Municipal de Cuiabá',
    'Hospital Santa Casa de Cuiabá',
    'Hospital Estadual Santa Casa',
    'Hospital Regional de Sinop',
    'Hospital de Câncer de Mato Grosso',
    'Pronto-Socorro Municipal de Cuiabá'
  ],
  MS: [
    'Hospital Universitário Maria Aparecida Pedrossian (HUMAP/UFMS)',
    'Hospital Regional de Mato Grosso do Sul Rosa Pedrossian (HRMS)',
    'Santa Casa de Campo Grande',
    'Hospital Universitário da UFGD — Dourados',
    'Hospital da Vida — Dourados',
    'Hospital El Kadri',
    'Hospital de Câncer Alfredo Abrão'
  ],
  MG: [
    'Hospital das Clínicas da UFMG (HC-UFMG)',
    'Hospital Risoleta Tolentino Neves — Belo Horizonte',
    'Hospital João XXIII (FHEMIG)',
    'Santa Casa de Belo Horizonte',
    'Hospital Julia Kubitschek (FHEMIG)',
    'Hospital Universitário da UFJF (HU-UFJF)',
    'Hospital de Clínicas da UFU — Uberlândia',
    'Hospital das Clínicas Samuel Libânio — Pouso Alegre',
    'Hospital das Clínicas da UFTM — Uberaba',
    'Fundação Hospitalar São Francisco de Assis',
    'Hospital Felício Rocho',
    'Hospital Mater Dei',
    'Hospital Márcio Cunha — Ipatinga',
    'Santa Casa de Montes Claros',
    'Hospital Universitário Alzira Velano (UNIFENAS) — Alfenas',
    'Hospital Municipal Odilon Behrens'
  ],
  PA: [
    'Hospital Universitário João de Barros Barreto (HUJBB/UFPA)',
    'Hospital Universitário Bettina Ferro de Souza (HUBFS/UFPA)',
    'Fundação Santa Casa de Misericórdia do Pará',
    'Hospital Ophir Loyola',
    'Fundação Hospital de Clínicas Gaspar Vianna',
    'Hospital Metropolitano de Urgência e Emergência (HMUE)',
    'Hospital Universitário da UEPA (Hospital de Clínicas)',
    'Hospital Regional do Baixo Amazonas — Santarém',
    'Fundação Pública Estadual Hospital de Clínicas Gaspar Vianna'
  ],
  PB: [
    'Hospital Universitário Lauro Wanderley (HULW/UFPB) — João Pessoa',
    'Hospital Universitário Alcides Carneiro (HUAC/UFCG) — Campina Grande',
    'Hospital de Emergência e Trauma Senador Humberto Lucena — João Pessoa',
    'Hospital de Emergência e Trauma Dom Luiz Gonzaga Fernandes — Campina Grande',
    'Complexo Hospitalar de Doenças Infecto-Contagiosas Clementino Fraga',
    'Hospital Universitário Júlio Bandeira',
    'Instituto Cândida Vargas — João Pessoa'
  ],
  PR: [
    'Hospital de Clínicas da UFPR (HC-UFPR) — Curitiba',
    'Hospital Universitário Regional Norte do Paraná (HURNP/UEL) — Londrina',
    'Hospital Universitário Regional de Maringá (HUM/UEM)',
    'Hospital Universitário da UEPG — Ponta Grossa',
    'Hospital Universitário do Oeste do Paraná (HUOP/UNIOESTE) — Cascavel',
    'Hospital do Trabalhador — Curitiba',
    'Hospital Evangélico Mackenzie — Curitiba',
    'Hospital Pequeno Príncipe — Curitiba',
    'Santa Casa de Curitiba',
    'Hospital Erasto Gaertner',
    'Hospital Universitário Cajuru (PUCPR)',
    'Hospital Nossa Senhora das Graças'
  ],
  PE: [
    'Hospital das Clínicas da UFPE (HC-UFPE)',
    'Hospital Universitário Oswaldo Cruz (HUOC/UPE)',
    'Pronto-Socorro Cardiológico de Pernambuco (PROCAPE/UPE)',
    'Instituto de Medicina Integral Prof. Fernando Figueira (IMIP)',
    'Hospital da Restauração Gov. Paulo Guerra (HR)',
    'Hospital Getúlio Vargas — Recife',
    'Hospital Barão de Lucena',
    'Hospital Otávio de Freitas',
    'Real Hospital Português de Beneficência',
    'Hospital Universitário da UNIVASF — Petrolina',
    'Instituto de Medicina Integral Professor Fernando Figueira'
  ],
  PI: [
    'Hospital Universitário da UFPI (HU-UFPI)',
    'Hospital Getúlio Vargas — Teresina',
    'Hospital de Urgência de Teresina (HUT)',
    'Hospital Infantil Lucídio Portella',
    'Maternidade Dona Evangelina Rosa',
    'Hospital São Marcos',
    'Hospital do Câncer do Piauí'
  ],
  RJ: [
    'Hospital Universitário Clementino Fraga Filho (HUCFF/UFRJ)',
    'Instituto de Ginecologia / Maternidade Escola da UFRJ',
    'Hospital Universitário Pedro Ernesto (HUPE/UERJ)',
    'Hospital Universitário Antônio Pedro (HUAP/UFF) — Niterói',
    'Hospital Universitário Gaffrée e Guinle (HUGG/UNIRIO)',
    'Instituto Nacional de Câncer (INCA)',
    'Instituto Nacional de Cardiologia (INC)',
    'Hospital Federal da Lagoa',
    'Hospital Federal de Bonsucesso',
    'Hospital Federal dos Servidores do Estado (HFSE)',
    'Hospital Federal de Ipanema',
    'Hospital Federal Cardoso Fontes',
    'Hospital Federal do Andaraí',
    'Instituto Nacional de Traumatologia e Ortopedia (INTO)',
    'Instituto Nacional de Infectologia Evandro Chagas (INI/Fiocruz)',
    'Santa Casa da Misericórdia do Rio de Janeiro',
    'Hospital Municipal Souza Aguiar',
    'Hospital Municipal Miguel Couto',
    'Instituto Estadual do Cérebro Paulo Niemeyer',
    'Instituto Estadual de Cardiologia Aloysio de Castro (IECAC)',
    'Hospital Estadual Alberto Torres — São Gonçalo',
    'Hospital Escola São Francisco de Assis (UFRJ)',
    'Instituto de Puericultura e Pediatria Martagão Gesteira (IPPMG/UFRJ)'
  ],
  RN: [
    'Hospital Universitário Onofre Lopes (HUOL/UFRN)',
    'Maternidade Escola Januário Cicco (MEJC/UFRN)',
    'Hospital de Pediatria Prof. Heriberto Bezerra (HOSPED/UFRN)',
    'Hospital Walfredo Gurgel — Natal',
    'Hospital Giselda Trigueiro',
    'Liga Norte-Riograndense Contra o Câncer',
    'Hospital Universitário Ana Bezerra (HUAB/UFRN) — Santa Cruz',
    'Hospital Regional Tarcísio Maia — Mossoró'
  ],
  RS: [
    'Hospital de Clínicas de Porto Alegre (HCPA/UFRGS)',
    'Santa Casa de Misericórdia de Porto Alegre (ISCMPA)',
    'Hospital Nossa Senhora da Conceição (Grupo Hospitalar Conceição)',
    'Hospital de Pronto Socorro de Porto Alegre (HPS)',
    'Hospital São Lucas da PUCRS',
    'Hospital Moinhos de Vento',
    'Hospital Universitário de Santa Maria (HUSM/UFSM)',
    'Hospital Escola da UFPel / Santa Casa de Pelotas',
    'Hospital Universitário Dr. Miguel Riet Corrêa Jr. (FURG) — Rio Grande',
    'Hospital Universitário de Canoas (ULBRA)',
    'Hospital Geral de Caxias do Sul',
    'Hospital São Vicente de Paulo — Passo Fundo',
    'Hospital Cristo Redentor',
    'Hospital da Criança Conceição'
  ],
  RO: [
    'Hospital de Base Dr. Ary Pinheiro — Porto Velho',
    'Hospital João Paulo II — Porto Velho',
    'Hospital Infantil Cosme e Damião',
    'Hospital de Urgência e Emergência de Rondônia (Heuro) — Cacoal',
    'Hospital Regional de Ji-Paraná',
    'Centro de Medicina Tropical de Rondônia (CEMETRON)'
  ],
  RR: [
    'Hospital Geral de Roraima (HGR) — Boa Vista',
    'Hospital da Criança Santo Antônio',
    'Hospital Materno-Infantil Nossa Senhora de Nazareth',
    'Hospital Coronel Mota'
  ],
  SC: [
    'Hospital Universitário Prof. Polydoro Ernani de São Thiago (HU-UFSC)',
    'Hospital Governador Celso Ramos — Florianópolis',
    'Hospital Regional de São José Dr. Homero de Miranda Gomes',
    'Hospital Infantil Joana de Gusmão',
    'Maternidade Carmela Dutra',
    'Hospital Nereu Ramos',
    'Hospital Santa Isabel — Blumenau',
    'Hospital Universitário Santa Terezinha (HUST) — Joaçaba',
    'Hospital Regional do Oeste — Chapecó',
    'Hospital Municipal São José — Joinville',
    'Hospital Universitário São José — Criciúma'
  ],
  SP: [
    'Hospital das Clínicas da FMUSP (HC-FMUSP)',
    'Instituto do Coração (InCor/HC-FMUSP)',
    'Instituto Central do HC-FMUSP',
    'Instituto de Ortopedia e Traumatologia (IOT/HC-FMUSP)',
    'Instituto do Câncer do Estado de São Paulo (ICESP)',
    'Hospital das Clínicas da FMRP-USP — Ribeirão Preto',
    'Hospital das Clínicas da UNICAMP — Campinas',
    'Hospital São Paulo (HU/UNIFESP)',
    'Hospital das Clínicas da Faculdade de Medicina de Botucatu (UNESP)',
    'Santa Casa de Misericórdia de São Paulo',
    'Hospital do Servidor Público Estadual (IAMSPE)',
    'Hospital do Servidor Público Municipal (HSPM)',
    'Hospital Municipal Dr. Arthur Ribeiro de Saboya',
    'Hospital Israelita Albert Einstein',
    'Hospital Sírio-Libanês',
    'Hospital Alemão Oswaldo Cruz',
    'Hospital Beneficência Portuguesa de São Paulo',
    'A.C.Camargo Cancer Center',
    'Instituto de Infectologia Emílio Ribas',
    'Hospital Municipal Infantil Menino Jesus',
    'Faculdade de Medicina do ABC — Hospital Estadual Mário Covas (Santo André)',
    'Hospital de Base de São José do Rio Preto (FUNFARME/FAMERP)',
    'Hospital das Clínicas da FAMEMA — Marília',
    'Hospital Universitário São Francisco — Bragança Paulista',
    'Hospital e Maternidade Celso Pierro (PUC-Campinas)',
    'Hospital Estadual de Sumaré',
    'Hospital Regional de Sorocaba / Conjunto Hospitalar de Sorocaba',
    'Hospital Municipal de Barueri',
    'Hospital Guilherme Álvaro — Santos',
    'Santa Casa de Ribeirão Preto',
    'Hospital das Clínicas de Jundiaí',
    'Hospital Estadual de Bauru (HEB)',
    'Hospital de Reabilitação de Anomalias Craniofaciais (HRAC/USP) — Bauru'
  ],
  SE: [
    'Hospital Universitário da UFS (HU-UFS) — Aracaju',
    'Hospital de Urgência de Sergipe Gov. João Alves Filho (HUSE)',
    'Hospital de Cirurgia — Fundação de Beneficência Hospital de Cirurgia',
    'Hospital São Lucas — Aracaju',
    'Maternidade Nossa Senhora de Lourdes',
    'Hospital Universitário de Lagarto',
    'Hospital do Coração de Sergipe'
  ],
  TO: [
    'Hospital Geral de Palmas Dr. Francisco Ayres (HGP)',
    'Hospital Regional de Araguaína (HRA)',
    'Hospital Materno-Infantil de Palmas',
    'Hospital Regional de Gurupi',
    'Hospital e Maternidade Dona Regina — Palmas',
    'Unidade de Referência em Média e Alta Complexidade (UNACON) — Araguaína'
  ]
};

// Helpers ---------------------------------------------------------------------
export const getFaculdadesByUF = (uf: string): string[] => FACULDADES_MEDICINA[uf] || [];
export const getHospitaisByUF = (uf: string): string[] => HOSPITAIS[uf] || [];

export const TIPOS_USUARIO = ['Médico', 'Residente', 'Acadêmico de Medicina'] as const;
export type TipoUsuario = (typeof TIPOS_USUARIO)[number];

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <h1 className="font-heading text-3xl font-bold text-gray-900 mb-8">Política de Privacidade</h1>

      <div className="prose prose-gray max-w-none">
        <p className="text-gray-600 mb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>

        <p className="text-gray-600 mb-8">
          O ECO RJ - Centro de Treinamento em Ecocardiografia está comprometido com a proteção da privacidade dos seus usuários. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Dados Coletados</h2>
          <p className="text-gray-600 mb-4">
            1.1 <strong>Dados de cadastro:</strong> nome completo, e-mail, CPF, CRM, UF do CRM, data de nascimento, especialidade médica.
          </p>
          <p className="text-gray-600 mb-4">
            1.2 <strong>Dados de uso:</strong> aulas assistidas, exercícios respondidos, participação no fórum, horários de acesso.
          </p>
          <p className="text-gray-600 mb-4">
            1.3 <strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional, páginas visitadas.
          </p>
          <p className="text-gray-600">
            1.4 <strong>Dados opcionais:</strong> foto de perfil, biografia, informações adicionais fornecidas voluntariamente.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Finalidade do Tratamento</h2>
          <p className="text-gray-600 mb-4">
            Utilizamos seus dados pessoais para as seguintes finalidades:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li>Criar e gerenciar sua conta na plataforma</li>
            <li>Verificar sua identidade profissional (CRM)</li>
            <li>Fornecer acesso aos cursos e conteúdos adquiridos</li>
            <li>Acompanhar seu progresso de aprendizado</li>
            <li>Emitir certificados de conclusão</li>
            <li>Enviar comunicações sobre cursos e atualizações</li>
            <li>Melhorar nossos serviços e conteúdos</li>
            <li>Cumprir obrigações legais e regulatórias</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Base Legal</h2>
          <p className="text-gray-600 mb-4">
            O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais:
          </p>
          <ul className="list-disc pl-6 text-gray-600">
            <li><strong>Execução de contrato:</strong> para fornecer os serviços contratados</li>
            <li><strong>Consentimento:</strong> para envio de comunicações de marketing</li>
            <li><strong>Interesse legítimo:</strong> para melhorar nossos serviços</li>
            <li><strong>Obrigação legal:</strong> para cumprimento de exigências regulatórias</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Compartilhamento de Dados</h2>
          <p className="text-gray-600 mb-4">
            4.1 Não vendemos, alugamos ou comercializamos seus dados pessoais.
          </p>
          <p className="text-gray-600 mb-4">
            4.2 Podemos compartilhar dados com:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li>Prestadores de serviços que auxiliam na operação da plataforma (hospedagem, pagamentos)</li>
            <li>Autoridades públicas, quando exigido por lei</li>
            <li>Profissionais jurídicos para defesa de nossos direitos</li>
          </ul>
          <p className="text-gray-600">
            4.3 Todos os terceiros que recebem dados são obrigados a manter sigilo e proteção adequada.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Segurança dos Dados</h2>
          <p className="text-gray-600 mb-4">
            Adotamos medidas técnicas e organizacionais para proteger seus dados:
          </p>
          <ul className="list-disc pl-6 text-gray-600">
            <li>Criptografia de senhas e dados sensíveis</li>
            <li>Conexões seguras (HTTPS)</li>
            <li>Controle de acesso restrito</li>
            <li>Monitoramento de acessos</li>
            <li>Backup regular de dados</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Cookies</h2>
          <p className="text-gray-600 mb-4">
            6.1 Utilizamos cookies para melhorar sua experiência na plataforma.
          </p>
          <p className="text-gray-600 mb-4">
            6.2 Tipos de cookies utilizados:
          </p>
          <ul className="list-disc pl-6 text-gray-600">
            <li><strong>Essenciais:</strong> necessários para funcionamento da plataforma</li>
            <li><strong>Desempenho:</strong> para análise de uso e melhorias</li>
            <li><strong>Funcionalidade:</strong> para lembrar suas preferências</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Retenção de Dados</h2>
          <p className="text-gray-600 mb-4">
            7.1 Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas.
          </p>
          <p className="text-gray-600 mb-4">
            7.2 Dados de conta são mantidos enquanto a conta estiver ativa.
          </p>
          <p className="text-gray-600">
            7.3 Após exclusão da conta, alguns dados podem ser retidos por obrigação legal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Seus Direitos (LGPD)</h2>
          <p className="text-gray-600 mb-4">
            Conforme a LGPD, você tem direito a:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li><strong>Confirmação:</strong> saber se tratamos seus dados</li>
            <li><strong>Acesso:</strong> solicitar cópia dos seus dados</li>
            <li><strong>Correção:</strong> atualizar dados incompletos ou incorretos</li>
            <li><strong>Anonimização:</strong> solicitar anonimização de dados desnecessários</li>
            <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
            <li><strong>Eliminação:</strong> solicitar exclusão de dados tratados com consentimento</li>
            <li><strong>Revogação:</strong> revogar consentimento a qualquer momento</li>
            <li><strong>Oposição:</strong> opor-se a tratamento irregular</li>
          </ul>
          <p className="text-gray-600">
            Para exercer seus direitos, entre em contato pelo email informado abaixo.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Transferência Internacional</h2>
          <p className="text-gray-600">
            Seus dados são armazenados em servidores que podem estar localizados fora do Brasil. Garantimos que qualquer transferência internacional de dados ocorre em conformidade com a legislação aplicável.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">10. Menores de Idade</h2>
          <p className="text-gray-600">
            Nossa plataforma é destinada a profissionais de saúde. Não coletamos intencionalmente dados de menores de 18 anos.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">11. Alterações nesta Política</h2>
          <p className="text-gray-600">
            Esta política pode ser atualizada periodicamente. Notificaremos alterações significativas por email ou através da plataforma.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">12. Contato e Encarregado (DPO)</h2>
          <p className="text-gray-600 mb-4">
            Para questões sobre privacidade e proteção de dados:
          </p>
          <p className="text-gray-600">
            <strong>E-mail:</strong>{' '}
            <a href="mailto:contato@cursodeecocardiografia.com" className="text-primary-500 hover:underline">
              contato@cursodeecocardiografia.com
            </a>
          </p>
        </section>

        <div className="border-t pt-8 mt-8">
          <p className="text-sm text-gray-500">
            ECO RJ - Centro de Treinamento em Ecocardiografia<br />
            CNPJ: 21.847.609/0001-70<br />
            Avenida das Américas 19.019 - Recreio Shopping - Sala 336<br />
            Recreio dos Bandeirantes - Rio de Janeiro - RJ
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

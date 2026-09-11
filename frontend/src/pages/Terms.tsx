import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <h1 className="font-heading text-3xl font-bold text-gray-900 mb-8">Termos de Serviço</h1>

      <div className="prose prose-gray max-w-none">
        <p className="text-gray-600 mb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Aceitação dos Termos</h2>
          <p className="text-gray-600 mb-4">
            1.1 Ao acessar e usar a plataforma ECO RJ - Centro de Treinamento em Ecocardiografia, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
          </p>
          <p className="text-gray-600">
            1.2 Se você não concordar com qualquer parte destes termos, não deve usar nossa plataforma.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Descrição do Serviço</h2>
          <p className="text-gray-600 mb-4">
            2.1 O ECO RJ oferece cursos de atualização em ecocardiografia para médicos e profissionais de saúde, integrando conceitos clínicos e de imagem.
          </p>
          <p className="text-gray-600 mb-4">
            2.2 Os serviços incluem acesso a aulas gravadas, aulas ao vivo, exercícios práticos, fórum de discussão e materiais complementares.
          </p>
          <p className="text-gray-600">
            2.3 O acesso completo ao conteúdo requer uma serial key válida, que define o nível de acesso do usuário na plataforma.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Cadastro e Conta</h2>
          <p className="text-gray-600 mb-4">
            3.1 Para utilizar a plataforma, é necessário criar uma conta informando dados verdadeiros, incluindo CRM válido, CPF e informações profissionais.
          </p>
          <p className="text-gray-600 mb-4">
            3.2 Cada usuário pode ter apenas uma conta. É proibido compartilhar credenciais de acesso.
          </p>
          <p className="text-gray-600">
            3.3 O usuário é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Direitos Intelectuais</h2>
          <p className="text-gray-600 mb-4">
            4.1 Todo o conteúdo disponibilizado na plataforma, incluindo vídeos, textos, imagens, exercícios e materiais complementares, é protegido por direitos autorais.
          </p>
          <p className="text-gray-600 mb-4">
            4.2 É expressamente proibido copiar, reproduzir, distribuir, transmitir ou comercializar qualquer conteúdo da plataforma sem autorização prévia por escrito.
          </p>
          <p className="text-gray-600">
            4.3 O uso indevido do conteúdo pode resultar em medidas legais cabíveis.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Código de Conduta</h2>
          <p className="text-gray-600 mb-4">
            5.1 Os usuários concordam em:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li>Utilizar a plataforma apenas para fins educacionais legítimos</li>
            <li>Manter um comportamento respeitoso no fórum e interações</li>
            <li>Não compartilhar conteúdo ilegal, ofensivo ou discriminatório</li>
            <li>Não tentar burlar os sistemas de segurança da plataforma</li>
            <li>Não compartilhar serial keys ou credenciais de acesso</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Pagamento e Reembolso</h2>
          <p className="text-gray-600 mb-4">
            6.1 O acesso aos cursos é mediante aquisição de serial key, cujos valores e condições são informados no momento da compra.
          </p>
          <p className="text-gray-600 mb-4">
            6.2 Serial keys não utilizadas podem ser reembolsadas em até 7 dias após a compra, mediante solicitação.
          </p>
          <p className="text-gray-600">
            6.3 Serial keys já utilizadas não são passíveis de reembolso.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Limitação de Responsabilidade</h2>
          <p className="text-gray-600 mb-4">
            7.1 O ECO RJ não se responsabiliza por decisões clínicas tomadas com base no conteúdo dos cursos. O material é exclusivamente educacional.
          </p>
          <p className="text-gray-600 mb-4">
            7.2 Não garantimos disponibilidade ininterrupta da plataforma, podendo haver manutenções programadas.
          </p>
          <p className="text-gray-600">
            7.3 O ECO RJ não se responsabiliza por danos indiretos decorrentes do uso ou impossibilidade de uso da plataforma.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Cancelamento e Suspensão</h2>
          <p className="text-gray-600 mb-4">
            8.1 O ECO RJ reserva-se o direito de suspender ou cancelar contas que violem estes termos.
          </p>
          <p className="text-gray-600">
            8.2 O usuário pode solicitar o cancelamento de sua conta a qualquer momento através do email de contato.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Alterações nos Termos</h2>
          <p className="text-gray-600 mb-4">
            9.1 Estes termos podem ser alterados a qualquer momento. Alterações significativas serão comunicadas por email.
          </p>
          <p className="text-gray-600">
            9.2 O uso continuado da plataforma após alterações constitui aceitação dos novos termos.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">10. Lei Aplicável</h2>
          <p className="text-gray-600 mb-4">
            10.1 Estes termos são regidos pela legislação brasileira.
          </p>
          <p className="text-gray-600">
            10.2 Qualquer disputa será resolvida no foro da comarca do Rio de Janeiro - RJ.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">11. Contato</h2>
          <p className="text-gray-600">
            Para dúvidas sobre estes termos, entre em contato pelo email:{' '}
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

export default Terms;

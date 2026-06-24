'use client'

import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header backTo="/" backLabel="← Início" />
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc dark:prose-invert">

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          Termos de Uso
        </h1>
        <p className="text-sm text-zinc-400 mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <h2>1. Sobre o serviço</h2>
        <p>
          O Entrevistador.ai é uma plataforma de simulação de entrevistas
          de emprego que utiliza inteligência artificial para gerar
          perguntas personalizadas e fornecer feedback sobre o desempenho
          do usuário. O serviço é oferecido por pessoa física, sem
          vínculo com nenhuma empresa de recrutamento real.
        </p>

        <h2>2. Cadastro e conta</h2>
        <p>
          Para utilizar funcionalidades pagas, é necessário criar uma
          conta com e-mail válido. Você é responsável por manter a
          confidencialidade de suas credenciais de acesso.
        </p>

        <h2>3. Planos e pagamento</h2>
        <p>
          O serviço oferece um plano de assinatura mensal recorrente e
          a opção de compra avulsa de entrevistas individuais. Os
          valores vigentes estão sempre disponíveis na página de preços
          antes da confirmação da compra. Pagamentos são processados
          por terceiro (Mercado Pago), e o Entrevistador.ai não
          armazena dados de cartão de crédito.
        </p>

        <h2>4. Direito de arrependimento</h2>
        <p>
          Em conformidade com o Art. 49 do Código de Defesa do
          Consumidor, você tem o direito de desistir da compra em até
          7 (sete) dias corridos a partir da data de contratação, sem
          necessidade de justificativa, mediante solicitação pelo
          e-mail de suporte. O reembolso será processado em até 7 dias
          úteis após a solicitação. Após o uso de qualquer entrevista
          dentro do período de 7 dias, o direito de arrependimento
          aplica-se de forma proporcional ao valor não utilizado, no
          caso de planos de assinatura.
        </p>

        <h2>5. Uso aceitável</h2>
        <p>
          É proibido: tentar contornar limites de uso por meios
          automatizados (bots, scripts), compartilhar credenciais de
          acesso com terceiros, utilizar o serviço para fins ilegais,
          ou tentar extrair, copiar ou redistribuir o conteúdo gerado
          pela IA para fins comerciais sem autorização.
        </p>

        <h2>6. Limitação de responsabilidade</h2>
        <p>
          O feedback gerado pela inteligência artificial é uma
          ferramenta de apoio à preparação para entrevistas e não
          garante aprovação em processos seletivos reais. O
          Entrevistador.ai não se responsabiliza por decisões de
          contratação de terceiros.
        </p>

        <h2>7. Cancelamento</h2>
        <p>
          Assinaturas podem ser canceladas a qualquer momento através
          da área de conta. O cancelamento interrompe cobranças
          futuras, mas não gera reembolso proporcional do período já
          pago, exceto dentro do prazo de arrependimento de 7 dias.
        </p>

        <h2>8. Contato</h2>
        <p>
          Dúvidas sobre estes termos ou solicitações relacionadas
          à sua conta podem ser enviadas para:{' '}
          <a href="mailto:suporte@entrevistador-ai.com.br"
             className="text-zinc-900 dark:text-white underline
                        hover:opacity-70">
            suporte@entrevistador-ai.com.br
          </a>
        </p>

      </div>
    </div>
  );
}

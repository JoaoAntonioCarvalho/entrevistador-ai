'use client'

import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default function PrivacidadePage() {
  return (
    <div className="min-h-dvh bg-background">
      <Header backTo="/" backLabel="← Início" />
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc dark:prose-invert">

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-fg mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <p>
          Esta política descreve como o Entrevistador.IA coleta, usa e
          protege seus dados pessoais, em conformidade com a Lei Geral
          de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <h2>1. Dados que coletamos</h2>
        <ul>
          <li>Dados de cadastro: nome, e-mail</li>
          <li>
            Dados do currículo enviado: experiências profissionais,
            formação, habilidades — fornecidos voluntariamente por você
          </li>
          <li>
            Conteúdo da entrevista simulada: transcrição de áudio
            convertida em texto, respostas dadas durante a sessão
          </li>
          <li>
            Dados de uso: páginas acessadas, data e hora de uso,
            endereço IP (para fins de segurança e limite de uso)
          </li>
          <li>
            Dados de pagamento: processados diretamente pelo Mercado
            Pago — não armazenamos número de cartão ou dados bancários
          </li>
        </ul>

        <h2>2. Para que usamos seus dados</h2>
        <ul>
          <li>Gerar perguntas de entrevista personalizadas</li>
          <li>Gerar feedback e relatório de desempenho</li>
          <li>Processar pagamentos e gerenciar sua assinatura</li>
          <li>Enviar comunicações sobre sua conta (não marketing, salvo consentimento)</li>
          <li>Prevenir abuso e uso fraudulento da plataforma</li>
        </ul>

        <h2>3. Compartilhamento com terceiros</h2>
        <p>
          Seus dados de currículo e respostas são processados por
          provedores de IA (Anthropic, e/ou modelos via OpenRouter) e
          de voz (OpenAI) estritamente para gerar a experiência da
          entrevista. Nós não usamos seus dados para treinar modelos
          de IA; o tratamento feito por esses provedores segue as
          políticas de privacidade e retenção próprias de cada um.
          Dados de pagamento são processados pelo Mercado Pago. Não
          vendemos nem compartilhamos seus dados com terceiros para
          fins de marketing.
        </p>

        <h2>4. Armazenamento e segurança</h2>
        <p>
          Os dados são armazenados em banco de dados Supabase, com
          medidas técnicas de segurança para proteger contra acesso
          não autorizado. Dados de sessões de entrevista são mantidos
          enquanto sua conta estiver ativa.
        </p>

        <h2>5. Seus direitos (LGPD)</h2>
        <p>Você tem direito a, mediante solicitação por e-mail:</p>
        <ul>
          <li>Confirmar a existência de tratamento de seus dados</li>
          <li>Acessar os dados que temos sobre você</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar a exclusão de seus dados (direito ao esquecimento)</li>
          <li>Revogar consentimento a qualquer momento</li>
          <li>Solicitar a portabilidade dos seus dados</li>
        </ul>

        <h2>6. Cookies</h2>
        <p>
          Utilizamos cookies essenciais para funcionamento da
          plataforma (sessão, preferência de tema) e, mediante seu
          consentimento, cookies de análise de uso para melhorar o
          produto.
        </p>

        <h2>7. Contato do Encarregado de Dados</h2>
        <p>
          Para exercer seus direitos previstos na LGPD ou
          esclarecer dúvidas sobre o tratamento de dados,
          entre em contato pelo email:{' '}
          <a href="mailto:suporte.entrevistador.ia@gmail.com"
             className="text-zinc-900 dark:text-white underline
                        hover:opacity-70">
            suporte.entrevistador.ia@gmail.com
          </a>
          {'. '}
          Respondemos em até 2 dias úteis.
        </p>

      </div>
    </div>
  );
}

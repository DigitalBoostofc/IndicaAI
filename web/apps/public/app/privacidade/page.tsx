import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade da Indica AÍ! — bases legais, retenção e direitos do titular conforme a LGPD.",
  alternates: { canonical: "/privacidade" },
};

const VERSION = "1.0.0";
const EFFECTIVE_DATE = "14 de maio de 2026";

// Canonical source: /docs/legal/privacy-policy.md. Keep both in sync.
export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" version={VERSION} effectiveDate={EFFECTIVE_DATE}>
      <div className="mb-8 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-warning-900 dark:text-warning-200">
        <strong>Documento em revisão jurídica.</strong> Template baseado nos artigos da LGPD aplicáveis a
        SaaS B2B. Será revisado antes da publicação definitiva.
      </div>

      <h2>1. Quem é o controlador</h2>
      <p>
        <strong>Indica AÍ! Tecnologia Ltda.</strong> é a <strong>Controladora</strong> dos dados pessoais
        tratados nas páginas públicas, no fluxo de cadastro e no relacionamento direto com os usuários.
      </p>
      <p>
        Para os dados de <strong>leads e parceiros das empresas-clientes</strong>, a empresa-cliente é a{" "}
        <strong>Controladora</strong> e a Indica AÍ! atua como <strong>Operadora</strong>, nos termos do
        art. 5º, VII da LGPD.
      </p>
      <p>
        <strong>Encarregado pelo Tratamento de Dados (DPO):</strong>{" "}
        <a href="mailto:privacidade@indica.ai">privacidade@indica.ai</a>.
      </p>

      <h2>2. Dados que tratamos</h2>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Exemplos</th>
            <th>Base legal</th>
            <th>Retenção</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cadastro</td>
            <td>nome, e-mail, telefone, senha (hash)</td>
            <td>Execução de contrato (V)</td>
            <td>5 anos após encerramento</td>
          </tr>
          <tr>
            <td>KYC (opcional)</td>
            <td>CPF/CNPJ, chave Pix</td>
            <td>Obrigação legal (II) — Lei 9.613/98</td>
            <td>10 anos</td>
          </tr>
          <tr>
            <td>Uso da plataforma</td>
            <td>logs, IP, user-agent, ações</td>
            <td>Legítimo interesse (IX)</td>
            <td>12 meses (anonimização após)</td>
          </tr>
          <tr>
            <td>Cliques de divulgação</td>
            <td>timestamp, IP, UA, partner_id</td>
            <td>Execução de contrato + legítimo interesse</td>
            <td>12 meses (anonimização após)</td>
          </tr>
          <tr>
            <td>Leads de campanha</td>
            <td>nome, e-mail, telefone</td>
            <td>Execução de contrato (V) — como Operador</td>
            <td>Conforme orientação do Cliente</td>
          </tr>
          <tr>
            <td>Consentimentos</td>
            <td>versão aceita, IP, UA, data</td>
            <td>Obrigação legal (II)</td>
            <td>5 anos após revogação</td>
          </tr>
          <tr>
            <td>Marketing</td>
            <td>preferências de opt-in</td>
            <td>Consentimento (I)</td>
            <td>Até a revogação</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Como coletamos</h2>
      <ul>
        <li>
          <strong>Diretamente do titular</strong> — ao cadastrar-se, configurar a conta ou interagir com
          nossas páginas.
        </li>
        <li>
          <strong>De empresas-clientes</strong> — quando cadastram seus parceiros e leads na plataforma.
          A Indica AÍ! age como <strong>Operadora</strong> nesses casos.
        </li>
        <li>
          <strong>Automaticamente</strong> — cookies próprios, logs de servidor, parâmetros de URL (UTMs).
        </li>
      </ul>
      <p>
        <strong>Cookies de terceiros:</strong> não usamos cookies de terceiros para rastreamento
        publicitário. Apenas cookies estritamente necessários para autenticação e antifraude.
      </p>

      <h2>4. Para que tratamos</h2>
      <ul>
        <li>Operar a plataforma (cadastro, autenticação, atribuição, comissões).</li>
        <li>Cumprir obrigações legais (notas fiscais, requisições judiciais).</li>
        <li>Prevenir fraude (análise de padrões, detecção de auto-referral).</li>
        <li>Melhorar o produto (análises agregadas e anonimizadas).</li>
        <li>Comunicar sobre o serviço (faturas, mudanças de Termos) — sem opt-out, são transacionais.</li>
        <li>Marketing direto — somente com consentimento prévio e com opt-out em todo e-mail.</li>
      </ul>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Compartilhamos dados estritamente necessários com operadores subcontratados (cloud, banco de
        dados, e-mail transacional, CDN). Todos têm <strong>DPA assinado</strong>. Nas transferências
        internacionais aplicamos cláusulas contratuais padrão (SCC) e o princípio da minimização.
      </p>
      <p>
        <strong>Não vendemos dados.</strong> Compartilhamento com autoridades públicas ocorre apenas
        mediante requisição formal fundamentada (art. 23 LGPD) ou ordem judicial.
      </p>

      <h2>6. Direitos do titular (art. 18 LGPD)</h2>
      <p>Você pode, a qualquer momento:</p>
      <table>
        <thead>
          <tr>
            <th>Direito</th>
            <th>Como exercer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Confirmação de tratamento</td>
            <td><code>GET /api/me</code> ou e-mail ao DPO</td>
          </tr>
          <tr>
            <td>Acesso e portabilidade</td>
            <td><code>POST /api/me/lgpd/export</code></td>
          </tr>
          <tr>
            <td>Correção</td>
            <td>área <code>/configuracoes</code> ou e-mail ao DPO</td>
          </tr>
          <tr>
            <td>Anonimização / eliminação</td>
            <td><code>POST /api/me/lgpd/erase</code> (irreversível)</td>
          </tr>
          <tr>
            <td>Revogação de consentimento</td>
            <td><code>DELETE /api/me/consents/&#123;id&#125;</code></td>
          </tr>
          <tr>
            <td>Oposição</td>
            <td>e-mail ao DPO</td>
          </tr>
        </tbody>
      </table>
      <p>
        Atendemos solicitações em <strong>até 15 dias</strong> corridos da confirmação de identidade.
        Em caso de discordância, você pode reclamar à{" "}
        <a href="https://www.gov.br/anpd/" target="_blank" rel="noopener noreferrer">
          ANPD
        </a>
        .
      </p>

      <h2>7. Segurança</h2>
      <ul>
        <li>Senhas armazenadas com <strong>Argon2id</strong>.</li>
        <li>Transporte sempre em <strong>TLS 1.2+</strong>.</li>
        <li>Banco com <strong>Row-Level Security</strong> por tenant.</li>
        <li>Logs de auditoria append-only com retenção mínima de 5 anos.</li>
        <li>
          Plano de resposta a incidente conforme art. 48 LGPD: notificação à ANPD e aos titulares em
          prazo razoável.
        </li>
      </ul>

      <h2>8. Crianças e adolescentes</h2>
      <p>
        A Indica AÍ! <strong>não trata dados de menores de 18 anos</strong>. Se identificarmos cadastro
        de menor, a conta será encerrada e os dados eliminados.
      </p>

      <h2>9. Atualizações</h2>
      <p>
        Mudanças materiais serão notificadas por e-mail com 30 dias de antecedência. Versões anteriores
        ficam arquivadas para consulta.
      </p>

      <h2>10. Contato</h2>
      <p>
        <strong>DPO:</strong> <a href="mailto:privacidade@indica.ai">privacidade@indica.ai</a>
        <br />
        <strong>Suporte geral:</strong> <a href="mailto:contato@indica.ai">contato@indica.ai</a>
        <br />
        <strong>ANPD:</strong>{" "}
        <a
          href="https://www.gov.br/anpd/pt-br/canais_atendimento"
          target="_blank"
          rel="noopener noreferrer"
        >
          gov.br/anpd/pt-br/canais_atendimento
        </a>
      </p>
    </LegalPage>
  );
}

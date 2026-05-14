import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de uso da plataforma Indica AÍ! — regras para empresas-cliente, parceiros indicadores e visitantes.",
  alternates: { canonical: "/termos" },
};

const VERSION = "1.0.0";
const EFFECTIVE_DATE = "14 de maio de 2026";

// The canonical source for this content is /docs/legal/terms-of-service.md.
// Keep both in sync when editing — the markdown is what your lawyer reviews,
// the JSX below is what end users actually see.
export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" version={VERSION} effectiveDate={EFFECTIVE_DATE}>
      <div className="mb-8 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-warning-900 dark:text-warning-200">
        <strong>Documento em revisão jurídica.</strong> Este é um template baseado em LGPD aplicado a
        SaaS B2B. Antes de publicar a versão pública definitiva, será revisado por advogado especializado.
      </div>

      <h2>1. Quem somos</h2>
      <p>
        <strong>Indica AÍ! Tecnologia Ltda.</strong> oferece uma plataforma SaaS para criação, gestão e
        operação de programas de indicação, parceiros e recompensas. Estes Termos regulam o uso da
        plataforma por <strong>empresas-clientes</strong>, <strong>parceiros indicadores</strong> e{" "}
        <strong>visitantes</strong> das páginas públicas.
      </p>
      <p>
        Contato:{" "}
        <a href="mailto:contato@indica.ai">contato@indica.ai</a> · Encarregado de Dados (DPO):{" "}
        <a href="mailto:privacidade@indica.ai">privacidade@indica.ai</a>.
      </p>

      <h2>2. Aceite</h2>
      <p>
        Ao se cadastrar, marcar a caixa de aceite ou usar a plataforma de qualquer forma, você declara
        que leu, entendeu e concorda com estes Termos e com a{" "}
        <a href="/privacidade">Política de Privacidade</a>. Se não concorda, não use a plataforma.
      </p>
      <p>Se você aceita em nome de uma pessoa jurídica, declara ter poderes para vinculá-la.</p>

      <h2>3. Quem pode usar</h2>
      <ul>
        <li>Pessoas físicas com <strong>18 anos ou mais</strong> e capacidade civil plena.</li>
        <li>Pessoas jurídicas regularmente constituídas no Brasil.</li>
        <li>
          Pessoas Expostas Politicamente (PEPs) precisarão de cadastro KYC adicional para saque via Pix,
          quando esse fluxo for ativado.
        </li>
      </ul>

      <h2>4. Cadastro e segurança da conta</h2>
      <ul>
        <li>Forneça informações verdadeiras, completas e atualizadas.</li>
        <li>A conta é pessoal e intransferível. Você é responsável por toda atividade nela.</li>
        <li>
          Em caso de uso não autorizado, escreva imediatamente para{" "}
          <a href="mailto:seguranca@indica.ai">seguranca@indica.ai</a>.
        </li>
      </ul>

      <h2>5. Como a plataforma funciona</h2>
      <p>A Indica AÍ! permite que o Cliente:</p>
      <ol>
        <li>
          Crie <strong>programas</strong> de indicação com regras configuráveis (comissão fixa,
          percentual, meta, split flexível, recorrência etc.).
        </li>
        <li>Convide ou cadastre <strong>Parceiros</strong> para divulgar produtos com links rastreáveis.</li>
        <li>Acompanhe <strong>leads</strong>, <strong>vendas confirmadas</strong> e <strong>comissões</strong>.</li>
        <li>Processe pagamentos das comissões devidas.</li>
      </ol>
      <p>
        <strong>Pagamentos no MVP atual:</strong> o repasse de comissões é{" "}
        <strong>operado manualmente</strong> pelo Cliente fora da plataforma (por exemplo, Pix bancário).
        A Indica AÍ! registra o status (<code>pendente</code>, <code>confirmado</code>, <code>pago</code>,{" "}
        <code>cancelado</code>) e mantém o histórico auditável. Versões futuras poderão integrar gateways
        de pagamento.
      </p>

      <h2>6. Obrigações do Cliente</h2>
      <ul>
        <li>Definir regras que respeitem o CDC e a legislação publicitária.</li>
        <li>Honrar comissões devidas conforme regras publicadas no momento da indicação.</li>
        <li>
          Não usar a plataforma para promover produtos ilegais, jogos não regulamentados, esquemas em
          pirâmide ou atividades vedadas pela legislação brasileira.
        </li>
        <li>
          Tratar os dados dos seus Parceiros e leads conforme a LGPD em seu papel de{" "}
          <strong>Controlador</strong> (a Indica AÍ! atua como <strong>Operador</strong> para esses
          dados — ver <a href="/privacidade">Política de Privacidade</a>).
        </li>
      </ul>

      <h2>7. Obrigações do Parceiro</h2>
      <ul>
        <li>Divulgar a oferta com honestidade, sem se passar por funcionário do Cliente.</li>
        <li>
          Não usar técnicas de <strong>auto-referral</strong>, <strong>click farms</strong> ou bots.
          Tais práticas configuram fraude e ensejam rejeição da recompensa, encerramento de conta e
          cobrança regressiva de comissões já pagas.
        </li>
        <li>Cumprir a LGPD ao coletar contatos de potenciais leads.</li>
      </ul>

      <h2>8. Antifraude</h2>
      <p>
        Monitoramos padrões de uso, IPs, fingerprint de dispositivo e relação entre contas. Atribuições
        sob suspeita podem ser marcadas em <strong>hold</strong>, <strong>rejeitadas</strong> com
        justificativa ou disparar bloqueio preventivo. Decisões podem ser contestadas em até 30 dias em{" "}
        <a href="mailto:suporte@indica.ai">suporte@indica.ai</a>.
      </p>

      <h2>9. Planos, cobrança e cancelamento</h2>
      <p>
        Planos e preços estão em <a href="/precos">/precos</a> e integram estes Termos. Renovação
        automática mensal; cancelamento a qualquer momento pela área de configurações. Não há reembolso
        pró-rata de mensalidade já paga, exceto nos casos previstos no art. 49 do CDC (arrependimento em
        até 7 dias).
      </p>

      <h2>10. Propriedade intelectual</h2>
      <p>
        A plataforma, marca, layout, código e documentação são de propriedade exclusiva da Indica AÍ!.
        O Cliente mantém direitos sobre seu próprio conteúdo (logos, banners, textos de campanha) e
        concede licença não-exclusiva para hospedá-lo durante a vigência do contrato.
      </p>

      <h2>11. Limitação de responsabilidade</h2>
      <ul>
        <li>
          A Indica AÍ! não é parte das transações comerciais entre Clientes e Parceiros ou entre Clientes
          e seus leads. Disputas comerciais devem ser resolvidas entre as partes envolvidas.
        </li>
        <li>
          A plataforma é fornecida <strong>&quot;como está&quot;</strong>, com SLA definido no Adendo de
          SLA (quando contratado).
        </li>
        <li>
          A responsabilidade agregada da Indica AÍ! limita-se ao valor pago pelo Cliente nos{" "}
          <strong>últimos 12 meses</strong>.
        </li>
      </ul>

      <h2>12. Suspensão e encerramento</h2>
      <p>
        Podemos suspender contas que violem estes Termos. Encerramento imediato em casos de fraude
        confirmada, inadimplência ou ordem judicial. Em qualquer caso, você terá <strong>30 dias</strong>{" "}
        para exportar seus dados via <code>/api/me/lgpd/export</code> antes da anonimização irreversível.
      </p>

      <h2>13. Alterações</h2>
      <p>
        Alterações materiais serão comunicadas com 30 dias de antecedência por e-mail. O uso continuado
        após a vigência configura aceite da nova versão.
      </p>

      <h2>14. Lei aplicável e foro</h2>
      <p>
        Aplicam-se as leis da República Federativa do Brasil. Fica eleito o foro da Comarca de{" "}
        <strong>São Paulo/SP</strong>, com renúncia a qualquer outro.
      </p>
    </LegalPage>
  );
}

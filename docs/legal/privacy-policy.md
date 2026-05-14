# Política de Privacidade — Indica AÍ!

**Versão:** 1.0.0
**Vigência a partir de:** {{vigencia}}
**Última atualização:** {{atualizado_em}}

> ⚠️ **Template não revisado por advogado.** Geramos com base nos artigos da LGPD (Lei nº 13.709/2018) aplicáveis a SaaS B2B. Antes de publicar, valide as bases legais com o seu jurídico, especialmente para tratamentos como **legítimo interesse** e **execução de contrato**.

---

## 1. Quem é o controlador

**{{razao_social}}** (CNPJ **{{cnpj}}**), com sede em **{{endereco_completo}}**, é a **Controladora** dos dados pessoais tratados nas páginas públicas, no fluxo de cadastro e no relacionamento direto com os usuários da plataforma Indica AÍ!.

Para os dados de **leads e parceiros das empresas-clientes** que usam a plataforma, a empresa-cliente é a **Controladora** e a Indica AÍ! atua como **Operadora**, nos termos do art. 5º, VII da LGPD.

**Encarregado pelo Tratamento de Dados (DPO):** **{{dpo_nome}}** — **{{dpo_email}}**.

## 2. Dados que tratamos

| Categoria | Exemplos | Base legal (art. 7º LGPD) | Retenção |
|-----------|----------|---------------------------|----------|
| Cadastro | nome, e-mail, telefone, senha (hash) | execução de contrato (V) | até 5 anos após encerramento |
| Documentos KYC (opcional) | CPF/CNPJ, chave Pix | obrigação legal (II) — Lei 9.613/98 | 10 anos |
| Uso da plataforma | logs de acesso, IP, user-agent, ação realizada | legítimo interesse (IX) — segurança e auditoria | 12 meses (anonimização parcial após esse prazo) |
| Cliques de divulgação | timestamp, IP, UA, partner_id, programa | execução de contrato (V) + legítimo interesse (IX) | 12 meses (anonimização parcial após) |
| Leads das campanhas | nome, e-mail, telefone enviados pelo Parceiro/Cliente | execução de contrato (V), na figura de Operador | conforme orientação do Controlador (cliente) |
| Consentimentos | versão da política aceita, IP, UA, data | cumprimento de obrigação legal (II) | 5 anos após revogação |
| Comunicações de marketing | e-mail, preferências de opt-in | consentimento (I) — revogável a qualquer momento | até a revogação |

Listas completas e atualizadas estão em **/docs/lgpd-data-policy.md** no nosso repositório técnico.

## 3. Como coletamos

- **Diretamente do titular**: ao se cadastrar, configurar a conta ou interagir com nossas páginas.
- **De empresas-clientes**: quando elas cadastram seus parceiros e leads na plataforma. Nesses casos a Indica AÍ! age como **Operadora** e o tratamento segue as instruções documentadas do Controlador.
- **Automaticamente**: cookies próprios, logs de servidor, parâmetros de URL (UTMs).

**Cookies de terceiros:** não usamos cookies de terceiros para rastreamento publicitário. Os únicos cookies de terceiros eventualmente carregados são do provedor de pagamento (quando ativado em versão futura) e do CDN.

## 4. Para que tratamos

- **Operar a plataforma** (cadastro, autenticação, processamento de indicações, atribuição de comissões).
- **Cumprir obrigações legais** (notas fiscais, registros financeiros, requisições judiciais).
- **Prevenir fraude** (análise de padrões de clique, detecção de auto-referral, bloqueio de contas suspeitas).
- **Melhorar o produto** (análises agregadas e anonimizadas; A/B tests em métricas — nunca em saques).
- **Comunicar** sobre o serviço (faturas, mudanças de Termos, alertas de segurança) — **sem opt-out**, são comunicações transacionais.
- **Marketing direto** (newsletter, novidades) — somente com **consentimento prévio** e com opt-out em todo e-mail.

## 5. Com quem compartilhamos

Compartilhamos dados estritamente necessários com **operadores subcontratados**:

| Operador | Propósito | Onde | Salvaguarda |
|----------|-----------|------|-------------|
| **{{cloud_provider}}** | hospedagem | Brasil/EUA | DPA assinado |
| **{{db_provider}}** | banco de dados | Brasil | DPA assinado |
| **{{email_provider}}** | envio de e-mail transacional | EUA | DPA + SCC |
| **{{cdn_provider}}** | CDN e DNS | Global | DPA assinado |
| Gateway de pagamento *(quando ativado)* | processamento Pix | Brasil | LGPD + BCB-resolução 4.764 |

**Não vendemos dados.** Nunca. Não cedemos a empresas afiliadas para fins de publicidade direta.

Compartilhamento com autoridades públicas ocorre apenas mediante requisição formal fundamentada (art. 23 LGPD) ou ordem judicial.

## 6. Transferência internacional

Quando dados são transferidos para fora do Brasil (ex.: e-mail transacional via provedor americano), aplicamos as salvaguardas do art. 33 LGPD: cláusulas contratuais padrão (SCC), DPA específico e princípio da minimização.

## 7. Direitos do titular (art. 18 LGPD)

Você pode, a qualquer momento:

| Direito | Como exercer |
|---------|--------------|
| Confirmação de tratamento | `GET /api/me` (logado) ou e-mail ao DPO |
| Acesso aos dados | `POST /api/me/lgpd/export` (logado) ou e-mail ao DPO |
| Correção | área `/configuracoes` ou e-mail ao DPO |
| Anonimização / eliminação | `POST /api/me/lgpd/erase` (logado, irreversível) |
| Portabilidade | `POST /api/me/lgpd/export` gera arquivo JSON estruturado |
| Eliminação de dados tratados com consentimento | `DELETE /api/me/consents/{id}` |
| Informação sobre compartilhamento | esta política (seção 5) |
| Revogação do consentimento | `DELETE /api/me/consents/{id}` |
| Oposição a tratamento ilegítimo | e-mail ao DPO |

Atendemos solicitações em **até 15 dias** corridos da confirmação de identidade. Casos complexos podem ser prorrogados em mais 15 dias com justificativa.

Em caso de discordância com nossa resposta, você pode reclamar à **Autoridade Nacional de Proteção de Dados (ANPD)**: [anpd.gov.br](https://www.gov.br/anpd/).

## 8. Segurança

- Senhas armazenadas com **Argon2id** (resistente a GPU).
- Transporte sempre em **TLS 1.2+** (HTTPS).
- Banco com **Row-Level Security** por tenant.
- Logs de auditoria **append-only** com retenção mínima de 5 anos.
- Princípio do menor privilégio em acessos administrativos internos.
- Plano de resposta a incidente conforme art. 48 LGPD: notificação à ANPD e aos titulares afetados em prazo razoável.

## 9. Crianças e adolescentes

A Indica AÍ! **não trata dados de menores de 18 anos**. Se identificarmos cadastro de menor, a conta será encerrada e os dados eliminados.

## 10. Cookies

Detalhados na **Política de Cookies** (em construção). Resumo: usamos apenas cookies estritamente necessários para autenticação e antifraude. Não há cookies de marketing de terceiros.

## 11. Atualizações desta política

Mudanças materiais serão notificadas por e-mail com **30 dias** de antecedência. Versões anteriores ficam em **/privacidade/v/{numero}**.

## 12. Contato

**DPO:** {{dpo_nome}} — **{{dpo_email}}**
**Suporte geral:** **{{email_contato}}**
**ANPD:** [anpd.gov.br/canais_atendimento](https://www.gov.br/anpd/pt-br/canais_atendimento)

---

*Esta política é redigida em português brasileiro como idioma autêntico. Traduções têm valor meramente informativo.*

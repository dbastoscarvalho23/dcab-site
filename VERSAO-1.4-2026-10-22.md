# DCAB Consulting — versão 1.4 (22-10-2026)

Alertas de vulnerabilidades por fabricante na área reservada: o cliente indica os fabricantes ou a lista de ativos e recebe por email as vulnerabilidades críticas que os afetam.

| Campo | Valor |
|---|---|
| Versão | 1.4 |
| Data | 22-10-2026 |
| Estado | Pacote entregue; por publicar |
| Pacote | `site-dcabconsulting-v1.4.zip` |
| Publicação | `bash publicar.sh funcoes` + `Incidentes.gs` no Apps Script |
| Guia | `GUIA-IMPLEMENTACAO-V1.4.md` |

## 1. O que muda

### Área reservada · secção «Vulnerabilidades»
- **Fabricantes e ativos.** Catálogo com 16 fabricantes: Check Point, Cisco, CrowdStrike, CubeBackup, Dell, Fortinet, Fujitsu, HPE (com Aruba), Lenovo, NetApp, Netskope, Palo Alto Networks, Pure Storage, Splunk, Veeam e Zscaler.
  - «Escolher fabricantes» cobre todos os produtos de um fabricante.
  - «Acrescentar ativo» e «Importar lista» (CSV: fabricante; produto; versão; designação) restringem ao produto e à versão.
  - O catálogo traduz os nomes comerciais para os das fontes, por exemplo «FortiGate» para «FortiOS» e «Firewall» da Palo Alto para «PAN-OS».
  - Até 500 ativos por cliente.
- **Vulnerabilidades.** Uma linha por CVE e por cliente, com:
  - gravidade (CVSS);
  - exploração (KEV ou EUVD);
  - EPSS;
  - nível de correspondência: versão afetada, produto, ou só fabricante;
  - prioridade do aviso e estado: Novo, Em análise, Corrigido, Mitigado, Não afetado ou Risco aceite.
- **Avisos por email**, escolhidos pelo cliente:
  - email imediato;
  - email imediato também para todas as críticas;
  - resumo diário;
  - omitir o produto nos emails.
- **Ficha do cliente.** O administrador liga o serviço com «Alertas de vulnerabilidades ativos». Os ativos podem ser registados antes.
- **Acessos.** Secção nova «Vulnerabilidades». O papel Cliente pode tê-la. Os acessos existentes com lista de secções não a recebem sozinhos.
- **Botão «Verificar agora».** Só o administrador o vê.

### Servidor
- **`recolherCves`, de 15 em 15 minutos:**
  - Lista CVE: registos novos e atualizados (`deltaLog.json`). Só são considerados os de este ano e do anterior.
  - NVD: CPE e CVSS do NIST dos publicados nos últimos 30 dias.
  - Catálogo KEV e exploradas da EUVD, de hora a hora.
  - EPSS uma vez por dia, para os alertas abertos, a partir do ficheiro completo do dia (não se enviam ao FIRST os identificadores das vulnerabilidades dos clientes).
- **Fila persistente:** cada vulnerabilidade entra na fila antes de o cursor avançar e só sai depois de cruzada com todos os clientes (até 4 tentativas). As que acabam de entrar no KEV ou na EUVD ficam marcadas na fila. Uma só execução de cada vez.
- **Emails sem repetição:** o Apps Script regista cada email enviado durante 6 horas e não o volta a enviar, mesmo que a gravação do resultado falhe.
- **Regras de prioridade:**
  - **Imediato:** explorada (KEV ou EUVD), ou CVSS ≥ 9,0 com EPSS no percentil 90 ou acima.
  - **Resumo diário:** CVSS ≥ 7,0.
  - **Restantes:** só na área reservada.
  - Se uma vulnerabilidade passar a explorada, volta a avisar, mesmo que já estivesse tratada.
- **Alertas novos:** só para registos publicados nos últimos 30 dias, ou que acabem de entrar no KEV ou na EUVD.
- **Registo de um ativo novo:** mostra as exploradas (KEV) do último ano, marcadas «anterior ao registo do ativo», sem email.
- **Emails:** seguem pela tarefa de 15 em 15 minutos do Apps Script (`cve-imediato` e `cve-resumo`).
  - Destinatários: as pessoas do cliente com a secção, com a equipa em cópia. Se o cliente não tiver ninguém com a secção, seguem só para a equipa.
  - Os emails não levam a lista de ativos.

### Site público
- **Política de privacidade (22-10-2026):**
  - finalidade e fundamento do envio dos avisos;
  - secção «Alertas de vulnerabilidades (serviço contratado)»;
  - Google Workspace também para os avisos de vulnerabilidades.
- **Referências:** fontes de dados novas e versão 1.4.

## 2. Ficheiros

| Ficheiro | Alteração |
|---|---|
| `public/reservado/cve.js` | Novo: catálogo, normalização, correspondência por fabricante, produto e versão, prioridade, leitura do CSV |
| `functions/cve-logica.mjs` | Cópia de `public/reservado/cve.js` (igualdade verificada por teste e pelo `publicar.sh`) |
| `functions/cve-servidor.mjs` | Novo: registos CVE 5 e NVD, KEV, alerta por cliente, atualização, ações de email |
| `functions/fontes-cve.js` | Novo: descargas da lista CVE, NVD, KEV, EPSS e EUVD |
| `functions/index.js` | `recolherCves`, `recolherCvesAgora`; ações e resultados `cve-*` na API dos incidentes |
| `functions/logica.js` | Secção «vulnerabilidades» |
| `functions/test/cve.test.mjs` | 18 testes novos (45 no total) |
| `firestore.rules` | `ativos`, `preferencias/vulnerabilidades`, `cves`; `servicoCve` na ficha do cliente |
| `testes-regras/regras.test.mjs` | 3 testes novos (22 no total) |
| `public/reservado/app.js` · `index.html` · `reservado.css` | Secção «Vulnerabilidades» |
| `apps-script/Incidentes.gs` | Envia `cve-imediato` e `cve-resumo` com remetente próprio |
| `ferramentas/testar-cve.js` | Teste com as fontes reais (Cloud Shell) |
| `public/privacidade.html` · `public/referencias.html` | Texto legal e referências |
| `publicar.sh` · `verificar-v1.4.sh` | Ficheiros novos, cópia do catálogo, verificação |

## 3. Verificação feita

- Testes das funções: 45 de 45 (correspondência, versões, prioridade, emails, revisão).
- Simulação completa com Firestore em memória: três clientes (um sem o serviço), KEV com histórico, fonte em falha, entrada no KEV, execução em curso, tarefas e resultados pela API assinada. Sem alertas para o cliente sem serviço, nem para registos de outros fabricantes ou antigos; histórico sem email; a fonte em falha fica na fila; um aviso por vulnerabilidade.
- Área reservada num navegador com dados de exemplo: painel, tratar, fabricantes, ativo com erro, importação com prévia e erros, preferências, acesso de cliente, largura de telemóvel. Sem erros na consola.
- Revisão independente do código: 12 pontos, todos corrigidos (fila persistente, versões com prefixo e «.0», produtos mais específicos do catálogo, CPE «hp», limites, EPSS sem envio de identificadores, emails sem repetição, execução única, exportação CSV sem fórmulas).
- Fontes confirmadas em registos reais: nomes de cada fabricante nos registos CVE e no NVD; a CubeBackup não tem vulnerabilidades publicadas; os registos da Fujitsu aparecem como «Fujitsu / Fsas Technologies»; desde 2025 os da Splunk são atribuídos pela Cisco.

## 4. Base legal

- **Gestão de vulnerabilidades como medida de segurança:** Diretiva (UE) 2022/2555, art. 21.º, n.º 2, alínea e), transposta pelo DL 125/2025. A correspondência com o artigo do regime jurídico ainda está por confirmar no Diário da República.
- **Avisos por email às pessoas indicadas pelo cliente:** RGPD, art. 6.º, n.º 1, alínea f), com a informação na política de privacidade (arts. 13.º e 14.º).
- **Lista de ativos:**
  - não contém dados pessoais, e a interface pede que a designação também não os tenha;
  - acesso só com segundo fator (RGPD, art. 32.º);
  - não é enviada às fontes.
- **Comunicações:** não são comunicações de marketing (Lei 41/2004, art. 13.º-A não se aplica). São avisos de um serviço contratado. A subscrição pública por fabricante, quando existir, precisa de consentimento com dupla confirmação.
- **Conservação:** 36 meses após a deteção (TTL `expira`). A lista de ativos é apagada quando o cliente a retira ou no fim do contrato.

## 5. Por confirmar

- Termos de reutilização da EUVD (ENISA). Os restantes estão na página de referências (KEV: CC0; NVD: aviso obrigatório, já na área reservada; EPSS: atribuição pedida).
- Endereço do ficheiro diário do EPSS (o teste no Cloud Shell confirma).
- Nomes de fabricante que o catálogo ainda não reconhece: a secção 4 do `testar-cve.js` no Cloud Shell.
- Piloto: começa com DCAB, Neora e AnkoraOne (guia, fase 5); clientes externos depois. Contrato com cada cliente externo: serviço, destinatários dos avisos e fim do contrato (devolução ou apagamento da lista de ativos).
- Testes das regras no emulador (Cloud Shell): 22.

## 6. Versão 1.4.1 (22-10-2026)

- **Correção nas regras dos incidentes (problema desde a versão 1.3).** Os testes no emulador mostraram que o registo de um incidente pelo cliente, e pela equipa com o responsável e os contactos preenchidos, era recusado: a validação passava o limite de 1000 expressões avaliadas por pedido do Firestore. Os incidentes abertos pelo formulário do site e pelo CRM não eram afetados (são criados pelo servidor).
  - Listas fechadas de valores (tipo, estado, origem, qualificação, risco, sim/não) verificadas com uma expressão regular, em vez de listas literais (cada texto de uma lista conta como uma expressão).
  - O registo das comunicações (`notificacoes`) começa vazio na criação e só é validado quando muda.
  - O papel de quem escreve é lido uma vez por pedido.
  - Na alteração, o cliente só passa pela validação do registo das comunicações; a equipa passa pela validação completa.
- **Observatório em observatorio.dcabconsulting.com:** ligações do site e verificação de disponibilidade (ver «Mudança do Observatório»).

# DCAB Consulting — versão 1.3 (19-10-2026)

Pedido de apoio a incidentes pelo formulário, com abertura automática do processo, provas entregues no Google Drive e avisos por email de 15 em 15 minutos.

| Campo | Valor |
|---|---|
| Versão | 1.3 |
| Data | 19-10-2026 |
| Estado | Pacote entregue; por publicar |
| Pacote | `site-dcabconsulting-v1.3.zip` |
| Publicação | `bash publicar.sh funcoes` + Apps Script (guia, fases 2 a 6) |
| Guia | `GUIA-IMPLEMENTACAO-V1.3.md` |
| CRM | `ESPEC-CRM-INCIDENTES-V1.3.md` (por implementar no CRM) |

## 1. O que muda

### Fluxo automático
1. O cliente escolhe no formulário «Incidente: pedido de apoio urgente». O Apps Script envia o email habitual e chama `POST /api/incidentes/pedido` (HMAC-SHA256, janela de 5 minutos, identificador de uso único).
2. A função identifica o cliente: pessoa com acesso de cliente a um só cliente, ou domínio do email registado num único cliente (nunca domínios gratuitos).
   - **Reconhecido:** incidente `INC-AAAA-NNN` «Por triar», origem «formulario», provas P01 a P03 com prazo de 24 horas. O Apps Script cria a pasta no Drive (raiz só DCAB, «Entregas do cliente» partilhada, «Cópias de integridade» só DCAB) e responde ao cliente com a referência, as provas e os primeiros cuidados.
   - **Não reconhecido, ou mais de 3 pedidos automáticos do mesmo cliente na última hora:** fica em `pedidosIncidente` («Pedidos por triar»), sem resposta automática, com aviso à equipa ao fim de 30 minutos. A equipa converte ou descarta.
   - O título do incidente automático é fixo e os emails não repetem o nome, a empresa nem a mensagem do remetente (o endereço do formulário não é verificado).
3. Tarefa `tarefasIncidentes` de 15 em 15 minutos, só para incidentes criados a partir de 19-10-2026: pastas em falta (incidentes abertos à mão ou pelo CRM), partilha da pasta de entregas sincronizada, ficheiros novos (SHA-256 e cópia; o servidor indica os já registados), lembretes das provas (diário e a 2 horas do prazo), aviso de prova em atraso, avisos dos prazos de notificação obrigatória (12 h, 6 h, 1 h e atraso, uma vez por prazo; se a equipa corrigir a hora, os avisos do novo prazo voltam a sair). Cada resultado é gravado logo depois da ação, para um email não sair duas vezes e resumo diário a partir das 8 horas.
4. Os emails não levam a descrição do incidente nem dados pessoais: só a referência, o título, os prazos e as ligações.
5. O CRM pode abrir um incidente com `POST /api/incidentes/abrir`, com segredo próprio (`INCIDENTES_SEGREDO_CRM`).

### Área reservada
- Estado «Por triar»; bloco «Pedidos de apoio por triar» com **Converter** e **Descartar**.
- Detalhe do incidente: bloco «Acompanhamento» (origem, responsável na DCAB, emails que recebem os avisos, pastas do Drive), «Provas pedidas» (pedir, editar, validar; atraso a vermelho) e «Ficheiros recebidos» (nome, tamanho, SHA-256).
- Registar e editar: responsável na DCAB e emails do cliente que recebem os avisos.
- Administrador: **Clientes** (denominação, NIPC, domínios de email, identificador no CRM) e **Avisos por email** (responsável por omissão e equipa).

### Site público
- Assunto novo no formulário e `?assunto=incidente`.
- Página de resposta a incidentes: caixa «Está a ser atacado agora?» com os primeiros cuidados e o botão «Pedir apoio urgente».
- Rodapé de todas as páginas: firma, tipo, capital social, sede, conservatória e matrícula/NIPC (CSC, art. 171.º, n.os 1 e 2); retirada a ligação à Neora do rodapé. Dados estruturados com a firma completa.
- Política de privacidade (19-10-2026): firma completa; fundamento dos pedidos de quem ainda não é cliente; pedido pelo formulário, provas no Google Drive, cópia de integridade, avisos por email e abertura pelo CRM; Google como subcontratante ulterior.
- Referências: CSC, art. 171.º; versão 1.3.

## 2. Ficheiros

| Ficheiro | Alteração |
|---|---|
| `functions/index.js` | `incidentesApi` (pedido, tarefas, resultados, abrir) |
| `functions/incidentes-api.js` | Novo: assinatura, identificação do cliente, ações da tarefa, resultados |
| `functions/incidentes-prazos.mjs` | Cópia de `public/reservado/incidentes.js` (tem de ser igual; verificado por teste e pelo `publicar.sh`) |
| `functions/test/incidentes-api.test.mjs` | 11 testes novos (26 no total) |
| `firebase.json` | Reescrita `/api/incidentes/**` → `incidentesApi` (europe-west1); cabeçalhos `no-store` |
| `firestore.rules` | Fichas de cliente (admin), campos do sistema protegidos, `provas`, `ficheiros`, `pedidosIncidente`, `config/incidentes` |
| `testes-regras/regras.test.mjs` | 6 testes novos (19 no total) |
| `apps-script/Incidentes.gs` | Novo |
| `apps-script/Codigo.gs` | Assunto novo e chamada a `tratarPedidoIncidente` (cópia de referência; no Apps Script colam-se só as duas alterações) |
| `public/reservado/app.js` · `incidentes.js` · `reservado.css` | Área reservada |
| `public/assets/js/assunto.js` · `estilo.css` | Assunto `incidente`; caixa de pedido urgente |
| `ferramentas/comum.py` · `gerar_inicio.py` · `gerar_solucoes.py` · `gerar_referencias.py` | Rodapé, formulário, página de incidentes, referências |
| `public/*.html` · `public/solucoes/*.html` | Regeneradas |
| `publicar.sh` · `verificar-v1.3.sh` | Segredos novos, cópia dos prazos, verificação do `/api/incidentes` |

## 3. Verificação feita

- Testes das funções: 26 de 26.
- Revisão independente do código: sem achados críticos. Corrigidos antes da entrega: abuso do formulário (limite por cliente e hora, título fixo, sem resposta a remetentes não reconhecidos), partilha do Drive sincronizada, resultados gravados ação a ação e ficheiros conhecidos indicados pelo servidor, bloqueio entre o formulário e a tarefa, avisos de prazo ligados ao prazo, campos que o cliente não pode escolher (responsável, origem, contactos), validação estrita de emails, incidentes anteriores fora da automatização, um segredo por origem, lembrete só com a subpasta criada, nome da pasta igual nos dois caminhos, ficheiros em subpastas, triagem sem bloqueio aos 50 pedidos, SHA-256 de documentos Google, texto dos emails.
- Área reservada num navegador com dados de exemplo e serviços simulados: lista com pedido por triar, detalhe com provas em atraso e ficheiro recebido, validar, pedir prova, mudar prazo (lembretes recomeçam), converter pedido, criar cliente (domínio gratuito recusado), configuração, perfil de cliente (sem triagem, sem pasta só DCAB), largura de telemóvel. Sem erros na consola.
- Site: `?assunto=incidente` seleciona o assunto; rodapé e caixa urgente verificados a 390 px.
- Base legal: RGPD arts. 6.º, 22.º, 28.º e 30.º; CSC art. 171.º (verificado na PGDL); prazos de notificação como na versão 1.2.

## 4. Por confirmar

- Testes das regras no emulador (Cloud Shell): 19.
- Contrato do art. 28.º com cada cliente: autorização da Google como subcontratante ulterior antes de usar a entrega pelo Drive.
- Edição do Google Workspace com unidades partilhadas e partilha com visitantes.
- Se o `EnviarCRM.gs` passa os pedidos de incidente para leads do CRM.
- Pontos legais herdados da versão 1.2 (art. 48.º do anexo do DL 125/2025 e outros).

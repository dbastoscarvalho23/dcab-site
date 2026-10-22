# DCAB Consulting — versão 1.2 (18-10-2026)

Área reservada com página de início e acessos por secção, e módulo de incidentes com os prazos de notificação e as minutas para o cliente submeter.

| Campo | Valor |
|---|---|
| Versão | 1.2 |
| Data | 18-10-2026 |
| Estado | Publicada a 19-10-2026; páginas NIS2, privacidade e referências confirmadas no domínio |
| Pacote | `site-dcabconsulting-v1.2.zip` |
| Publicação | `bash publicar.sh funcoes` (alojamento, regras e funções) |
| Procedimento | Documento «Procedimento de notificação de incidentes» (claude.ai) |

## 1. O que muda

### Área reservada (dcabconsulting.com/reservado)
- **Início.** Depois da entrada, um cartão por secção a que a pessoa tem acesso: Candidatura, Vigilância, Incidentes e Acessos (só administradores). Cada cartão mostra um resumo (execução, alertas abertos, incidentes abertos e prazos em atraso).
- **Outras secções.** Ligações para fora do site (por exemplo o CRM) ficam no Firestore (`portal/ligacoes`), não no código público. Só a equipa as vê; só o administrador as altera. Só são aceites endereços `https://`.
- **Acessos por secção.** O convite e a alteração de papel passam a ter caixas de secções. O papel define o máximo (o cliente nunca vê a candidatura; o administrador vê tudo); a lista restringe. Acessos antigos da equipa sem lista mantêm todas as secções do papel; acessos antigos de clientes ficam só com a vigilância até o administrador lhes dar os incidentes em «Papel e secções». As regras do Firestore aplicam a mesma restrição.
- **Incidentes.** Por cliente: registo com a hora da deteção, avaliação (significativo, dados pessoais, risco), regimes aplicáveis (DL 125/2025, RGPD, DORA), prazos a correr, minutas preenchidas, registo de cada envio (data, hora, referência) e cronologia que só aceita novos registos. Descarga do registo completo em texto.
- **Base única da candidatura.** A secção em claude.ai passou a só leitura, com ligação para a área reservada. O cartão do portal em claude.ai aponta para /reservado.

### Prazos calculados (incidentes.js)

| Comunicação | Prazo | A contar de | Base |
|---|---|---|---|
| CNCS · inicial | 24 h | Verificação de que existe ou pode vir a existir incidente significativo | DL 125/2025, anexo, arts. 40.º e 42.º, n.os 1 e 2 |
| CNCS · atualização | 72 h, quando necessária | Verificação | Art. 42.º, n.º 3 |
| CNCS · fim do impacto | 24 h | Fim do impacto | Art. 43.º |
| Resolvido em 2 h | Só a notificação de fim do impacto | Deteção | Art. 41.º, n.º 2 |
| CNCS · relatório final | 30 dias úteis (fins de semana e feriados nacionais excluídos) | Envio do fim do impacto | Art. 44.º, n.º 1 |
| CNCS · intercalar | A pedido ou semanal | — | Arts. 41.º, n.º 3, e 44.º, n.os 3 e 4 |
| CNPD | 72 h, sempre que possível | Conhecimento da violação | RGPD, art. 33.º |
| Titulares | Sem demora injustificada, com risco elevado | — | RGPD, art. 34.º |
| DORA | 4 h após classificação, máx. 24 h após conhecimento; 72 h; 1 mês | — | Reg. Delegado (UE) 2025/301, art. 5.º |
| Queixa-crime | 6 meses (crimes semipúblicos) | Conhecimento do facto e dos autores | Lei 109/2009, arts. 4.º, n.º 6, e 6.º, n.º 7; CP, art. 115.º |

### Site público
- **Página NIS2:** a notificação inicial conta da verificação de que existe ou pode vir a existir incidente significativo; relatórios intercalares semanais; ANACOM e GNS como autoridades setoriais; remissão corrigida para arts. 40.º a 44.º. Retirada a frase «a falta de notificação é uma contraordenação muito grave», por não estar confirmada no texto oficial.
- **Política de privacidade:** novo fundamento «Apoio à resposta e à notificação de incidentes contratado» (art. 28.º) e secção «Apoio a incidentes»; a área reservada passa a guardar as secções de cada pessoa. Data: 18-10-2026.
- **Referências:** Regulamento de Execução (UE) 2024/2690, Regulamento Delegado (UE) 2025/301, Código Penal art. 115.º; versão 1.2 da área reservada e registo de alterações.

## 2. Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `firestore.rules` | `seccao()`, candidatura e vigilância por secção, `clientes/*/incidentes` (+ `eventos`), `portal/ligacoes` |
| `functions/logica.js` | `lerSeccoes`; convites e mudança de papel guardam `seccoes` |
| `functions/test/incidentes.test.mjs` | 10 testes: feriados, dias úteis, prazos NIS2 e RGPD, minutas, referências, secções |
| `functions/package.json` | `npm test` corre os testes `.js` e `.mjs` |
| `public/reservado/index.html` · `app.js` · `reservado.css` | Início, navegação por secções, incidentes, acessos por secção |
| `public/reservado/incidentes.js` | Novo: prazos, feriados, minutas |
| `public/privacidade.html` · `public/solucoes/nis2-decreto-lei-125-2025.html` · `public/referencias.html` | Textos acima |
| `ferramentas/gerar_solucoes.py` · `ferramentas/gerar_referencias.py` | Geradores das páginas acima |
| `publicar.sh` | Verifica `incidentes.js` |
| `testes-regras/` | Novo: 13 testes das regras no emulador (a correr no Cloud Shell) |

## 3. Verificação feita

- Testes das funções: 15 de 15 (`cd functions && npm test`), incluindo prazos com a hora de Lisboa (verão e inverno).
- Revisão independente do código e das regras: sem achados críticos; corrigidos os prazos que não apareciam com a avaliação «Em avaliação», o fecho dos dias úteis à meia-noite de Lisboa, os acessos antigos de clientes (ficam só com a vigilância até o administrador escolher), o administrador sempre com todas as secções, referências de incidente únicas (são o identificador do documento) e envio registado sempre com data.
- Área reservada aberta num navegador com dados de exemplo e serviços simulados: início, incidentes, detalhe, minuta, acessos, perfil de cliente e largura de telemóvel, sem erros na consola.
- Base legal: DL 125/2025 (anexo, arts. 1.º a 22.º no PDF do DR; arts. 40.º a 44.º na base da PGR Lisboa), Regulamento n.º 756/2026 (PDF do DR), Regulamentos (UE) 2024/2690 e 2025/301 (EUR-Lex), RGPD e Orientações 9/2022 do CEPD, Lei 109/2009 e Código Penal.
- Testes das regras no emulador (Cloud Shell, 19-10-2026): a primeira execução revelou que o pedido do cliente passava o limite de 1000 expressões das regras; as regras dos incidentes passaram a ler o acesso uma só vez por pedido (`papelIncidentes`). A configuração dos testes passou a copiar as regras para a pasta dos testes.
- Publicação a 19-10-2026 com `bash publicar.sh funcoes`: todas as verificações no domínio com ✔.

## 4. Por confirmar

- Texto do art. 48.º do anexo do DL 125/2025 (comunicação aos destinatários dos serviços); arts. 45.º a 47.º, 51.º, 59.º e 61.º a 66.º.
- Relação DORA/CNCS para entidades financeiras.
- Instrução técnica do CNCS (formulário, taxonomia, limiares) e nome oficial da plataforma.
- Campos do formulário da CNPD.
- Contrato de subcontratação (art. 28.º) com cada cliente que use o módulo de incidentes, com o prazo de conservação e a devolução no fim.

## 5. Critérios para a próxima versão

- Testes das regras a passar no emulador e integrados no `publicar.sh`.
- Alertas por email quando um prazo de notificação estiver a menos de 6 horas.
- Verificação dos artigos por confirmar e ajuste das minutas ao formulário do CNCS quando for publicado.

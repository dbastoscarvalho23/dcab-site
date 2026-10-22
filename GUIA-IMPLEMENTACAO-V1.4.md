# Guia de implementação · versão 1.4

**Data:** 22-10-2026 · **Tempo total:** cerca de 1 hora e 30 minutos, em 9 fases.

Esta versão acrescenta à área reservada os **alertas de vulnerabilidades por fabricante**:

- cada cliente indica os fabricantes que usa (catálogo com 16: Check Point, Cisco, CrowdStrike, CubeBackup, Dell, Fortinet, Fujitsu, HPE com Aruba, Lenovo, NetApp, Netskope, Palo Alto Networks, Pure Storage, Splunk, Veeam e Zscaler) ou importa a lista de ativos com produto e versão;
- de 15 em 15 minutos, a função `recolherCves` descarrega as vulnerabilidades novas da lista CVE, do NVD, do catálogo KEV da CISA e da EUVD da ENISA, e uma vez por dia o ficheiro completo do EPSS do FIRST;
- cada vulnerabilidade entra numa fila antes de ser analisada: se uma fonte falhar ou o tempo acabar, fica para a execução seguinte, e as que passam a exploradas nunca se perdem;
- cruza-as com os ativos de cada cliente e cria um registo por vulnerabilidade e por cliente, com o nível de correspondência (versão afetada, produto ou só fabricante);
- **email imediato** quando a vulnerabilidade é explorada (KEV ou EUVD) ou é crítica com probabilidade alta de exploração; **resumo diário** às 8 horas das altas e críticas; as restantes ficam só na área reservada;
- ao registar um ativo, aparecem as vulnerabilidades exploradas do último ano desse fabricante ou produto, sem email;
- os emails seguem pelo Apps Script dos incidentes e não levam a lista de ativos;
- o serviço liga-se cliente a cliente, pelo administrador (decisão comercial).

Nenhum dado de cliente é enviado às fontes: são descargas públicas por data ou do catálogo inteiro.

Siga as fases pela ordem.

## Ficheiros

| Ficheiro | Para quê |
|---|---|
| `site-dcabconsulting-v1.4.zip` | Site, regras, funções, testes e Apps Script. Não traz o `principal.js` |
| `apps-script/Incidentes.gs` (dentro do zip) | Substitui o ficheiro com o mesmo nome no Apps Script |
| `ferramentas/testar-cve.js` (dentro do zip) | Teste com as fontes reais, no Cloud Shell |
| `verificar-v1.4.sh` (dentro do zip) | Verificação só de leitura depois de publicar |

---

## Fase 0 · Cópia de segurança (5 min, Mac)

```bash
cd ~/Documents
rsync -a --exclude node_modules site-dcabconsulting/ site-dcabconsulting-copia-v1.3/
ls site-dcabconsulting-copia-v1.3/public/assets/js/principal.js
```

**Resultado esperado:** a última linha mostra o caminho do `principal.js`.

---

## Fase 1 · Testar as regras e as fontes no Cloud Shell (20 min)

1. Abra https://console.cloud.google.com/?project=dcab-consulting e clique em **>_**.
2. **⋮** › **Carregar** › `site-dcabconsulting-v1.4.zip`.
3. Regras:

```bash
rm -rf ~/site-v14 && unzip -q -o ~/site-dcabconsulting-v1.4.zip -d ~/site-v14
cd ~/site-v14/testes-regras && npm install && npm test
```

**Resultado esperado:** `# pass 22` e `# fail 0`. Se houver `fail`, não publique: envie as linhas com «not ok».

4. Fontes reais (não grava nada):

```bash
cd ~/site-v14 && node ferramentas/testar-cve.js 48
```

**Resultado esperado:**
- secção 1 só com ✔ (lista CVE, NVD, KEV, EPSS e EUVD). No EPSS, a linha indica a data do ficheiro do dia; se der ✘, envie-me a linha (o endereço do ficheiro mudou de servidor em 2025 e tenho dois previstos);
- secção 2 com o número de vulnerabilidades exploradas do último ano por fabricante (Cisco, Fortinet, Palo Alto e Check Point costumam ter várias; a CubeBackup não tem nenhuma vulnerabilidade publicada até hoje, por isso fica sempre a zero);
- secção 3 com os registos recentes de cada fabricante e o total de emails que haveria com os 16 marcados;
- secção 4: nomes parecidos que o catálogo não reconhece. **Envie-me esta secção**, mesmo que diga «nenhum».

---

## Fase 2 · Publicar (10 min, Mac)

```bash
cd ~/Documents
unzip -o ~/Downloads/site-dcabconsulting-v1.4.zip -d site-dcabconsulting
cd site-dcabconsulting
bash publicar.sh funcoes
```

**Resultado esperado:** «Testes das funções passaram» e só ✔ no fim, incluindo «Catálogo de fabricantes publicado».

Funções novas: `recolherCves` (de 15 em 15 minutos) e `recolherCvesAgora` (botão «Verificar agora»). Se o Firebase perguntar se quer apagar alguma função ou política de TTL, responda **N**.

Se a publicação falhar com «missing permission on the build service account», são as mesmas quatro funções do serviço de compilação já atribuídas na versão 1.3: envie-me as últimas linhas.

---

## Fase 3 · Prazo de conservação (5 min, Cloud Shell)

```bash
gcloud firestore fields ttls update expira --collection-group=cves --enable-ttl --project=dcab-consulting --async
```

**Resultado esperado:** uma operação criada. Cada vulnerabilidade registada é apagada cerca de 36 meses depois da deteção.

---

## Fase 4 · Apps Script (5 min)

1. https://script.google.com › projeto do formulário › ficheiro **Incidentes.gs**.
2. Selecione tudo, apague e cole o conteúdo de `apps-script/Incidentes.gs` do zip. **Guardar**.
3. Não mexa no `Codigo.gs` nem volte a executar `instalarTarefas()`: a tarefa de 15 em 15 minutos já existe e passa a enviar também os alertas de vulnerabilidades.

---

## Fase 5 · Ligar o serviço aos três primeiros clientes (20 min, área reservada)

O piloto começa com DCAB, Neora e AnkoraOne. Em https://dcabconsulting.com/reservado › **Incidentes** › **Clientes**, crie ou abra cada um e marque **Alertas de vulnerabilidades ativos**:

| Identificador | Denominação | Domínio de email |
|---|---|---|
| `dcab` | DCAB Consulting | dcabconsulting.com |
| `neora` | Neora Consulting | neora.pt |
| `ankoraone` | AnkoraOne | ankoraone.com |

Se algum já existir com outro identificador (por exemplo dos incidentes), use esse e só marque a opção.

Para cada um:

1. **Vulnerabilidades** › escolha o cliente › **Importar lista**, com os equipamentos e o software que cada empresa usa (fabricante; produto; versão; designação). Se ainda não tiver a lista, use **Escolher fabricantes** e marque os que a empresa usa.
2. **Avisos por email** › **Alterar**: deixe as opções por omissão. Gravar.
3. **Acessos**: quem deve receber os avisos da Neora precisa de um acesso com o papel **Cliente**, o cliente `neora` e a secção **Vulnerabilidades**. Este acesso é só à área reservada; não dá acesso ao CRM. Na DCAB e na AnkoraOne, a equipa já recebe os avisos pela configuração em **Incidentes** › **Avisos por email**.

Sem nenhuma pessoa do cliente com a secção, os avisos vão só para a equipa definida em **Incidentes** › **Avisos por email** (responsável por omissão daniel.carvalho@dcabconsulting.com).

Dica para a lista da DCAB e da AnkoraOne: inclua também o que suporta a plataforma (firewall, VPN, cópias de segurança, servidores), não só os postos de trabalho.

---

## Fase 6 · Primeira verificação (15 min)

1. Em **Vulnerabilidades**, clique em **Verificar agora** (só o administrador vê o botão). Pode demorar até 4 minutos.
2. **Resultado esperado:**
   - a mensagem «N registos analisados · M vulnerabilidades novas»;
   - na tabela de cada cliente, as vulnerabilidades exploradas do último ano dos fabricantes e produtos indicados, com a nota «anterior ao registo do ativo» (estas não geram email);
   - o indicador «Última verificação» com a hora atual.
3. Nas horas seguintes, as vulnerabilidades novas chegam por email a daniel.carvalho@dcabconsulting.com e às pessoas da Neora com a secção: as exploradas logo, as altas e críticas no resumo das 8 horas.

Se houver demasiados emails, troque fabricantes inteiros por produtos com versão.

---

## Fase 7 · Validar (10 min)

```bash
cd ~/Documents/site-dcabconsulting && bash verificar-v1.4.sh
```

Na área reservada, abra uma vulnerabilidade com **Tratar** e confirme: descrição, gravidade, exploração, EPSS (aparece no dia seguinte), ativos afetados e ligações para o registo CVE, o NVD e o aviso do fabricante. Mude o estado para «Em análise» e grave.

Na política de privacidade (https://dcabconsulting.com/privacidade) deve aparecer a secção «Alertas de vulnerabilidades (serviço contratado)», com data de 22 de outubro de 2026.

---

## Fase 8 · Alargar o piloto a clientes externos (quando decidir)

Depois de duas a quatro semanas com DCAB, Neora e AnkoraOne, para cada cliente externo:

1. **Incidentes** › **Clientes**: marque **Alertas de vulnerabilidades ativos**.
2. **Acessos**: dê a secção **Vulnerabilidades** às pessoas do cliente que devem receber os avisos e gerir a lista.
3. Peça ao cliente a lista de ativos (fabricante; produto; versão; designação) ou importe-a com **Importar lista**. Sem nomes de pessoas nem endereços internos na designação.
4. Antes de ligar, confirme que o contrato prevê o serviço e quem recebe os avisos.

Ao fim de 4 semanas, compare por cliente (incluindo os três primeiros): emails imediatos, resumos, vulnerabilidades marcadas «Não afetado» (falsos positivos) e tempo até «Corrigido».

---

## Fase 9 · Fechar (Mac)

```bash
cd ~/Documents/site-dcabconsulting && git add -A && git commit -m "Versão 1.4: alertas de vulnerabilidades por fabricante"
```

---

## Se algo correr mal

- **Os emails não chegam:** em https://script.google.com › **Execuções**, veja se a `tarefasIncidentes` corre sem erros. Confirme que o `Incidentes.gs` é o da versão 1.4 (procure «cve-imediato»).
- **Demasiados emails:** em **Avisos por email**, desligue o resumo diário ou o email imediato das críticas; ou troque os fabricantes inteiros por produtos com versão.
- **«Verificar agora» dá erro:** Firebase › Functions › `recolherCves` › Registos. Envie-me as linhas com «cve_recolha».
- **Voltar à versão 1.3:**

```bash
cd ~/Documents/site-dcabconsulting-copia-v1.3 && bash publicar.sh funcoes
```

Se perguntar se quer apagar as funções `recolherCves` e `recolherCvesAgora`, responda **S** (são as novas). A tudo o resto, **N**. No Apps Script, volte a colar o `Incidentes.gs` da cópia.

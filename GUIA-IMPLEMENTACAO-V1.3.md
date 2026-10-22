# Guia de implementação · versão 1.3

**Data:** 19-10-2026 · **Tempo total:** cerca de 2 horas, em 9 fases.

Esta versão automatiza o pedido de apoio a incidentes:

- o cliente escolhe no formulário do site o assunto «Incidente: pedido de apoio urgente»;
- se o remetente for de um cliente conhecido, o incidente abre-se sozinho na área reservada, com três provas pedidas;
- o Apps Script cria a pasta no Google Drive, partilha a subpasta de entregas com o cliente e responde com a referência;
- de 15 em 15 minutos, uma tarefa regista os ficheiros entregues, envia os lembretes das provas, os avisos dos prazos de notificação e o resumo diário;
- se o remetente não for reconhecido, o pedido fica em «Pedidos por triar», sem resposta automática, e a equipa recebe um aviso ao fim de 30 minutos;
- o endereço do formulário não é verificado: cada cliente tem no máximo 3 incidentes automáticos por hora (os seguintes vão para a triagem), e os emails automáticos nunca repetem o texto do remetente;
- a partilha da pasta «Entregas do cliente» acompanha as alterações: quem passa a ter provas por entregar ganha acesso, quem sai da lista perde-o;
- só entram na automatização os incidentes criados a partir de 19-10-2026; os anteriores continuam como na versão 1.2;
- o CRM pode abrir um incidente a partir da ficha de uma entidade (ver `ESPEC-CRM-INCIDENTES-V1.3.md`).

Também muda o rodapé de todas as páginas (identificação exigida pelo Código das Sociedades Comerciais, art. 171.º, sem a ligação à Neora) e a política de privacidade.

Siga as fases pela ordem.

## Ficheiros

| Ficheiro | Para quê |
|---|---|
| `site-dcabconsulting-v1.3.zip` | Site, regras, funções, testes e Apps Script. Não traz o `principal.js` |
| `apps-script/Incidentes.gs` (dentro do zip) | Ficheiro novo a colar no Apps Script |
| `ESPEC-CRM-INCIDENTES-V1.3.md` (dentro do zip) | Especificação para a conversa do CRM |
| `verificar-v1.3.sh` (dentro do zip) | Verificação só de leitura depois de publicar |

---

## Fase 0 · Preparação (5 min, no Mac)

```bash
cd ~/Documents
rsync -a --exclude node_modules site-dcabconsulting/ site-dcabconsulting-copia-v1.2/
ls site-dcabconsulting-copia-v1.2/public/assets/js/principal.js
```

**Resultado esperado:** a última linha mostra o caminho do `principal.js`. Se aparecer «No such file», pare e avise.

---

## Fase 1 · Testar as regras no Cloud Shell (15 min)

1. Abra https://console.cloud.google.com/?project=dcab-consulting e clique em **>_** (Ativar Cloud Shell).
2. **⋮** › **Carregar** › escolha `site-dcabconsulting-v1.3.zip`.
3. No terminal:

```bash
rm -rf ~/site-v13 && unzip -q -o ~/site-dcabconsulting-v1.3.zip -d ~/site-v13
cd ~/site-v13/testes-regras
npm install
npm test
```

**Resultado esperado:** `# pass 19` e `# fail 0`. Se houver `fail`, não publique: envie as linhas com «not ok».

---

## Fase 2 · Criar os dois segredos (10 min, no Mac)

São dois segredos novos, um para o Apps Script e outro para o CRM. Não toque no `HIBP_API_KEY`.

```bash
cd ~/Documents/site-dcabconsulting
firebase use dcab-consulting
openssl rand -hex 32 | tr -d '\n' > /tmp/inc1
openssl rand -hex 32 | tr -d '\n' > /tmp/inc2
firebase functions:secrets:set INCIDENTES_SEGREDO --data-file /tmp/inc1
firebase functions:secrets:set INCIDENTES_SEGREDO_CRM --data-file /tmp/inc2
cat /tmp/inc1 | pbcopy
```

O valor do primeiro segredo fica copiado: cole-o já numa nota segura (vai precisar dele na fase 6). Depois:

```bash
rm /tmp/inc1 /tmp/inc2
```

O segundo segredo é lido mais tarde, quando o CRM for ligado: `firebase functions:secrets:access INCIDENTES_SEGREDO_CRM`.

---

## Fase 3 · Publicar (10 min, no Mac)

```bash
cd ~/Documents
unzip -o ~/Downloads/site-dcabconsulting-v1.3.zip -d site-dcabconsulting
cd site-dcabconsulting
(cd functions && npm test)
bash publicar.sh funcoes
```

Se o Safari já tinha descompactado o zip, use em vez do `unzip`: `rsync -a ~/Downloads/site-dcabconsulting-v1.3/ ~/Documents/site-dcabconsulting/`

**Resultado esperado:**
- `# pass 26` nos testes das funções;
- só ✔ no `publicar.sh`, incluindo «Ligação automática dos incidentes ativa» e «Pedido de apoio urgente publicado».

**Se o Firebase perguntar se quer apagar alguma função ou política de TTL:** responda **N**.

**Se a publicação falhar com «allUsers» ou «Domain restricted sharing»:** a organização Google não deixa funções públicas. Envie-me as últimas linhas; a correção é uma exceção à política para o projeto `dcab-consulting`.

---

## Fase 4 · Limpeza automática dos registos novos (5 min, Cloud Shell)

```bash
gcloud firestore fields ttls update expira --collection-group=api_pedidos --enable-ttl --project=dcab-consulting --async
gcloud firestore fields ttls update expira --collection-group=pedidosIncidente --enable-ttl --project=dcab-consulting --async
```

- `api_pedidos`: identificadores dos pedidos assinados, apagados ao fim de 2 dias.
- `pedidosIncidente`: pedidos por triar, apagados ao fim de 12 meses (o prazo da política de privacidade).

---

## Fase 5 · Pasta no Google Drive (10 min)

1. Abra https://drive.google.com com a conta da DCAB.
2. Crie a pasta-mãe dos incidentes:
   - **De preferência, numa unidade partilhada:** menu da esquerda **Unidades partilhadas** › **Novo** › nome `DCAB · Incidentes`. Numa unidade partilhada, o cliente pode entregar ficheiros mas não apagar os já entregues.
   - Se a sua edição do Workspace não tiver unidades partilhadas, crie a pasta `DCAB · Incidentes` em **O meu disco**. Funciona, mas o cliente pode apagar o que entregou (a DCAB fica com a cópia de integridade).
3. Abra a pasta e copie o identificador do endereço: é o texto depois de `/folders/`.
4. Partilha com quem não tem conta Google: na consola do Workspace (admin.google.com) › **Apps** › **Google Workspace** › **Drive e Documentos** › **Definições de partilha**:
   - partilha fora da organização: **Ativada**;
   - **Permitir que os utilizadores da organização convidem pessoas sem conta Google**: ativado (os clientes recebem um código por email para entrar).

---

## Fase 6 · Apps Script (20 min)

Abra https://script.google.com › projeto do formulário do site.

### 6.1 Ficheiro novo
1. Ao lado de **Ficheiros**, clique em **+** › **Script** › nome `Incidentes`.
2. Apague o conteúdo e cole o conteúdo de `apps-script/Incidentes.gs`. Grave (Cmd + S).

### 6.2 Duas alterações no `Codigo.gs`
Não substitua o ficheiro inteiro: pode ter a ligação ao CRM (`EnviarCRM`).

1. Na lista `ASSUNTOS`, antes de `"Outro"`, acrescente:

```javascript
  "Incidente: pedido de apoio urgente",
```

2. Logo antes da linha `// Registo opcional numa Google Sheet`, cole:

```javascript
    // Pedido de apoio a incidente: abre o processo (Incidentes.gs). Uma falha aqui não impede a resposta ao site.
    if (limpo.assunto === "Incidente: pedido de apoio urgente" && typeof tratarPedidoIncidente === "function") {
      try { tratarPedidoIncidente(limpo); } catch (errInc) { console.error("Incidentes: " + errInc); }
    }
```

3. Grave.

### 6.3 Propriedades do script
**Definições do projeto** (engrenagem) › **Propriedades do script** › **Adicionar propriedade**:

| Propriedade | Valor |
|---|---|
| `INCIDENTES_SEGREDO` | O valor guardado na fase 2 |
| `PASTA_INCIDENTES_ID` | O identificador da pasta da fase 5 |

### 6.4 Serviço do Drive (opcional, recomendado)
**Serviços** › **+** › **Drive API** › **Adicionar**. Permite obter o SHA-256 de ficheiros com mais de 45 MB.

### 6.5 Instalar a tarefa
1. No topo, escolha a função `instalarTarefas` e clique em **Executar**.
2. Autorize os novos acessos (Drive, pedidos externos, acionadores).
3. **Resultado esperado** no registo de execução: «Tarefa instalada. Ações pendentes neste momento: …».

### 6.6 Publicar a nova versão da aplicação web
Sem este passo, o formulário continua a correr o código antigo.

**Implementar** › **Gerir implementações** › lápis da implementação ativa › **Versão: Nova versão** › **Implementar**. O endereço `/exec` não muda.

---

## Fase 7 · Configurar na área reservada (10 min)

1. Abra https://dcabconsulting.com/reservado › **Incidentes**.
2. **Avisos por email:** responsável por omissão (`daniel.carvalho@dcabconsulting.com`) e emails da equipa. **Gravar**.
3. **Clientes:** para cada cliente, preencha o NIPC e os **domínios de email** (por exemplo `cm-exemplo.pt`). Nunca domínios gratuitos.
4. **Acessos:** as pessoas de cliente que devem acompanhar os incidentes precisam da secção **Incidentes** (Papel e secções).

---

## Fase 8 · Ensaio completo (20 min)

1. **Clientes** › escolha `dcab` (ou crie-o) e acrescente o domínio `dcabconsulting.com`. **Gravar**.
2. Numa janela privada, abra https://dcabconsulting.com/?assunto=incidente#contacto e envie um pedido com o seu email da DCAB e a mensagem `Ensaio da versão 1.3`.
3. **Em menos de 1 minuto deve ter:**
   - o email habitual do formulário;
   - o email «[INC-2026-…] Recebemos o seu pedido de apoio», com três provas e a ligação da pasta;
   - na área reservada, o incidente «Por triar», com origem «Pedido pelo formulário do site» e as provas P01 a P03;
   - no Drive, a pasta `INC-2026-… · DCAB Consulting` com «Entregas do cliente» e «Cópias de integridade (só DCAB)».
4. Entregue um ficheiro qualquer na subpasta `P01`.
5. No Apps Script, execute `tarefasIncidentes`. Na área reservada, a P01 passa a «Recebida» e o ficheiro aparece em «Ficheiros recebidos» com o SHA-256.
6. Clique em **Validar** na P01.
7. Teste a triagem: envie outro pedido a partir de um email pessoal (Gmail). Não recebe resposta automática; o pedido aparece em **Pedidos de apoio por triar**. Clique em **Descartar**.
8. Limpeza: **Apagar** o incidente de ensaio (administrador), retire o domínio `dcabconsulting.com` do cliente `dcab` e apague a pasta de ensaio no Drive.
9. Verificação final, no Mac:

```bash
cd ~/Documents/site-dcabconsulting
bash verificar-v1.3.sh
```

---

## Fase 9 · Governação (ao longo da semana)

- [ ] **Contrato de subcontratação (RGPD, art. 28.º):** acrescentar a autorização geral para a Google como subcontratante ulterior (n.º 2 e 4), a entrega de provas pelo Google Drive e os avisos por email. Sem esta autorização escrita, não use o envio automático para esse cliente.
- [ ] **Registo de atividades (art. 30.º, n.º 2):** acrescentar, nas categorias de tratamento por conta dos clientes, as provas de incidentes e os avisos por email.
- [ ] **CRM:** levar `ESPEC-CRM-INCIDENTES-V1.3.md` à conversa do CRM. Confirmar também se o `EnviarCRM.gs` passa estes pedidos para leads (se sim, decidir se é desejado).
- [ ] **Git:**

```bash
cd ~/Documents/site-dcabconsulting
git add -A
git commit -m "Versão 1.3: incidentes automáticos, provas no Google Drive e avisos por email"
```

- [ ] Apagar `site-dcabconsulting-copia-v1.2` quando a versão estiver estável há uma semana.

---

## Se algo correr mal

**Parar os emails automáticos de imediato:** Apps Script › **Acionadores** (ícone do relógio) › apague o acionador `tarefasIncidentes`.

**Desligar a abertura automática pelo formulário:** no `Codigo.gs`, apague o bloco colado na fase 6.2 e publique uma nova versão (fase 6.6).

**Voltar à versão 1.2 do site:**

```bash
cd ~/Documents/site-dcabconsulting-copia-v1.2
bash publicar.sh funcoes
```

Se o Firebase perguntar se quer apagar a função `incidentesApi`, responda **S** (é a função nova). A qualquer outra função ou política de TTL, responda **N**.

---

## Quando um cliente pede ajuda (resumo)

1. O pedido chega. Se o cliente foi reconhecido, o incidente já está aberto («Por triar»); se não, está em **Pedidos por triar**: confirme por telefone quem pede e clique em **Converter**.
2. Ligue ao cliente. Mude o estado para **Aberto**, escolha o tipo e registe a hora da deteção.
3. Ajuste as provas (**Pedir prova**, **Editar**). O cliente recebe os pedidos e os lembretes sem intervenção.
4. Logo que se verifique que o incidente é ou pode ser significativo, registe essa hora: começam os avisos dos prazos (12 h, 6 h, 1 h e atraso).
5. Valide cada prova recebida e siga as comunicações e minutas como na versão 1.2.

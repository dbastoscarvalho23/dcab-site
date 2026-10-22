# Guia de publicação — dcabconsulting.com

Guia passo a passo para colocar online o site da DCAB Consulting e a área reservada, a partir de um MacBook.

Cada passo indica:
- **Onde:** o endereço ou a aplicação a abrir;
- **O que fazer:** os cliques, pela ordem;
- **O que colar:** o texto exato, quando existe;
- **Resultado esperado:** como saber que correu bem.

As consolas da Google aparecem muitas vezes em inglês. Por isso, o nome de cada botão aparece em português e, entre parênteses, em inglês: **Novo projeto** (*New project*).

**Conta a usar em todos os serviços Google:** `daniel.carvalho@dcabconsulting.com`

---

## Folha de valores

Ao longo do guia vai obter alguns códigos que são usados mais à frente. Copie esta tabela para uma nota no Mac (app **Notas**) e preencha-a à medida que avança.

| Valor | Obtido no passo | Usado nos passos | Exemplo do formato | O seu valor |
|---|---|---|---|---|
| ID da Google Sheet | 7 | 12 | `1AbCdEf…xyz` (cerca de 44 caracteres) | |
| URL do Apps Script | 18 | 21 | `https://script.google.com/macros/s/AKfy…/exec` | |
| ID do projeto Firebase | 24 | 27, 62, 66, 68 | `dcab-consulting` | |
| Endereço provisório do site | 29 | 30, 31 | `https://dcab-consulting.web.app` | |
| apiKey e appId do Firebase | 64 | 66 | `AIzaSy…` e `1:123…:web:abc…` | |


---

# Parte 0 — Preparar o Mac

### Passo 1 — Descompactar o pacote do site

**Onde:** pasta **Transferências** (*Downloads*), no Finder.

**O que fazer:**
1. Faça duplo clique em `site-dcabconsulting.zip`. O macOS cria a pasta `site-dcabconsulting`.
2. Arraste essa pasta para **Documentos** (*Documents*).

**Resultado esperado:** existe a pasta `Documentos/site-dcabconsulting`, com as pastas `public` e `apps-script` e os ficheiros `firebase.json`, `firestore.rules` e `GUIA-PUBLICACAO.md`.

### Passo 2 — Mostrar ficheiros ocultos

**Porquê:** o ficheiro `.firebaserc` começa por um ponto. No Mac, os ficheiros que começam por ponto estão ocultos por omissão.

**O que fazer:** com a pasta do site aberta no Finder, prima **Cmd + Shift + .** (ponto).

**Resultado esperado:** o ficheiro `.firebaserc` aparece em cinzento-claro.

### Passo 3 — Instalar o editor de código VS Code

**Porquê:** vai editar três ficheiros. O TextEdit troca as aspas retas `"` por aspas curvas `“ ”`, o que estraga o código. O VS Code não faz isso.

**Onde:** https://code.visualstudio.com

**O que fazer:**
1. Clique em **Download for macOS**.
2. Abra o ficheiro transferido e arraste **Visual Studio Code** para a pasta **Aplicações** (*Applications*).
3. Abra o VS Code e escolha **File › Open Folder…** (Ficheiro › Abrir pasta).
4. Selecione `Documentos/site-dcabconsulting` e clique em **Open**.
5. Se perguntar *Do you trust the authors…?*, clique em **Yes, I trust the authors**.

**Resultado esperado:** a coluna da esquerda mostra os ficheiros do site. Para abrir um ficheiro, basta clicar nele. Para guardar, use **Cmd + S**.

### Passo 4 — Instalar o Node.js

**Porquê:** o Node.js é necessário para a ferramenta que publica o site (Firebase CLI).

**Onde:** https://nodejs.org

**O que fazer:**
1. Clique no botão da versão **LTS**.
2. Escolha **macOS Installer (.pkg)**.
3. Abra o ficheiro transferido e avance com **Continuar** até **Instalar**. Introduza a palavra-passe do Mac quando for pedida.

**Resultado esperado:** a mensagem final indica que a instalação foi concluída.

### Passo 5 — Abrir o Terminal na pasta do site

**Porquê:** o Terminal é a aplicação onde se escrevem comandos. Vai usá-lo para publicar.

**O que fazer:**
1. Prima **Cmd + Espaço**, escreva `Terminal` e prima Enter.
2. Escreva `cd ` (as letras c e d, seguidas de um espaço) e **não prima Enter**.
3. Arraste a pasta `site-dcabconsulting` do Finder para dentro da janela do Terminal. O caminho da pasta é escrito automaticamente.
4. Prima Enter.
5. Para confirmar que está na pasta certa, escreva este comando e prima Enter:

```bash
ls -a
```

**Resultado esperado:** aparecem `.firebaserc`, `firebase.json`, `firestore.rules`, `public` e `apps-script`.

> Sempre que o guia mandar «executar um comando», é aqui: cole o comando na janela do Terminal e prima Enter. Se fechar o Terminal, repita este passo antes de continuar.

### Passo 6 — Instalar a ferramenta de publicação (Firebase CLI)

**Onde:** Terminal (passo 5).

**O que colar:**
```bash
sudo npm install -g firebase-tools
```

**O que fazer:** quando aparecer `Password:`, escreva a palavra-passe do Mac e prima Enter. Os caracteres não aparecem enquanto escreve; isso é normal.

**Resultado esperado:** ao fim de um ou dois minutos, a instalação termina sem a palavra `ERR`. Para confirmar, execute:
```bash
firebase --version
```
Deve aparecer um número de versão, por exemplo `14.x.x`.

---

# Parte A — Site público

## Fase 1 — Folha de registo dos pedidos (opcional, recomendada)

**Para que serve:** cada pedido do formulário do site fica guardado numa linha desta folha, além de chegar por email.

### Passo 7 — Criar a folha e copiar o ID

**Onde:** https://sheets.google.com (com a sessão da conta DCAB iniciada).

**O que fazer:**
1. Clique em **Folha de cálculo em branco** (*Blank spreadsheet*).
2. Clique no título «Folha de cálculo sem título», no canto superior esquerdo, e escreva `Pedidos site DCAB`.
3. Copie o ID da folha a partir da barra de endereço do navegador. O endereço tem este formato:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdef/edit#gid=0
                                       └──────────────── ID da folha ───────────────┘
```

O **ID** é o texto entre `/d/` e `/edit`. No exemplo acima é `1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdef`.

Para o copiar, clique na barra de endereço, faça duplo clique sobre o ID para o selecionar e prima **Cmd + C**. Confirme que a seleção não inclui as barras `/`.

**Resultado esperado:** o ID fica anotado na Folha de valores.

## Fase 2 — Formulário de contacto (Google Apps Script)

**Para que serve:** o Apps Script é um pequeno programa que corre nos servidores da Google. Recebe o que o visitante escreve no formulário e envia-o por email para `daniel.carvalho@dcabconsulting.com`. Como o seu email fica guardado apenas no script, nunca aparece no site.

### Passo 8 — Criar o projeto

**Onde:** https://script.google.com

**O que fazer:**
1. Clique em **Novo projeto** (*New project*), no canto superior esquerdo.
2. Clique em «Projeto sem título» (*Untitled project*), no topo, escreva `Formulário site DCAB` e clique em **Mudar o nome** (*Rename*).

**Resultado esperado:** abre o editor, com um ficheiro `Código.gs` que contém `function myFunction() {}`.

### Passo 9 — Colar o código

**O que fazer:**
1. Clique dentro do editor e prima **Cmd + A** para selecionar tudo. Depois prima a tecla **Delete**.
2. Copie todo o código abaixo, cole-o no editor (**Cmd + V**) e clique no ícone de disquete **Guardar projeto** (*Save project*), ou prima **Cmd + S**.

**O que colar:**

```javascript
/**
 * DCAB Consulting — receção dos pedidos de contacto do site
 *
 * O email de destino fica guardado nas Propriedades do script (não no código),
 * por isso não aparece no site nem neste ficheiro.
 *
 * Configuração (uma vez): Definições do projeto (ícone de engrenagem) >
 * Propriedades do script > Adicionar propriedade:
 *   EMAIL_DESTINO  = caixa que recebe os pedidos (ex.: a caixa oculta criada no Google Workspace)
 *   FOLHA_ID       = (opcional) ID de uma Google Sheet para registo dos pedidos
 */

const LIMITE_POR_EMAIL = 3;          // pedidos por remetente...
const JANELA_SEGUNDOS = 600;         // ...em 10 minutos
const TEMPO_MINIMO_MS = 3000;        // envios mais rápidos que isto são tratados como automáticos
const ASSUNTOS = [
  "Prevenção de fuga de dados (DLP)", "Classificação e proteção da informação",
  "Continuidade de negócio", "Demonstração da AnkoraOne", "Parcerias", "Proteção de dados", "Outro"
];

// Executar uma vez no editor para autorizar o envio de email e testar a configuração
function testarEnvio() {
  const destino = PropertiesService.getScriptProperties().getProperty("EMAIL_DESTINO");
  MailApp.sendEmail(destino, "[Site DCAB] Teste de configuração", "O formulário do site está configurado corretamente.");
}

function doPost(e) {
  try {
    // Execução manual no editor (sem pedido do site): não faz nada
    if (!e || !e.postData) return resposta_({ ok: false, erro: "sem_dados" });
    const d = JSON.parse(e.postData.contents || "{}");

    // Bots: campo-armadilha preenchido ou envio instantâneo → responde "ok" sem enviar nada
    if (d.website || Number(d.tempo) < TEMPO_MINIMO_MS) return resposta_({ ok: true });

    const limpo = {
      nome: texto_(d.nome, 120),
      empresa: texto_(d.empresa, 120),
      email: texto_(d.email, 160).toLowerCase(),
      telefone: texto_(d.telefone, 30),
      assunto: ASSUNTOS.indexOf(d.assunto) >= 0 ? d.assunto : "Outro",
      mensagem: texto_(d.mensagem, 3000),
      origem: texto_(d.origem, 200),
    };

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo.email);
    if (!limpo.nome || !limpo.empresa || !emailValido || !limpo.mensagem || d.consentimento !== true) {
      return resposta_({ ok: false, erro: "dados_invalidos" });
    }

    // Limite simples de envios por remetente
    const cache = CacheService.getScriptCache();
    const chave = "rl_" + Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, limpo.email));
    const contagem = Number(cache.get(chave) || 0);
    if (contagem >= LIMITE_POR_EMAIL) return resposta_({ ok: false, erro: "limite" });
    cache.put(chave, String(contagem + 1), JANELA_SEGUNDOS);

    const props = PropertiesService.getScriptProperties();
    const destino = props.getProperty("EMAIL_DESTINO");
    if (!destino) throw new Error("EMAIL_DESTINO não configurado");

    const quando = Utilities.formatDate(new Date(), "Europe/Lisbon", "dd/MM/yyyy HH:mm");

    MailApp.sendEmail({
      to: destino,
      replyTo: limpo.email,
      name: "Site DCAB Consulting",
      subject: "[Site DCAB] " + limpo.assunto + " — " + limpo.empresa,
      htmlBody:
        '<div style="font-family:Arial,sans-serif;font-size:14px;color:#000">' +
        '<p style="font-size:16px"><strong>Novo pedido de contacto</strong></p>' +
        '<table cellpadding="6" style="border-collapse:collapse">' +
        linha_("Data", quando) +
        linha_("Nome", limpo.nome) +
        linha_("Empresa", limpo.empresa) +
        linha_("Email", limpo.email) +
        linha_("Telefone", limpo.telefone || "—") +
        linha_("Assunto", limpo.assunto) +
        "</table>" +
        '<p style="margin-top:16px"><strong>Mensagem</strong></p>' +
        '<p style="white-space:pre-wrap;border-left:3px solid #00A2DB;padding-left:12px">' + escapar_(limpo.mensagem) + "</p>" +
        '<p style="color:#666;font-size:12px">Responda diretamente a este email para contactar o remetente. Consentimento RGPD: dado no formulário.</p>' +
        "</div>",
    });

    // Registo opcional numa Google Sheet
    const folhaId = props.getProperty("FOLHA_ID");
    if (folhaId) {
      const folha = SpreadsheetApp.openById(folhaId).getSheets()[0];
      if (folha.getLastRow() === 0) {
        folha.appendRow(["Data", "Nome", "Empresa", "Email", "Telefone", "Assunto", "Mensagem", "Estado"]);
      }
      folha.appendRow([quando, limpo.nome, limpo.empresa, limpo.email, limpo.telefone,
        limpo.assunto, limpo.mensagem, "Novo"].map(protegerFolha_));
    }

    return resposta_({ ok: true });
  } catch (err) {
    console.error(err);
    return resposta_({ ok: false, erro: "interno" });
  }
}

// Permite testar no navegador que a aplicação web está publicada
function doGet() {
  return resposta_({ ok: true, servico: "formulario-dcab" });
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function texto_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
function escapar_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function linha_(rotulo, valor) {
  return '<tr><td style="color:#46525C;border-bottom:1px solid #eee">' + rotulo +
    '</td><td style="border-bottom:1px solid #eee">' + escapar_(valor) + "</td></tr>";
}
// Evita injeção de fórmulas na folha de cálculo
function protegerFolha_(v) {
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
```

**Resultado esperado:** o ícone de guardar deixa de estar ativo e não aparecem linhas sublinhadas a vermelho.

### Passo 10 — Fuso horário

**O que fazer:**
1. Na barra lateral esquerda, clique na engrenagem **Definições do projeto** (*Project Settings*).
2. Em **Fuso horário** (*Time zone*), escolha `(GMT+00:00) Lisboa` (*Lisbon*).

**Resultado esperado:** as datas nos emails ficam na hora de Portugal.

### Passo 11 — Abrir as propriedades do script

**Porquê:** as «propriedades do script» são valores guardados à parte do código. É aí que fica o email de destino, para não estar escrito no código.

**O que fazer:** na mesma página de definições, desça até ao fim, até **Propriedades do script** (*Script Properties*). Clique em **Adicionar propriedade do script** (*Add script property*).

### Passo 12 — Preencher as propriedades

**O que colar:** crie duas linhas, clicando de novo em **Adicionar propriedade do script** para a segunda.

| Propriedade (*Property*) | Valor (*Value*) |
|---|---|
| `EMAIL_DESTINO` | `daniel.carvalho@dcabconsulting.com` |
| `FOLHA_ID` | o ID da folha do passo 7 |

Escreva os nomes exatamente como estão, em maiúsculas e com o traço baixo `_`. Se saltou a Fase 1, não crie a linha `FOLHA_ID`.

### Passo 13 — Guardar as propriedades

**O que fazer:** clique em **Guardar propriedades do script** (*Save script properties*).

**Resultado esperado:** as duas propriedades ficam listadas.

### Passo 14 — Executar o teste

**O que fazer:**
1. Na barra lateral esquerda, clique em **Editor** (ícone `< >`).
2. Na barra de ferramentas, ao lado do botão **Depurar** (*Debug*), há uma lista com o nome de uma função. Confirme que está escolhida `testarEnvio`. Se aparecer `doPost`, `doGet` ou outra, abra a lista e escolha `testarEnvio`.
3. Clique em **Executar** (*Run*).

### Passo 15 — Autorizar o script (só na primeira execução)

**Porquê:** na primeira vez que se executa qualquer função do projeto, a Google pede autorização para o script enviar emails e escrever na folha. Essa autorização fica válida para todas as funções do projeto.

**Antes de começar, verifique em que situação está:**

| O que acontece depois de clicar em **Executar** | O que fazer |
|---|---|
| Abre a janela **Autorização necessária** | Siga as instruções abaixo |
| Não abre nenhuma janela e o **Registo de execução** mostra «Execução concluída» | Já autorizou numa execução anterior (por exemplo, ao executar `doPost` por engano). Avance para o passo 16 |
| Não abre nenhuma janela e o registo mostra «Autorização necessária» | O navegador bloqueou a janela. Permita janelas pop-up para `script.google.com` (no Safari: **Safari › Definições › Websites › Janelas pop-up**) e clique outra vez em **Executar** |

**O que fazer quando a janela abre:**
1. Na janela **Autorização necessária** (*Authorization required*), clique em **Rever autorizações** (*Review permissions*).
2. Escolha a conta `daniel.carvalho@dcabconsulting.com`.
3. Pode aparecer o aviso «A Google não validou esta app» (*Google hasn't verified this app*). Isto é normal num script criado por si. Clique em **Avançadas** (*Advanced*) e depois em **Aceder a Formulário site DCAB (não seguro)** (*Go to Formulário site DCAB (unsafe)*).
4. Clique em **Permitir** (*Allow*).

**Resultado esperado:** em baixo, no **Registo de execução** (*Execution log*), aparece «Execução concluída» (*Execution completed*).

### Passo 16 — Confirmar o email de teste

**Onde:** Gmail de `daniel.carvalho@dcabconsulting.com`.

**Resultado esperado:** chegou o email «[Site DCAB] Teste de configuração».

**Se correr mal:**
- Erro `EMAIL_DESTINO não configurado`: reveja os passos 12 e 13.
- Erro `Cannot read properties of undefined (reading 'postData')`: foi executada a função `doPost` em vez de `testarEnvio`. Não estragou nada. Volte ao passo 14 e escolha `testarEnvio` na lista.

### Passo 17 — Publicar o script como aplicação web

**Porquê:** para o formulário do site conseguir enviar dados ao script, o script tem de ter um endereço na internet.

**O que fazer:**
1. No canto superior direito, clique em **Implementar › Nova implementação** (*Deploy › New deployment*).
2. Ao lado de **Selecionar tipo** (*Select type*), clique na engrenagem e escolha **Aplicação Web** (*Web app*).
3. Preencha os campos:

| Campo | O que escrever ou escolher |
|---|---|
| Descrição (*Description*) | `Formulário site v1` |
| Executar como (*Execute as*) | **Eu** (*Me*) — daniel.carvalho@dcabconsulting.com |
| Quem tem acesso (*Who has access*) | **Qualquer pessoa** (*Anyone*) |

4. Clique em **Implementar** (*Deploy*).

**Porquê «Qualquer pessoa»:** os visitantes do site não têm conta Google da DCAB. O script continua a correr com a sua conta, e o seu email continua oculto.

**Se não aparecer «Qualquer pessoa»:** a administração do Google Workspace está a bloquear esta opção. Em admin.google.com, abra **Apps › Google Workspace › Drive e Documentos › Definições de partilha** e permita a partilha fora da organização.

### Passo 18 — Copiar o URL do script

**O que fazer:** na janela de confirmação, em **Aplicação Web** (*Web app*), copie o **URL** com o botão **Copiar** (*Copy*). Não copie o «ID de implementação» (*Deployment ID*).

O URL tem este formato:
```
https://script.google.com/macros/s/AKfycbx1a2B3c4D5e6F7g8H9i0J…/exec
```

**Resultado esperado:** o URL começa por `https://script.google.com/macros/s/`, termina em `/exec` e fica anotado na Folha de valores.

### Passo 19 — Testar o URL

**O que fazer:** abra um separador novo no navegador, cole o URL e prima Enter.

**Resultado esperado:** a página mostra apenas este texto:
```
{"ok":true,"servico":"formulario-dcab"}
```

## Fase 3 — Ligar o formulário do site ao script

### Passo 20 — Abrir o ficheiro do formulário

**Onde:** VS Code (passo 3).

**O que fazer:** na coluna da esquerda, abra `public` › `assets` › `js` e clique em `principal.js`.

### Passo 21 — Colar o URL

**O que fazer:** na linha 10 está o seguinte:
```js
  ENDPOINT: "COLAR_AQUI_O_URL_DO_APPS_SCRIPT",
```
Selecione apenas `COLAR_AQUI_O_URL_DO_APPS_SCRIPT` (sem as aspas) e cole o URL do passo 18. Guarde com **Cmd + S**.

**Resultado esperado:** a linha fica assim, com o seu URL:
```js
  ENDPOINT: "https://script.google.com/macros/s/AKfycbx1a2B3c4D5e6F7g8H9i0J…/exec",
```
Confirme que as aspas e a vírgula do fim da linha se mantêm.

## Fase 4 — Projeto de alojamento (Firebase)

**Para que serve:** o Firebase é o serviço da Google que vai alojar o site e, mais à frente, a base de dados e a autenticação da área reservada.

### Passo 22 — Criar o projeto

**Onde:** https://console.firebase.google.com

**O que fazer:** clique em **Criar um projeto** (*Create a project*), ou **Adicionar projeto** (*Add project*).

### Passo 23 — Dar nome ao projeto

**O que escrever:** em **Nome do projeto** (*Project name*): `dcab-consulting`.

### Passo 24 — Anotar o ID do projeto

**O que fazer:** por baixo do nome aparece o **ID do projeto**, por exemplo `dcab-consulting` ou, se esse já existir, `dcab-consulting-4f2a1`. Anote-o exatamente como aparece. Depois aceite os termos e clique em **Continuar** (*Continue*).

### Passo 25 — Concluir a criação

**O que fazer:**
1. Desative a opção **Google Analytics**.
2. Clique em **Criar projeto** (*Create project*) e, no fim, em **Continuar**.

### Passo 26 — Ativar o alojamento

**O que fazer:**
1. No menu da esquerda, abra **Criar › Hosting** (*Build › Hosting*) e clique em **Começar** (*Get started*).
2. O assistente mostra comandos para instalar e configurar. **Não os execute**, porque o pacote já traz a configuração. Clique em **Seguinte** (*Next*) até ao fim e depois em **Continuar para a consola** (*Continue to console*).

### Passo 27 — Indicar o ID do projeto ao pacote

**Onde:** Terminal, na pasta do site (passo 5).

**O que colar:** substitua `dcab-consulting` pelo ID do passo 24, se for diferente.
```bash
printf '{\n  "projects": {\n    "default": "dcab-consulting"\n  }\n}\n' > .firebaserc
```

**Resultado esperado:** o comando `cat .firebaserc` mostra o seguinte, com aspas retas:
```json
{
  "projects": {
    "default": "dcab-consulting"
  }
}
```

## Fase 5 — Publicar o site

### Passo 28 — Iniciar sessão na ferramenta de publicação

**O que colar:**
```bash
firebase login
```

**O que fazer:**
1. À pergunta *Allow Firebase to collect CLI and Emulator Suite usage…?*, escreva `n` e prima Enter.
2. O navegador abre. Escolha a conta `daniel.carvalho@dcabconsulting.com` e clique em **Permitir** (*Allow*).

**Resultado esperado:** o Terminal mostra `Success! Logged in as daniel.carvalho@dcabconsulting.com`.

### Passo 29 — Publicar

**O que colar:**
```bash
firebase deploy --only hosting
```

**Resultado esperado:** ao fim de alguns segundos, o Terminal termina com:
```
✔  Deploy complete!
Hosting URL: https://dcab-consulting.web.app
```

### Passo 30 — Abrir o endereço provisório

**O que fazer:** abra o **Hosting URL** do passo 29 no navegador e anote-o na Folha de valores.

**Resultado esperado:** o site da DCAB aparece completo.

### Passo 31 — Testar o formulário

**O que fazer:** no endereço provisório, preencha o formulário de contacto com dados reais e clique em **Enviar pedido**.

**Resultado esperado:**
- aparece a mensagem «Pedido enviado»;
- o email «[Site DCAB] …» chega à sua caixa;
- se configurou a folha, o pedido aparece numa linha nova da Google Sheet.

**Se correr mal:** se aparecer «O formulário ainda não está ligado…», reveja o passo 21 e volte a publicar (passo 29).

## Fase 6 — Ligar o domínio dcabconsulting.com

**Conceitos usados nesta fase:**
- **DNS:** a «lista telefónica» da internet. Indica em que servidor está o site de um domínio.
- **Registo A:** aponta o domínio para o endereço numérico (IP) do servidor do site.
- **Registo TXT:** um texto que prova à Google que o domínio é seu.
- **Registo MX:** indica onde é entregue o email. **Nunca se altera nesta fase.**

### Passo 32 — Pedir o domínio no Firebase

**Onde:** consola Firebase › **Hosting**.

**O que fazer:**
1. Clique em **Adicionar domínio personalizado** (*Add custom domain*).
2. Escreva `dcabconsulting.com`. **Não** ative a opção de redirecionar.
3. Clique em **Continuar** (*Continue*).

### Passo 33 — Manter a lista de registos aberta

**O que fazer:** o Firebase mostra uma tabela com os registos a criar, com as colunas Tipo (*Type*), Nome/Anfitrião (*Host*) e Valor (*Value*). Deixe este separador aberto e abra o passo seguinte noutro separador.

Exemplo do que vai ver (os valores reais são os do seu ecrã):

| Tipo | Anfitrião | Valor |
|---|---|---|
| TXT | `dcabconsulting.com` | `hosting-site=dcab-consulting` |
| A | `dcabconsulting.com` | `199.36.158.100` |

**Aviso normal nesta fase:** o Firebase pode mostrar «Ocorreu uma falha (…) no desafio ACME: 198.185.159.144: 403 Forbidden». Esses endereços (198.185.159.x e 198.49.23.x) são do Squarespace e significam que o domínio ainda aponta para lá. O aviso desaparece depois dos passos 35 a 37.

### Passo 34 — Abrir o gestor de DNS

**Onde:** se o domínio foi comprado no Google Domains, está agora no Squarespace: https://account.squarespace.com/domains

**O que fazer:**
1. Inicie sessão com a mesma conta Google que usava no Google Domains (opção **Continue with Google**).
2. Clique em `dcabconsulting.com` e depois em **DNS** › **DNS Settings**.

**Se o domínio não aparecer:** o domínio está noutro fornecedor (por exemplo, PTisp, Amen ou GoDaddy). Os registos a criar são os mesmos; só muda o painel.

### Passo 35 — Remover registos em conflito

**O que fazer:**
1. Na secção **Squarespace Defaults**, se existirem registos do tipo **A** ou **AAAA** com anfitrião `@`, ou **CNAME** com anfitrião `www`, apague-os com o ícone do caixote do lixo. Se o Squarespace só permitir apagar o bloco completo, apague o bloco **Squarespace Defaults**.
2. Em **Custom Records**, apague também os registos A, AAAA ou CNAME antigos em `@` e `www`.

### Passo 36 — Registos que NÃO pode apagar

Mantenha sempre estes registos, que pertencem ao email do Google Workspace:

| Tipo | Como o reconhece |
|---|---|
| MX | Valor com `google.com` ou `smtp.google.com` |
| TXT | Valor que começa por `v=spf1` |
| TXT | Anfitrião `google._domainkey` |
| TXT | Anfitrião `_dmarc` |
| TXT | Valor que começa por `google-site-verification=` |

Se existir o bloco **Google Workspace** no Squarespace, não lhe toque.

### Passo 37 — Criar os registos do Firebase

**O que fazer:** em **Custom Records**, clique em **Add Record** (Adicionar registo) e crie cada linha da tabela do passo 33.

| Campo no Squarespace | O que escrever |
|---|---|
| Host | `@` (no Squarespace, `@` significa o próprio domínio `dcabconsulting.com`) |
| Type | o tipo da tabela do Firebase (A ou TXT) |
| Priority | deixe vazio |
| TTL | deixe o valor proposto |
| Data | o valor da tabela do Firebase, copiado e colado |

Clique em **Save** (Guardar) em cada registo. Se o Firebase pedir também um registo `_acme-challenge`, crie-o com o anfitrião `_acme-challenge`.

### Passo 38 — Verificar no Firebase

**O que fazer:** volte ao separador do passo 33 e clique em **Verificar** (*Verify*).

**Resultado esperado:** o estado passa a **A aguardar** (*Pending*) e depois a **Ligado** (*Connected*).

**Como confirmar que o DNS já mudou:** no Terminal do Mac, execute:
```bash
dig +short dcabconsulting.com A
```
- Aparece só o IP indicado pelo Firebase (por exemplo `199.36.158.100`): está correto; aguarde que o Firebase conclua.
- Ainda aparecem `198.185.159.x` ou `198.49.23.x`: há registos do Squarespace por apagar (passo 35), ou a alteração ainda não se propagou. Aguarde 1 a 2 horas e volte a verificar.

### Passo 39 — Adicionar o www

**O que fazer:**
1. Em **Hosting**, clique outra vez em **Adicionar domínio personalizado**.
2. Escreva `www.dcabconsulting.com`.
3. Ative a opção **Redirecionar** (*Redirect*) e escolha `dcabconsulting.com`.
4. Clique em **Continuar** (*Continue*).

### Passo 40 — Criar o registo do www

**O que fazer:** crie no Squarespace o registo indicado pelo Firebase para o `www`, com o anfitrião `www`, e clique em **Verificar**.

### Passo 41 — Aguardar o certificado

**Resultado esperado:** dentro de alguns minutos a 24 horas, os dois domínios aparecem como **Ligado** (*Connected*) e o site abre em `https://dcabconsulting.com` com o cadeado na barra de endereço.

## Fase 7 — Validação do site público

### Passo 42 — Testes

| Teste | Resultado esperado |
|---|---|
| Abrir `https://dcabconsulting.com` | Site com cadeado |
| Abrir `https://www.dcabconsulting.com` | Muda automaticamente para `dcabconsulting.com` |
| Enviar o formulário vazio | Mensagem de erro em cada campo obrigatório |
| Enviar um pedido real | Email na sua caixa |
| Clicar em «Responder» nesse email | O destinatário é quem preencheu o formulário |
| Clicar em «Pedir demonstração» | Assunto «Demonstração da AnkoraOne» já escolhido |
| Abrir o site no iPhone | Conteúdo legível, sem deslocamento lateral |

### Passo 43 — Filtro no Gmail

**Onde:** Gmail.

**O que fazer:**
1. Na barra de pesquisa, escreva o texto abaixo e prima Enter:
```
subject:"[Site DCAB]"
```
2. Clique no ícone de filtros, à direita da barra de pesquisa, e depois em **Criar filtro** (*Create filter*).
3. Ative **Aplicar a etiqueta** (*Apply the label*) › **Nova etiqueta** (*New label*), escreva `Pedidos do site` e clique em **Criar filtro**.

### Passo 44 — Pedir ao Google para indexar o site (opcional)

**Onde:** https://search.google.com/search-console

**O que fazer:**
1. Clique em **Adicionar propriedade** (*Add property*), escolha **Domínio** (*Domain*), escreva `dcabconsulting.com` e clique em **Continuar**.
2. A Google mostra um registo TXT (`google-site-verification=…`). Crie-o no Squarespace como no passo 37, com o anfitrião `@`, e clique em **Verificar**.
3. No menu da esquerda, abra **Sitemaps**, escreva `sitemap.xml` e clique em **Enviar** (*Submit*).

**Resultado esperado:** o sitemap aparece com o estado «Êxito» (*Success*).

---

# Parte B — Área reservada (/reservado)

Esta parte ativa a área de controlo da candidatura AI4CyberSecurity. Faça-a só depois de o site estar online (Parte A).

**Resumo do que vai configurar:** o plano de faturação, a base de dados, a entrada por email (só por convite) e com Google, o segundo fator com aplicação autenticadora e a ligação da página à configuração.

## Fase 8 — Plano e base de dados

### Passo 45 — Mudar para o plano Blaze

**Porquê:** a autenticação de dois fatores só existe no plano Blaze (pagamento por utilização). Para algumas pessoas a usar a área reservada, o custo esperado é 0 €, porque fica dentro dos limites gratuitos.

**Onde:** consola Firebase, no canto inferior esquerdo, onde está escrito **Spark**.

**O que fazer:**
1. Clique em **Atualizar** (*Upgrade*) e escolha **Blaze**.
2. Crie uma conta de faturação (*billing account*) com o cartão da empresa, ou escolha uma existente.

### Passo 46 — Criar um alerta de orçamento

**Onde:** https://console.cloud.google.com/billing

**O que fazer:**
1. Escolha a conta de faturação e abra **Orçamentos e alertas** (*Budgets & alerts*).
2. Clique em **Criar orçamento** (*Create budget*). Nome: `Limite DCAB`.
3. Em **Valor** (*Amount*), indique `5` €.
4. Mantenha os alertas a 50 %, 90 % e 100 % e clique em **Concluir** (*Finish*).

**Resultado esperado:** se algum dia houver custos, recebe um email antes de passarem de 5 €.

### Passo 47 — Criar a base de dados

**Onde:** consola Firebase › **Criar › Firestore Database** (*Build › Firestore Database*).

**O que fazer:**
1. Clique em **Criar base de dados** (*Create database*).
2. Escolha os valores seguintes:

| Opção | Escolher |
|---|---|
| Edição (se for perguntada) | **Standard** |
| ID da base de dados | `(default)` (não altere) |
| Localização (*Location*) | `eur3 (Europe)` |
| Regras (*Security rules*) | **Iniciar no modo de produção** (*Start in production mode*) |

3. Clique em **Criar** (*Create*).

**Atenção:** a localização não pode ser alterada depois. A opção `eur3` mantém os dados na União Europeia.

### Passo 48 — Publicar as regras de segurança

**Porquê:** as regras são o ficheiro `firestore.rules` do pacote. Definem quem pode ler e escrever: só contas autorizadas e com segundo fator.

**Onde:** Terminal, na pasta do site.

**O que colar:**
```bash
firebase deploy --only firestore:rules
```

**Resultado esperado:** `✔  Deploy complete!`. Na consola, em **Firestore › Regras** (*Rules*), aparece o texto que começa por `rules_version = '2';`.

### Passo 49 — Autorizar o seu acesso

**Onde:** consola Firebase › **Firestore Database** › separador **Dados** (*Data*).

**O que fazer:**
1. Clique em **+ Iniciar coleção** (*+ Start collection*).
2. Em **ID da coleção** (*Collection ID*), escreva `acessos` e clique em **Seguinte** (*Next*).
3. Preencha o documento:

| Campo da consola | O que escrever |
|---|---|
| ID do documento (*Document ID*) | `daniel.carvalho@dcabconsulting.com` (tudo em minúsculas) |
| Campo 1 › Nome (*Field*) | `papel` |
| Campo 1 › Tipo (*Type*) | `string` |
| Campo 1 › Valor (*Value*) | `admin` |
| Campo 2 › Nome | `ativo` (clique em **Adicionar campo** / *Add field*) |
| Campo 2 › Tipo | `boolean` |
| Campo 2 › Valor | `true` |

4. Clique em **Guardar** (*Save*).

**Resultado esperado:** aparece a coleção `acessos` com o seu email.

**Para dar acesso a outra pessoa no futuro:** dentro de `acessos`, clique em **+ Adicionar documento** (*Add document*) e use o email dessa pessoa como ID. Em `papel`, escreva `editor` (pode registar e editar) ou `leitor` (só consulta), e em `ativo` escolha `true`. Para retirar o acesso, mude `ativo` para `false`.

## Fase 9 — Entrada com Google

### Passo 50 — Ativar a autenticação

**Onde:** consola Firebase › **Criar › Authentication** (*Build › Authentication*).

**O que fazer:** clique em **Começar** (*Get started*).

### Passo 51 — Ativar o fornecedor Google

**O que fazer:**
1. No separador **Método de início de sessão** (*Sign-in method*), clique em **Google**.
2. Ative o interruptor **Ativar** (*Enable*).
3. Em **Email de apoio do projeto** (*Project support email*), escolha `daniel.carvalho@dcabconsulting.com`.
4. Clique em **Guardar** (*Save*).

### Passo 52 — Autorizar o domínio

**O que fazer:** no separador **Definições** (*Settings*) › **Domínios autorizados** (*Authorized domains*), clique em **Adicionar domínio** (*Add domain*), escreva `dcabconsulting.com` e clique em **Adicionar**.

**Resultado esperado:** a lista inclui `localhost`, `dcab-consulting.firebaseapp.com`, `dcab-consulting.web.app` e `dcabconsulting.com`.

### Passo 53 — Ativar o Identity Platform

**Porquê:** é a versão da autenticação do Firebase que inclui o segundo fator.

**O que fazer:** em **Authentication › Definições** (*Settings*), procure a opção **Atualizar para Firebase Authentication with Identity Platform** (*Upgrade to Firebase Authentication with Identity Platform*) e clique em **Atualizar** (*Upgrade*).

**Resultado esperado:** a opção desaparece e surge a secção **Autenticação multifator** (*Multi-factor authentication*).

### Passo 54 — Emails em português

**O que fazer:** no separador **Modelos** (*Templates*), clique no ícone de idioma e escolha **Português (Portugal)**.

**Resultado esperado:** o email de confirmação do passo 72 chega em português.

## Fase 10 — Entrada por email, só por convite

**Como funciona:**
- Ninguém se pode registar sozinho. Só o administrador cria contas, na consola do Firebase.
- A pessoa convidada define a sua própria palavra-passe através de uma ligação enviada por email. O administrador nunca a conhece.
- Em cada entrada é sempre pedido também o código da aplicação autenticadora.
- **Contas `@dcabconsulting.com`:** usam o botão **Entrar com Google**. A entrada por email destina-se a pessoas sem conta Google da DCAB, como consultores, o contabilista certificado ou parceiros.

### Passo 55 — Ativar a entrada por email e palavra-passe

**Onde:** consola Firebase › **Authentication** › **Método de início de sessão** (*Sign-in method*).

**O que fazer:**
1. Clique em **Adicionar novo fornecedor** (*Add new provider*) e escolha **Email/palavra-passe** (*Email/Password*).
2. Ative o primeiro interruptor, **Email/palavra-passe** (*Email/Password*).
3. Deixe **desativado** o segundo, **Ligação de email (início de sessão sem palavra-passe)** (*Email link (passwordless sign-in)*). Esta opção não é compatível com a autenticação de dois fatores.
4. Clique em **Guardar** (*Save*).

**Resultado esperado:** a lista de fornecedores mostra **Email/palavra-passe** e **Google**, ambos com o estado **Ativado** (*Enabled*).

### Passo 56 — Publicar as funções do servidor

**Porquê:** as funções do servidor fazem duas coisas. Permitem gerir os convites dentro da área reservada, no separador **Acessos**. E recusam automaticamente qualquer conta que não tenha convite, seja de Google ou de email. Têm de estar publicadas **antes** do passo 58.

**Onde:** Terminal, na pasta do site.

**O que colar:**
```bash
bash publicar.sh funcoes
```

**O que esperar:**
- A primeira publicação demora 3 a 6 minutos.
- Pode pedir para ativar serviços da Google Cloud; responda `Y` (sim).
- Se perguntar por uma política de limpeza (*cleanup policy*), prima Enter.

**Resultado esperado:** no fim aparece `✔ Deploy complete!`. Na consola Firebase, em **Functions**, ficam listadas quatro funções: `convidar`, `listarAcessos`, `alterarAcesso` e `antesDeCriarConta`.

### Passo 57 — Definir a política de palavras-passe

**Onde:** **Authentication** › **Definições** (*Settings*) › **Política de palavras-passe** (*Password policy*).

**O que fazer:**
1. Ative a política.
2. Em **Modo de aplicação** (*Enforcement mode*), escolha **Exigir** (*Require*).
3. Preencha as regras:

| Regra | Valor |
|---|---|
| Comprimento mínimo (*Minimum length*) | `12` |
| Exigir letra maiúscula (*Require uppercase*) | ativado |
| Exigir letra minúscula (*Require lowercase*) | ativado |
| Exigir número (*Require numeric*) | ativado |
| Exigir carácter especial (*Require special character*) | ativado |

4. Clique em **Guardar** (*Save*).

### Passo 58 — Manter o registo ativo

**Porquê:** com a função `antesDeCriarConta` publicada, quem controla a criação de contas é o servidor, que só aceita emails com convite. O registo tem de ficar **ativo** para que as pessoas convidadas possam entrar pela primeira vez.

**Onde:** Firebase › **Authentication** › **Definições** (*Settings*) › **Ações do utilizador** (*User actions*).

**O que fazer:** **marque** **Ativar criação (registo)** e clique em **Guardar**. Deixe **Ativar eliminação** desmarcada.

**Para confirmar o bloqueio:** numa janela privada, tente entrar com Google com uma conta pessoal sem convite. Deve aparecer «Este email não tem convite ativo».

### Passo 59 — Convidar uma pessoa

**Onde:** área reservada › separador **Acessos**. Só aparece ao administrador.

**O que fazer:** em **Convidar pessoa**, preencha:

| Campo | O que escolher |
|---|---|
| Email | O email da pessoa |
| Nome | O nome, para a reconhecer na lista |
| Papel | **Editor** (regista e edita), **Consulta** (só leitura) ou **Administrador** |
| Método de entrada | **Conta Google** para emails `@dcabconsulting.com`; **Email e palavra-passe** para pessoas externas |

Clique em **Convidar**.

**Resultado esperado:**
- **Com email e palavra-passe:** a conta é criada e a pessoa recebe de imediato um email para definir a palavra-passe.
- **Com conta Google:** a pessoa pode entrar logo com **Entrar com Google**.
- Em ambos os casos aparece, por baixo, a mensagem de convite pronta a copiar.

### Passo 60 — Enviar a mensagem de convite

**O que fazer:** clique em **Copiar mensagem** e envie-a à pessoa a partir do seu email. A mensagem explica os passos de ativação, incluindo a aplicação autenticadora.

**Acompanhar o convite:** na lista **Pessoas com acesso**:
- **Conta** muda de «Por ativar» para «Criada» quando a pessoa entra pela primeira vez;
- **Segundo fator** muda para «Configurado» quando a pessoa lê o código QR.

**Ações disponíveis em cada pessoa:**

| Ação | Quando usar |
|---|---|
| **Reenviar convite** | A pessoa não recebeu ou perdeu o email para definir a palavra-passe |
| **Papel** | Mudar entre Editor, Consulta e Administrador |
| **Repor 2FA** | A pessoa perdeu ou trocou de telemóvel; na entrada seguinte lê um novo código QR |
| **Desativar / Reativar** | Retirar ou devolver o acesso. A desativação tem efeito imediato, mesmo com sessão aberta |

Por segurança, não pode desativar nem alterar o seu próprio acesso, e tem de existir sempre pelo menos um administrador ativo.

### Passo 61 — Abrir o Cloud Shell

**Porquê:** a ativação do segundo fator com aplicação autenticadora (TOTP) não tem botão na consola. Faz-se com um comando no Cloud Shell, um Terminal que corre no navegador, já com sessão iniciada na sua conta Google.

**Onde:** https://console.cloud.google.com

**O que fazer:**
1. No topo, ao lado do logótipo Google Cloud, clique no seletor de projeto e escolha `dcab-consulting`.
2. No canto superior direito, clique no ícone **Ativar Cloud Shell** (*Activate Cloud Shell*), um quadrado com `>_`.
3. Abre uma consola na parte de baixo da página. Aguarde até aparecer uma linha que termina em `$`.

### Passo 62 — Preparar o comando

**O que fazer:** copie o comando do passo 63 para a app Notas e substitua `ID-DO-PROJETO` (aparece duas vezes) pelo ID do passo 24.

### Passo 63 — Executar o comando

**O que colar:** o comando preparado no passo 62.
```bash
curl -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/ID-DO-PROJETO/config?updateMask=mfa" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "X-Goog-User-Project: ID-DO-PROJETO" \
  -d '{"mfa":{"providerConfigs":[{"state":"ENABLED","totpProviderConfig":{"adjacentIntervals":5}}]}}'
```

**O que fazer:** cole o comando no Cloud Shell e prima Enter. Se aparecer a janela **Autorizar o Cloud Shell** (*Authorize Cloud Shell*), clique em **Autorizar** (*Authorize*).

**Resultado esperado:** a resposta é um bloco de texto que contém `"totpProviderConfig"` e `"adjacentIntervals": 5`.

**Se correr mal:** uma resposta com `"PERMISSION_DENIED"` ou `"BILLING"` significa que o passo 45 (Blaze) ou o passo 53 (Identity Platform) ainda não está concluído.

## Fase 12 — Ligar a área reservada ao projeto

### Passo 64 — Registar a aplicação web no Firebase

**Onde:** consola Firebase › engrenagem ao lado de **Vista geral do projeto** (*Project Overview*) › **Definições do projeto** (*Project settings*) › separador **Geral** (*General*).

**O que fazer:**
1. Em **As suas apps** (*Your apps*), clique no ícone **`</>`** (Web).
2. Em **Alcunha da app** (*App nickname*), escreva `Área reservada`. **Não** ative «Configurar também o Firebase Hosting».
3. Clique em **Registar app** (*Register app*).
4. O Firebase mostra um bloco de código como este:

```js
const firebaseConfig = {
  apiKey: "AIzaSyA1b2C3d4E5f6G7h8I9j0K-LmNoPqRsTuV",
  authDomain: "dcab-consulting.firebaseapp.com",
  projectId: "dcab-consulting",
  storageBucket: "dcab-consulting.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:a1b2c3d4e5f6a7b8c9d0e1"
};
```

5. Copie os três valores necessários (`apiKey`, `projectId` e `appId`) para a Folha de valores e clique em **Continuar para a consola**.

> A `apiKey` não é secreta: identifica o projeto e aparece sempre no código de qualquer site com Firebase. A proteção dos dados está nas regras do passo 48.

### Passo 65 — Abrir o ficheiro de configuração

**Onde:** VS Code › `public` › `reservado` › `config.js`.

### Passo 66 — Substituir o conteúdo do ficheiro

**O que fazer:** selecione todo o conteúdo do ficheiro (**Cmd + A**), apague-o e cole o bloco abaixo. Depois substitua os três valores em maiúsculas pelos da Folha de valores e guarde com **Cmd + S**.

**O que colar:**
```js
export const CONFIG = {
  firebase: {
    apiKey: "COLAR_API_KEY_DO_PASSO_64",
    authDomain: "dcabconsulting.com",
    projectId: "COLAR_ID_DO_PROJETO_DO_PASSO_24",
    appId: "COLAR_APP_ID_DO_PASSO_64",
  },
  projetoId: "ai4cybersecurity",
  dominioGoogle: "dcabconsulting.com",
  emissorMfa: "DCAB Consulting",
  inatividadeMinutos: 30,
};
```

**Exemplo de como fica preenchido:**
```js
    apiKey: "AIzaSyA1b2C3d4E5f6G7h8I9j0K-LmNoPqRsTuV",
    authDomain: "dcabconsulting.com",
    projectId: "dcab-consulting",
    appId: "1:123456789012:web:a1b2c3d4e5f6a7b8c9d0e1",
  …
```

**Atenção:**
- Mantenha as aspas e as vírgulas.
- Não altere `projetoId: "ai4cybersecurity"`: é o nome interno da candidatura na base de dados, diferente do ID do projeto Firebase.

### Passo 67 — Autorizar o domínio no cliente Google

**Porquê:** a janela de entrada com Google vai abrir em `dcabconsulting.com`. A Google tem de saber que esse endereço é legítimo.

**Onde:** https://console.cloud.google.com/apis/credentials (com o projeto `dcab-consulting` selecionado no topo).

**O que fazer:**
1. Em **IDs de cliente OAuth 2.0** (*OAuth 2.0 Client IDs*), clique em **Web client (auto created by Google Service)**.
2. Em **URIs de redirecionamento autorizados** (*Authorized redirect URIs*), clique em **Adicionar URI** (*Add URI*) e cole:
```
https://dcabconsulting.com/__/auth/handler
```
3. Clique em **Guardar** (*Save*).

### Passo 68 — Restringir a chave da API

**Porquê:** a chave só deve funcionar a partir dos endereços da DCAB.

**Onde:** mesma página, secção **Chaves de API** (*API Keys*).

**O que fazer:**
1. Clique em **Browser key (auto created by Firebase)**.
2. Em **Restrições de aplicações** (*Application restrictions*), escolha **Websites**.
3. Clique em **Adicionar** (*Add*) três vezes e cole, um em cada linha:
```
https://dcabconsulting.com/*
https://dcab-consulting.web.app/*
https://dcab-consulting.firebaseapp.com/*
```
Nas duas últimas, use o seu ID do projeto em vez de `dcab-consulting`, se for diferente.

4. Clique em **Guardar** (*Save*). A alteração pode demorar até 5 minutos a ter efeito.

### Passo 69 — Publicar tudo

**Onde:** Terminal, na pasta do site.

**O que colar:**
```bash
firebase deploy --only hosting,firestore:rules
```

**Resultado esperado:** `✔  Deploy complete!`

## Fase 13 — Primeiro acesso

Antes de começar, instale no iPhone a aplicação **Microsoft Authenticator** ou **Google Authenticator**, a partir da App Store.

### Passo 70 — Abrir a área reservada

**Onde:** https://dcabconsulting.com/reservado

**Resultado esperado:** aparece o ecrã «Entrar na área reservada», com os campos Email e Palavra-passe e o botão **Entrar com Google**.

### Passo 71 — Entrar

**O que fazer:** como administrador, clique em **Entrar com Google** e escolha `daniel.carvalho@dcabconsulting.com`. As pessoas convidadas por email seguem as instruções do passo 60.

Se o navegador avisar que bloqueou uma janela pop-up, permita as janelas pop-up para `dcabconsulting.com`. No Safari, isso faz-se em **Safari › Definições › Websites › Janelas pop-up**.

### Passo 72 — Confirmar o email (só para contas criadas por convite)

**Quando acontece:** as contas criadas no passo 58 começam com o email por confirmar. Na primeira entrada aparece o ecrã «Confirme o seu email». Com **Entrar com Google**, este passo não aparece.

**O que fazer:** abra a mensagem recebida, clique na ligação de confirmação e, de volta à área reservada, clique em **Já confirmei, continuar**.

### Passo 73 — Registar o segundo fator

**O que fazer:**
1. No iPhone, abra a aplicação autenticadora e toque em **+** (Microsoft Authenticator: **Outra conta**; Google Authenticator: **Ler código QR**).
2. Aponte a câmara para o código QR que aparece no ecrã.
3. A aplicação passa a mostrar um código de 6 dígitos que muda a cada 30 segundos. Escreva-o no campo **Código de 6 dígitos** e clique em **Ativar**.

**Resultado esperado:** aparece a mensagem «Autenticação de dois fatores ativada. Entre novamente para concluir.» e a sessão termina.

### Passo 74 — Entrar com o segundo fator

**O que fazer:** entre outra vez (com Google, ou com email e palavra-passe) e introduza o código atual da aplicação autenticadora.

**Resultado esperado:** abre a área reservada, com o separador **Resumo** e a indicação **Administrador**.

### Passo 75 — Criar as fases da candidatura

**O que fazer:** no **Resumo**, clique em **Criar fases ADT, PP01–PP12 e PSF**.

**Resultado esperado:** aparecem 14 blocos: ADT, PP01 a PP12 e PSF, todos «Em preparação».

### Passo 76 — Carregar os dados do Excel

**O que fazer:**
1. Abra o separador **Parâmetros** e clique em **Importar do Excel de controlo**.
2. Escolha o ficheiro `Controlo_Execucao_Candidatura_IA_Dcab_Consulting.xlsx`.
3. Confirme o resumo e clique em **Importar**.

**Em alternativa:** preencha à mão a data de início de elegibilidade e os nomes dos consultores, e clique em **Gravar parâmetros**.

**Resultado esperado:** a data de fim de elegibilidade é calculada automaticamente e o separador **Contratação** mostra os 24 meses.

## Fase 14 — Testes de segurança

### Passo 77 — Conta não autorizada

**O que fazer:** numa janela privada do navegador (**Cmd + Shift + N** no Chrome e no Safari), entre com uma conta Google pessoal.

**Resultado esperado:** depois do segundo fator, aparece «Sem acesso».

Teste também a entrada por email com um email que não foi convidado: deve aparecer «Email ou palavra-passe incorretos». Ao clicar em «Primeiro acesso…», a mensagem é a mesma de um convite válido, mas não chega nenhum email. Isto é intencional: impede que alguém descubra que emails têm acesso.

### Passo 78 — Bloqueio de pedidos fechados

**O que fazer:**
1. Registe uma despesa de teste associada a PP01.
2. Em **Pedidos de pagamento**, edite PP01 e mude o estado para **Submetido**.

**Resultado esperado:** em **Despesas**, essa despesa mostra «Fechado» e o botão **Editar** desaparece. Depois do teste, volte a pôr PP01 **Em preparação** e elimine a despesa.

### Passo 79 — Simular um acesso sem autenticação

**Onde:** consola Firebase › **Firestore Database › Regras** (*Rules*) › **Playground das regras** (*Rules Playground*).

**O que fazer:**

| Campo | Valor |
|---|---|
| Tipo de simulação (*Simulation type*) | `get` |
| Localização (*Location*) | `projetos/ai4cybersecurity` |
| Autenticado (*Authenticated*) | desativado |

Clique em **Executar** (*Run*).

**Resultado esperado:** **Leitura simulada recusada** (*Simulated read denied*), a vermelho.

### Passo 80 — Cabeçalhos de segurança

**Onde:** https://securityheaders.com

**O que fazer:** analise `https://dcabconsulting.com` e depois `https://dcabconsulting.com/reservado`.

**Resultado esperado:** classificação **A** nos dois endereços, com a linha *Content-Security-Policy* presente.

### Passo 81 — Registo de auditoria

**Onde:** consola Firebase › **Firestore Database › Dados** › `projetos` › `ai4cybersecurity` › `auditoria`.

**Resultado esperado:** existe um documento por cada alteração feita nos passos anteriores, com o email do autor e a hora.

## Fase 15 — Reforço recomendado

### Passo 82 — Verificação em dois passos no Google Workspace

**Onde:** https://admin.google.com › **Segurança › Autenticação › Verificação em dois passos** (*Security › Authentication › 2-step verification*).

**O que fazer:** ative **Permitir que os utilizadores ativem a verificação em dois passos** e, em **Aplicação**, escolha **Ativado** (*On*), com uma data de início.

### Passo 83 — Rever os acessos a cada trimestre

**Onde:** área reservada › separador **Acessos**.

**O que fazer:** confirme que cada pessoa na lista ainda precisa de acesso e que o papel é o adequado. Para retirar o acesso, use **Desativar**.

**Resultado:** a pessoa deixa de conseguir ler ou alterar dados no instante seguinte, mesmo que tenha uma sessão aberta.

---

# Manutenção

| Quero… | O que fazer |
|---|---|
| Alterar textos do site | Editar os ficheiros em `public` no VS Code e executar `firebase deploy --only hosting` |
| Alterar o Apps Script | Editar e guardar no script.google.com; depois **Implementar › Gerir implementações** › lápis › **Versão: Nova versão** › **Implementar**. O URL mantém-se |
| Mudar quem recebe os pedidos | Alterar `EMAIL_DESTINO` nas propriedades do script (vários endereços separados por vírgula). Não é preciso republicar |
| Dar ou retirar acesso à área reservada | Coleção `acessos` no Firestore (passo 49) |
| Alterar as regras de segurança | Editar `firestore.rules` e executar `firebase deploy --only firestore:rules` |
| Voltar a uma versão anterior do site | Consola Firebase › **Hosting › Histórico de lançamentos** (*Release history*) › menu `⋮` › **Reverter** (*Rollback*) |
| Convidar uma pessoa nova | Separador **Acessos** da área reservada (passos 59 e 60) |
| Retirar o acesso a alguém | Separador **Acessos** › **Desativar** |
| Publicar alterações às funções do servidor | `bash publicar.sh funcoes` |

---

# Glossário

| Termo | Significado |
|---|---|
| **Apps Script** | Pequenos programas que correm nos servidores da Google, ligados à sua conta. Aqui, recebe o formulário e envia o email |
| **Implementação** (*deployment*) | Publicar uma versão do Apps Script com um endereço próprio |
| **URL** | Endereço de uma página ou serviço na internet, como `https://…` |
| **ID** | Código único que identifica algo (uma folha, um projeto, uma aplicação) |
| **Firebase** | Serviço da Google que aloja o site, a base de dados e a autenticação |
| **Firestore** | A base de dados do Firebase onde ficam as despesas, os pedidos e os parâmetros |
| **Regras de segurança** | O ficheiro `firestore.rules`, que diz ao servidor quem pode ler e escrever |
| **CLI / Firebase CLI** | Ferramenta de linha de comandos, usada no Terminal para publicar |
| **Deploy** | Publicar: enviar os ficheiros do Mac para o servidor |
| **Terminal** | Aplicação do Mac para escrever comandos |
| **Cloud Shell** | Um Terminal que corre no navegador, dentro da consola Google Cloud |
| **DNS** | Sistema que associa um domínio (`dcabconsulting.com`) ao servidor onde está o site |
| **Registo A / TXT / MX** | Linhas do DNS. A aponta para o servidor do site; TXT prova a propriedade do domínio; MX indica onde é entregue o email |
| **Convite** | Conta criada pelo administrador; a pessoa define a própria palavra-passe através de uma ligação por email |
| **Política de palavras-passe** | Regras mínimas que todas as palavras-passe têm de cumprir (tamanho e tipos de caracteres) |
| **MFA / segundo fator** | Pedido de um segundo elemento de prova além da conta, aqui o código da aplicação autenticadora |
| **TOTP** | Código temporário de 6 dígitos, renovado a cada 30 segundos, gerado pela aplicação autenticadora |
| **Plano Blaze** | Plano de pagamento por utilização do Firebase, necessário para o MFA |

# Atualização para a versão final — dcabconsulting.com

Este pacote contém **o site completo na versão final**. Em vez de copiar ficheiros soltos, substitui-se a pasta inteira. É mais simples e evita misturar versões.

---

## O que esta versão inclui

| Área | Alterações |
|---|---|
| Página principal | Abertura com vídeo (entrada e ciclo contínuo), título em destaque e botão «Pedir contacto»; faixa de atalhos; secção «Quem somos»; título novo da AnkoraOne; ligações para ankoraone.com e neora.pt; texto revisto |
| Páginas novas | Prevenção de fuga de dados, Classificação da informação, Continuidade de negócio, Resposta a incidentes |
| SEO | Títulos e descrições otimizados, imagem de partilha, dados estruturados completos (com o LinkedIn da AnkoraOne), morada no rodapé, sitemap com 6 páginas |
| Área reservada | Leitor de QR code de faturas, taxas de comparticipação editáveis, separador Acessos, biblioteca de Excel corrigida |
| Segurança | Cabeçalhos de segurança nas páginas novas; permissão de câmara só na área reservada |

---

## Parte 1 — Substituir a pasta do site (5 minutos)

### Passo 1 — Guardar a versão atual

No Finder, em **Documentos**, mude o nome da pasta `site-dcabconsulting` para `site-dcabconsulting-anterior`. Para mudar o nome, clique uma vez na pasta, prima **Enter**, escreva o nome novo e prima **Enter**.

Não apague esta pasta até confirmar que a versão nova está online.

### Passo 2 — Instalar a versão final

1. Faça duplo clique em `site-dcabconsulting-final.zip`. Aparece a pasta `site-dcabconsulting`.
2. Arraste essa pasta para **Documentos**.

### Passo 3 — Abrir o Terminal na pasta

Abra o Terminal (**Cmd + Espaço**, escreva `Terminal`, prima Enter) e cole:

```bash
cd ~/Documents/site-dcabconsulting
```

### Passo 4 — Publicar

```bash
bash publicar.sh
```

O script pede o **URL do Apps Script**, porque o pacote não o inclui:

1. Abra script.google.com › **Formulário site DCAB** › **Implementar** › **Gerir implementações**.
2. Copie o **URL** da Aplicação Web (termina em `/exec`).
3. Cole-o no Terminal e prima **Enter**.

**Resultado esperado:** todas as linhas com ✔ e, no fim, «Concluído», com três confirmações novas:
- «Páginas das soluções publicadas»;
- «Vídeo da abertura publicado»;
- «Área reservada atualizada no servidor».

Já vêm preenchidos no pacote: a configuração da área reservada (`config.js`), o projeto Firebase (`.firebaserc`) e as funções do servidor. Não é preciso publicar as funções de novo: não mudaram.

---

## Parte 2 — Atualizar o formulário de contacto (5 minutos)

Se ainda não aplicou a correção de segurança do formulário (limite de 30 pedidos por hora):

1. Abra script.google.com › **Formulário site DCAB**.
2. No ficheiro `Código.gs`, prima **Cmd + A** e depois **Delete**.
3. Abra o ficheiro `apps-script/Codigo.gs` do pacote no VS Code, copie todo o conteúdo e cole-o no editor do Apps Script.
4. Guarde com **Cmd + S**.
5. Clique em **Implementar › Gerir implementações**, no lápis, em **Versão: Nova versão** e em **Implementar**.

O URL mantém-se, por isso o site não precisa de ser publicado de novo.

---

## Parte 3 — Confirmar no site (10 minutos)

| Verificação | Onde | Resultado esperado |
|---|---|---|
| Página principal | `https://dcabconsulting.com` (recarregar com **Cmd + Shift + R**) | Vídeo na abertura, título com «não pode perder.» a azul, botão «Pedir contacto» |
| Páginas das soluções | Clicar nos atalhos abaixo do vídeo | Abrem as quatro páginas novas |
| Ligações externas | Botões «Visitar ankoraone.com» e «Visitar neora.pt» | Abrem os sites num separador novo |
| Formulário | Enviar um pedido de teste | Chega o email «[Site DCAB] …» |
| Área reservada | `https://dcabconsulting.com/reservado` | Entrada, código do autenticador, separadores incluindo **Acessos** |
| Telemóvel | Abrir o site no iPhone | Vídeo em cima, título por baixo, sem deslocamento lateral |

---

## Parte 4 — Google (10 minutos)

1. **Sitemap.** Em search.google.com/search-console › **Sitemaps**, volte a submeter `sitemap.xml`. Deve indicar 6 páginas encontradas.
2. **Indexação.** Em **Inspeção de URL**, introduza cada endereço e clique em **Pedir indexação**:
   - `https://dcabconsulting.com`
   - `https://dcabconsulting.com/solucoes/prevencao-fuga-dados`
   - `https://dcabconsulting.com/solucoes/classificacao-informacao`
   - `https://dcabconsulting.com/solucoes/continuidade-negocio`
   - `https://dcabconsulting.com/solucoes/resposta-incidentes`
3. **Dados estruturados.** Em https://search.google.com/test/rich-results, teste a página principal (deve reconhecer «Organização») e uma página de solução (deve reconhecer a localização na página e as perguntas frequentes).
4. **Desempenho.** Em https://pagespeed.web.dev, analise a página principal.
5. **Partilha.** Em https://www.linkedin.com/post-inspector, introduza `https://dcabconsulting.com` para atualizar a imagem de partilha.

---

## Parte 5 — Tarefas pendentes de segurança (uma vez)

Se ainda não as fez, estas tarefas são executadas no Cloud Shell (console.cloud.google.com, projeto **dcab-consulting**, ícone `>_`) ou nos painéis indicados.

| Tarefa | Como |
|---|---|
| Cópias de segurança diárias da base de dados (14 dias) | `gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14d --project=dcab-consulting` |
| DMARC (proteção contra emails falsos em nome da DCAB) | Squarespace › DNS › Custom Records: Nome `_dmarc`, Tipo TXT, Dados `v=DMARC1; p=none; rua=mailto:daniel.carvalho@dcabconsulting.com` |
| Segundo administrador da área reservada | Área reservada › **Acessos** › convidar com papel **Administrador** |
| Restringir a chave da API | Guia de publicação, passo 68 |
| Verificação em dois passos obrigatória no Google Workspace | admin.google.com › Segurança › Autenticação › Verificação em dois passos |

---

---

## Inventário dos ficheiros

### Ficheiros de texto (código completo no Anexo)

| Ficheiro | Para que serve | O que fazer |
|---|---|---|
| `public/index.html` | Página principal | Substituir |
| `public/privacidade.html` | Política de privacidade | Substituir |
| `public/404.html` | Página de erro | Manter (sem alterações) |
| `public/robots.txt` | Instruções para motores de pesquisa | Manter |
| `public/sitemap.xml` | Mapa do site (6 páginas) | Substituir |
| `public/solucoes/prevencao-fuga-dados.html` | Página de solução | Novo |
| `public/solucoes/classificacao-informacao.html` | Página de solução | Novo |
| `public/solucoes/continuidade-negocio.html` | Página de solução | Novo |
| `public/solucoes/resposta-incidentes.html` | Página de solução | Novo |
| `public/assets/css/estilo.css` | Estilos do site | Substituir |
| `public/assets/js/principal.js` | Formulário de contacto (contém o URL do Apps Script) | Manter o seu; o do pacote tem o URL por preencher |
| `public/assets/js/abertura.js` | Vídeo da abertura | Novo / substituir |
| `public/reservado/index.html` | Área reservada: página | Substituir |
| `public/reservado/app.js` | Área reservada: aplicação | Substituir |
| `public/reservado/modelo.js` | Área reservada: cálculos e leitura de QR | Substituir |
| `public/reservado/reservado.css` | Área reservada: estilos | Substituir |
| `public/reservado/arranque.js` | Área reservada: diagnóstico de arranque | Manter / substituir |
| `public/reservado/config.js` | Área reservada: ligação ao projeto Firebase (já preenchido) | Substituir |
| `firebase.json` | Alojamento, cabeçalhos de segurança e funções | Substituir |
| `firestore.rules` | Regras de segurança da base de dados | Substituir |
| `.firebaserc` | Projeto Firebase (dcab-consulting) | Manter / substituir |
| `publicar.sh` | Script de publicação com verificações | Substituir |
| `functions/index.js` | Funções do servidor (gestão de acessos) | Manter (sem alterações) |
| `functions/logica.js` | Lógica das funções do servidor | Manter (sem alterações) |
| `functions/package.json` | Bibliotecas das funções | Manter (sem alterações) |
| `apps-script/Codigo.gs` | Formulário no Google Apps Script (não vai para o site) | Colar no Apps Script (Parte 2) |

### Ficheiros binários (só no pacote `site-dcabconsulting-final.zip`)

Estes ficheiros não podem ser colados como texto. Copie-os do pacote para o mesmo caminho dentro da pasta do site.

| Ficheiro | Para que serve |
|---|---|
| `public/assets/video/dcab-intro.webm e .mp4` | Vídeo de entrada |
| `public/assets/video/dcab-ciclo.webm e .mp4` | Vídeo em ciclo |
| `public/assets/img/dcab-intro-inicio.jpg` | Imagem antes de o vídeo arrancar |
| `public/assets/img/dcab-intro-final.jpg` | Imagem fixa (movimento reduzido) |
| `public/assets/img/og-dcab.jpg` | Imagem de partilha nas redes sociais |
| `public/assets/img/logo-dcab-branco.png` | Logótipo do rodapé (otimizado) |
| `public/assets/img/monograma-preto.png, favicon.png, apple-touch-icon.png, logo-dcab.png` | Logótipos e ícones |
| `public/reservado/vendor/pdf.min.mjs e pdf.worker.min.mjs` | Biblioteca de leitura de PDF (leitor de QR) |

---

## Alternativa — atualizar ficheiro a ficheiro, colando o código

Use esta via apenas se não puder substituir a pasta inteira (Parte 1). Para cada ficheiro marcado como **Substituir** ou **Novo** no inventário:

1. No VS Code, abra a pasta `Documentos/site-dcabconsulting` (**File › Open Folder…**).
2. **Ficheiro existente:** clique nele na coluna da esquerda, prima **Cmd + A** e depois **Delete**.
   **Ficheiro novo:** clique com o botão direito na pasta de destino › **New File…**, escreva o nome exato (por exemplo `prevencao-fuga-dados.html`) e prima Enter. Para a pasta `solucoes`, crie-a primeiro dentro de `public` com **New Folder…**.
3. No Anexo abaixo, copie **todo** o bloco de código desse ficheiro, sem as linhas com os acentos graves (````).
4. Cole no VS Code (**Cmd + V**) e guarde (**Cmd + S**).
5. Copie também os ficheiros binários do pacote (tabela acima).
6. No fim, publique com `bash publicar.sh`. O script confirma que nenhum ficheiro ficou em falta e que não há erros de escrita no código.

> **`principal.js`:** mantenha o seu ficheiro atual, que já tem o URL do formulário. Se usar o do Anexo, substitua `COLAR_AQUI_O_URL_DO_APPS_SCRIPT` (linha 10) pelo URL do Apps Script, ou deixe o `publicar.sh` pedi-lo.

---

## Se algo correr mal

- **O `publicar.sh` mostra uma linha com ✘:** não publicou nada. Copie a linha e envie-a.
- **O site novo tem um problema e precisa de voltar atrás:** na consola Firebase, abra **Hosting › Histórico de lançamentos**. No lançamento anterior, use o menu `⋮` › **Reverter**. A versão anterior volta a ficar online de imediato.
- **Tudo confirmado:** a pasta `site-dcabconsulting-anterior` pode ser apagada.

A partir de agora, todas as alterações fazem-se em `Documentos/site-dcabconsulting` e publicam-se com `bash publicar.sh`.

---

# Anexo — Código completo dos ficheiros

Cada bloco corresponde a um ficheiro, com o caminho indicado no título. Copie o bloco inteiro.

## `public/index.html`

Página principal. **Substituir.**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DLP, classificação e continuidade de negócio | DCAB Consulting</title>
  <meta name="description" content="Prevenção de fuga de dados (DLP), classificação da informação e continuidade de negócio. Detentora da AnkoraOne, plataforma SaaS de GRC.">
  <link rel="canonical" href="https://dcabconsulting.com/">
  <meta name="theme-color" content="#00A2DB">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:title" content="DCAB Consulting | Proteção da informação">
  <meta property="og:description" content="Prevenção de fuga de dados (DLP), classificação da informação e continuidade de negócio. Detentora da AnkoraOne, plataforma SaaS de GRC.">
  <meta property="og:url" content="https://dcabconsulting.com/">
  <meta property="og:site_name" content="DCAB Consulting">
  <meta property="og:image" content="https://dcabconsulting.com/assets/img/og-dcab.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Logótipo DCAB Consulting sobre fundo azul-escuro com linhas de circuito">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
  <script src="/assets/js/principal.js" defer></script>
  <script src="/assets/js/abertura.js" defer></script>

  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://dcabconsulting.com/#organizacao",
      "name": "DCAB Consulting",
      "legalName": "DCAB Consulting, Lda.",
      "taxID": "518180964",
      "url": "https://dcabconsulting.com/",
      "logo": "https://dcabconsulting.com/assets/img/logo-dcab.png",
      "image": "https://dcabconsulting.com/assets/img/og-dcab.jpg",
      "description": "Prevenção de fuga de dados (DLP), classificação da informação e continuidade de negócio. Detentora da AnkoraOne, plataforma SaaS de GRC.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Urbanização do Torrão, n.º 66",
        "postalCode": "4825-458",
        "addressLocality": "Água Longa",
        "addressRegion": "Santo Tirso",
        "addressCountry": "PT"
      },
      "areaServed": {
        "@type": "Country",
        "name": "Portugal"
      },
      "knowsAbout": [
        "Prevenção de fuga de dados (DLP)",
        "Classificação da informação",
        "Continuidade de negócio",
        "ISO 22301",
        "ISO/IEC 27001",
        "Diretiva NIS2",
        "Regulamento DORA",
        "RGPD",
        "Governação, risco e conformidade (GRC)"
      ],
      "makesOffer": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Prevenção de fuga de dados (DLP)",
            "provider": {
              "@id": "https://dcabconsulting.com/#organizacao"
            }
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Classificação e rotulagem da informação",
            "provider": {
              "@id": "https://dcabconsulting.com/#organizacao"
            }
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Planos de continuidade e recuperação",
            "provider": {
              "@id": "https://dcabconsulting.com/#organizacao"
            }
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Resposta a incidentes de fuga de informação",
            "provider": {
              "@id": "https://dcabconsulting.com/#organizacao"
            }
          }
        }
      ],
      "owns": {
        "@type": "Product",
        "name": "AnkoraOne",
        "url": "https://ankoraone.com",
        "description": "Plataforma SaaS de governação, risco e conformidade (GRC).",
        "sameAs": [
          "https://www.linkedin.com/company/ankoraone/"
        ]
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://dcabconsulting.com/#site",
      "url": "https://dcabconsulting.com/",
      "name": "DCAB Consulting",
      "inLanguage": "pt-PT",
      "publisher": {
        "@id": "https://dcabconsulting.com/#organizacao"
      }
    }
  ]
}
  </script>
</head>
<body>
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>

  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>DCAB Consulting</span>
      </a>
      <nav class="topo__nav" aria-label="Navegação principal">
        <a href="#quem-somos">Quem somos</a>
        <a href="#solucoes">Soluções</a>
        <a href="#ankoraone">AnkoraOne</a>
        <a href="#parceria">Parceria</a>
      </nav>
      <a class="botao botao--pequeno" href="#contacto">Pedir contacto</a>
    </div>
  </header>

  <main id="conteudo">

    <!-- Abertura -->
    <section class="abertura abertura--titulo" aria-labelledby="abertura-titulo">
      <div class="abertura__media" aria-hidden="true">
        <video class="abertura__video abertura__video--ciclo" muted playsinline loop preload="none">
          <source src="/assets/video/dcab-ciclo.webm" type="video/webm">
          <source src="/assets/video/dcab-ciclo.mp4" type="video/mp4">
        </video>
        <video class="abertura__video abertura__video--entrada" autoplay muted playsinline preload="auto" poster="/assets/img/dcab-intro-inicio.jpg">
          <source src="/assets/video/dcab-intro.webm" type="video/webm">
          <source src="/assets/video/dcab-intro.mp4" type="video/mp4">
        </video>
        <img class="abertura__final" src="/assets/img/dcab-intro-final.jpg" alt="" width="1280" height="720" loading="lazy">
      </div>
      <div class="abertura__texto">
        <h1 id="abertura-titulo">Protegemos a informação que a sua organização <span class="realce">não pode perder.</span></h1>
        <a class="botao botao--linha-clara botao--discreto" href="#contacto">Pedir contacto</a>
      </div>
    </section>

    <!-- Atalhos para as áreas de atuação -->
    <nav class="atalhos" aria-label="Áreas de atuação">
      <div class="atalhos__interior">
        <a href="/solucoes/prevencao-fuga-dados"><strong>Prevenção de fuga de dados</strong><span>Controlo da informação que sai da organização</span></a>
        <a href="/solucoes/classificacao-informacao"><strong>Classificação da informação</strong><span>Etiquetas que acompanham cada documento</span></a>
        <a href="/solucoes/continuidade-negocio"><strong>Continuidade de negócio</strong><span>Recuperação depois de um incidente</span></a>
        <a href="#ankoraone"><strong>AnkoraOne</strong><span>Governação, risco e conformidade em SaaS</span></a>
      </div>
    </nav>

    <!-- Quem somos -->
    <section class="bloco" id="quem-somos" aria-labelledby="quem-somos-titulo">
      <div class="bloco__interior quem-somos">
        <div class="quem-somos__texto">
          <h2 id="quem-somos-titulo">Quem somos</h2>
          <p>A DCAB Consulting é uma empresa portuguesa de segurança da informação. Implementa soluções de prevenção de fuga de dados (DLP), classificação da informação e continuidade de negócio, e desenvolveu a AnkoraOne, uma plataforma SaaS de governação, risco e conformidade (GRC).</p>
          <p>Trabalhamos com as equipas de informática e de segurança de cada cliente, desde o levantamento da informação sensível até à implementação e aos testes de recuperação. Nos projetos que exigem infraestrutura ou serviços geridos, contamos com a Neora Consulting.</p>
        </div>
        <dl class="quem-somos__factos">
          <div><dt>Áreas</dt><dd>Prevenção de fuga de dados, classificação da informação, continuidade de negócio</dd></div>
          <div><dt>Plataforma</dt><dd><a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>, governação, risco e conformidade em SaaS</dd></div>
          <div><dt>Parceiro</dt><dd><a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a></dd></div>
          <div><dt>Sede</dt><dd>Água Longa, Santo Tirso</dd></div>
        </dl>
      </div>
    </section>

    <!-- Soluções -->
    <section class="bloco" id="solucoes" aria-labelledby="solucoes-titulo">
      <div class="bloco__interior">
        <h2 id="solucoes-titulo">Soluções de segurança da informação</h2>
        <p class="bloco__intro">Desenhamos e implementamos as soluções técnicas que protegem a informação no dia a dia da organização, do posto de trabalho à cloud.</p>

        <article class="dominio">
          <div class="dominio__cabeca">
            <h3>Proteção da informação</h3>
            <p>Identificar a informação sensível e impedir que saia da organização sem autorização.</p>
            <ul class="saber-mais">
              <li><a href="/solucoes/prevencao-fuga-dados">Prevenção de fuga de dados (DLP)</a></li>
              <li><a href="/solucoes/classificacao-informacao">Classificação e rotulagem da informação</a></li>
            </ul>
          </div>
          <dl class="componentes">
            <div class="componentes__destaque">
              <dt>Prevenção de fuga de dados (DLP)</dt>
              <dd>Políticas que detetam e bloqueiam o envio de informação sensível por email, pela web, em aplicações cloud ou para dispositivos externos.</dd>
            </div>
            <div>
              <dt>Descoberta de dados sensíveis</dt>
              <dd>Levantamento da informação crítica guardada em servidores, repositórios de documentos e serviços cloud.</dd>
            </div>
            <div>
              <dt>Classificação e rotulagem</dt>
              <dd>Esquemas de classificação definidos para cada organização. A etiqueta é aplicada automaticamente ou pelo utilizador e acompanha o documento.</dd>
            </div>
            <div>
              <dt>Proteção da informação interna</dt>
              <dd>Controlo de acessos, cifragem e gestão de direitos sobre documentos, incluindo quando são partilhados com o exterior.</dd>
            </div>
            <div>
              <dt>Informação e inteligência artificial</dt>
              <dd>Regras sobre a informação que pode ser usada em ferramentas de IA generativa e controlo do que lhes é enviado.</dd>
            </div>
          </dl>
        </article>

        <article class="dominio">
          <div class="dominio__cabeca">
            <h3>Continuidade de negócio</h3>
            <p>Manter a informação e os serviços críticos disponíveis depois de um incidente.</p>
            <ul class="saber-mais">
              <li><a href="/solucoes/continuidade-negocio">Continuidade de negócio e recuperação</a></li>
              <li><a href="/solucoes/resposta-incidentes">Resposta a incidentes</a></li>
            </ul>
          </div>
          <dl class="componentes">
            <div>
              <dt>Planos de continuidade e recuperação</dt>
              <dd>Análise de impacto no negócio e planos de continuidade e recuperação segundo a ISO 22301, com tempos de recuperação definidos.</dd>
            </div>
            <div>
              <dt>Cópias de segurança protegidas</dt>
              <dd>Cópias de segurança isoladas e imutáveis, preparadas para resistir a ataques de ransomware.</dd>
            </div>
            <div>
              <dt>Testes e exercícios</dt>
              <dd>Testes de recuperação e exercícios de crise, realizados com regularidade.</dd>
            </div>
            <div>
              <dt>Resposta a incidentes</dt>
              <dd>Contenção e investigação de incidentes e fugas de informação, e notificação às autoridades competentes quando é obrigatória.</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <!-- AnkoraOne -->
    <section class="ankora" id="ankoraone" aria-labelledby="ankora-titulo">
      <div class="bloco__interior ankora__interior">
        <div class="ankora__cabeca">
          <p class="ankora__nome">AnkoraOne</p>
          <h2 id="ankora-titulo">A Infraestrutura Inteligente de Governação, Risco e Conformidade</h2>
          <p>A AnkoraOne é uma plataforma SaaS desenvolvida pela DCAB Consulting para gerir governação, risco e conformidade. Reúne os frameworks, os riscos, os controlos e as evidências de cada organização e usa inteligência artificial para apoiar a análise.</p>
          <p>Funciona no navegador, sem instalação nem servidores próprios.</p>
          <div class="ankora__acoes">
            <a class="botao botao--claro" href="#contacto" data-assunto="Demonstração da AnkoraOne">Pedir demonstração</a>
            <a class="botao botao--linha-clara" href="https://ankoraone.com" target="_blank" rel="noopener">Visitar ankoraone.com</a>
          </div>
        </div>

        <dl class="pilares">
          <div>
            <dt>Gestão de frameworks</dt>
            <dd>ISO/IEC 27001, Diretiva NIS2, Regulamento DORA, RGPD, ISO 22301 e ISO/IEC 42001.</dd>
          </div>
          <div>
            <dt>Risco</dt>
            <dd>Identificação, avaliação e tratamento de riscos com os mesmos critérios em toda a organização.</dd>
          </div>
          <div>
            <dt>Controlos e evidências</dt>
            <dd>Cada requisito ligado aos controlos e às evidências que o comprovam, para preparar auditorias.</dd>
          </div>
          <div>
            <dt>Governação</dt>
            <dd>Relatórios para a administração acompanhar o estado da conformidade e tomar decisões.</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Parceria -->
    <section class="bloco" id="parceria" aria-labelledby="parceria-titulo">
      <div class="bloco__interior parceria">
        <h2 id="parceria-titulo">Parceria com a Neora Consulting</h2>
        <div class="parceria__texto">
          <p>A DCAB Consulting trabalha em parceria com a Neora Consulting, empresa de consultoria tecnológica com mais de 20 anos de experiência no mercado nacional.</p>
          <p>Nos projetos conjuntos, a Neora contribui com a experiência em infraestrutura, cibersegurança e serviços geridos.</p>
          <p><a class="botao botao--linha" href="https://neora.pt" target="_blank" rel="noopener">Visitar neora.pt</a></p>
        </div>
      </div>
    </section>

    <!-- Contacto -->
    <section class="contacto" id="contacto" aria-labelledby="contacto-titulo">
      <div class="bloco__interior contacto__interior">
        <div class="contacto__texto">
          <h2 id="contacto-titulo">Fale connosco</h2>
          <p>Indique o que precisa. A equipa da DCAB Consulting responde por email, em regra no prazo de dois dias úteis.</p>
          <p class="contacto__nota">Os dados enviados são usados apenas para responder ao seu pedido. Consulte a <a href="/privacidade">política de privacidade</a>.</p>
        </div>

        <form class="formulario" id="formulario-contacto" novalidate>
          <div class="campo">
            <label for="nome">Nome</label>
            <input id="nome" name="nome" type="text" autocomplete="name" required maxlength="120">
            <p class="campo__erro" id="nome-erro"></p>
          </div>

          <div class="campo">
            <label for="empresa">Empresa</label>
            <input id="empresa" name="empresa" type="text" autocomplete="organization" required maxlength="120">
            <p class="campo__erro" id="empresa-erro"></p>
          </div>

          <div class="campo">
            <label for="email">Email profissional</label>
            <input id="email" name="email" type="email" autocomplete="email" required maxlength="160">
            <p class="campo__erro" id="email-erro"></p>
          </div>

          <div class="campo">
            <label for="telefone">Telefone <span class="opcional">(opcional)</span></label>
            <input id="telefone" name="telefone" type="tel" autocomplete="tel" maxlength="30">
          </div>

          <div class="campo campo--largo">
            <label for="assunto">Assunto</label>
            <select id="assunto" name="assunto" required>
              <option value="">Selecione o assunto</option>
              <option>Prevenção de fuga de dados (DLP)</option>
              <option>Classificação e proteção da informação</option>
              <option>Continuidade de negócio</option>
              <option>Demonstração da AnkoraOne</option>
              <option>Parcerias</option>
              <option>Proteção de dados</option>
              <option>Outro</option>
            </select>
            <p class="campo__erro" id="assunto-erro"></p>
          </div>

          <div class="campo campo--largo">
            <label for="mensagem">Mensagem</label>
            <textarea id="mensagem" name="mensagem" rows="5" required maxlength="3000"></textarea>
            <p class="campo__erro" id="mensagem-erro"></p>
          </div>

          <!-- Campo-armadilha para bots: invisível para pessoas -->
          <div class="armadilha" aria-hidden="true">
            <label for="website">Não preencher</label>
            <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
          </div>

          <div class="campo campo--largo campo--caixa">
            <input id="consentimento" name="consentimento" type="checkbox" required>
            <label for="consentimento">Autorizo o tratamento dos meus dados para resposta a este pedido, nos termos da <a href="/privacidade">política de privacidade</a>.</label>
            <p class="campo__erro" id="consentimento-erro"></p>
          </div>

          <div class="campo--largo formulario__rodape">
            <button class="botao" type="submit" id="botao-enviar">Enviar pedido</button>
            <p class="formulario__estado" id="estado" role="status" aria-live="polite"></p>
          </div>
        </form>
      </div>
    </section>
  </main>

  <footer class="rodape">
    <div class="bloco__interior rodape__interior">
      <img src="/assets/img/logo-dcab-branco.png" alt="DCAB Consulting" width="96" height="136">
      <div class="rodape__info">
        <p>Prevenção de fuga de dados, classificação da informação e continuidade de negócio.</p>
        <p>Detentora da plataforma <a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>. Parceira da <a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a>.</p>
      </div>
      <div class="rodape__legal">
        <a href="/privacidade">Política de privacidade</a>
        <p><a href="/reservado/">Área reservada</a></p>
        <p>© <span id="ano">2026</span> DCAB Consulting, Lda.</p>
        <p>NIPC 518180964</p>
        <p>Urbanização do Torrão, n.º 66, 4825-458 Água Longa</p>
      </div>
    </div>
  </footer>
</body>
</html>
````

## `public/privacidade.html`

Política de privacidade. **Substituir.**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Política de privacidade | DCAB Consulting</title>
  <meta name="description" content="Política de privacidade e proteção de dados do site da DCAB Consulting.">
  <link rel="canonical" href="https://dcabconsulting.com/privacidade">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:site_name" content="DCAB Consulting">
  <meta property="og:title" content="Política de privacidade | DCAB Consulting">
  <meta property="og:url" content="https://dcabconsulting.com/privacidade">
  <meta property="og:image" content="https://dcabconsulting.com/assets/img/og-dcab.jpg">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
  <script src="/assets/js/principal.js" defer></script>
</head>
<body>
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>

  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>DCAB Consulting</span>
      </a>
      <nav class="topo__nav" aria-label="Navegação principal">
        <a href="/#solucoes">Soluções</a>
        <a href="/#ankoraone">AnkoraOne</a>
        <a href="/#parceria">Parceria</a>
      </nav>
      <a class="botao botao--pequeno" href="/#contacto">Pedir contacto</a>
    </div>
  </header>

  <main id="conteudo" class="legal">
    <h1>Política de privacidade</h1>
    <p class="atualizacao">Última atualização: setembro de 2026</p>

    <h2>Responsável pelo tratamento</h2>
    <p>DCAB Consulting, Lda., pessoa coletiva n.º 518180964, com sede na Urbanização do Torrão, n.º 66, 4825-458 Água Longa.</p>

    <h2>Que dados recolhemos</h2>
    <p>Através do formulário de contacto recolhemos o nome, a empresa, o email, o telefone (opcional), o assunto e o conteúdo da mensagem. Registamos também a data e hora do pedido. Não recolhemos outros dados pessoais através deste site.</p>

    <h2>Para que usamos os dados</h2>
    <p>Os dados são usados exclusivamente para responder ao pedido de informação ou de contacto e, quando aplicável, para preparar uma proposta a pedido do titular. Não são usados para envio de comunicações de marketing sem consentimento específico.</p>

    <h2>Fundamento jurídico</h2>
    <p>O tratamento baseia-se no consentimento do titular, dado no formulário, e na realização de diligências pré-contratuais a pedido do titular, nos termos do artigo 6.º, n.º 1, alíneas a) e b), do Regulamento Geral sobre a Proteção de Dados (RGPD).</p>

    <h2>Durante quanto tempo guardamos os dados</h2>
    <p>Os pedidos de contacto são conservados durante 12 meses após a última interação, salvo se derem origem a uma relação contratual, caso em que se aplicam os prazos legais correspondentes.</p>

    <h2>Quem tem acesso aos dados</h2>
    <p>Os dados são acedidos apenas pela equipa da DCAB Consulting. Para o funcionamento do site e do email recorremos a serviços da Google (alojamento Firebase, Google Workspace e Google Apps Script), que atua como subcontratante ao abrigo de termos de proteção de dados conformes com o RGPD. Os dados não são vendidos nem cedidos a terceiros para fins comerciais.</p>

    <h2>Os seus direitos</h2>
    <p>Pode, a qualquer momento, pedir o acesso, a retificação, o apagamento, a limitação ou a portabilidade dos seus dados, opor-se ao tratamento e retirar o consentimento, sem afetar a licitude do tratamento anterior. Para o fazer, use o <a href="/#contacto">formulário de contacto</a> e selecione o assunto «Proteção de dados».</p>
    <p>Tem ainda o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em <a href="https://www.cnpd.pt" rel="noopener">www.cnpd.pt</a>.</p>

    <h2>Cookies</h2>
    <p>Este site não usa cookies de análise, de publicidade ou de rastreio. Os tipos de letra são carregados a partir do serviço Google Fonts, o que implica a comunicação do endereço IP do visitante à Google no momento do carregamento da página.</p>

    <h2>Segurança</h2>
    <p>O site é servido exclusivamente por HTTPS e o endereço de email que recebe os pedidos não é publicado. Aplicamos medidas técnicas e organizativas adequadas para proteger os dados contra acesso não autorizado, perda ou divulgação.</p>
  </main>

  <footer class="rodape">
    <div class="bloco__interior rodape__interior">
      <img src="/assets/img/logo-dcab-branco.png" alt="DCAB Consulting" width="96" height="136">
      <div class="rodape__info">
        <p>Prevenção de fuga de dados, classificação da informação e continuidade de negócio.</p>
        <p>Detentora da plataforma <a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>. Parceira da <a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a>.</p>
      </div>
      <div class="rodape__legal">
        <a href="/privacidade">Política de privacidade</a>
        <p><a href="/reservado/">Área reservada</a></p>
        <p>© <span id="ano">2026</span> DCAB Consulting, Lda.</p>
        <p>NIPC 518180964</p>
        <p>Urbanização do Torrão, n.º 66, 4825-458 Água Longa</p>
      </div>
    </div>
  </footer>
</body>
</html>
````

## `public/404.html`

Página de erro. **Manter (sem alterações).**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Página não encontrada | DCAB Consulting</title>
  <meta name="robots" content="noindex">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
</head>
<body>
  <main class="legal">
    <img src="/assets/img/monograma-preto.png" alt="" width="56" height="70" class="marca-404">
    <h1>Esta página não existe.</h1>
    <p>O endereço pode estar incorreto ou a página foi removida.</p>
    <p><a class="botao" href="/">Voltar à página inicial</a></p>
  </main>
</body>
</html>
````

## `public/robots.txt`

Instruções para motores de pesquisa. **Manter.**

````text
User-agent: *
Allow: /
Disallow: /reservado

Sitemap: https://dcabconsulting.com/sitemap.xml
````

## `public/sitemap.xml`

Mapa do site (6 páginas). **Substituir.**

````xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://dcabconsulting.com/</loc><lastmod>2026-10-05</lastmod></url>
  <url><loc>https://dcabconsulting.com/privacidade</loc><lastmod>2026-10-05</lastmod></url>
  <url><loc>https://dcabconsulting.com/solucoes/prevencao-fuga-dados</loc><lastmod>2026-10-05</lastmod></url>
  <url><loc>https://dcabconsulting.com/solucoes/classificacao-informacao</loc><lastmod>2026-10-05</lastmod></url>
  <url><loc>https://dcabconsulting.com/solucoes/continuidade-negocio</loc><lastmod>2026-10-05</lastmod></url>
  <url><loc>https://dcabconsulting.com/solucoes/resposta-incidentes</loc><lastmod>2026-10-05</lastmod></url>
</urlset>
````

## `public/solucoes/prevencao-fuga-dados.html`

Página de solução. **Novo.**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prevenção de fuga de dados (DLP) para empresas | DCAB Consulting</title>
  <meta name="description" content="Implementação de prevenção de fuga de dados (DLP) no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras.">
  <link rel="canonical" href="https://dcabconsulting.com/solucoes/prevencao-fuga-dados">
  <meta name="theme-color" content="#00A2DB">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:site_name" content="DCAB Consulting">
  <meta property="og:title" content="Prevenção de fuga de dados (DLP) | DCAB Consulting">
  <meta property="og:description" content="Implementação de prevenção de fuga de dados (DLP) no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras.">
  <meta property="og:url" content="https://dcabconsulting.com/solucoes/prevencao-fuga-dados">
  <meta property="og:image" content="https://dcabconsulting.com/assets/img/og-dcab.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
  <script src="/assets/js/principal.js" defer></script>
  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://dcabconsulting.com/solucoes/prevencao-fuga-dados#servico",
      "name": "Prevenção de fuga de dados (DLP)",
      "description": "Implementação de prevenção de fuga de dados (DLP) no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras.",
      "url": "https://dcabconsulting.com/solucoes/prevencao-fuga-dados",
      "areaServed": {
        "@type": "Country",
        "name": "Portugal"
      },
      "provider": {
        "@type": "Organization",
        "@id": "https://dcabconsulting.com/#organizacao",
        "name": "DCAB Consulting",
        "url": "https://dcabconsulting.com/"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://dcabconsulting.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Soluções",
          "item": "https://dcabconsulting.com/#solucoes"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Prevenção de fuga de dados",
          "item": "https://dcabconsulting.com/solucoes/prevencao-fuga-dados"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "A DLP vai impedir as equipas de trabalhar?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Não deve. Por isso começamos em modo de monitorização e só ativamos o bloqueio depois de afinar as regras. Quando há uma necessidade legítima, o utilizador pode justificar o envio e a exceção fica registada."
          }
        },
        {
          "@type": "Question",
          "name": "Funciona com o Microsoft 365 e o Google Workspace?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ambas as plataformas incluem funcionalidades de DLP em determinadas licenças. Antes de propor ferramentas adicionais, avaliamos o que a organização já tem disponível."
          }
        },
        {
          "@type": "Question",
          "name": "Qual é a relação com a classificação da informação?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As etiquetas de classificação tornam as regras de DLP mais simples e mais precisas. Um documento marcado como confidencial pode ter regras próprias, independentemente do conteúdo que a ferramenta consiga reconhecer."
          }
        }
      ]
    }
  ]
}
  </script>
</head>
<body>
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>

  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>DCAB Consulting</span>
      </a>
      <nav class="topo__nav" aria-label="Navegação principal">
        <a href="/#quem-somos">Quem somos</a>
        <a href="/#solucoes">Soluções</a>
        <a href="/#ankoraone">AnkoraOne</a>
        <a href="/#parceria">Parceria</a>
      </nav>
      <a class="botao botao--pequeno" href="/#contacto">Pedir contacto</a>
    </div>
  </header>

  <main id="conteudo">
    <section class="pagina-cabeca">
      <div class="bloco__interior">
        <nav class="migalhas" aria-label="Localização"><a href="/">Início</a> <span aria-hidden="true">›</span> <a href="/#solucoes">Soluções</a> <span aria-hidden="true">›</span> <span aria-current="page">Prevenção de fuga de dados</span></nav>
        <h1>Prevenção de fuga de dados (DLP)</h1>
        <p class="pagina-cabeca__intro">A prevenção de fuga de dados, conhecida pela sigla inglesa DLP (<em>Data Loss Prevention</em>), reúne as políticas e as ferramentas que detetam informação sensível e impedem que saia da organização por canais não autorizados. A DCAB Consulting desenha e implementa estas soluções em organizações privadas e públicas, desde o levantamento inicial até à afinação das regras em produção.</p>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <article class="bloco__interior pagina-corpo">

<h2>Onde acontecem as fugas de informação</h2>
<p>A maioria das fugas de informação não resulta de ataques sofisticados. Resulta de situações do dia a dia: um email com anexos enviado ao destinatário errado, uma pasta partilhada com uma ligação pública, um ficheiro copiado para uma pen USB ou para uma conta pessoal de armazenamento, ou um excerto de um contrato colado numa ferramenta de inteligência artificial generativa.</p>
<p>Uma solução de DLP atua nestes momentos. Analisa o conteúdo que está a ser enviado, compara-o com as regras definidas pela organização e, conforme o caso, regista, avisa o utilizador ou bloqueia o envio.</p>

<h2>O que a solução controla</h2>
<ul class="lista-conteudo">
  <li><strong>Email.</strong> Mensagens e anexos com dados pessoais, financeiros ou confidenciais enviados para fora da organização.</li>
  <li><strong>Web e aplicações cloud.</strong> Carregamentos para serviços de partilha de ficheiros, formulários web e aplicações não autorizadas.</li>
  <li><strong>Postos de trabalho.</strong> Cópias para dispositivos USB, impressão e transferência de ficheiros para pastas sincronizadas.</li>
  <li><strong>Ferramentas de IA generativa.</strong> Texto e documentos colados ou carregados em assistentes de IA públicos.</li>
</ul>

<h2>Como trabalhamos</h2>
<ol class="passos">
  <li><strong>Levantamento.</strong> Identificamos que informação é sensível, onde está guardada e que equipas a usam, com base em entrevistas e em ferramentas de descoberta.</li>
  <li><strong>Definição das políticas.</strong> Propomos regras por tipo de informação e por canal, que são revistas com a administração e com o encarregado de proteção de dados.</li>
  <li><strong>Implementação em modo de monitorização.</strong> As regras começam por registar os envios sem os bloquear. Assim medimos o impacto real antes de alterar a forma de trabalhar das equipas.</li>
  <li><strong>Afinação e bloqueio gradual.</strong> Reduzimos os falsos positivos e ativamos o bloqueio por fases, começando pela informação mais crítica.</li>
  <li><strong>Acompanhamento.</strong> Entregamos relatórios periódicos e revemos as regras sempre que mudam os processos, as aplicações ou a legislação.</li>
</ol>

<h2>Enquadramento legal</h2>
<p>O artigo 32.º do Regulamento Geral sobre a Proteção de Dados (RGPD) obriga a aplicar medidas técnicas adequadas para proteger os dados pessoais. A Diretiva NIS2, transposta para o direito português pelo Decreto-Lei n.º 125/2025, exige às entidades abrangidas medidas de controlo de acessos, de cifragem e de segurança da informação. A DLP é uma das medidas que permitem cumprir e demonstrar estas obrigações. Na <a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>, cada regra pode ser associada aos requisitos que ajuda a cumprir e às respetivas evidências.</p>

      <h2>Perguntas frequentes</h2>
      <details class="faq"><summary>A DLP vai impedir as equipas de trabalhar?</summary><p>Não deve. Por isso começamos em modo de monitorização e só ativamos o bloqueio depois de afinar as regras. Quando há uma necessidade legítima, o utilizador pode justificar o envio e a exceção fica registada.</p></details>
<details class="faq"><summary>Funciona com o Microsoft 365 e o Google Workspace?</summary><p>Ambas as plataformas incluem funcionalidades de DLP em determinadas licenças. Antes de propor ferramentas adicionais, avaliamos o que a organização já tem disponível.</p></details>
<details class="faq"><summary>Qual é a relação com a classificação da informação?</summary><p>As etiquetas de classificação tornam as regras de DLP mais simples e mais precisas. Um documento marcado como confidencial pode ter regras próprias, independentemente do conteúdo que a ferramenta consiga reconhecer.</p></details>
    </article>

    <section class="pagina-cta">
      <div class="bloco__interior pagina-cta__interior">
        <div>
          <h2>Fale connosco sobre prevenção de fuga de dados</h2>
          <p>Indique o que precisa. Respondemos por email, em regra no prazo de dois dias úteis.</p>
        </div>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <section class="bloco__interior pagina-relacionadas" aria-labelledby="relacionadas-titulo">
      <h2 id="relacionadas-titulo">Outras soluções</h2>
      <div class="relacionadas">
<a class="relacionada" href="/solucoes/classificacao-informacao"><strong>Classificação da informação</strong><span>Esquemas de classificação da informação à medida da organização, com rotulagem automática ou pelo utilizador, alinhados com a ISO/IEC 27001.</span></a>
<a class="relacionada" href="/solucoes/resposta-incidentes"><strong>Resposta a incidentes</strong><span>Planos de resposta a incidentes, exercícios e apoio na contenção, investigação e notificação de fugas de informação ao abrigo do RGPD e da NIS2.</span></a>
        <a class="relacionada" href="https://ankoraone.com" target="_blank" rel="noopener"><strong>AnkoraOne</strong><span>Plataforma SaaS para gerir governação, risco e conformidade.</span></a>
      </div>
    </section>
  </main>

  <footer class="rodape">
    <div class="bloco__interior rodape__interior">
      <img src="/assets/img/logo-dcab-branco.png" alt="DCAB Consulting" width="96" height="136">
      <div class="rodape__info">
        <p>Prevenção de fuga de dados, classificação da informação e continuidade de negócio.</p>
        <p>Detentora da plataforma <a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>. Parceira da <a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a>.</p>
      </div>
      <div class="rodape__legal">
        <a href="/privacidade">Política de privacidade</a>
        <p><a href="/reservado/">Área reservada</a></p>
        <p>© <span id="ano">2026</span> DCAB Consulting, Lda.</p>
        <p>NIPC 518180964</p>
        <p>Urbanização do Torrão, n.º 66, 4825-458 Água Longa</p>
      </div>
    </div>
  </footer>
</body>
</html>
````

## `public/solucoes/classificacao-informacao.html`

Página de solução. **Novo.**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Classificação e rotulagem da informação | DCAB Consulting</title>
  <meta name="description" content="Esquemas de classificação da informação à medida da organização, com rotulagem automática ou pelo utilizador, alinhados com a ISO/IEC 27001.">
  <link rel="canonical" href="https://dcabconsulting.com/solucoes/classificacao-informacao">
  <meta name="theme-color" content="#00A2DB">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:site_name" content="DCAB Consulting">
  <meta property="og:title" content="Classificação e rotulagem da informação | DCAB Consulting">
  <meta property="og:description" content="Esquemas de classificação da informação à medida da organização, com rotulagem automática ou pelo utilizador, alinhados com a ISO/IEC 27001.">
  <meta property="og:url" content="https://dcabconsulting.com/solucoes/classificacao-informacao">
  <meta property="og:image" content="https://dcabconsulting.com/assets/img/og-dcab.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
  <script src="/assets/js/principal.js" defer></script>
  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://dcabconsulting.com/solucoes/classificacao-informacao#servico",
      "name": "Classificação e rotulagem da informação",
      "description": "Esquemas de classificação da informação à medida da organização, com rotulagem automática ou pelo utilizador, alinhados com a ISO/IEC 27001.",
      "url": "https://dcabconsulting.com/solucoes/classificacao-informacao",
      "areaServed": {
        "@type": "Country",
        "name": "Portugal"
      },
      "provider": {
        "@type": "Organization",
        "@id": "https://dcabconsulting.com/#organizacao",
        "name": "DCAB Consulting",
        "url": "https://dcabconsulting.com/"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://dcabconsulting.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Soluções",
          "item": "https://dcabconsulting.com/#solucoes"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Classificação da informação",
          "item": "https://dcabconsulting.com/solucoes/classificacao-informacao"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Quantos níveis de classificação devemos ter?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Recomendamos três ou quatro. Com mais níveis, os utilizadores têm dificuldade em escolher e a classificação deixa de ser aplicada de forma coerente."
          }
        },
        {
          "@type": "Question",
          "name": "O que acontece aos documentos que já existem?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Tratamos os repositórios existentes por fases, começando pelos que guardam informação mais sensível. A rotulagem automática permite classificar grandes volumes sem intervenção manual."
          }
        },
        {
          "@type": "Question",
          "name": "A proteção mantém-se quando o documento é enviado para fora?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Nos níveis em que a etiqueta aplica cifragem, sim. Só as pessoas autorizadas conseguem abrir o documento, mesmo que este seja reencaminhado."
          }
        }
      ]
    }
  ]
}
  </script>
</head>
<body>
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>

  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>DCAB Consulting</span>
      </a>
      <nav class="topo__nav" aria-label="Navegação principal">
        <a href="/#quem-somos">Quem somos</a>
        <a href="/#solucoes">Soluções</a>
        <a href="/#ankoraone">AnkoraOne</a>
        <a href="/#parceria">Parceria</a>
      </nav>
      <a class="botao botao--pequeno" href="/#contacto">Pedir contacto</a>
    </div>
  </header>

  <main id="conteudo">
    <section class="pagina-cabeca">
      <div class="bloco__interior">
        <nav class="migalhas" aria-label="Localização"><a href="/">Início</a> <span aria-hidden="true">›</span> <a href="/#solucoes">Soluções</a> <span aria-hidden="true">›</span> <span aria-current="page">Classificação da informação</span></nav>
        <h1>Classificação e rotulagem da informação</h1>
        <p class="pagina-cabeca__intro">Classificar a informação é atribuir a cada documento um nível de sensibilidade, como Interno ou Confidencial, e uma etiqueta que o acompanha onde quer que seja guardado ou enviado. É o ponto de partida para proteger a informação de forma proporcionada ao seu valor.</p>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <article class="bloco__interior pagina-corpo">

<h2>Porque classificar</h2>
<p>Sem classificação, a organização tem duas opções, ambas más: proteger toda a informação da mesma forma, com custos elevados e entraves ao trabalho, ou proteger pouco, deixando expostos os documentos que realmente importam. A classificação permite aplicar controlos mais exigentes apenas onde são necessários.</p>

<h2>Um esquema à medida da organização</h2>
<p>O esquema deve ser simples o suficiente para ser usado todos os dias. Na maioria das organizações, quatro níveis são suficientes:</p>
<div class="tabela-envolvente"><table class="tabela-conteudo">
  <thead><tr><th scope="col">Nível</th><th scope="col">Exemplos</th><th scope="col">Tratamento habitual</th></tr></thead>
  <tbody>
    <tr><td>Público</td><td>Brochuras, conteúdos do site</td><td>Sem restrições</td></tr>
    <tr><td>Interno</td><td>Procedimentos, comunicações internas</td><td>Partilha apenas dentro da organização</td></tr>
    <tr><td>Confidencial</td><td>Contratos, propostas, dados de clientes</td><td>Acesso limitado às equipas envolvidas e cifragem no envio externo</td></tr>
    <tr><td>Restrito</td><td>Dados de saúde, informação estratégica, credenciais</td><td>Acesso nominal, cifragem permanente e registo de todos os acessos</td></tr>
  </tbody>
</table></div>

<h2>Rotulagem automática e pelo utilizador</h2>
<p>A etiqueta pode ser aplicada de duas formas, que normalmente se combinam. A rotulagem automática reconhece padrões, como números de identificação fiscal, IBAN ou números do cartão de cidadão, e aplica a etiqueta adequada sem intervenção. A rotulagem pelo utilizador cobre o que nenhuma ferramenta consegue avaliar, como a sensibilidade de uma proposta ou de uma decisão interna. Nesse caso, a ferramenta sugere uma etiqueta e o utilizador confirma.</p>
<p>A etiqueta fica nos metadados do documento, pode acrescentar uma marca visível no cabeçalho ou no rodapé e, nos níveis mais altos, pode aplicar cifragem que se mantém mesmo fora da organização.</p>

<h2>Como trabalhamos</h2>
<ol class="passos">
  <li><strong>Descoberta.</strong> Fazemos o levantamento da informação existente em servidores, repositórios de documentos e serviços cloud.</li>
  <li><strong>Esquema e política.</strong> Definimos os níveis, os critérios de atribuição e as regras de tratamento de cada nível.</li>
  <li><strong>Configuração.</strong> Criamos as etiquetas e as regras automáticas nas ferramentas da organização.</li>
  <li><strong>Formação.</strong> Preparamos sessões curtas para as equipas, com exemplos dos documentos que usam no dia a dia.</li>
  <li><strong>Ligação à DLP e revisão.</strong> Usamos as etiquetas nas regras de <a href="/solucoes/prevencao-fuga-dados">prevenção de fuga de dados</a> e revemos o esquema periodicamente.</li>
</ol>

<h2>Enquadramento normativo</h2>
<p>A norma ISO/IEC 27001:2022 inclui no Anexo A os controlos 5.12, sobre a classificação da informação, e 5.13, sobre a rotulagem da informação. A Diretiva NIS2 e o Decreto-Lei n.º 125/2025 exigem a gestão dos ativos de informação. Um esquema de classificação documentado e aplicado é uma das evidências mais pedidas em auditorias de segurança.</p>

      <h2>Perguntas frequentes</h2>
      <details class="faq"><summary>Quantos níveis de classificação devemos ter?</summary><p>Recomendamos três ou quatro. Com mais níveis, os utilizadores têm dificuldade em escolher e a classificação deixa de ser aplicada de forma coerente.</p></details>
<details class="faq"><summary>O que acontece aos documentos que já existem?</summary><p>Tratamos os repositórios existentes por fases, começando pelos que guardam informação mais sensível. A rotulagem automática permite classificar grandes volumes sem intervenção manual.</p></details>
<details class="faq"><summary>A proteção mantém-se quando o documento é enviado para fora?</summary><p>Nos níveis em que a etiqueta aplica cifragem, sim. Só as pessoas autorizadas conseguem abrir o documento, mesmo que este seja reencaminhado.</p></details>
    </article>

    <section class="pagina-cta">
      <div class="bloco__interior pagina-cta__interior">
        <div>
          <h2>Fale connosco sobre classificação da informação</h2>
          <p>Indique o que precisa. Respondemos por email, em regra no prazo de dois dias úteis.</p>
        </div>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <section class="bloco__interior pagina-relacionadas" aria-labelledby="relacionadas-titulo">
      <h2 id="relacionadas-titulo">Outras soluções</h2>
      <div class="relacionadas">
<a class="relacionada" href="/solucoes/prevencao-fuga-dados"><strong>Prevenção de fuga de dados</strong><span>Implementação de prevenção de fuga de dados (DLP) no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras.</span></a>
<a class="relacionada" href="/solucoes/continuidade-negocio"><strong>Continuidade de negócio</strong><span>Análise de impacto no negócio, planos de continuidade e recuperação segundo a ISO 22301, cópias de segurança protegidas contra ransomware e testes.</span></a>
        <a class="relacionada" href="https://ankoraone.com" target="_blank" rel="noopener"><strong>AnkoraOne</strong><span>Plataforma SaaS para gerir governação, risco e conformidade.</span></a>
      </div>
    </section>
  </main>

  <footer class="rodape">
    <div class="bloco__interior rodape__interior">
      <img src="/assets/img/logo-dcab-branco.png" alt="DCAB Consulting" width="96" height="136">
      <div class="rodape__info">
        <p>Prevenção de fuga de dados, classificação da informação e continuidade de negócio.</p>
        <p>Detentora da plataforma <a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>. Parceira da <a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a>.</p>
      </div>
      <div class="rodape__legal">
        <a href="/privacidade">Política de privacidade</a>
        <p><a href="/reservado/">Área reservada</a></p>
        <p>© <span id="ano">2026</span> DCAB Consulting, Lda.</p>
        <p>NIPC 518180964</p>
        <p>Urbanização do Torrão, n.º 66, 4825-458 Água Longa</p>
      </div>
    </div>
  </footer>
</body>
</html>
````

## `public/solucoes/continuidade-negocio.html`

Página de solução. **Novo.**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Continuidade de negócio (ISO 22301) | DCAB Consulting</title>
  <meta name="description" content="Análise de impacto no negócio, planos de continuidade e recuperação segundo a ISO 22301, cópias de segurança protegidas contra ransomware e testes.">
  <link rel="canonical" href="https://dcabconsulting.com/solucoes/continuidade-negocio">
  <meta name="theme-color" content="#00A2DB">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:site_name" content="DCAB Consulting">
  <meta property="og:title" content="Continuidade de negócio e recuperação | DCAB Consulting">
  <meta property="og:description" content="Análise de impacto no negócio, planos de continuidade e recuperação segundo a ISO 22301, cópias de segurança protegidas contra ransomware e testes.">
  <meta property="og:url" content="https://dcabconsulting.com/solucoes/continuidade-negocio">
  <meta property="og:image" content="https://dcabconsulting.com/assets/img/og-dcab.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
  <script src="/assets/js/principal.js" defer></script>
  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://dcabconsulting.com/solucoes/continuidade-negocio#servico",
      "name": "Continuidade de negócio e recuperação",
      "description": "Análise de impacto no negócio, planos de continuidade e recuperação segundo a ISO 22301, cópias de segurança protegidas contra ransomware e testes.",
      "url": "https://dcabconsulting.com/solucoes/continuidade-negocio",
      "areaServed": {
        "@type": "Country",
        "name": "Portugal"
      },
      "provider": {
        "@type": "Organization",
        "@id": "https://dcabconsulting.com/#organizacao",
        "name": "DCAB Consulting",
        "url": "https://dcabconsulting.com/"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://dcabconsulting.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Soluções",
          "item": "https://dcabconsulting.com/#solucoes"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Continuidade de negócio",
          "item": "https://dcabconsulting.com/solucoes/continuidade-negocio"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Qual é a diferença entre cópias de segurança e um plano de recuperação?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As cópias de segurança guardam os dados. O plano de recuperação define como e por que ordem se repõem os sistemas, quem o faz e em quanto tempo. Sem plano, ter cópias não garante uma recuperação rápida."
          }
        },
        {
          "@type": "Question",
          "name": "Com que frequência devemos testar o plano?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pelo menos uma vez por ano e sempre que há alterações relevantes nos sistemas, nos fornecedores ou na estrutura da organização."
          }
        },
        {
          "@type": "Question",
          "name": "Já temos os ficheiros sincronizados na cloud. Isso chega?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Não. A sincronização replica também as alterações maliciosas: se um ficheiro for cifrado por ransomware no computador, a versão na cloud é substituída. É necessária uma cópia de segurança independente, com histórico de versões."
          }
        }
      ]
    }
  ]
}
  </script>
</head>
<body>
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>

  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>DCAB Consulting</span>
      </a>
      <nav class="topo__nav" aria-label="Navegação principal">
        <a href="/#quem-somos">Quem somos</a>
        <a href="/#solucoes">Soluções</a>
        <a href="/#ankoraone">AnkoraOne</a>
        <a href="/#parceria">Parceria</a>
      </nav>
      <a class="botao botao--pequeno" href="/#contacto">Pedir contacto</a>
    </div>
  </header>

  <main id="conteudo">
    <section class="pagina-cabeca">
      <div class="bloco__interior">
        <nav class="migalhas" aria-label="Localização"><a href="/">Início</a> <span aria-hidden="true">›</span> <a href="/#solucoes">Soluções</a> <span aria-hidden="true">›</span> <span aria-current="page">Continuidade de negócio</span></nav>
        <h1>Continuidade de negócio e recuperação</h1>
        <p class="pagina-cabeca__intro">Um plano de continuidade define como a organização mantém os serviços essenciais e recupera a informação depois de um ataque, de uma falha técnica ou de um desastre físico. A DCAB Consulting prepara estes planos segundo a norma ISO 22301 e acompanha os testes que comprovam que funcionam.</p>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <article class="bloco__interior pagina-corpo">

<h2>Análise de impacto no negócio</h2>
<p>O trabalho começa pela análise de impacto no negócio (BIA, <em>Business Impact Analysis</em>). Identificamos os processos críticos, os sistemas e as pessoas de que dependem e o efeito de uma interrupção ao longo do tempo. Desta análise saem dois valores para cada processo:</p>
<ul class="lista-conteudo">
  <li><strong>Tempo máximo de recuperação (RTO).</strong> O tempo durante o qual o processo pode estar parado sem causar danos inaceitáveis.</li>
  <li><strong>Perda máxima de dados aceitável (RPO).</strong> O período de dados que a organização pode perder, que define a frequência das cópias de segurança.</li>
</ul>

<h2>Planos de continuidade e de recuperação</h2>
<p>O plano de continuidade de negócio descreve como a organização continua a funcionar durante a interrupção: quem decide, como comunica com clientes e fornecedores e que processos alternativos usa. O plano de recuperação de desastre trata da parte técnica: a ordem de recuperação dos sistemas, os procedimentos de reposição e os contactos dos fornecedores envolvidos.</p>

<h2>Cópias de segurança preparadas para ransomware</h2>
<p>Os ataques de ransomware procuram cifrar ou apagar também as cópias de segurança. Por isso aplicamos a regra 3-2-1: três cópias dos dados, em dois tipos de suporte, com uma delas fora das instalações. Pelo menos uma cópia deve ser imutável ou isolada da rede, de forma a não poder ser alterada a partir de uma conta comprometida.</p>

<h2>Testes e exercícios</h2>
<p>Um plano que nunca foi testado não garante a recuperação. Realizamos testes de reposição de dados, para confirmar que as cópias estão completas e que os tempos de recuperação são cumpridos, e exercícios de crise em sala, em que a equipa de gestão simula as decisões perante um cenário realista.</p>

<h2>Como trabalhamos</h2>
<ol class="passos">
  <li><strong>Análise de impacto.</strong> Entrevistas com as áreas de negócio e definição dos tempos de recuperação.</li>
  <li><strong>Avaliação da situação atual.</strong> Revisão das cópias de segurança, da infraestrutura e dos contratos com fornecedores.</li>
  <li><strong>Planos.</strong> Redação dos planos de continuidade e de recuperação, com papéis e contactos.</li>
  <li><strong>Testes.</strong> Reposição de dados e exercício de crise, com relatório de melhorias.</li>
  <li><strong>Manutenção.</strong> Revisão anual e sempre que mudam sistemas ou processos críticos.</li>
</ol>

<h2>Enquadramento normativo</h2>
<p>A norma ISO 22301 define os requisitos de um sistema de gestão da continuidade de negócio. O artigo 21.º da Diretiva NIS2, transposta pelo Decreto-Lei n.º 125/2025, inclui expressamente a continuidade das atividades, a gestão de cópias de segurança, a recuperação de desastres e a gestão de crises. No setor financeiro, o Regulamento DORA exige uma política de continuidade das tecnologias de informação e comunicação e testes regulares.</p>

      <h2>Perguntas frequentes</h2>
      <details class="faq"><summary>Qual é a diferença entre cópias de segurança e um plano de recuperação?</summary><p>As cópias de segurança guardam os dados. O plano de recuperação define como e por que ordem se repõem os sistemas, quem o faz e em quanto tempo. Sem plano, ter cópias não garante uma recuperação rápida.</p></details>
<details class="faq"><summary>Com que frequência devemos testar o plano?</summary><p>Pelo menos uma vez por ano e sempre que há alterações relevantes nos sistemas, nos fornecedores ou na estrutura da organização.</p></details>
<details class="faq"><summary>Já temos os ficheiros sincronizados na cloud. Isso chega?</summary><p>Não. A sincronização replica também as alterações maliciosas: se um ficheiro for cifrado por ransomware no computador, a versão na cloud é substituída. É necessária uma cópia de segurança independente, com histórico de versões.</p></details>
    </article>

    <section class="pagina-cta">
      <div class="bloco__interior pagina-cta__interior">
        <div>
          <h2>Fale connosco sobre continuidade de negócio</h2>
          <p>Indique o que precisa. Respondemos por email, em regra no prazo de dois dias úteis.</p>
        </div>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <section class="bloco__interior pagina-relacionadas" aria-labelledby="relacionadas-titulo">
      <h2 id="relacionadas-titulo">Outras soluções</h2>
      <div class="relacionadas">
<a class="relacionada" href="/solucoes/resposta-incidentes"><strong>Resposta a incidentes</strong><span>Planos de resposta a incidentes, exercícios e apoio na contenção, investigação e notificação de fugas de informação ao abrigo do RGPD e da NIS2.</span></a>
<a class="relacionada" href="/solucoes/prevencao-fuga-dados"><strong>Prevenção de fuga de dados</strong><span>Implementação de prevenção de fuga de dados (DLP) no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras.</span></a>
        <a class="relacionada" href="https://ankoraone.com" target="_blank" rel="noopener"><strong>AnkoraOne</strong><span>Plataforma SaaS para gerir governação, risco e conformidade.</span></a>
      </div>
    </section>
  </main>

  <footer class="rodape">
    <div class="bloco__interior rodape__interior">
      <img src="/assets/img/logo-dcab-branco.png" alt="DCAB Consulting" width="96" height="136">
      <div class="rodape__info">
        <p>Prevenção de fuga de dados, classificação da informação e continuidade de negócio.</p>
        <p>Detentora da plataforma <a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>. Parceira da <a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a>.</p>
      </div>
      <div class="rodape__legal">
        <a href="/privacidade">Política de privacidade</a>
        <p><a href="/reservado/">Área reservada</a></p>
        <p>© <span id="ano">2026</span> DCAB Consulting, Lda.</p>
        <p>NIPC 518180964</p>
        <p>Urbanização do Torrão, n.º 66, 4825-458 Água Longa</p>
      </div>
    </div>
  </footer>
</body>
</html>
````

## `public/solucoes/resposta-incidentes.html`

Página de solução. **Novo.**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Resposta a incidentes e fugas de informação | DCAB Consulting</title>
  <meta name="description" content="Planos de resposta a incidentes, exercícios e apoio na contenção, investigação e notificação de fugas de informação ao abrigo do RGPD e da NIS2.">
  <link rel="canonical" href="https://dcabconsulting.com/solucoes/resposta-incidentes">
  <meta name="theme-color" content="#00A2DB">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:site_name" content="DCAB Consulting">
  <meta property="og:title" content="Resposta a incidentes e fugas de informação | DCAB Consulting">
  <meta property="og:description" content="Planos de resposta a incidentes, exercícios e apoio na contenção, investigação e notificação de fugas de informação ao abrigo do RGPD e da NIS2.">
  <meta property="og:url" content="https://dcabconsulting.com/solucoes/resposta-incidentes">
  <meta property="og:image" content="https://dcabconsulting.com/assets/img/og-dcab.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
  <script src="/assets/js/principal.js" defer></script>
  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://dcabconsulting.com/solucoes/resposta-incidentes#servico",
      "name": "Resposta a incidentes de segurança",
      "description": "Planos de resposta a incidentes, exercícios e apoio na contenção, investigação e notificação de fugas de informação ao abrigo do RGPD e da NIS2.",
      "url": "https://dcabconsulting.com/solucoes/resposta-incidentes",
      "areaServed": {
        "@type": "Country",
        "name": "Portugal"
      },
      "provider": {
        "@type": "Organization",
        "@id": "https://dcabconsulting.com/#organizacao",
        "name": "DCAB Consulting",
        "url": "https://dcabconsulting.com/"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://dcabconsulting.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Soluções",
          "item": "https://dcabconsulting.com/#solucoes"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Resposta a incidentes",
          "item": "https://dcabconsulting.com/solucoes/resposta-incidentes"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Quando é obrigatório notificar a CNPD?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Quando a violação de dados pessoais for suscetível de resultar num risco para os direitos e liberdades das pessoas. Se esse risco for improvável, a notificação não é obrigatória, mas a violação deve ficar registada internamente com a respetiva fundamentação."
          }
        },
        {
          "@type": "Question",
          "name": "Uma tentativa de phishing sem consequências deve ser notificada?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Normalmente não exige notificação às autoridades, mas deve ficar registada e analisada. Várias tentativas dirigidas à organização podem indicar um ataque em preparação."
          }
        },
        {
          "@type": "Question",
          "name": "Quem decide se a organização notifica?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A decisão cabe à gestão da organização, enquanto responsável pelo tratamento ou entidade abrangida. O encarregado de proteção de dados e o responsável de segurança aconselham com base na avaliação do incidente."
          }
        }
      ]
    }
  ]
}
  </script>
</head>
<body>
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>

  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>DCAB Consulting</span>
      </a>
      <nav class="topo__nav" aria-label="Navegação principal">
        <a href="/#quem-somos">Quem somos</a>
        <a href="/#solucoes">Soluções</a>
        <a href="/#ankoraone">AnkoraOne</a>
        <a href="/#parceria">Parceria</a>
      </nav>
      <a class="botao botao--pequeno" href="/#contacto">Pedir contacto</a>
    </div>
  </header>

  <main id="conteudo">
    <section class="pagina-cabeca">
      <div class="bloco__interior">
        <nav class="migalhas" aria-label="Localização"><a href="/">Início</a> <span aria-hidden="true">›</span> <a href="/#solucoes">Soluções</a> <span aria-hidden="true">›</span> <span aria-current="page">Resposta a incidentes</span></nav>
        <h1>Resposta a incidentes e fugas de informação</h1>
        <p class="pagina-cabeca__intro">Quando ocorre um incidente de segurança, as decisões das primeiras horas determinam a dimensão dos danos e o cumprimento das obrigações legais. A DCAB Consulting ajuda as organizações a preparar a resposta antes do incidente e apoia a contenção, a investigação e as notificações quando ele acontece.</p>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <article class="bloco__interior pagina-corpo">

<h2>As primeiras horas</h2>
<p>A resposta inicial segue uma ordem simples. Primeiro, conter: isolar os sistemas afetados, bloquear as contas comprometidas e travar a saída de informação. Depois, preservar as evidências, como registos dos sistemas, mensagens e cópias dos equipamentos afetados, antes de qualquer reposição. Por fim, avaliar o âmbito: que dados foram afetados, quantas pessoas estão envolvidas e se há obrigação de notificar.</p>

<h2>Prazos de notificação</h2>
<p>Os prazos legais começam a contar a partir do momento em que a organização tem conhecimento do incidente:</p>
<div class="tabela-envolvente"><table class="tabela-conteudo">
  <thead><tr><th scope="col">Enquadramento</th><th scope="col">A quem</th><th scope="col">Prazo</th></tr></thead>
  <tbody>
    <tr><td>RGPD, artigo 33.º</td><td>Comissão Nacional de Proteção de Dados (CNPD)</td><td>Sem demora injustificada e, sempre que possível, até 72 horas</td></tr>
    <tr><td>RGPD, artigo 34.º</td><td>Titulares dos dados</td><td>Sem demora injustificada, quando houver risco elevado para os seus direitos</td></tr>
    <tr><td>NIS2 e Decreto-Lei n.º 125/2025</td><td>Autoridade nacional de cibersegurança</td><td>Alerta inicial em 24 horas, notificação em 72 horas e relatório final no prazo de um mês</td></tr>
    <tr><td>DORA (setor financeiro)</td><td>Autoridade de supervisão competente</td><td>Prazos definidos para incidentes graves relacionados com as tecnologias de informação e comunicação</td></tr>
  </tbody>
</table></div>
<p class="nota-legal">Informação de caráter geral. A obrigação de notificar e os prazos aplicáveis devem ser confirmados para cada caso concreto.</p>

<h2>Um plano preparado antes do incidente</h2>
<p>O plano de resposta a incidentes define quem decide, quem comunica e quem trata a parte técnica, com os contactos internos e externos atualizados. Inclui também os critérios para classificar a gravidade de um incidente e os modelos de notificação para as autoridades e para os titulares dos dados. Com estas decisões tomadas com antecedência, a equipa não perde tempo no momento em que ele é mais escasso.</p>

<h2>Como trabalhamos</h2>
<ol class="passos">
  <li><strong>Preparação.</strong> Redação do plano de resposta, definição de papéis e lista de contactos.</li>
  <li><strong>Exercícios.</strong> Simulação de incidentes com a equipa de gestão e com as equipas técnicas.</li>
  <li><strong>Apoio no incidente.</strong> Contenção, preservação de evidências, investigação e preparação das notificações.</li>
  <li><strong>Análise posterior.</strong> Relatório com as causas, o impacto e as medidas para evitar a repetição.</li>
</ol>
<p>A resposta a incidentes liga-se à <a href="/solucoes/continuidade-negocio">continuidade de negócio</a>, que garante a reposição dos serviços, e à <a href="/solucoes/prevencao-fuga-dados">prevenção de fuga de dados</a>, que reduz a probabilidade de novos incidentes.</p>

      <h2>Perguntas frequentes</h2>
      <details class="faq"><summary>Quando é obrigatório notificar a CNPD?</summary><p>Quando a violação de dados pessoais for suscetível de resultar num risco para os direitos e liberdades das pessoas. Se esse risco for improvável, a notificação não é obrigatória, mas a violação deve ficar registada internamente com a respetiva fundamentação.</p></details>
<details class="faq"><summary>Uma tentativa de phishing sem consequências deve ser notificada?</summary><p>Normalmente não exige notificação às autoridades, mas deve ficar registada e analisada. Várias tentativas dirigidas à organização podem indicar um ataque em preparação.</p></details>
<details class="faq"><summary>Quem decide se a organização notifica?</summary><p>A decisão cabe à gestão da organização, enquanto responsável pelo tratamento ou entidade abrangida. O encarregado de proteção de dados e o responsável de segurança aconselham com base na avaliação do incidente.</p></details>
    </article>

    <section class="pagina-cta">
      <div class="bloco__interior pagina-cta__interior">
        <div>
          <h2>Fale connosco sobre resposta a incidentes</h2>
          <p>Indique o que precisa. Respondemos por email, em regra no prazo de dois dias úteis.</p>
        </div>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <section class="bloco__interior pagina-relacionadas" aria-labelledby="relacionadas-titulo">
      <h2 id="relacionadas-titulo">Outras soluções</h2>
      <div class="relacionadas">
<a class="relacionada" href="/solucoes/continuidade-negocio"><strong>Continuidade de negócio</strong><span>Análise de impacto no negócio, planos de continuidade e recuperação segundo a ISO 22301, cópias de segurança protegidas contra ransomware e testes.</span></a>
<a class="relacionada" href="/solucoes/prevencao-fuga-dados"><strong>Prevenção de fuga de dados</strong><span>Implementação de prevenção de fuga de dados (DLP) no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras.</span></a>
        <a class="relacionada" href="https://ankoraone.com" target="_blank" rel="noopener"><strong>AnkoraOne</strong><span>Plataforma SaaS para gerir governação, risco e conformidade.</span></a>
      </div>
    </section>
  </main>

  <footer class="rodape">
    <div class="bloco__interior rodape__interior">
      <img src="/assets/img/logo-dcab-branco.png" alt="DCAB Consulting" width="96" height="136">
      <div class="rodape__info">
        <p>Prevenção de fuga de dados, classificação da informação e continuidade de negócio.</p>
        <p>Detentora da plataforma <a href="https://ankoraone.com" target="_blank" rel="noopener">AnkoraOne</a>. Parceira da <a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a>.</p>
      </div>
      <div class="rodape__legal">
        <a href="/privacidade">Política de privacidade</a>
        <p><a href="/reservado/">Área reservada</a></p>
        <p>© <span id="ano">2026</span> DCAB Consulting, Lda.</p>
        <p>NIPC 518180964</p>
        <p>Urbanização do Torrão, n.º 66, 4825-458 Água Longa</p>
      </div>
    </div>
  </footer>
</body>
</html>
````

## `public/assets/css/estilo.css`

Estilos do site. **Substituir.**

````css
/* DCAB Consulting — folha de estilos */

:root {
  --tinta: #000000;        /* preto do logótipo */
  --sinal: #00A2DB;        /* azul do logótipo */
  --sinal-texto: #006F97;  /* azul com contraste AA para texto sobre branco */
  --papel: #FFFFFF;
  --aco: #46525C;          /* texto secundário */
  --nevoa: #EEF4F7;        /* superfície discreta */
  --linha: #D5DEE3;

  --f-titulo: "Jost", "Futura", "Century Gothic", "Avenir Next", sans-serif;
  --f-texto: "IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;

  --largura: 1180px;
  --margem: clamp(20px, 5vw, 56px);
  color-scheme: light;
}

*, *::before, *::after { box-sizing: border-box; }

/* O atributo hidden tem sempre prioridade sobre display definido nas classes */
[hidden] { display: none !important; }

html { scroll-behavior: smooth; scroll-padding-top: 88px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

body {
  margin: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: var(--f-texto);
  font-size: 1.0625rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

img { max-width: 100%; height: auto; display: block; }

h1, h2, h3 {
  font-family: var(--f-titulo);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.01em;
  margin: 0;
}
h2 { font-size: clamp(2rem, 3.6vw, 2.9rem); }
h3 { font-size: 1.4rem; line-height: 1.2; }
p { margin: 0 0 1em; }

a { color: var(--sinal-texto); text-underline-offset: 3px; }
a:hover { color: var(--tinta); }

:focus-visible { outline: 3px solid var(--sinal); outline-offset: 3px; }

.saltar {
  position: absolute; left: -9999px; top: 8px;
  background: var(--tinta); color: var(--papel); padding: 10px 16px; z-index: 100;
}
.saltar:focus { left: 8px; }

/* Botões */
.botao {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 48px; padding: 0 26px;
  background: var(--tinta); color: var(--papel);
  border: 2px solid var(--tinta);
  font-family: var(--f-titulo); font-weight: 600; font-size: 1rem; letter-spacing: 0.02em;
  text-decoration: none; cursor: pointer;
  transition: background-color .15s ease, color .15s ease, border-color .15s ease;
}
.botao:hover { background: var(--sinal); border-color: var(--sinal); color: var(--tinta); }
.botao--linha { background: transparent; color: var(--tinta); }
.botao--linha:hover { background: var(--tinta); border-color: var(--tinta); color: var(--papel); }
.botao--claro { background: var(--sinal); border-color: var(--sinal); color: var(--tinta); }
.botao--claro:hover { background: var(--papel); border-color: var(--papel); color: var(--tinta); }
.botao--linha-clara { background: transparent; color: var(--papel); border-color: var(--papel); }
.botao--linha-clara:hover { background: var(--papel); border-color: var(--papel); color: var(--tinta); }
.ankora__acoes { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 18px; }
.ankora__cabeca .ankora__acoes .botao { margin-top: 0; }
.botao--pequeno { min-height: 40px; padding: 0 18px; font-size: .95rem; }
.botao[disabled] { opacity: .6; cursor: progress; }

/* Cabeçalho */
.topo {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255, 255, 255, .94);
  backdrop-filter: saturate(160%) blur(8px);
  border-bottom: 1px solid var(--linha);
}
.topo__interior {
  max-width: var(--largura); margin: 0 auto; padding: 14px var(--margem);
  display: flex; align-items: center; gap: 32px;
}
.topo__marca {
  display: flex; align-items: center; gap: 12px;
  color: var(--tinta); text-decoration: none;
  font-family: var(--f-titulo); font-weight: 600; font-size: 1.1rem; letter-spacing: .01em;
}
.topo__marca img { width: 34px; }
.topo__nav { display: flex; gap: 28px; margin-left: auto; }
.topo__nav a { color: var(--tinta); text-decoration: none; font-size: .98rem; }
.topo__nav a:hover { color: var(--sinal-texto); text-decoration: underline; }

/* Abertura com vídeo: texto à esquerda, animação do logótipo à direita, fundida com o fundo */
.abertura {
  position: relative; overflow: hidden; isolation: isolate;
  min-height: min(70vh, 600px);
  display: flex; align-items: center;
  padding: clamp(48px, 6vw, 80px) 0;
  background: linear-gradient(180deg, #213440 0%, #15242B 55%, #0D181B 100%);
  color: var(--papel);
}
.abertura__media { position: absolute; inset: 0 0 0 auto; width: 64%; z-index: -1; }
.abertura__media > * { position: absolute; inset: 0; }
.abertura__video, .abertura__final {
  width: 100%; height: 100%; object-fit: cover; object-position: 100% 50%;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 34%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 34%);
}
.abertura__final { display: none; }
.abertura__texto { width: 100%; max-width: var(--largura); margin: 0 auto; padding: 0 var(--margem); }
.abertura h1 {
  font-size: clamp(2.2rem, 4.2vw, 3.4rem); font-weight: 700; line-height: 1.08; letter-spacing: -0.02em;
  max-width: 17ch; margin-bottom: 20px;
}
.abertura__lead { max-width: 40ch; font-size: 1.12rem; color: #C9D3D9; margin-bottom: 30px; }
.abertura__acoes { display: flex; flex-wrap: wrap; gap: 14px; }

/* Movimento reduzido: mostra a imagem final em vez do vídeo */
@media (prefers-reduced-motion: reduce) {
  .abertura__video { display: none; }
  .abertura__final { display: block; }
}

.abertura--estatica .abertura__video { display: none; }
.abertura--estatica .abertura__final { display: block; }

/* Quem somos */
#quem-somos { border-bottom: 1px solid var(--linha); }
.quem-somos { display: grid; grid-template-columns: 7fr 5fr; gap: clamp(40px, 6vw, 88px); align-items: start; }
.quem-somos__texto h2 { margin-bottom: 24px; }
.quem-somos__texto p { font-size: 1.1rem; max-width: 60ch; }
.quem-somos__texto p + p { color: var(--aco); }
.quem-somos__factos { margin: 0; border-top: 4px solid var(--sinal); }
.quem-somos__factos > div { display: grid; grid-template-columns: 110px 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--linha); }
.quem-somos__factos dt { font-weight: 600; }
.quem-somos__factos dd { margin: 0; color: var(--aco); }

/* Atalhos */
.atalhos { background: var(--tinta); border-top: 1px solid #22313A; }
.atalhos__interior { max-width: var(--largura); margin: 0 auto; padding: 0 var(--margem); display: grid; grid-template-columns: repeat(4, 1fr); }
.atalhos a {
  display: flex; flex-direction: column; gap: 4px; padding: 22px 20px 22px 0;
  color: var(--papel); text-decoration: none; border-top: 3px solid transparent;
}
.atalhos a + a { padding-left: 20px; border-left: 1px solid #22313A; }
.atalhos a strong { font-family: var(--f-titulo); font-weight: 600; font-size: 1.05rem; }
.atalhos a span { color: #9FB0BA; font-size: .92rem; }
.atalhos a:hover { border-top-color: var(--sinal); }
.atalhos a:hover strong { color: var(--sinal); }

/* Blocos gerais */
.bloco { padding: clamp(72px, 10vw, 128px) 0; }
.bloco__interior { max-width: var(--largura); margin: 0 auto; padding: 0 var(--margem); }
.bloco__intro { max-width: 60ch; color: var(--aco); font-size: 1.12rem; margin: 20px 0 56px; }

#solucoes { border-top: 0; }

.dominio {
  display: grid; grid-template-columns: 4fr 8fr; gap: clamp(32px, 5vw, 72px);
  border-top: 4px solid var(--sinal); padding-top: 32px;
}
.dominio + .dominio { margin-top: clamp(56px, 8vw, 96px); }
.dominio__cabeca h3 { font-size: clamp(1.6rem, 2.6vw, 2.1rem); margin-bottom: 16px; }
.dominio__cabeca p { color: var(--aco); max-width: 36ch; }

.componentes {
  margin: 0; display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px;
  border-top: 1px solid var(--linha);
}
.componentes > div { padding: 20px 0; border-bottom: 1px solid var(--linha); }
.componentes dt { font-weight: 600; margin-bottom: 4px; }
.componentes dd { margin: 0; color: var(--aco); font-size: .98rem; }
.componentes__destaque { grid-column: 1 / -1; }
.componentes__destaque dt { font-family: var(--f-titulo); font-size: 1.3rem; }

/* AnkoraOne */
.ankora { background: var(--tinta); color: var(--papel); padding: clamp(80px, 11vw, 140px) 0; }
.ankora__interior { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(48px, 7vw, 96px); align-items: start; }
.ankora__nome {
  font-family: var(--f-titulo); font-weight: 600; font-size: 1.25rem;
  color: var(--sinal); margin-bottom: 18px;
}
.ankora h2 { font-size: clamp(2rem, 3.6vw, 2.9rem); margin-bottom: 28px; max-width: 18ch; }
.ankora__cabeca p:not(.ankora__nome) { color: #C9D3D9; max-width: 48ch; margin-bottom: 18px; }
.ankora__cabeca .botao { margin-top: 18px; }
.pilares { margin: 0; }
.pilares > div { padding: 22px 0; border-bottom: 1px solid #2B3339; }
.pilares > div:first-child { border-top: 1px solid #2B3339; }
.pilares dt { font-family: var(--f-titulo); font-weight: 600; font-size: 1.3rem; margin-bottom: 6px; }
.pilares dd { margin: 0; color: #C9D3D9; }

/* Parceria */
.parceria { display: grid; grid-template-columns: 5fr 7fr; gap: clamp(32px, 6vw, 80px); }
.parceria h2 { max-width: 14ch; }
.parceria__texto { font-size: 1.12rem; max-width: 60ch; }
.parceria__texto p:last-child { color: var(--aco); margin-bottom: 0; }

/* Contacto */
.contacto { background: var(--nevoa); padding: clamp(72px, 10vw, 128px) 0; }
.contacto__interior { display: grid; grid-template-columns: 4fr 7fr; gap: clamp(40px, 6vw, 88px); }
.contacto__texto h2 { margin-bottom: 20px; }
.contacto__texto p { color: var(--aco); max-width: 38ch; }
.contacto__nota { font-size: .95rem; }

.formulario { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 24px; }
.campo { display: flex; flex-direction: column; gap: 6px; }
.campo--largo { grid-column: 1 / -1; }
.campo label { font-weight: 500; font-size: .98rem; }
.opcional { font-weight: 400; color: var(--aco); }
.campo input, .campo select, .campo textarea {
  font: inherit; color: var(--tinta);
  background: var(--papel);
  border: 1px solid #B7C3CA; border-radius: 0;
  padding: 12px 14px; min-height: 48px; width: 100%;
}
.campo textarea { resize: vertical; min-height: 140px; }
.campo input:focus, .campo select:focus, .campo textarea:focus {
  outline: none; border-color: var(--tinta); box-shadow: 0 0 0 3px rgba(0, 162, 219, .35);
}
.campo [aria-invalid="true"] { border-color: #B3261E; }
.campo__erro { color: #B3261E; font-size: .9rem; margin: 0; min-height: 0; }
.campo__erro:empty { display: none; }

.campo--caixa { flex-direction: row; flex-wrap: wrap; align-items: flex-start; gap: 12px; }
.campo--caixa input { width: 22px; height: 22px; min-height: 0; margin: 2px 0 0; accent-color: var(--tinta); flex: none; }
.campo--caixa label { font-weight: 400; flex: 1; font-size: .95rem; }
.campo--caixa .campo__erro { flex-basis: 100%; }

.armadilha { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

.formulario__rodape { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; margin-top: 8px; }
.formulario__estado { margin: 0; font-size: .98rem; }
.formulario__estado.erro { color: #B3261E; }

.confirmacao {
  grid-column: 1 / -1;
  background: var(--papel); border-left: 4px solid var(--sinal);
  padding: 32px;
}
.confirmacao h3 { margin-bottom: 10px; }
.confirmacao p { margin: 0; color: var(--aco); }

/* Rodapé */
.rodape { background: var(--tinta); color: #C9D3D9; padding: 56px 0; font-size: .95rem; }
.rodape__interior { display: grid; grid-template-columns: auto 1fr auto; gap: 48px; align-items: end; }
.rodape img { width: 96px; }
.rodape__info p { margin: 0 0 4px; max-width: 52ch; }
.rodape__legal { text-align: right; }
.rodape__legal p { margin: 6px 0 0; }
.rodape a { color: var(--papel); }
.rodape a:hover { color: var(--sinal); }

/* Página legal */
.legal { max-width: 760px; margin: 0 auto; padding: clamp(56px, 8vw, 96px) var(--margem); }
.legal h1 { font-size: clamp(2.2rem, 4.5vw, 3.2rem); margin-bottom: 12px; }
.legal h2 { font-size: 1.45rem; margin: 44px 0 12px; }
.legal .atualizacao { color: var(--aco); margin-bottom: 40px; }
.legal ul { padding-left: 1.2em; }
.legal li { margin-bottom: 6px; }

/* Responsivo */
@media (max-width: 960px) {
  .abertura__media { width: 72%; }
  .dominio { grid-template-columns: 1fr; gap: 24px; }
  .ankora__interior, .parceria, .contacto__interior, .quem-somos { grid-template-columns: 1fr; }
  .rodape__interior { grid-template-columns: 1fr; align-items: start; gap: 28px; }
  .rodape__legal { text-align: left; }
}

@media (max-width: 760px) {
  .topo__nav { display: none; }
  .topo__interior { justify-content: space-between; }
  .abertura { min-height: 0; padding: 0 0 48px; flex-direction: column; align-items: stretch; }
  .abertura__media { position: relative; inset: auto; width: 100%; aspect-ratio: 16 / 9; margin-bottom: 8px; }
  .abertura__video, .abertura__final {
    object-position: 50% 50%;
    -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 70%, transparent 100%);
  }
  .atalhos__interior { grid-template-columns: 1fr 1fr; }
  .atalhos a, .atalhos a + a { padding: 16px 12px; border-left: 0; border-bottom: 1px solid #22313A; }
  .formulario, .componentes { grid-template-columns: 1fr; }
}

@media (max-width: 420px) {
  .topo__marca span { display: none; }
}
.marca-404 { margin-bottom: 32px; }

/* Variante: vídeo em largura total, só com o título em destaque */
.abertura--titulo { min-height: min(78vh, 660px); align-items: center; padding: 0; }
.abertura--titulo .abertura__media { width: 100%; }
.abertura--titulo .abertura__video, .abertura--titulo .abertura__final {
  object-position: 50% 50%; -webkit-mask-image: none; mask-image: none;
}
.abertura--titulo::after {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(10, 20, 24, .94) 0%, rgba(10, 20, 24, .78) 32%, rgba(10, 20, 24, 0) 58%),
    linear-gradient(0deg, rgba(0, 0, 0, .65) 0%, rgba(0, 0, 0, 0) 22%);
}
.abertura--titulo h1 {
  font-size: clamp(2.4rem, 4.6vw, 4rem); line-height: 1.05; max-width: 14ch; margin: 0;
  text-shadow: 0 2px 24px rgba(0, 0, 0, .45);
}
.abertura--titulo .realce { color: var(--sinal); }
@media (max-width: 760px) {
  .abertura--titulo { min-height: 0; padding: 0 0 40px; }
  .abertura--titulo::after { display: none; }
  .abertura--titulo .abertura__media { width: 100%; }
  .abertura--titulo .abertura__video, .abertura--titulo .abertura__final {
    object-position: 62% 50%;
    -webkit-mask-image: linear-gradient(180deg, #000 65%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 65%, transparent 100%);
  }
  .abertura--titulo h1 { font-size: 2.2rem; margin-top: 4px; }
}

/* Botão discreto por baixo do título da abertura */
.botao--discreto {
  margin-top: 28px; min-height: 42px; padding: 0 20px; font-size: .95rem;
  border-width: 1px; border-color: rgba(255, 255, 255, .55); background: rgba(10, 20, 24, .25);
}
.botao--discreto:hover { background: var(--papel); border-color: var(--papel); color: var(--tinta); }
@media (max-width: 760px) { .botao--discreto { margin-top: 22px; } }

/* Páginas das soluções */
.pagina-cabeca { background: linear-gradient(180deg, #213440 0%, #0D181B 100%); color: var(--papel); padding: clamp(48px, 7vw, 88px) 0; }
.pagina-cabeca h1 { font-size: clamp(2.2rem, 4.4vw, 3.4rem); line-height: 1.08; max-width: 20ch; margin: 18px 0 22px; }
.pagina-cabeca__intro { max-width: 62ch; font-size: 1.12rem; color: #C9D3D9; margin-bottom: 30px; }
.pagina-cabeca__intro em { font-style: italic; }
.migalhas { font-size: .9rem; color: #9FB0BA; }
.migalhas a { color: #C9D3D9; }
.migalhas a:hover { color: var(--sinal); }
.migalhas span[aria-current] { color: var(--papel); }

.pagina-corpo { max-width: 820px; padding-top: clamp(56px, 7vw, 88px); padding-bottom: clamp(56px, 7vw, 88px); font-size: 1.06rem; }
.pagina-corpo h2 { font-size: clamp(1.5rem, 2.4vw, 1.9rem); margin: 48px 0 16px; }
.pagina-corpo h2:first-child { margin-top: 0; }
.pagina-corpo p { color: #26313A; }
.lista-conteudo { padding-left: 1.2em; margin: 0 0 1em; }
.lista-conteudo li { margin-bottom: 10px; }
.passos { counter-reset: passo; list-style: none; padding: 0; margin: 0 0 1em; border-top: 1px solid var(--linha); }
.passos li { counter-increment: passo; position: relative; padding: 16px 0 16px 52px; border-bottom: 1px solid var(--linha); }
.passos li::before {
  content: counter(passo); position: absolute; left: 0; top: 14px; width: 34px; height: 34px;
  display: grid; place-items: center; background: var(--tinta); color: var(--papel);
  font-family: var(--f-titulo); font-weight: 600;
}
.tabela-envolvente { overflow-x: auto; margin: 0 0 1em; }
.tabela-conteudo { width: 100%; border-collapse: collapse; font-size: .96rem; }
.tabela-conteudo th, .tabela-conteudo td { text-align: left; vertical-align: top; padding: 12px 14px; border-bottom: 1px solid var(--linha); }
.tabela-conteudo thead th { background: var(--nevoa); font-weight: 600; }
.nota-legal { font-size: .9rem; color: var(--aco) !important; }
.faq { border-bottom: 1px solid var(--linha); }
.faq:first-of-type { border-top: 1px solid var(--linha); }
.faq summary { cursor: pointer; padding: 16px 32px 16px 0; font-weight: 600; list-style: none; position: relative; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: "+"; position: absolute; right: 4px; top: 12px; font-size: 1.4rem; color: var(--sinal-texto); }
.faq[open] summary::after { content: "−"; }
.faq p { margin: 0 0 18px; }

.pagina-cta { background: var(--tinta); color: var(--papel); padding: 48px 0; }
.pagina-cta__interior { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px; }
.pagina-cta h2 { font-size: clamp(1.5rem, 2.6vw, 2rem); margin-bottom: 8px; }
.pagina-cta p { margin: 0; color: #C9D3D9; }

.pagina-relacionadas { padding-top: clamp(56px, 7vw, 88px); padding-bottom: clamp(56px, 7vw, 88px); }
.pagina-relacionadas h2 { font-size: 1.6rem; margin-bottom: 24px; }
.relacionadas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: var(--linha); border: 1px solid var(--linha); }
.relacionada { background: var(--papel); padding: 22px; text-decoration: none; color: var(--tinta); display: flex; flex-direction: column; gap: 8px; border-top: 4px solid transparent; }
.relacionada:hover { border-top-color: var(--sinal); }
.relacionada strong { font-family: var(--f-titulo); font-size: 1.15rem; }
.relacionada span { color: var(--aco); font-size: .95rem; }

/* Ligações «Saber mais» na secção de soluções da página principal */
.saber-mais { list-style: none; padding: 0; margin: 18px 0 0; display: flex; flex-direction: column; gap: 8px; }
.saber-mais a { font-weight: 500; }
.saber-mais a::after { content: " ›"; }

@media (max-width: 860px) { .relacionadas { grid-template-columns: 1fr; } }
````

## `public/assets/js/principal.js`

Formulário de contacto (contém o URL do Apps Script). **Manter o seu; o do pacote tem o URL por preencher.**

````javascript
/* DCAB Consulting — formulário de contacto
 *
 * O formulário envia os dados para um Google Apps Script (ver /apps-script/Codigo.gs).
 * O endereço de email de destino fica guardado apenas no Apps Script:
 * nunca aparece no código do site nem é visível para o público.
 */

const CONFIG = {
  // Colar aqui o URL da aplicação web do Apps Script (termina em /exec)
  ENDPOINT: "COLAR_AQUI_O_URL_DO_APPS_SCRIPT",
};

document.addEventListener("DOMContentLoaded", () => {
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  const form = document.getElementById("formulario-contacto");
  if (!form) return;

  const carregadoEm = Date.now();
  const botao = document.getElementById("botao-enviar");
  const estado = document.getElementById("estado");
  const assunto = document.getElementById("assunto");

  // Botões com data-assunto pré-selecionam o assunto do pedido
  document.querySelectorAll("[data-assunto]").forEach((el) => {
    el.addEventListener("click", () => { assunto.value = el.dataset.assunto; });
  });

  const mensagens = {
    nome: "Indique o seu nome.",
    empresa: "Indique o nome da empresa.",
    email: "Indique um email válido, por exemplo nome@empresa.pt.",
    assunto: "Selecione o assunto do pedido.",
    mensagem: "Escreva uma breve descrição do pedido.",
    consentimento: "Para enviarmos uma resposta, é necessário autorizar o tratamento dos dados.",
  };

  function marcarErro(id, texto) {
    const campo = document.getElementById(id);
    const erro = document.getElementById(id + "-erro");
    if (texto) {
      campo.setAttribute("aria-invalid", "true");
      campo.setAttribute("aria-describedby", id + "-erro");
    } else {
      campo.removeAttribute("aria-invalid");
      campo.removeAttribute("aria-describedby");
    }
    if (erro) erro.textContent = texto || "";
  }

  function validar() {
    let primeiroInvalido = null;
    Object.keys(mensagens).forEach((id) => {
      const campo = document.getElementById(id);
      let valido;
      if (campo.type === "checkbox") valido = campo.checked;
      else if (campo.type === "email") valido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(campo.value.trim());
      else valido = campo.value.trim().length > 0;
      marcarErro(id, valido ? "" : mensagens[id]);
      if (!valido && !primeiroInvalido) primeiroInvalido = campo;
    });
    if (primeiroInvalido) primeiroInvalido.focus();
    return !primeiroInvalido;
  }

  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") marcarErro(e.target.id, "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    estado.textContent = "";
    estado.classList.remove("erro");

    if (!validar()) return;

    if (!CONFIG.ENDPOINT.startsWith("https://script.google.com/")) {
      estado.textContent = "O formulário ainda não está ligado ao serviço de envio. Configure o ENDPOINT em principal.js.";
      estado.classList.add("erro");
      return;
    }

    const dados = {
      nome: form.nome.value.trim(),
      empresa: form.empresa.value.trim(),
      email: form.email.value.trim(),
      telefone: form.telefone.value.trim(),
      assunto: form.assunto.value,
      mensagem: form.mensagem.value.trim(),
      consentimento: form.consentimento.checked,
      website: form.website.value,           // campo-armadilha
      tempo: Date.now() - carregadoEm,       // envios instantâneos são tratados como automáticos
      origem: window.location.href,
    };

    botao.disabled = true;
    botao.textContent = "A enviar…";

    try {
      // Sem cabeçalho Content-Type personalizado: o pedido segue como text/plain,
      // o que evita o pré-voo CORS que o Apps Script não suporta.
      const resposta = await fetch(CONFIG.ENDPOINT, {
        method: "POST",
        body: JSON.stringify(dados),
      });
      const resultado = await resposta.json();
      if (!resultado.ok) throw new Error(resultado.erro || "falha");

      const caixa = document.createElement("div");
      caixa.className = "confirmacao";
      caixa.tabIndex = -1;
      const titulo = document.createElement("h3");
      titulo.textContent = "Pedido enviado";
      const texto = document.createElement("p");
      texto.textContent = "Obrigado pelo contacto. A equipa da DCAB Consulting vai responder para o email indicado.";
      caixa.append(titulo, texto);
      form.replaceChildren(caixa);
      caixa.focus();
    } catch (err) {
      estado.textContent = "Não foi possível enviar o pedido. Verifique a ligação à internet e tente novamente.";
      estado.classList.add("erro");
      botao.disabled = false;
      botao.textContent = "Enviar pedido";
    }
  });
});
````

## `public/assets/js/abertura.js`

Vídeo da abertura. **Novo / substituir.**

````javascript
/* DCAB Consulting — vídeo da abertura.
 * A entrada toca uma vez; depois passa, sem corte, para um ciclo contínuo e lento.
 * Com «movimento reduzido» ou «poupança de dados» ativos, mostra só a imagem final.
 * O ciclo pausa quando a abertura sai do ecrã, para poupar bateria e processador.
 */
document.addEventListener("DOMContentLoaded", () => {
  const abertura = document.querySelector(".abertura");
  const entrada = document.querySelector(".abertura__video--entrada");
  const ciclo = document.querySelector(".abertura__video--ciclo");
  if (!abertura || !entrada || !ciclo) return;

  const estatica = () => {
    abertura.classList.add("abertura--estatica");
    for (const v of [entrada, ciclo]) { v.removeAttribute("autoplay"); v.preload = "none"; v.pause(); }
  };
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const poupanca = navigator.connection && navigator.connection.saveData;
  if (reduzido || poupanca) return estatica();

  let emCiclo = false;
  const passarAoCiclo = () => {
    if (emCiclo) return;
    emCiclo = true;
    ciclo.currentTime = 0;
    const p = ciclo.play();
    const esconder = () => { entrada.hidden = true; };
    if (p && p.then) p.then(esconder).catch(esconder); else esconder();
  };
  // O ciclo só começa a descarregar depois de a entrada arrancar (não atrasa o carregamento inicial)
  entrada.addEventListener("playing", () => { ciclo.preload = "auto"; ciclo.load(); }, { once: true });
  entrada.addEventListener("ended", passarAoCiclo);
  entrada.addEventListener("error", passarAoCiclo);
  const p = entrada.play();
  if (p && p.catch) p.catch(() => estatica());

  // Pausa o ciclo fora do ecrã
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      if (!emCiclo) return;
      if (e.isIntersecting) ciclo.play().catch(() => {}); else ciclo.pause();
    }).observe(abertura);
  }
});
````

## `public/reservado/index.html`

Área reservada: página. **Substituir.**

````html
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="referrer" content="strict-origin">
  <title>Área reservada | DCAB Consulting</title>
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/estilo.css">
  <link rel="stylesheet" href="/reservado/reservado.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
  <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js" defer></script>
  <script src="/reservado/arranque.js"></script>
  <script type="module" src="/reservado/app.js"></script>
</head>
<body class="reservado">
  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>Área reservada</span>
      </a>
      <div class="sessao" id="sessao" hidden>
        <span class="sessao__email" id="sessao-email"></span>
        <button class="botao botao--pequeno botao--linha" type="button" id="botao-sair">Terminar sessão</button>
      </div>
    </div>
  </header>

  <!-- Mensagem global -->
  <div class="aviso" id="aviso" role="status" aria-live="polite" hidden></div>

  <!-- 0. A carregar / falha no arranque -->
  <main class="ecra" id="ecra-carregar">
    <div class="cartao-acesso">
      <h1 id="carregar-titulo">A preparar o acesso seguro…</h1>
      <p id="carregar-texto">Aguarde alguns segundos.</p>
      <p class="carregar__detalhe" id="carregar-detalhe" hidden></p>
    </div>
  </main>

  <!-- 1. Entrada -->
  <main class="ecra" id="ecra-entrada" hidden>
    <div class="cartao-acesso">
      <h1>Entrar na área reservada</h1>
      <p>Acesso apenas por convite. Em cada entrada é pedido também o código da sua aplicação autenticadora.</p>
      <form class="acesso__form" id="form-entrar" novalidate>
        <div class="campo">
          <label for="entrar-email">Email</label>
          <input id="entrar-email" type="email" autocomplete="username" maxlength="160" required>
        </div>
        <div class="campo">
          <label for="entrar-senha">Palavra-passe</label>
          <input id="entrar-senha" type="password" autocomplete="current-password" maxlength="128" required>
        </div>
        <button class="botao" type="submit" id="botao-entrar">Entrar</button>
        <button class="ligacao" type="button" id="definir-senha">Primeiro acesso ou esqueceu a palavra-passe?</button>
      </form>
      <p class="acesso__separador"><span>ou</span></p>
      <div class="acesso__botoes">
        <button class="botao botao--fornecedor" type="button" id="entrar-google">
          <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>
          Entrar com Google
        </button>
      </div>
      <p class="acesso__nota">A sessão termina ao fechar o navegador ou após um período de inatividade.</p>
    </div>
  </main>

  <!-- 2. Verificação do email -->
  <main class="ecra" id="ecra-verificar" hidden>
    <div class="cartao-acesso">
      <h1>Confirme o seu email</h1>
      <p>Para ativar a autenticação de dois fatores, o email <strong id="verificar-email"></strong> tem de estar confirmado. Enviámos uma mensagem com uma ligação de confirmação; abra-a e volte a esta página.</p>
      <div class="acesso__botoes">
        <button class="botao" type="button" id="verificar-continuar">Já confirmei, continuar</button>
        <button class="botao botao--linha" type="button" id="verificar-reenviar">Reenviar email</button>
      </div>
    </div>
  </main>

  <!-- 3. Registo do segundo fator -->
  <main class="ecra" id="ecra-mfa-registo" hidden>
    <div class="cartao-acesso cartao-acesso--largo">
      <h1>Ativar a autenticação de dois fatores</h1>
      <ol class="passos-mfa">
        <li>Abra uma aplicação autenticadora no telemóvel (Microsoft Authenticator, Google Authenticator ou equivalente).</li>
        <li>Leia o código QR ou introduza a chave manualmente.</li>
        <li>Escreva o código de 6 dígitos que a aplicação apresenta.</li>
      </ol>
      <div class="mfa__qr">
        <div id="mfa-qr" aria-label="Código QR de configuração"></div>
        <div>
          <p class="mfa__rotulo">Chave para introdução manual</p>
          <code class="mfa__chave" id="mfa-chave"></code>
        </div>
      </div>
      <form class="mfa__form" id="form-mfa-registo" novalidate>
        <label for="mfa-codigo-registo">Código de 6 dígitos</label>
        <input id="mfa-codigo-registo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>
        <button class="botao" type="submit">Ativar</button>
      </form>
    </div>
  </main>

  <!-- 4. Código do segundo fator -->
  <main class="ecra" id="ecra-mfa-codigo" hidden>
    <div class="cartao-acesso">
      <h1>Verificação em dois passos</h1>
      <p>Introduza o código de 6 dígitos da sua aplicação autenticadora.</p>
      <form class="mfa__form" id="form-mfa-codigo" novalidate>
        <label for="mfa-codigo">Código</label>
        <input id="mfa-codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>
        <button class="botao" type="submit">Validar</button>
      </form>
    </div>
  </main>

  <!-- 5. Sem autorização -->
  <main class="ecra" id="ecra-sem-acesso" hidden>
    <div class="cartao-acesso">
      <h1>Sem acesso</h1>
      <p>A conta <strong id="sem-acesso-email"></strong> está autenticada, mas não tem autorização para a área reservada. Peça acesso ao administrador.</p>
    </div>
  </main>

  <!-- 6. Aplicação -->
  <main class="app" id="app" hidden>
    <div class="app__cabeca">
      <div>
        <p class="app__projeto" id="app-entidade">DCAB Consulting</p>
        <h1 id="app-titulo">AI4CyberSecurity</h1>
      </div>
      <p class="app__papel" id="app-papel"></p>
    </div>

    <nav class="separadores" aria-label="Secções" role="tablist">
      <button role="tab" aria-selected="true" data-separador="resumo">Resumo</button>
      <button role="tab" aria-selected="false" data-separador="despesas">Despesas</button>
      <button role="tab" aria-selected="false" data-separador="pedidos">Pedidos de pagamento</button>
      <button role="tab" aria-selected="false" data-separador="quadro">Quadro de investimento</button>
      <button role="tab" aria-selected="false" data-separador="contratacao">Contratação</button>
      <button role="tab" aria-selected="false" data-separador="parametros">Parâmetros</button>
      <button role="tab" aria-selected="false" data-separador="acessos" id="separador-acessos" hidden>Acessos</button>
    </nav>

    <section class="painel" id="painel-resumo" role="tabpanel"></section>
    <section class="painel" id="painel-despesas" role="tabpanel" hidden></section>
    <section class="painel" id="painel-pedidos" role="tabpanel" hidden></section>
    <section class="painel" id="painel-quadro" role="tabpanel" hidden></section>
    <section class="painel" id="painel-contratacao" role="tabpanel" hidden></section>
    <section class="painel" id="painel-parametros" role="tabpanel" hidden></section>
    <section class="painel" id="painel-acessos" role="tabpanel" hidden></section>
  </main>

  <!-- Diálogo de edição (despesas, pedidos, confirmação) -->
  <dialog class="dialogo" id="dialogo">
    <form method="dialog" class="dialogo__form" id="dialogo-form" novalidate>
      <h2 id="dialogo-titulo"></h2>
      <div class="dialogo__corpo" id="dialogo-corpo"></div>
      <p class="dialogo__erros" id="dialogo-erros" role="alert"></p>
      <div class="dialogo__acoes">
        <button class="botao botao--linha" type="button" id="dialogo-cancelar">Cancelar</button>
        <button class="botao" type="submit" id="dialogo-gravar">Gravar</button>
      </div>
    </form>
  </dialog>

  <noscript><p class="aviso">A área reservada necessita de JavaScript ativo.</p></noscript>
</body>
</html>
````

## `public/reservado/app.js`

Área reservada: aplicação. **Substituir.**

````javascript
/* Área reservada DCAB Consulting
 * Autenticação por email e palavra-passe (só por convite) ou Google + segundo fator TOTP
 * (Firebase Authentication com Identity Platform)
 * Dados em Cloud Firestore, protegidos por regras que exigem MFA e autorização explícita.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail, getMultiFactorResolver, multiFactor, TotpMultiFactorGenerator,
  sendEmailVerification, reload,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, collection, getDoc, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { CONFIG } from "./config.js";
import * as M from "./modelo.js";

/* ---------- Utilitários ---------- */

const $ = (id) => document.getElementById(id);

// Constrói elementos sem innerHTML: todo o texto entra como textContent
function el(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "texto") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat()) if (f !== null && f !== undefined && f !== false) e.append(f instanceof Node ? f : String(f));
  return e;
}

const fmtEur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const fmtPct = new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 1 });
const eur = (v) => (v === null || v === undefined ? "—" : fmtEur.format(v));
const pct = (v) => fmtPct.format(v || 0);
const dataPt = (s) => (s ? s.split("-").reverse().join("/") : "—");
const mesPt = (s) => (s ? new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(s + "-01T00:00:00Z")) : "—");
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
const texto = (v, max) => String(v ?? "").trim().slice(0, max);

// Aceita "2 500,00", "2500.00", "2.500,00 €"
function lerValor(s) {
  let t = String(s ?? "").replace(/[\s€\u00a0]/g, "");
  if (t === "") return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const v = Number(t);
  return isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}
const valorParaCampo = (v) => (typeof v === "number" ? String(v).replace(".", ",") : "");

let temporizadorAviso;
function aviso(msg, tipo = "info") {
  const a = $("aviso");
  a.textContent = msg;
  a.className = "aviso aviso--" + tipo;
  a.hidden = false;
  clearTimeout(temporizadorAviso);
  // Os erros ficam visíveis até à ação seguinte; as restantes mensagens desaparecem sozinhas
  if (tipo !== "erro") temporizadorAviso = setTimeout(() => { a.hidden = true; }, 8000);
}

function mensagemErro(e) {
  if (e && /apenas por convite/i.test(e.message || "")) return "Este email não tem convite ativo. Peça acesso ao administrador.";
  if (e && /^functions\//.test(e.code || "") && e.code !== "functions/internal" && e.message) return e.message;
  const c = e && e.code ? e.code.replace(/^firestore\//, "") : "";
  const m = {
    "auth/popup-closed-by-user": "A janela de autenticação foi fechada antes de concluir.",
    "auth/cancelled-popup-request": "A janela de autenticação foi fechada antes de concluir.",
    "auth/popup-blocked": "O navegador bloqueou a janela de autenticação. Permita janelas pop-up para este site.",
    "auth/account-exists-with-different-credential": "Este email já está associado a outro método de entrada. Use o método que usou da primeira vez.",
    "auth/invalid-credential": "Email ou palavra-passe incorretos.",
    "auth/wrong-password": "Email ou palavra-passe incorretos.",
    "auth/user-not-found": "Email ou palavra-passe incorretos.",
    "auth/invalid-email": "O email não é válido.",
    "auth/admin-restricted-operation": "O acesso é apenas por convite e esta conta ainda não foi criada. Peça ao administrador para a ativar (código: auth/admin-restricted-operation).",
    "auth/operation-not-allowed": "A autenticação de dois fatores ainda não está ativa no projeto (código: auth/operation-not-allowed).",
    "auth/invalid-verification-code": "Código inválido ou expirado. Confirme a hora do telemóvel e tente novamente.",
    "auth/unauthorized-domain": "Este domínio não está autorizado na configuração de autenticação.",
    "auth/too-many-requests": "Demasiadas tentativas. Aguarde alguns minutos.",
    "auth/network-request-failed": "Sem ligação à internet.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "permission-denied": "Operação não autorizada. O pedido de pagamento associado pode estar fechado, ou a sua conta não tem esta permissão.",
    "unavailable": "Sem ligação ao servidor. Tente novamente.",
  };
  if (!m[c]) console.error(e);
  return m[c] || "Ocorreu um erro inesperado" + (c ? " (código: " + c + ")" : "") + ". Tente novamente ou envie este código ao administrador.";
}

/* ---------- Firebase ---------- */

// Configuração incompleta: mostra a causa em vez de falhar em silêncio
const emFalta = ["apiKey", "projectId", "appId", "authDomain"].filter((k) => !CONFIG.firebase[k] || String(CONFIG.firebase[k]).startsWith("COLAR"));
if (emFalta.length) {
  window.__falhaArranque && window.__falhaArranque(
    "Configuração incompleta",
    "O ficheiro reservado/config.js ainda não tem os dados do projeto Firebase (passos 64 a 66 do guia).",
    "Campos por preencher: " + emFalta.join(", "));
  throw new Error("config.js incompleto: " + emFalta.join(", "));
}

const app = initializeApp(CONFIG.firebase);
const auth = getAuth(app);
auth.languageCode = "pt";
const db = getFirestore(app);
const funcoes = getFunctions(app, "europe-west1");
const chamar = (nome, dados) => httpsCallable(funcoes, nome)(dados).then((r) => r.data);
const raiz = () => doc(db, "projetos", CONFIG.projetoId);

const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account", hd: CONFIG.dominioGoogle });

const estado = {
  papel: null, parametros: {}, despesas: [], pedidos: {}, separador: "resumo",
  filtros: { linha: "", pedido: "", alertas: false }, resolver: null, segredo: null,
  subscricoes: [], emailEnviado: false, aoGravar: null, prontos: 0,
};
const podeEditar = () => ["admin", "editor"].includes(estado.papel);
const eAdmin = () => estado.papel === "admin";
const emailAtual = () => (auth.currentUser ? auth.currentUser.email.toLowerCase() : "");

function mostrar(id) {
  for (const e of document.querySelectorAll(".ecra, #app")) e.hidden = e.id !== id;
  const foco = document.querySelector("#" + id + " h1");
  if (foco) { foco.setAttribute("tabindex", "-1"); foco.focus({ preventScroll: true }); }
}

/* ---------- Autenticação ---------- */

async function entrar(fornecedor) {
  return tentarEntrada(() => signInWithPopup(auth, fornecedor));
}

async function entrarComEmail(ev) {
  ev.preventDefault();
  const email = $("entrar-email").value.trim();
  const senha = $("entrar-senha").value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !senha) return aviso("Indique o email e a palavra-passe.", "erro");
  $("botao-entrar").disabled = true;
  await tentarEntrada(() => signInWithEmailAndPassword(auth, email, senha));
  $("botao-entrar").disabled = false;
  $("entrar-senha").value = "";
}

// Primeiro acesso (convite) e recuperação usam a mesma ligação de definição de palavra-passe.
// A resposta é sempre igual, exista ou não a conta, para não revelar que emails têm acesso.
async function pedirDefinicaoSenha() {
  const email = $("entrar-email").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    $("entrar-email").focus();
    return aviso("Escreva primeiro o seu email no campo Email.", "erro");
  }
  try {
    await sendPasswordResetEmail(auth, email, { url: location.origin + "/reservado/" });
  } catch (e) {
    if (e.code === "auth/too-many-requests") return aviso(mensagemErro(e), "erro");
  }
  aviso("Se este email tiver um convite ativo, vai receber uma ligação para definir a palavra-passe. Verifique também a pasta de spam.", "ok");
}

async function tentarEntrada(acao) {
  $("aviso").hidden = true;
  try {
    await acao();
  } catch (e) {
    if (e.code === "auth/multi-factor-auth-required") {
      estado.resolver = getMultiFactorResolver(auth, e);
      mostrar("ecra-mfa-codigo");
      $("mfa-codigo").value = "";
      $("mfa-codigo").focus();
      return;
    }
    aviso(mensagemErro(e), "erro");
  }
}

async function validarCodigo(ev) {
  ev.preventDefault();
  const codigo = $("mfa-codigo").value.trim();
  if (!/^\d{6}$/.test(codigo)) return aviso("Introduza os 6 dígitos do código.", "erro");
  const dica = estado.resolver && estado.resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  if (!dica) return aviso("Não foi encontrado um segundo fator registado para esta conta.", "erro");
  try {
    await estado.resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(dica.uid, codigo));
    estado.resolver = null;
  } catch (e) {
    aviso(mensagemErro(e), "erro");
    $("mfa-codigo").select();
  }
}

async function prepararRegistoMfa(user) {
  try {
    const sessao = await multiFactor(user).getSession();
    estado.segredo = await TotpMultiFactorGenerator.generateSecret(sessao);
  } catch (e) {
    await signOut(auth);
    aviso(e.code === "auth/requires-recent-login"
      ? "Por segurança, entre novamente para ativar a autenticação de dois fatores."
      : mensagemErro(e), "erro");
    return;
  }
  const url = estado.segredo.generateQrCodeUrl(user.email, CONFIG.emissorMfa);
  const alvo = $("mfa-qr");
  alvo.replaceChildren();
  if (window.QRCode) new window.QRCode(alvo, { text: url, width: 184, height: 184, correctLevel: window.QRCode.CorrectLevel.M });
  else alvo.append(el("p", { texto: "Não foi possível gerar o código QR. Use a chave manual." }));
  $("mfa-chave").textContent = estado.segredo.secretKey.replace(/(.{4})/g, "$1 ").trim();
  $("mfa-codigo-registo").value = "";
  mostrar("ecra-mfa-registo");
}

async function concluirRegistoMfa(ev) {
  ev.preventDefault();
  const codigo = $("mfa-codigo-registo").value.trim();
  if (!/^\d{6}$/.test(codigo)) return aviso("Introduza os 6 dígitos do código.", "erro");
  try {
    await multiFactor(auth.currentUser).enroll(TotpMultiFactorGenerator.assertionForEnrollment(estado.segredo, codigo), "Aplicação autenticadora");
    estado.segredo = null;
    await signOut(auth);
    aviso("Autenticação de dois fatores ativada. Entre novamente para concluir.", "ok");
  } catch (e) {
    aviso(mensagemErro(e), "erro");
  }
}

// Qualquer falha durante a validação da sessão termina a sessão e mostra a causa no ecrã de entrada
async function processarSessao(user) {
  try {
    await validarSessao(user);
  } catch (e) {
    console.error(e);
    try { await signOut(auth); } catch (_) {}
    mostrar("ecra-entrada");
    aviso(mensagemErro(e), "erro");
  }
}

async function validarSessao(user) {
  pararSubscricoes();
  $("sessao").hidden = !user;
  if (!user) { estado.papel = null; mostrar("ecra-entrada"); return; }
  $("sessao-email").textContent = user.email;
  reiniciarInatividade();

  if (!user.emailVerified) {
    $("verificar-email").textContent = user.email;
    mostrar("ecra-verificar");
    if (!estado.emailEnviado) { estado.emailEnviado = true; sendEmailVerification(user).catch(() => {}); }
    return;
  }
  if (multiFactor(user).enrolledFactors.length === 0) { await prepararRegistoMfa(user); return; }

  const token = await user.getIdTokenResult();
  if (!token.claims.firebase || token.claims.firebase.sign_in_second_factor !== "totp") {
    await signOut(auth);
    aviso("A sessão não foi validada com o segundo fator. Entre novamente.", "erro");
    return;
  }

  let acesso = null;
  try { acesso = await getDoc(doc(db, "acessos", user.email.toLowerCase())); } catch (e) { console.error(e); }
  if (!acesso || !acesso.exists()) {
    $("sem-acesso-email").textContent = user.email;
    mostrar("ecra-sem-acesso");
    return;
  }
  estado.papel = acesso.data().papel;
  iniciarApp();
}

// Termina a sessão após inatividade
let temporizadorInatividade;
function reiniciarInatividade() {
  clearTimeout(temporizadorInatividade);
  if (!auth.currentUser) return;
  temporizadorInatividade = setTimeout(async () => {
    await signOut(auth);
    aviso("A sessão terminou por inatividade.", "info");
  }, CONFIG.inatividadeMinutos * 60000);
}

/* ---------- Dados ---------- */

function pararSubscricoes() {
  estado.subscricoes.forEach((f) => f());
  estado.subscricoes = [];
  estado.prontos = 0;
}

function erroLeitura(e) {
  aviso(mensagemErro(e), "erro");
}

function iniciarApp() {
  mostrar("app");
  $("app-papel").textContent = { admin: "Administrador", editor: "Editor", leitor: "Consulta" }[estado.papel] || "";
  $("separador-acessos").hidden = !eAdmin();
  const base = raiz();
  const pronto = () => { estado.prontos++; desenhar(); };
  estado.subscricoes.push(onSnapshot(base, (s) => { estado.parametros = s.exists() ? s.data().parametros || {} : {}; pronto(); }, erroLeitura));
  estado.subscricoes.push(onSnapshot(collection(base, "despesas"), (s) => { estado.despesas = s.docs.map((d) => ({ id: d.id, ...d.data() })); pronto(); }, erroLeitura));
  estado.subscricoes.push(onSnapshot(collection(base, "pedidos"), (s) => { estado.pedidos = Object.fromEntries(s.docs.map((d) => [d.id, { ...d.data(), codigo: d.id }])); pronto(); }, erroLeitura));
}

// Regista cada alteração na coleção de auditoria (apenas criação; não pode ser alterada nem apagada)
function auditar(batch, acao, colecao, docId, resumo) {
  batch.set(doc(collection(raiz(), "auditoria")), {
    acao, colecao, docId, resumo: texto(resumo, 200), por: emailAtual(), em: serverTimestamp(),
  });
}

function calcular() {
  const c = M.calcularDespesas(estado.despesas, estado.parametros, estado.pedidos);
  const q = M.calcularQuadro(c, estado.parametros);
  const p = M.calcularPedidos(estado.pedidos, c);
  const ct = M.calcularContratacao(estado.parametros, c, hojeISO());
  return { c, q, r: M.calcularRubricas(q), p, ct, res: M.calcularResumo(q, p, c, ct) };
}

/* ---------- Interface ---------- */

let pedidoDesenho = 0;
function desenhar() {
  if (estado.prontos < 3) return;
  cancelAnimationFrame(pedidoDesenho);
  pedidoDesenho = requestAnimationFrame(() => {
    const dados = calcular();
    const p = estado.parametros;
    $("app-titulo").textContent = p.projeto || "AI4CyberSecurity";
    $("app-entidade").textContent = p.entidade || "DCAB Consulting";
    const desenhos = { resumo: painelResumo, despesas: painelDespesas, pedidos: painelPedidos, quadro: painelQuadro, contratacao: painelContratacao, parametros: painelParametros, acessos: painelAcessos };
    const painel = $("painel-" + estado.separador);
    const foco = document.activeElement && painel.contains(document.activeElement) ? document.activeElement.id : null;
    painel.replaceChildren(...desenhos[estado.separador](dados));
    if (foco && $(foco)) $(foco).focus();
  });
}

function mudarSeparador(nome) {
  if (nome === "acessos" && !eAdmin()) return;
  estado.separador = nome;
  if (nome === "acessos") carregarAcessos();
  for (const b of document.querySelectorAll("[data-separador]")) b.setAttribute("aria-selected", String(b.dataset.separador === nome));
  for (const s of document.querySelectorAll(".painel")) s.hidden = s.id !== "painel-" + nome;
  desenhar();
}

const tabela = (cabecalhos, linhas, rodape) => el("div", { class: "tabela-envolvente" },
  el("table", { class: "tabela" },
    el("thead", {}, el("tr", {}, cabecalhos.map((h) => el("th", { scope: "col", class: h.num ? "num" : null, texto: h.t || h })))),
    el("tbody", {}, linhas),
    rodape ? el("tfoot", {}, rodape) : null));
const td = (v, cls) => el("td", { class: cls || null }, v);
const tdNum = (v) => td(v, "num");
const indicador = (rotulo, valor, nota, destaque) => el("div", { class: "indicador" + (destaque ? " indicador--" + destaque : "") },
  el("p", { class: "indicador__rotulo", texto: rotulo }), el("p", { class: "indicador__valor", texto: valor }), nota ? el("p", { class: "indicador__nota", texto: nota }) : null);
const etiqueta = (t, tipo) => el("span", { class: "etiqueta etiqueta--" + tipo, texto: t });
const classeEstadoPedido = (e) => ({ "Pago": "ok", "Aprovado": "ok", "Submetido": "info", "Em análise": "info", "Com correções": "alerta" }[e] || "neutro");

function painelResumo({ q, r, p, res }) {
  const fases = p.length
    ? el("ol", { class: "fases" }, p.map((f) => el("li", { class: "fase fase--" + classeEstadoPedido(f.estado) },
        el("span", { class: "fase__codigo", texto: f.codigo }),
        el("span", { class: "fase__estado", texto: f.estado || "Em preparação" }),
        el("span", { class: "fase__valor", texto: typeof f.valorTransferido === "number" ? eur(f.valorTransferido) : "—" }))))
    : el("div", { class: "vazio" },
        el("p", { texto: "As fases da candidatura (adiantamento, pedidos de pagamento e saldo final) ainda não foram criadas." }),
        eAdmin() ? el("button", { class: "botao", type: "button", texto: "Criar fases ADT, PP01–PP12 e PSF", onclick: criarFases }) : null);

  return [
    el("h2", { class: "painel__titulo", texto: "Fases da candidatura" }),
    fases,
    el("h2", { class: "painel__titulo", texto: "Execução e tesouraria" }),
    el("div", { class: "indicadores" },
      indicador("Investimento aprovado", eur(res.totalAprovado), "Comparticipação " + eur(res.compAprovada)),
      indicador("Despesa executada", eur(res.executada), pct(res.execucaoGlobal) + " do investimento"),
      indicador("Comparticipação executada", eur(res.compExecutada), "Validada " + eur(res.compValidada)),
      indicador("Total recebido", eur(res.recebido), "Por receber " + eur(res.saldoReceber)),
      indicador("Verbas por justificar", eur(res.porJustificar), "Recebido sem despesa apresentada", res.porJustificar > 0 ? "alerta" : null),
      indicador("Pontos de atenção", String(res.comAlertas + res.mesesEmFalta), plural(res.comAlertas, "despesa com alertas", "despesas com alertas") + " · " + plural(res.mesesEmFalta, "mês de contratação em falta", "meses de contratação em falta"), res.comAlertas + res.mesesEmFalta > 0 ? "alerta" : "ok")),
    el("div", { class: "barra", role: "img", "aria-label": "Execução global " + pct(res.execucaoGlobal) },
      el("div", { class: "barra__preenchimento", "data-pct": Math.min(100, Math.round(res.execucaoGlobal * 100)) })),
    el("h2", { class: "painel__titulo", texto: "Execução por rubrica" }),
    tabela(["Nº", "Rubrica", { t: "Aprovado", num: 1 }, { t: "Taxa", num: 1 }, { t: "Comp. aprovada", num: 1 }, { t: "Executado", num: 1 }, { t: "% exec.", num: 1 }, { t: "Comp. executada", num: 1 }, { t: "Saldo", num: 1 }],
      r.map((x) => el("tr", {}, td(String(x.numero)), el("td", { title: x.nome, texto: x.curto }), tdNum(eur(x.aprovado)), tdNum(pct(x.taxa)), tdNum(eur(x.compAprovada)), tdNum(eur(x.executada)), tdNum(pct(x.percentagem)), tdNum(eur(x.compExecutada)), tdNum(eur(x.saldo)))),
      el("tr", {}, td(""), td("Total"), tdNum(eur(res.totalAprovado)), tdNum(""), tdNum(eur(res.compAprovada)), tdNum(eur(res.executada)), tdNum(pct(res.execucaoGlobal)), tdNum(eur(res.compExecutada)), tdNum(eur(q.reduce((s, l) => s + l.saldo, 0))))),
  ];
}

function painelDespesas({ c }) {
  const f = estado.filtros;
  const lista = c.filter((d) => (!f.linha || d.linha === f.linha) && (!f.pedido || d.pedido === f.pedido) && (!f.alertas || d.alertas.length));
  const opcoesLinha = M.QUADRO.map((l) => [l.codigo, l.codigo + " – " + l.descricao]);
  const filtroLinha = seletor("filtro-linha", opcoesLinha, f.linha, "Todas as linhas");
  filtroLinha.addEventListener("change", () => { f.linha = filtroLinha.value; desenhar(); });
  const filtroPedido = seletor("filtro-pedido", Object.keys(estado.pedidos).sort((a, b) => M.ordemPedido(a) - M.ordemPedido(b)), f.pedido, "Todos os pedidos");
  filtroPedido.addEventListener("change", () => { f.pedido = filtroPedido.value; desenhar(); });
  const soAlertas = el("input", { type: "checkbox", id: "filtro-alertas", checked: f.alertas, onchange: (e) => { f.alertas = e.target.checked; desenhar(); } });

  const linhas = lista.map((d) => el("tr", { class: d.fechado ? "linha--fechada" : null },
    td(String(d.numero)), td(dataPt(d.dataDocumento)),
    el("td", { title: M.LINHA[d.linha] ? M.LINHA[d.linha].descricao : "", texto: d.linha }),
    td(d.fornecedor || "—"), td(d.documento || "—"),
    tdNum(eur(d.elegivel)), tdNum(eur(d.comparticipacao)),
    td(d.pedido || "—"), td(d.estado),
    el("td", {}, d.alertas.length ? el("ul", { class: "alertas" }, d.alertas.map((a) => el("li", { texto: a }))) : etiqueta("OK", "ok")),
    el("td", { class: "acoes" },
      d.fechado ? etiqueta("Fechado", "neutro")
        : podeEditar() ? el("button", { class: "ligacao", type: "button", texto: "Editar", onclick: () => editarDespesa(d) }) : null,
      !d.fechado && eAdmin() ? el("button", { class: "ligacao ligacao--perigo", type: "button", texto: "Eliminar", onclick: () => eliminarDespesa(d) }) : null)));

  const soma = (k) => lista.reduce((s, d) => s + (d[k] || 0), 0);
  return [
    el("div", { class: "barra-ferramentas" },
      el("div", { class: "filtros" },
        el("label", { class: "sr", for: "filtro-linha", texto: "Linha orçamental" }), filtroLinha,
        el("label", { class: "sr", for: "filtro-pedido", texto: "Pedido de pagamento" }), filtroPedido,
        el("label", { class: "filtro-caixa" }, soAlertas, " Só com alertas")),
      el("div", { class: "ferramentas" },
        podeEditar() ? el("button", { class: "botao", type: "button", texto: "Nova despesa", onclick: () => editarDespesa(null) }) : null)),
    lista.length
      ? tabela(["Nº", "Data", "Linha", "Fornecedor", "Documento", { t: "Elegível", num: 1 }, { t: "Comparticipação", num: 1 }, "Pedido", "Estado", "Verificação", ""], linhas,
          el("tr", {}, td(""), td(""), td(""), td("Total (" + lista.length + ")"), td(""), tdNum(eur(soma("elegivel"))), tdNum(eur(soma("comparticipacao"))), td(""), td(""), td(""), td("")))
      : el("p", { class: "vazio", texto: c.length ? "Nenhuma despesa corresponde aos filtros." : "Ainda não há despesas registadas." }),
  ];
}

function painelPedidos({ p, res }) {
  const linhas = p.map((x) => el("tr", { class: x.fechado ? "linha--fechada" : null },
    td(x.codigo), td(x.tipo || "—"),
    td(x.periodoInicio || x.periodoFim ? dataPt(x.periodoInicio) + " a " + dataPt(x.periodoFim) : "—"),
    td(dataPt(x.dataSubmissao)), tdNum(eur(x.valorSolicitado ?? null)),
    td(dataPt(x.dataTransferencia)), tdNum(eur(x.valorTransferido ?? null)),
    tdNum(eur(x.imputada)), tdNum(eur(x.apresentada)), tdNum(eur(x.validada)),
    el("td", { class: "num" + (x.diferenca > 0 ? " valor--alerta" : "") , texto: eur(x.diferenca) }),
    el("td", {}, etiqueta(x.estado || "Em preparação", classeEstadoPedido(x.estado))),
    el("td", { class: "acoes" }, (podeEditar() && !x.fechado) || eAdmin() ? el("button", { class: "ligacao", type: "button", texto: "Editar", onclick: () => editarPedido(x) }) : null)));
  return [
    el("div", { class: "indicadores" },
      indicador("Comparticipação aprovada", eur(res.compAprovada)),
      indicador("Total transferido", eur(res.recebido)),
      indicador("Comparticipação apresentada", eur(res.apresentada)),
      indicador("Saldo por receber", eur(res.saldoReceber)),
      indicador("Verbas por justificar", eur(res.porJustificar), null, res.porJustificar > 0 ? "alerta" : null),
      indicador("Comparticipação sem pedido", eur(res.semPedido), null, res.semPedido > 0 ? "alerta" : null)),
    el("p", { class: "nota", texto: "Quando um pedido passa a Submetido, Em análise, Aprovado ou Pago, as despesas associadas ficam bloqueadas. Só o administrador pode reabrir um pedido fechado." }),
    el("div", { class: "barra-ferramentas" }, el("div", {}),
      el("div", { class: "ferramentas" },
        eAdmin() && !p.length ? el("button", { class: "botao", type: "button", texto: "Criar fases ADT, PP01–PP12 e PSF", onclick: criarFases }) : null,
        eAdmin() && p.length ? el("button", { class: "botao botao--linha", type: "button", texto: "Adicionar pedido", onclick: () => editarPedido(null) }) : null)),
    p.length
      ? tabela(["Nº", "Tipo", "Período da despesa", "Submissão", { t: "Solicitado", num: 1 }, "Transferência", { t: "Transferido", num: 1 }, { t: "Despesa imputada", num: 1 }, { t: "Comp. apresentada", num: 1 }, { t: "Comp. validada", num: 1 }, { t: "Diferença", num: 1 }, "Estado", ""], linhas)
      : el("p", { class: "vazio", texto: "Ainda não existem pedidos de pagamento." }),
  ];
}

function painelQuadro({ q }) {
  const linhas = [];
  for (const [num, r] of Object.entries(M.RUBRICAS)) {
    linhas.push(el("tr", { class: "linha--grupo" }, el("td", { colspan: "11", texto: num + ". " + r.nome })));
    for (const l of q.filter((x) => x.rubrica === Number(num))) {
      linhas.push(el("tr", {}, td(l.codigo), td(l.descricao), tdNum(eur(l.valor)),
        el("td", { class: "num" + (l.taxaAlterada ? " valor--alterado" : ""), title: l.taxaAlterada ? "Taxa aprovada: " + pct(l.taxaAprovada) : null, texto: pct(l.taxa) + (l.taxaAlterada ? " *" : "") }),
        tdNum(eur(l.compAprovada)),
        tdNum(eur(l.executada)), tdNum(eur(l.compExecutada)), tdNum(eur(l.validada)), tdNum(eur(l.compValidada)),
        el("td", { class: "num" + (l.saldo < 0 ? " valor--erro" : ""), texto: eur(l.saldo) }), tdNum(pct(l.percentagem))));
    }
  }
  const s = (k) => q.reduce((t, l) => t + l[k], 0);
  return [
    el("div", { class: "barra-ferramentas" },
      el("p", { class: "nota", texto: "Réplica do Quadro de Investimento Aprovado (Dossier de Projeto, SelectAdvisor, Lda., pág. 4). A comparticipação executada está limitada ao valor aprovado de cada linha." + (q.some((l) => l.taxaAlterada) ? " * Taxa alterada em relação à aprovada." : "") }),
      eAdmin() ? el("div", { class: "ferramentas" }, el("button", { class: "botao botao--linha", type: "button", texto: "Alterar taxas de comparticipação", onclick: editarTaxas })) : null),
    tabela(["Código", "Descrição", { t: "Aprovado", num: 1 }, { t: "Taxa", num: 1 }, { t: "Comp. aprovada", num: 1 }, { t: "Executado", num: 1 }, { t: "Comp. executada", num: 1 }, { t: "Validado", num: 1 }, { t: "Comp. validada", num: 1 }, { t: "Saldo", num: 1 }, { t: "% exec.", num: 1 }], linhas,
      el("tr", {}, td(""), td("Total"), tdNum(eur(s("valor"))), tdNum(""), tdNum(eur(s("compAprovada"))), tdNum(eur(s("executada"))), tdNum(eur(s("compExecutada"))), tdNum(eur(s("validada"))), tdNum(eur(s("compValidada"))), tdNum(eur(s("saldo"))), tdNum(pct(s("executada") / M.TOTAL_APROVADO)))),
  ];
}

function painelContratacao({ ct }) {
  const p = estado.parametros;
  if (!p.inicio) return [el("p", { class: "vazio", texto: "Defina a data de início de elegibilidade nos Parâmetros para gerar o calendário de 24 meses." })];
  const coluna = (nome, meses) => el("div", { class: "contratacao__coluna" },
    el("h2", { class: "painel__titulo", texto: nome }),
    tabela(["Mês", "Referência", { t: "Valor elegível", num: 1 }, "Estado", { t: "Desvio", num: 1 }],
      meses.map((m) => el("tr", {}, td(String(m.numero)), td(mesPt(m.mes)), tdNum(m.valor ? eur(m.valor) : "—"),
        el("td", {}, etiqueta(m.estado, { "Lançado": "ok", "Em falta": "alerta", "Por lançar": "neutro" }[m.estado])),
        tdNum(m.desvio === null ? "—" : eur(m.desvio))))));
  return [
    el("p", { class: "nota", texto: "Referência mensal (aprovado ÷ duração): " + eur(ct.referencia) + " por consultor. Meses em falta: " + ct.emFalta + "." }),
    el("div", { class: "contratacao" },
      coluna("Consultor Sénior 1 — " + (p.consultor1 || "nome por definir"), ct.c1),
      coluna("Consultor Sénior 2 — " + (p.consultor2 || "nome por definir"), ct.c2)),
  ];
}

function painelParametros() {
  const p = estado.parametros;
  const so = !eAdmin();
  const campos = [
    campo("Entidade beneficiária", entrada("p-entidade", "text", p.entidade || "DCAB Consulting", { maxlength: 120, disabled: so })),
    campo("Projeto", entrada("p-projeto", "text", p.projeto || "AI4CyberSecurity", { maxlength: 120, disabled: so })),
    campo("Data de início de elegibilidade", entrada("p-inicio", "date", p.inicio || "", { disabled: so })),
    campo("Duração (meses)", entrada("p-duracao", "number", p.duracao || 24, { min: 1, max: 60, disabled: so })),
    campo("Data de fim de elegibilidade", entrada("p-fim", "text", dataPt(M.fimElegibilidade(p.inicio, p.duracao)), { disabled: true })),
    campo("Entidade consultora", entrada("p-consultora", "text", p.entidadeConsultora || "SelectAdvisor, Lda.", { maxlength: 120, disabled: so })),
    campo("Consultor Sénior 1 (linha 4.1)", entrada("p-consultor1", "text", p.consultor1 || "", { maxlength: 120, disabled: so })),
    campo("Consultor Sénior 2 (linha 4.2)", entrada("p-consultor2", "text", p.consultor2 || "", { maxlength: 120, disabled: so })),
  ];
  const ficheiro = el("input", { type: "file", id: "importar-ficheiro", accept: ".xlsx", class: "sr", onchange: importarExcel });
  return [
    el("form", { class: "formulario-parametros", onsubmit: gravarParametros }, campos,
      eAdmin() ? el("div", { class: "campo--largo" }, el("button", { class: "botao", type: "submit", texto: "Gravar parâmetros" })) : null),
    el("h2", { class: "painel__titulo", texto: "Dados" }),
    el("div", { class: "ferramentas ferramentas--esquerda" },
      el("button", { class: "botao botao--linha", type: "button", texto: "Exportar para Excel", onclick: exportarExcel }),
      eAdmin() ? el("label", { class: "botao botao--linha", for: "importar-ficheiro", texto: "Importar do Excel de controlo" }) : null,
      eAdmin() ? ficheiro : null),
    el("p", { class: "nota", texto: "A importação lê as folhas Parâmetros, Registo Despesas e Controlo Transferências. As despesas que já existem (mesma linha, NIF, documento, data e valor) são ignoradas." }),
    el("h2", { class: "painel__titulo", texto: "Segurança" }),
    el("p", { class: "nota", texto: "O acesso é apenas por convite (email e palavra-passe, ou conta Google da DCAB) e exige um código de aplicação autenticadora em cada entrada. Os acessos e papéis (admin, editor, leitor) são geridos na coleção «acessos» do Firestore. Todas as alterações ficam registadas na coleção «auditoria»." }),
  ];
}

/* ---------- Acessos (só administrador) ---------- */

estado.acessos = null;
estado.acessosErro = "";
// Mantém o formulário e o resultado do convite entre atualizações do painel
estado.formAcesso = { email: "", nome: "", papel: "editor", metodo: "email" };
estado.conviteResultado = null;
async function carregarAcessos() {
  estado.acessosErro = "";
  try { estado.acessos = await chamar("listarAcessos"); }
  catch (e) { estado.acessosErro = mensagemErro(e); }
  desenhar();
}

const NOMES_PAPEL = { admin: "Administrador", editor: "Editor", leitor: "Consulta" };
const dataHoraPt = (iso) => (iso ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : "—");

function mensagemConvite(email, metodo) {
  const url = location.origin + "/reservado";
  const passos = metodo === "google"
    ? ["Abra " + url, "Clique em «Entrar com Google» e escolha a conta " + email + "."]
    : ["Abra a mensagem com o assunto de definição de palavra-passe que acabou de receber (verifique também a pasta de spam) e defina a sua palavra-passe: mínimo de 12 caracteres, com maiúsculas, minúsculas, números e um símbolo.",
       "Abra " + url + " e entre com o seu email e a nova palavra-passe.",
       "Confirme o seu email através da ligação que vai receber."];
  passos.push("Instale no telemóvel o Microsoft Authenticator ou o Google Authenticator e leia o código QR que aparece no ecrã. A partir daí, em cada entrada é pedido o código de 6 dígitos da aplicação.");
  return "Olá,\n\nFoi-lhe atribuído acesso à área reservada da DCAB Consulting. Para o ativar:\n\n" +
    passos.map((p, i) => (i + 1) + ". " + p).join("\n") + "\n\nCom os melhores cumprimentos,\nDCAB Consulting";
}

function blocoMensagem(email, metodo) {
  const texto = mensagemConvite(email, metodo);
  const area = el("textarea", { class: "convite__texto", rows: "11", readonly: true });
  area.value = texto;
  return el("div", { class: "convite__mensagem" },
    el("p", { texto: "Mensagem para enviar à pessoa, a partir do seu email:" }), area,
    el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Copiar mensagem",
      onclick: async (ev) => { try { await navigator.clipboard.writeText(texto); ev.target.textContent = "Mensagem copiada"; } catch (_) { area.select(); } } }));
}

function painelAcessos() {
  const fa = estado.formAcesso;
  const email = entrada("ac-email", "email", fa.email, { maxlength: 160, autocomplete: "off" });
  const nome = entrada("ac-nome", "text", fa.nome, { maxlength: 120, autocomplete: "off" });
  const papel = seletor("ac-papel", [["editor", "Editor (regista e edita)"], ["leitor", "Consulta (só leitura)"], ["admin", "Administrador"]], fa.papel);
  const metodo = seletor("ac-metodo", [["email", "Email e palavra-passe"], ["google", "Conta Google"]], fa.metodo);
  const resultado = el("div", { class: "convite__resultado", "aria-live": "polite" });
  const guardar = () => { fa.email = email.value; fa.nome = nome.value; fa.papel = papel.value; fa.metodo = metodo.value; };
  email.addEventListener("input", () => {
    if (/@dcabconsulting\.com$/i.test(email.value.trim())) metodo.value = "google";
    guardar();
  });
  for (const c of [nome, papel, metodo]) c.addEventListener("input", guardar);
  const r = estado.conviteResultado;
  if (r && r.erro) resultado.append(el("p", { class: "leitor__erro", texto: r.erro }));
  else if (r && r.ok) resultado.append(el("p", { class: "leitor__ok", texto: r.ok }), blocoMensagem(r.email, r.metodo));
  else if (r && r.aguardar) resultado.append(el("p", { texto: "A criar o convite…" }));

  const formulario = el("form", { class: "formulario-parametros", novalidate: true, onsubmit: async (ev) => {
    ev.preventDefault();
    const dados = { email: email.value.trim().toLowerCase(), nome: nome.value.trim(), papel: papel.value, metodo: metodo.value };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.email)) return aviso("Indique um email válido.", "erro");
    if (estado.conviteResultado && estado.conviteResultado.aguardar) return;
    estado.conviteResultado = { aguardar: true };
    desenhar();
    try {
      await chamar("convidar", dados);
      if (dados.metodo === "email") await sendPasswordResetEmail(auth, dados.email, { url: location.origin + "/reservado/" });
      estado.conviteResultado = { email: dados.email, metodo: dados.metodo, ok: dados.metodo === "email"
        ? "Convite criado. Foi enviado a " + dados.email + " um email para definir a palavra-passe."
        : "Convite criado. " + dados.email + " já pode entrar com Google." };
      estado.formAcesso = { email: "", nome: "", papel: "editor", metodo: "email" };
      carregarAcessos();
    } catch (e) {
      estado.conviteResultado = { erro: mensagemErro(e) };
      desenhar();
    }
  } },
    campo("Email", email), campo("Nome", nome),
    campo("Papel", papel), campo("Método de entrada", metodo, { ajuda: "Contas @dcabconsulting.com: Conta Google. Pessoas externas: email e palavra-passe." }),
    el("div", { class: "campo--largo" }, el("button", { class: "botao", type: "submit", texto: "Convidar" })),
    el("div", { class: "campo--largo" }, resultado));

  let lista;
  if (estado.acessosErro) lista = el("p", { class: "vazio", texto: estado.acessosErro });
  else if (!estado.acessos) lista = el("p", { class: "vazio", texto: "A carregar os acessos…" });
  else lista = tabela(["Pessoa", "Papel", "Entrada", "Acesso", "Conta", "Segundo fator", "Último acesso", ""],
    estado.acessos.map((x) => {
      const proprio = x.email === emailAtual();
      return el("tr", { class: x.ativo ? null : "linha--fechada" },
        el("td", {}, el("strong", { texto: x.nome || "—" }), el("br"), x.email),
        td(NOMES_PAPEL[x.papel] || x.papel),
        td(x.metodo === "google" ? "Google" : x.metodo === "email" ? "Email" : "—"),
        el("td", {}, etiqueta(x.ativo ? "Ativo" : "Desativado", x.ativo ? "ok" : "neutro")),
        el("td", {}, etiqueta(x.conta ? "Criada" : "Por ativar", x.conta ? "ok" : "alerta")),
        el("td", {}, etiqueta(x.mfa ? "Configurado" : "Pendente", x.mfa ? "ok" : "alerta")),
        td(dataHoraPt(x.ultimoAcesso)),
        el("td", { class: "acoes" },
          x.ativo && x.metodo === "email" ? el("button", { class: "ligacao", type: "button", texto: "Reenviar convite", onclick: () => reenviarConvite(x) }) : null,
          !proprio ? el("button", { class: "ligacao", type: "button", texto: "Papel", onclick: () => alterarPapel(x) }) : null,
          !proprio && x.mfa ? el("button", { class: "ligacao", type: "button", texto: "Repor 2FA", onclick: () => confirmarAcesso(x, "reporMfa") }) : null,
          !proprio ? el("button", { class: "ligacao" + (x.ativo ? " ligacao--perigo" : ""), type: "button", texto: x.ativo ? "Desativar" : "Reativar",
            onclick: () => (x.ativo ? confirmarAcesso(x, "desativar") : executarAcesso({ email: x.email, acao: "reativar" }, "Acesso reativado.")) }) : null));
    }));

  return [
    el("h2", { class: "painel__titulo", texto: "Convidar pessoa" }),
    formulario,
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h2", { class: "painel__titulo", texto: "Pessoas com acesso" }),
      el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Atualizar", onclick: carregarAcessos })),
    lista,
    el("p", { class: "nota", texto: "Só quem tem convite ativo consegue criar conta, seja por Google ou por email. «Repor 2FA» apaga o autenticador da pessoa (por exemplo, telemóvel perdido): na entrada seguinte, volta a ler um código QR. Todas as operações ficam na auditoria." }),
  ];
}

async function executarAcesso(dados, sucesso) {
  try { await chamar("alterarAcesso", dados); aviso(sucesso, "ok"); await carregarAcessos(); }
  catch (e) { aviso(mensagemErro(e), "erro"); }
}

async function reenviarConvite(x) {
  try {
    await sendPasswordResetEmail(auth, x.email, { url: location.origin + "/reservado/" });
    aviso("Enviado de novo a " + x.email + " o email para definir a palavra-passe.", "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

function alterarPapel(x) {
  const s = seletor("ac-novo-papel", [["editor", "Editor (regista e edita)"], ["leitor", "Consulta (só leitura)"], ["admin", "Administrador"]], x.papel);
  abrirDialogo({
    titulo: "Papel de " + (x.nome || x.email),
    corpo: el("div", { class: "grelha-form" }, campo("Papel", s, { largo: true })),
    gravar: async () => { await chamar("alterarAcesso", { email: x.email, acao: "papel", papel: s.value }); aviso("Papel atualizado.", "ok"); carregarAcessos(); },
  });
}

function confirmarAcesso(x, acao) {
  const textos = {
    desativar: ["Desativar acesso", "A pessoa " + (x.nome || x.email) + " deixa de conseguir entrar de imediato, mesmo que tenha uma sessão aberta. Pode reativar mais tarde.", "Desativar"],
    reporMfa: ["Repor segundo fator", "O autenticador de " + (x.nome || x.email) + " vai ser apagado. Na entrada seguinte, a pessoa tem de ler um novo código QR. Use quando o telemóvel foi perdido ou trocado.", "Repor"],
  }[acao];
  abrirDialogo({
    titulo: textos[0], corpo: el("p", { texto: textos[1] }), rotulo: textos[2], perigo: acao === "desativar",
    gravar: async () => { await chamar("alterarAcesso", { email: x.email, acao }); aviso(acao === "desativar" ? "Acesso desativado." : "Segundo fator reposto.", "ok"); carregarAcessos(); },
  });
}

/* ---------- Formulários ---------- */

function campo(rotulo, input, opcoes = {}) {
  return el("div", { class: "campo" + (opcoes.largo ? " campo--largo" : ""), id: opcoes.id || null },
    el("label", { for: input.id, texto: rotulo }), input,
    opcoes.ajuda ? el("p", { class: "campo__ajuda", texto: opcoes.ajuda }) : null);
}
function entrada(id, tipo, valor, extra = {}) {
  return el("input", { id, name: id, type: tipo, value: valor ?? "", ...extra });
}
function seletor(id, opcoes, valor, vazio) {
  const s = el("select", { id, name: id });
  if (vazio !== undefined) s.append(el("option", { value: "", texto: vazio }));
  for (const o of opcoes) {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    const op = el("option", { value: v, texto: t });
    if (v === valor) op.selected = true;
    s.append(op);
  }
  return s;
}

function abrirDialogo({ titulo, corpo, gravar, rotulo = "Gravar", perigo = false }) {
  $("dialogo-titulo").textContent = titulo;
  $("dialogo-corpo").replaceChildren(...[].concat(corpo));
  $("dialogo-erros").textContent = "";
  const b = $("dialogo-gravar");
  b.textContent = rotulo;
  b.disabled = false;
  b.classList.toggle("botao--perigo", perigo);
  estado.aoGravar = gravar;
  $("dialogo").showModal();
}

async function submeterDialogo(ev) {
  ev.preventDefault();
  const b = $("dialogo-gravar");
  b.disabled = true;
  try {
    const erros = await estado.aoGravar();
    if (erros && erros.length) { $("dialogo-erros").textContent = erros.join(" "); b.disabled = false; return; }
    $("dialogo").close();
  } catch (e) {
    $("dialogo-erros").textContent = mensagemErro(e);
    b.disabled = false;
  }
}

function editarDespesa(d) {
  const v = d || { estado: "Lançada", ivaElegivel: false };
  const pedidosAbertos = Object.values(estado.pedidos)
    .filter((p) => !M.ESTADOS_FECHADOS.includes(p.estado) || p.codigo === v.pedido)
    .sort((a, b) => M.ordemPedido(a.codigo) - M.ordemPedido(b.codigo)).map((p) => p.codigo);

  const f = {
    linha: seletor("d-linha", M.QUADRO.map((l) => [l.codigo, l.codigo + " – " + l.descricao]), v.linha, "Escolha a linha orçamental"),
    fornecedor: entrada("d-fornecedor", "text", v.fornecedor, { maxlength: 150, autocomplete: "off" }),
    nif: entrada("d-nif", "text", v.nif, { inputmode: "numeric", maxlength: 9, autocomplete: "off" }),
    documento: entrada("d-documento", "text", v.documento, { maxlength: 60, autocomplete: "off" }),
    dataDocumento: entrada("d-data", "date", v.dataDocumento),
    mesReferencia: entrada("d-mes", "month", v.mesReferencia),
    descricao: entrada("d-descricao", "text", v.descricao, { maxlength: 300 }),
    semIva: entrada("d-semiva", "text", valorParaCampo(v.semIva), { inputmode: "decimal", placeholder: "0,00" }),
    iva: entrada("d-iva", "text", valorParaCampo(v.iva), { inputmode: "decimal", placeholder: "0,00" }),
    ivaElegivel: seletor("d-ivaeleg", ["Não", "Sim"], v.ivaElegivel ? "Sim" : "Não"),
    dataPagamento: entrada("d-pagamento", "date", v.dataPagamento),
    meioPagamento: seletor("d-meio", M.MEIOS_PAGAMENTO, v.meioPagamento, "—"),
    pedido: seletor("d-pedido", pedidosAbertos, v.pedido, "Sem pedido"),
    estado: seletor("d-estado", M.ESTADOS_DESPESA, v.estado),
    valorValidado: entrada("d-validado", "text", valorParaCampo(v.valorValidado), { inputmode: "decimal", placeholder: "Preenchido após validação" }),
    comprovativo: entrada("d-comprovativo", "text", v.comprovativo, { maxlength: 200 }),
    observacoes: entrada("d-obs", "text", v.observacoes, { maxlength: 500 }),
  };
  const previsao = el("p", { class: "previsao", "aria-live": "polite" });
  const leitor = leitorQr((fatura) => {
    f.nif.value = fatura.nif;
    f.documento.value = fatura.documento;
    f.dataDocumento.value = fatura.dataDocumento;
    f.semIva.value = valorParaCampo(fatura.semIva);
    f.iva.value = valorParaCampo(fatura.iva);
    if (!f.fornecedor.value) {
      const anterior = [...estado.despesas].reverse().find((x) => x.nif === fatura.nif && x.fornecedor);
      if (anterior) f.fornecedor.value = anterior.fornecedor;
    }
    if (!f.comprovativo.value && fatura.atcud) f.comprovativo.value = "ATCUD " + fatura.atcud;
    atualizar();
    return f.fornecedor.value ? [] : ["Indique o nome do fornecedor (o QR code não inclui o nome)."];
  });
  const campoMes = campo("Mês de referência", f.mesReferencia, { id: "c-mes", ajuda: "Obrigatório nas linhas de contratação (4.1 e 4.2)." });

  const atualizar = () => {
    const l = M.LINHA[f.linha.value];
    campoMes.hidden = !(l && l.rubrica === 4);
    const s = lerValor(f.semIva.value), i = lerValor(f.iva.value) || 0;
    const taxa = M.taxaLinha(f.linha.value, estado.parametros);
    if (s === null || isNaN(s) || taxa === null) { previsao.textContent = "Escolha a linha e indique o valor para calcular a comparticipação."; return; }
    const eleg = s + (f.ivaElegivel.value === "Sim" ? i : 0);
    const comp = f.estado.value === "Não elegível" ? 0 : eleg * taxa;
    previsao.textContent = "Valor elegível " + eur(eleg) + " · Taxa " + pct(taxa) + " · Comparticipação " + eur(comp);
  };
  for (const c of Object.values(f)) c.addEventListener("input", atualizar);
  atualizar();

  abrirDialogo({
    titulo: d ? "Editar despesa nº " + d.numero : "Nova despesa",
    corpo: el("div", { class: "grelha-form" },
      d ? null : el("div", { class: "campo--largo" }, leitor.elemento),
      campo("Linha orçamental", f.linha, { largo: true }),
      campo("Fornecedor / colaborador", f.fornecedor), campo("NIF", f.nif),
      campo("Nº do documento", f.documento), campo("Data do documento", f.dataDocumento),
      campoMes, campo("Descrição da despesa", f.descricao, { largo: true }),
      campo("Valor sem IVA (€)", f.semIva), campo("IVA (€)", f.iva), campo("IVA elegível?", f.ivaElegivel),
      campo("Data de pagamento", f.dataPagamento), campo("Meio de pagamento", f.meioPagamento),
      campo("Pedido de pagamento", f.pedido), campo("Estado da despesa", f.estado),
      campo("Valor validado pelo organismo (€)", f.valorValidado),
      campo("Ref. comprovativo / arquivo", f.comprovativo), campo("Observações", f.observacoes, { largo: true }),
      el("div", { class: "campo--largo" }, previsao)),
    gravar: async () => {
      const linha = M.LINHA[f.linha.value];
      const dados = {
        linha: f.linha.value,
        fornecedor: texto(f.fornecedor.value, 150), nif: texto(f.nif.value, 9), documento: texto(f.documento.value, 60),
        dataDocumento: f.dataDocumento.value, mesReferencia: linha && linha.rubrica === 4 ? f.mesReferencia.value : "",
        descricao: texto(f.descricao.value, 300), semIva: lerValor(f.semIva.value), iva: lerValor(f.iva.value),
        ivaElegivel: f.ivaElegivel.value === "Sim", dataPagamento: f.dataPagamento.value, meioPagamento: f.meioPagamento.value,
        pedido: f.pedido.value, estado: f.estado.value, valorValidado: lerValor(f.valorValidado.value),
        comprovativo: texto(f.comprovativo.value, 200), observacoes: texto(f.observacoes.value, 500),
      };
      const erros = [];
      if (Number.isNaN(dados.semIva) || Number.isNaN(dados.iva) || Number.isNaN(dados.valorValidado)) erros.push("Há valores em formato inválido (use, por exemplo, 2 500,00).");
      else erros.push(...M.validarDespesa(dados));
      if (erros.length) return erros;

      const batch = writeBatch(db);
      const col = collection(raiz(), "despesas");
      const ref = d ? doc(col, d.id) : doc(col);
      const meta = { atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() };
      if (d) batch.update(ref, { ...dados, ...meta });
      else batch.set(ref, { ...dados, ...meta, ordem: Date.now(), criadoEm: serverTimestamp(), criadoPor: emailAtual() });
      auditar(batch, d ? "alterar" : "criar", "despesas", ref.id, dados.linha + " · " + dados.fornecedor + " · " + dados.documento + " · " + dados.semIva);
      await batch.commit();
      aviso(d ? "Despesa atualizada." : "Despesa registada.", "ok");
    },
  });
}

function eliminarDespesa(d) {
  abrirDialogo({
    titulo: "Eliminar despesa nº " + d.numero,
    corpo: el("p", { texto: "Vai eliminar a despesa " + (d.documento || "sem documento") + " de " + (d.fornecedor || "fornecedor não indicado") + " (" + eur(d.elegivel) + "). Esta ação fica registada na auditoria e não pode ser anulada." }),
    rotulo: "Eliminar", perigo: true,
    gravar: async () => {
      const batch = writeBatch(db);
      batch.delete(doc(collection(raiz(), "despesas"), d.id));
      auditar(batch, "eliminar", "despesas", d.id, d.linha + " · " + d.fornecedor + " · " + d.documento + " · " + d.semIva);
      await batch.commit();
      aviso("Despesa eliminada.", "ok");
    },
  });
}

function editarPedido(x) {
  const novo = !x;
  const v = x || { tipo: "Reembolso / Acerto", estado: "Em preparação" };
  const f = {
    codigo: entrada("pd-codigo", "text", v.codigo || "", { maxlength: 4, disabled: !novo, placeholder: "AC01" }),
    tipo: seletor("pd-tipo", M.TIPOS_PEDIDO, v.tipo),
    periodoInicio: entrada("pd-inicio", "date", v.periodoInicio), periodoFim: entrada("pd-fim", "date", v.periodoFim),
    dataSubmissao: entrada("pd-submissao", "date", v.dataSubmissao),
    valorSolicitado: entrada("pd-solicitado", "text", valorParaCampo(v.valorSolicitado), { inputmode: "decimal" }),
    dataTransferencia: entrada("pd-transferencia", "date", v.dataTransferencia),
    valorTransferido: entrada("pd-transferido", "text", valorParaCampo(v.valorTransferido), { inputmode: "decimal" }),
    estado: seletor("pd-estado", M.ESTADOS_PEDIDO, v.estado || "Em preparação"),
    observacoes: entrada("pd-obs", "text", v.observacoes, { maxlength: 300 }),
  };
  abrirDialogo({
    titulo: novo ? "Novo pedido de pagamento" : "Pedido " + x.codigo,
    corpo: el("div", { class: "grelha-form" },
      campo("Nº do pedido", f.codigo, { ajuda: novo ? "ADT, PSF, PP + 2 dígitos ou AC + 2 dígitos." : null }), campo("Tipo", f.tipo),
      campo("Período da despesa — início", f.periodoInicio), campo("Período da despesa — fim", f.periodoFim),
      campo("Data de submissão", f.dataSubmissao), campo("Valor solicitado (€)", f.valorSolicitado),
      campo("Data de transferência", f.dataTransferencia), campo("Valor transferido (€)", f.valorTransferido),
      campo("Estado", f.estado, { ajuda: "Submetido, Em análise, Aprovado e Pago bloqueiam as despesas associadas." }),
      campo("Ref. bancária / observações", f.observacoes, { largo: true })),
    gravar: async () => {
      const codigo = (novo ? f.codigo.value : x.codigo).trim().toUpperCase();
      const dados = {
        tipo: f.tipo.value, periodoInicio: f.periodoInicio.value, periodoFim: f.periodoFim.value, dataSubmissao: f.dataSubmissao.value,
        valorSolicitado: lerValor(f.valorSolicitado.value), dataTransferencia: f.dataTransferencia.value,
        valorTransferido: lerValor(f.valorTransferido.value), estado: f.estado.value, observacoes: texto(f.observacoes.value, 300),
        atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual(),
      };
      const erros = [];
      if (!/^(ADT|PSF|PP\d{2}|AC\d{2})$/.test(codigo)) erros.push("Nº do pedido inválido.");
      if (novo && estado.pedidos[codigo]) erros.push("Já existe um pedido com esse número.");
      if (Number.isNaN(dados.valorSolicitado) || Number.isNaN(dados.valorTransferido)) erros.push("Há valores em formato inválido.");
      if (dados.periodoInicio && dados.periodoFim && dados.periodoFim < dados.periodoInicio) erros.push("O fim do período é anterior ao início.");
      if (erros.length) return erros;
      const batch = writeBatch(db);
      batch.set(doc(collection(raiz(), "pedidos"), codigo), dados);
      auditar(batch, novo ? "criar" : "alterar", "pedidos", codigo, codigo + " · " + dados.estado + " · " + dados.valorTransferido);
      await batch.commit();
      aviso("Pedido " + codigo + " gravado.", "ok");
    },
  });
}

function editarTaxas() {
  const campos = Object.entries(M.RUBRICAS).map(([num, r]) => {
    const atual = M.taxaRubrica(Number(num), estado.parametros);
    const input = entrada("taxa-" + num, "text", String(Math.round(atual * 10000) / 100).replace(".", ","), { inputmode: "decimal", maxlength: 6 });
    return { num, r, input };
  });
  abrirDialogo({
    titulo: "Taxas de comparticipação",
    corpo: [
      el("p", { class: "nota", texto: "A alteração aplica-se a todas as despesas da rubrica, incluindo as já registadas, e fica registada na auditoria. Indique a percentagem (por exemplo 85 ou 85,5)." }),
      el("div", { class: "grelha-form" }, campos.map(({ num, r, input }) =>
        campo(num + ". " + r.curto + " (aprovada: " + pct(r.taxa) + ")", input))),
    ],
    gravar: async () => {
      const taxas = {};
      const erros = [];
      for (const { num, r, input } of campos) {
        const v = lerValor(input.value);
        if (v === null || Number.isNaN(v) || v < 0 || v > 100) { erros.push("Rubrica " + num + ": indique uma percentagem entre 0 e 100."); continue; }
        const t = Math.round(v * 100) / 10000;
        if (t !== r.taxa) taxas[num] = t;
      }
      if (erros.length) return erros;
      const parametros = { ...estado.parametros };
      delete parametros.taxas;
      if (Object.keys(taxas).length) parametros.taxas = taxas;
      const batch = writeBatch(db);
      batch.set(raiz(), { parametros, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      auditar(batch, "alterar", "taxas", CONFIG.projetoId, "Taxas: " + (Object.keys(taxas).length ? Object.entries(taxas).map(([k, v]) => "R" + k + "=" + Math.round(v * 10000) / 100 + "%").join(", ") : "repostas as aprovadas"));
      await batch.commit();
      aviso("Taxas de comparticipação atualizadas.", "ok");
    },
  });
}

async function criarFases() {
  try {
    const batch = writeBatch(db);
    for (const p of M.PEDIDOS_INICIAIS) {
      batch.set(doc(collection(raiz(), "pedidos"), p.codigo), {
        tipo: p.tipo, periodoInicio: "", periodoFim: "", dataSubmissao: "", valorSolicitado: null, dataTransferencia: "",
        valorTransferido: null, estado: "Em preparação", observacoes: "", atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual(),
      });
    }
    auditar(batch, "criar", "pedidos", "ADT-PSF", "Criação das fases ADT, PP01–PP12 e PSF");
    await batch.commit();
    aviso("Fases da candidatura criadas.", "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

async function gravarParametros(ev) {
  ev.preventDefault();
  const parametros = {
    entidade: texto($("p-entidade").value, 120), projeto: texto($("p-projeto").value, 120),
    inicio: $("p-inicio").value, duracao: Number($("p-duracao").value) || 24,
    entidadeConsultora: texto($("p-consultora").value, 120),
    consultor1: texto($("p-consultor1").value, 120), consultor2: texto($("p-consultor2").value, 120),
  };
  if (estado.parametros.taxas) parametros.taxas = estado.parametros.taxas;
  if (parametros.duracao < 1 || parametros.duracao > 60) return aviso("A duração tem de estar entre 1 e 60 meses.", "erro");
  try {
    const batch = writeBatch(db);
    batch.set(raiz(), { parametros, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
    auditar(batch, "alterar", "parametros", CONFIG.projetoId, JSON.stringify(parametros));
    await batch.commit();
    aviso("Parâmetros gravados.", "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

/* ---------- Leitura de QR code de faturas ---------- */

let pdfjsCarregado = null;
function carregarPdfjs() {
  if (!pdfjsCarregado) {
    pdfjsCarregado = import("/reservado/vendor/pdf.min.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/reservado/vendor/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsCarregado;
}

let jsqrCarregado = null;
function carregarJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!jsqrCarregado) {
    jsqrCarregado = new Promise((resolver, rejeitar) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
      s.onload = () => (window.jsQR ? resolver(window.jsQR) : rejeitar(new Error("leitor indisponível")));
      s.onerror = () => { jsqrCarregado = null; rejeitar(new Error("Não foi possível carregar o leitor de QR code.")); };
      document.head.append(s);
    });
  }
  return jsqrCarregado;
}

// Devolve os textos de todos os QR codes encontrados na imagem
async function lerQrDeCanvas(canvas) {
  if ("BarcodeDetector" in window) {
    try {
      const encontrados = await new window.BarcodeDetector({ formats: ["qr_code"] }).detect(canvas);
      if (encontrados.length) return encontrados.map((x) => x.rawValue);
    } catch (e) { /* segue para o leitor alternativo */ }
  }
  const jsQR = await carregarJsQR();
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return r ? [r.data] : [];
}

async function procurarFatura(canvas) {
  const textos = await lerQrDeCanvas(canvas);
  for (const t of textos) { const f = M.lerQrFatura(t); if (f) return f; }
  return textos.length ? { naoFatura: true } : null;
}

async function lerFaturaDeFicheiro(ficheiro) {
  if (ficheiro.size > 20 * 1024 * 1024) throw new Error("O ficheiro excede 20 MB.");
  let semFatura = false;
  if (ficheiro.type === "application/pdf" || /\.pdf$/i.test(ficheiro.name)) {
    const pdfjs = await carregarPdfjs();
    const documento = await pdfjs.getDocument({ data: new Uint8Array(await ficheiro.arrayBuffer()), isEvalSupported: false }).promise;
    for (let n = 1; n <= Math.min(documento.numPages, 4); n++) {
      const pagina = await documento.getPage(n);
      for (const escala of [2, 3.5]) {
        const vista = pagina.getViewport({ scale: escala });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vista.width);
        canvas.height = Math.floor(vista.height);
        await pagina.render({ canvasContext: canvas.getContext("2d"), viewport: vista }).promise;
        const r = await procurarFatura(canvas);
        if (r && !r.naoFatura) return r;
        if (r && r.naoFatura) semFatura = true;
      }
    }
  } else if (/^image\//.test(ficheiro.type)) {
    const imagem = await createImageBitmap(ficheiro);
    const maior = Math.max(imagem.width, imagem.height);
    // Tenta no tamanho original (até 3000 px), ampliado (QR pequeno) e com contraste reforçado (fotografias)
    for (const [alvo, contraste] of [[Math.min(maior, 3000), false], [Math.min(maior * 2, 3600), false], [Math.min(maior * 2, 3600), true]]) {
      const escala = alvo / maior;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (contraste) ctx.filter = "grayscale(1) contrast(1.8)";
      ctx.imageSmoothingEnabled = !contraste;
      ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      const r = await procurarFatura(canvas);
      if (r && !r.naoFatura) return r;
      if (r && r.naoFatura) semFatura = true;
    }
  } else {
    throw new Error("Formato não suportado. Use PDF, JPG ou PNG.");
  }
  throw new Error(semFatura
    ? "Foi encontrado um QR code, mas não é o QR code fiscal da fatura (pode ser de pagamento ou de outro tipo)."
    : "Não foi encontrado o QR code da fatura. Experimente uma imagem mais nítida ou a leitura com a câmara.");
}

/* Bloco do formulário de despesa: importar fatura (PDF/imagem) ou ler com a câmara.
 * aoLer(fatura) preenche os campos e devolve avisos adicionais. */
function leitorQr(aoLer) {
  const estadoLeitor = el("div", { class: "leitor__estado", "aria-live": "polite" });
  const video = el("video", { class: "leitor__video", playsinline: true, muted: true, hidden: true });
  const ficheiro = el("input", { type: "file", accept: "application/pdf,image/*", class: "sr", id: "qr-ficheiro" });
  let stream = null, ativo = false;

  const mostrarResultado = (fatura) => {
    const avisos = [...fatura.avisos, ...aoLer(fatura)];
    const partes = [el("p", { class: "leitor__ok", texto: "Dados preenchidos a partir do QR code: NIF " + fatura.nif + ", " + (fatura.documento || "documento") + ", " + dataPt(fatura.dataDocumento) + ", total " + eur(fatura.total) + ". Confirme os valores antes de gravar." })];
    if (avisos.length) partes.push(el("ul", { class: "alertas" }, avisos.map((t) => el("li", { texto: t }))));
    estadoLeitor.replaceChildren(...partes);
  };
  const mostrarErro = (msg) => estadoLeitor.replaceChildren(el("p", { class: "leitor__erro", texto: msg }));

  const pararCamera = () => {
    ativo = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.hidden = true;
    botaoCamera.textContent = "Ler com a câmara";
  };

  ficheiro.addEventListener("change", async () => {
    const f = ficheiro.files[0];
    ficheiro.value = "";
    if (!f) return;
    pararCamera();
    estadoLeitor.replaceChildren(el("p", { texto: "A procurar o QR code em " + f.name + "…" }));
    try { mostrarResultado(await lerFaturaDeFicheiro(f)); } catch (e) { mostrarErro(e.message || "Não foi possível ler o ficheiro."); }
  });

  const botaoCamera = el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Ler com a câmara" });
  botaoCamera.addEventListener("click", async () => {
    if (ativo) return pararCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return mostrarErro("Este navegador não permite usar a câmara.");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch (e) {
      return mostrarErro("Não foi possível aceder à câmara. Autorize o acesso nas definições do navegador.");
    }
    ativo = true;
    video.srcObject = stream;
    video.hidden = false;
    await video.play();
    botaoCamera.textContent = "Parar câmara";
    estadoLeitor.replaceChildren(el("p", { texto: "Aponte a câmara para o QR code da fatura." }));
    const canvas = document.createElement("canvas");
    const ciclo = async () => {
      if (!ativo) return;
      if (video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0);
        try {
          const r = await procurarFatura(canvas);
          if (r && !r.naoFatura) { pararCamera(); return mostrarResultado(r); }
        } catch (e) { pararCamera(); return mostrarErro(e.message); }
      }
      setTimeout(ciclo, 300);
    };
    ciclo();
  });

  // A câmara desliga-se sempre que o diálogo fecha
  $("dialogo").addEventListener("close", pararCamera, { once: true });

  return {
    elemento: el("div", { class: "leitor" },
      el("p", { class: "leitor__titulo", texto: "Preencher a partir do QR code da fatura" }),
      el("div", { class: "leitor__botoes" },
        el("label", { class: "botao botao--pequeno", for: "qr-ficheiro", texto: "Importar fatura (PDF ou imagem)" }), ficheiro, botaoCamera),
      video, estadoLeitor),
  };
}

/* ---------- Excel ---------- */

// Datas do Excel em número de série → AAAA-MM-DD (sem desvios de fuso horário)
function dataExcel(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : "";
}
const numExcel = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v === null || v === "" || v === undefined ? null : lerValor(v));

function lerFolha(wb, nome) {
  const ws = wb.Sheets[nome];
  if (!ws) throw new Error("Folha em falta: " + nome);
  return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

async function importarExcel(ev) {
  const ficheiro = ev.target.files[0];
  ev.target.value = "";
  if (!ficheiro) return;
  if (!window.XLSX) return aviso("Não foi possível carregar o leitor de Excel.", "erro");
  if (ficheiro.size > 10 * 1024 * 1024) return aviso("O ficheiro excede 10 MB.", "erro");

  let parametros, despesas, pedidos;
  try {
    const wb = window.XLSX.read(await ficheiro.arrayBuffer(), { type: "array", cellDates: false });

    const pr = lerFolha(wb, "Parâmetros");
    const val = (rotulo) => { const l = pr.find((r) => r[1] === rotulo); return l ? l[2] : null; };
    const nome = (v) => (v && v !== "Nome a preencher" ? texto(v, 120) : "");
    parametros = {
      entidade: texto(val("Entidade beneficiária") || "DCAB Consulting", 120), projeto: texto(val("Projeto") || "AI4CyberSecurity", 120),
      inicio: dataExcel(val("Data de início de elegibilidade")), duracao: Number(val("Duração (meses)")) || 24,
      entidadeConsultora: texto(val("Entidade consultora") || "", 120),
      consultor1: nome(val("Consultor Sénior 1 (linha 4.1)")), consultor2: nome(val("Consultor Sénior 2 (linha 4.2)")),
    };

    const rd = lerFolha(wb, "Registo Despesas");
    const h = rd.findIndex((r) => r[0] === "Nº" && String(r[1] || "").startsWith("Linha orçamental"));
    if (h < 0) throw new Error("Cabeçalho do Registo de Despesas não encontrado.");
    const col = (t) => rd[h].indexOf(t);
    const c = {
      linha: col("Linha orçamental (escolher)"), forn: col("Fornecedor / Colaborador"), nif: col("NIF"), doc: col("Nº Documento"),
      data: col("Data Documento"), mes: col("Mês de referência (contratação)"), desc: col("Descrição da despesa"),
      semIva: col("Valor s/ IVA"), iva: col("IVA"), ivaEleg: col("IVA elegível?"), pag: col("Data Pagamento"),
      meio: col("Meio de Pagamento"), pedido: col("Pedido de Pagamento"), estado: col("Estado da despesa"),
      validado: col("Valor validado pelo organismo"), comp: col("Ref. Comprovativo / Arquivo"), obs: col("Observações"),
    };
    despesas = rd.slice(h + 1).filter((r) => r[c.linha]).map((r) => {
      const linha = String(r[c.linha]).trim().split(/\s/)[0];
      const l = M.LINHA[linha];
      return {
        linha, fornecedor: texto(r[c.forn], 150), nif: texto(r[c.nif], 9), documento: texto(r[c.doc], 60),
        dataDocumento: dataExcel(r[c.data]), mesReferencia: l && l.rubrica === 4 ? dataExcel(r[c.mes]).slice(0, 7) : "",
        descricao: texto(r[c.desc], 300), semIva: numExcel(r[c.semIva]), iva: numExcel(r[c.iva]),
        ivaElegivel: r[c.ivaEleg] === "Sim", dataPagamento: dataExcel(r[c.pag]),
        meioPagamento: M.MEIOS_PAGAMENTO.includes(r[c.meio]) ? r[c.meio] : "",
        pedido: /^(ADT|PSF|PP\d{2}|AC\d{2})$/.test(String(r[c.pedido] || "")) ? String(r[c.pedido]) : "",
        estado: M.ESTADOS_DESPESA.includes(r[c.estado]) ? r[c.estado] : "Lançada",
        valorValidado: numExcel(r[c.validado]), comprovativo: texto(r[c.comp], 200), observacoes: texto(r[c.obs], 500),
      };
    });

    const tr = lerFolha(wb, "Controlo Transferências");
    const ht = tr.findIndex((r) => r[0] === "Nº Pedido");
    pedidos = tr.slice(ht + 1).filter((r) => /^(ADT|PSF|PP\d{2}|AC\d{2})$/.test(String(r[0] || ""))).map((r) => ({
      codigo: String(r[0]), tipo: M.TIPOS_PEDIDO.includes(r[1]) ? r[1] : "Pedido de pagamento intercalar",
      periodoInicio: dataExcel(r[2]), periodoFim: dataExcel(r[3]), dataSubmissao: dataExcel(r[4]), valorSolicitado: numExcel(r[5]),
      dataTransferencia: dataExcel(r[6]), valorTransferido: numExcel(r[7]),
      estado: M.ESTADOS_PEDIDO.includes(r[12]) ? r[12] : "Em preparação", observacoes: texto(r[13], 300),
    }));
  } catch (e) {
    console.error(e);
    return aviso("Não foi possível ler o ficheiro: " + (e.message || "formato inesperado") + ".", "erro");
  }

  const chave = (d) => [d.linha, d.nif, (d.documento || "").toUpperCase(), d.dataDocumento, d.semIva].join("|");
  const existentes = new Set(estado.despesas.map(chave));
  const novas = despesas.filter((d) => !existentes.has(chave(d)));
  const invalidas = novas.filter((d) => M.validarDespesa(d).length || Number.isNaN(d.semIva));
  const validas = novas.filter((d) => !invalidas.includes(d));

  abrirDialogo({
    titulo: "Importar do Excel",
    corpo: el("ul", { class: "lista-importacao" },
      el("li", { texto: "Parâmetros do projeto: serão atualizados." }),
      el("li", { texto: plural(validas.length, "despesa nova a importar.", "despesas novas a importar.") }),
      el("li", { texto: plural(despesas.length - novas.length, "despesa já existente (ignorada).", "despesas já existentes (ignoradas).") }),
      invalidas.length ? el("li", { texto: plural(invalidas.length, "despesa com dados incompletos (ignorada", "despesas com dados incompletos (ignoradas") + "; corrija no Excel e volte a importar)." }) : null,
      el("li", { texto: plural(pedidos.length, "pedido de pagamento a criar ou atualizar.", "pedidos de pagamento a criar ou atualizar.") })),
    rotulo: "Importar",
    gravar: async () => {
      // Despesas primeiro (antes de eventuais pedidos fechados), em lotes
      const base = Date.now();
      for (let i = 0; i < validas.length; i += 200) {
        const batch = writeBatch(db);
        validas.slice(i, i + 200).forEach((d, j) => batch.set(doc(collection(raiz(), "despesas")), {
          ...d, ordem: base + i + j, criadoEm: serverTimestamp(), criadoPor: emailAtual(), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual(),
        }));
        auditar(batch, "importar", "despesas", "lote-" + (i / 200 + 1), "Importação de " + Math.min(200, validas.length - i) + " despesas");
        await batch.commit();
      }
      const batch = writeBatch(db);
      if (estado.parametros.taxas) parametros.taxas = estado.parametros.taxas;
      batch.set(raiz(), { parametros, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      for (const p of pedidos) {
        const { codigo, ...resto } = p;
        batch.set(doc(collection(raiz(), "pedidos"), codigo), { ...resto, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      }
      auditar(batch, "importar", "pedidos", "excel", "Importação de parâmetros e " + pedidos.length + " pedidos");
      await batch.commit();
      aviso("Importação concluída: " + validas.length + " despesas e " + pedidos.length + " pedidos.", "ok");
    },
  });
}

function exportarExcel() {
  if (!window.XLSX) return aviso("Não foi possível carregar o gerador de Excel.", "erro");
  const { c, q, r, p, ct, res } = calcular();
  const X = window.XLSX;
  const wb = X.utils.book_new();
  const folha = (nome, linhas) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(linhas), nome);
  folha("Resumo", [
    ["Resumo de execução", estado.parametros.projeto || "AI4CyberSecurity", "Exportado em " + dataPt(hojeISO())], [],
    ["Nº", "Rubrica", "Investimento aprovado", "Taxa", "Comparticipação aprovada", "Despesa executada", "% execução", "Comparticipação executada", "Comparticipação validada", "Saldo por executar"],
    ...r.map((x) => [x.numero, x.nome, x.aprovado, x.taxa, x.compAprovada, x.executada, x.percentagem, x.compExecutada, x.compValidada, x.saldo]), [],
    ["Indicadores"], ["Comparticipação aprovada", res.compAprovada], ["Comparticipação executada", res.compExecutada],
    ["Comparticipação validada", res.compValidada], ["Total recebido", res.recebido], ["Saldo por receber", res.saldoReceber],
    ["Verbas por justificar", res.porJustificar], ["Execução financeira global", res.execucaoGlobal],
    ["Despesas com alertas", res.comAlertas], ["Meses de contratação em falta", res.mesesEmFalta],
  ]);
  folha("Quadro Investimento", [
    ["Código", "Rubrica", "Descrição", "Valor aprovado", "Taxa", "Comparticipação aprovada", "Despesa executada", "Comparticipação executada", "Despesa validada", "Comparticipação validada", "Saldo", "% execução"],
    ...q.map((l) => [l.codigo, l.rubrica, l.descricao, l.valor, l.taxa, l.compAprovada, l.executada, l.compExecutada, l.validada, l.compValidada, l.saldo, l.percentagem]),
  ]);
  folha("Registo Despesas", [
    ["Nº", "Código", "Rubrica", "Fornecedor / Colaborador", "NIF", "Nº Documento", "Data Documento", "Mês de referência", "Descrição", "Valor s/ IVA", "IVA", "IVA elegível?", "Valor Total", "Valor Elegível", "Taxa", "Comparticipação", "Data Pagamento", "Meio de Pagamento", "Pedido de Pagamento", "Estado", "Valor validado", "Comparticipação validada", "Comprovativo", "Observações", "Verificação"],
    ...c.map((d) => [d.numero, d.linha, d.rubrica, d.fornecedor, d.nif, d.documento, d.dataDocumento, d.mesReferencia, d.descricao, d.semIva, d.iva, d.ivaElegivel ? "Sim" : "Não", d.valorTotal, d.elegivel, d.taxa, d.comparticipacao, d.dataPagamento, d.meioPagamento, d.pedido, d.estado, d.valorValidado, d.compValidada, d.comprovativo, d.observacoes, d.alertas.length ? d.alertas.join("; ") : "OK"]),
  ]);
  folha("Controlo Transferências", [
    ["Nº Pedido", "Tipo", "Período início", "Período fim", "Data submissão", "Valor solicitado", "Data transferência", "Valor transferido", "Despesa elegível imputada", "Comparticipação apresentada", "Comparticipação validada", "Diferença", "Estado", "Observações"],
    ...p.map((x) => [x.codigo, x.tipo, x.periodoInicio, x.periodoFim, x.dataSubmissao, x.valorSolicitado, x.dataTransferencia, x.valorTransferido, x.imputada, x.apresentada, x.validada, x.diferenca, x.estado, x.observacoes]),
  ]);
  folha("Controlo Contratação", [
    ["Mês nº", "Mês", "Consultor 1 — valor", "Consultor 1 — estado", "Consultor 2 — valor", "Consultor 2 — estado"],
    ...ct.c1.map((m, i) => [m.numero, m.mes, m.valor, m.estado, ct.c2[i].valor, ct.c2[i].estado]),
  ]);
  X.writeFile(wb, "Controlo_" + (estado.parametros.projeto || "AI4CyberSecurity") + "_" + hojeISO() + ".xlsx");
}

/* ---------- Arranque ---------- */

$("entrar-google").addEventListener("click", () => entrar(google));
$("form-entrar").addEventListener("submit", entrarComEmail);
$("definir-senha").addEventListener("click", pedirDefinicaoSenha);
$("form-mfa-codigo").addEventListener("submit", validarCodigo);
$("form-mfa-registo").addEventListener("submit", concluirRegistoMfa);
$("botao-sair").addEventListener("click", () => signOut(auth));
$("verificar-reenviar").addEventListener("click", async () => {
  try { await sendEmailVerification(auth.currentUser); aviso("Email de confirmação reenviado.", "ok"); } catch (e) { aviso(mensagemErro(e), "erro"); }
});
$("verificar-continuar").addEventListener("click", async () => {
  await reload(auth.currentUser);
  if (!auth.currentUser.emailVerified) return aviso("O email ainda não está confirmado. Abra a ligação que enviámos.", "erro");
  await auth.currentUser.getIdToken(true);
  processarSessao(auth.currentUser);
});
$("dialogo-form").addEventListener("submit", submeterDialogo);
$("dialogo-cancelar").addEventListener("click", () => $("dialogo").close());
for (const b of document.querySelectorAll("[data-separador]")) b.addEventListener("click", () => mudarSeparador(b.dataset.separador));
for (const ev of ["click", "keydown", "pointerdown", "scroll"]) document.addEventListener(ev, reiniciarInatividade, { passive: true });

// Barra de execução: largura definida por CSSOM (compatível com a política CSP sem estilos inline)
new MutationObserver(() => {
  for (const b of document.querySelectorAll(".barra__preenchimento[data-pct]")) b.style.width = b.dataset.pct + "%";
}).observe(document.body, { childList: true, subtree: true });

try {
  await setPersistence(auth, browserSessionPersistence);
  onAuthStateChanged(auth, processarSessao, (e) => window.__falhaArranque("Erro na autenticação", mensagemErro(e), e.code));
} catch (e) {
  window.__falhaArranque("Não foi possível iniciar a autenticação", mensagemErro(e), (e.code || "") + " " + (e.message || ""));
}
````

## `public/reservado/modelo.js`

Área reservada: cálculos e leitura de QR. **Substituir.**

````javascript
/* Área reservada DCAB — modelo de dados e cálculos
 * Replica as fórmulas do ficheiro "Controlo_Execucao_Candidatura_IA_Dcab_Consulting.xlsx".
 * Módulo sem dependências: pode ser testado fora do navegador.
 */

// Quadro de Investimento Aprovado (Dossier de Projeto IA, SelectAdvisor, Lda., pág. 4)
export const RUBRICAS = {
  1: { nome: "Aquisição de equipamentos e componentes para incorporação das soluções de IA", curto: "Equipamentos", taxa: 0.75 },
  2: { nome: "Aquisição de software, incluindo subscrições SaaS", curto: "Software e SaaS", taxa: 0.75 },
  3: { nome: "Aquisição de software, incluindo subscrições SaaS (infraestrutura e plataforma)", curto: "Software e SaaS — infraestrutura", taxa: 0.75 },
  4: { nome: "Contratação de até 2 técnicos ou gestores de plataformas (24 meses)", curto: "Contratação", taxa: 1 },
  5: { nome: "Intervenção de contabilista certificado ou ROC na validação dos pedidos de pagamento", curto: "Contabilista / ROC", taxa: 1 },
};

export const QUADRO = [
  { codigo: "1.1", rubrica: 1, descricao: "Servidores NVIDIA (2 unidades)", valor: 10200 },
  { codigo: "1.2", rubrica: 1, descricao: "Workstations IA HP ZBook 8 (5 unidades)", valor: 13500 },
  { codigo: "2.1", rubrica: 2, descricao: "Office 365 Copilot", valor: 12500 },
  { codigo: "2.2", rubrica: 2, descricao: "Gemini Pro – subscrição 24 meses", valor: 13950 },
  { codigo: "2.3", rubrica: 2, descricao: "Integração LLM – subscrição 24 meses", valor: 45500 },
  { codigo: "2.4", rubrica: 2, descricao: "OpenAI – subscrição 24 meses", valor: 2000 },
  { codigo: "2.5", rubrica: 2, descricao: "Claude Users", valor: 500 },
  { codigo: "2.6", rubrica: 2, descricao: "Budgyt – subscrição 24 meses", valor: 6000 },
  { codigo: "2.7", rubrica: 2, descricao: "CRM Inteligente – subscrição 24 meses", valor: 12000 },
  { codigo: "2.8", rubrica: 2, descricao: "Tableau – subscrição 24 meses", valor: 20000 },
  { codigo: "3.1", rubrica: 3, descricao: "Frontend PROD – 24 meses", valor: 1800 },
  { codigo: "3.2", rubrica: 3, descricao: "Backend PROD – 24 meses", valor: 4200 },
  { codigo: "3.3", rubrica: 3, descricao: "Desenvolvimento – 24 meses", valor: 1440 },
  { codigo: "3.4", rubrica: 3, descricao: "DR (Disaster Recovery) – 24 meses", valor: 4080 },
  { codigo: "3.5", rubrica: 3, descricao: "Storage Frontend/Backend/Desenvolvimento & DR – 24 meses", valor: 960 },
  { codigo: "3.6", rubrica: 3, descricao: "Plataforma de Computação IA", valor: 60000 },
  { codigo: "3.7", rubrica: 3, descricao: "Integração LLM Público", valor: 18000 },
  { codigo: "3.8", rubrica: 3, descricao: "AWS Web Application Firewall", valor: 36000 },
  { codigo: "4.1", rubrica: 4, descricao: "Consultor Sénior 1 – Analista de Risco e Maturidade (24 meses)", valor: 65662.5 },
  { codigo: "4.2", rubrica: 4, descricao: "Consultor Sénior 2 – Analista de Risco e Maturidade (24 meses)", valor: 65662.5 },
  { codigo: "5.1", rubrica: 5, descricao: "Contabilista Certificado ou Revisor Oficial de Contas", valor: 2500 },
];

export const TOTAL_APROVADO = 396455;
export const NIF_BENEFICIARIO = "518180964"; // DCAB Consulting, Lda.
export const LINHA = Object.fromEntries(QUADRO.map((l) => [l.codigo, l]));

export const ESTADOS_DESPESA = ["Lançada", "Paga", "Submetida em PP", "Validada", "Não elegível"];
export const MEIOS_PAGAMENTO = ["Transferência bancária", "Débito direto", "Cartão", "Cheque", "Processamento salarial", "Outro"];
export const TIPOS_PEDIDO = ["Adiantamento", "Pedido de pagamento intercalar", "Pedido de pagamento de saldo final", "Reembolso / Acerto"];
export const ESTADOS_PEDIDO = ["Em preparação", "Submetido", "Em análise", "Aprovado", "Pago", "Com correções"];
export const ESTADOS_FECHADOS = ["Submetido", "Em análise", "Aprovado", "Pago"];

export const PEDIDOS_INICIAIS = [
  { codigo: "ADT", tipo: "Adiantamento" },
  ...Array.from({ length: 12 }, (_, i) => ({ codigo: "PP" + String(i + 1).padStart(2, "0"), tipo: "Pedido de pagamento intercalar" })),
  { codigo: "PSF", tipo: "Pedido de pagamento de saldo final" },
];

const n = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const arred = (v) => Math.round(v * 100) / 100;
// Taxa de comparticipação por rubrica: a aprovada, ou a alterada pelo administrador (parametros.taxas)
export function taxaRubrica(rubrica, parametros) {
  const t = parametros && parametros.taxas ? parametros.taxas[rubrica] : undefined;
  return typeof t === "number" && t >= 0 && t <= 1 ? t : RUBRICAS[rubrica].taxa;
}
export const taxaLinha = (codigo, parametros) => (LINHA[codigo] ? taxaRubrica(LINHA[codigo].rubrica, parametros) : null);

// Ordena pedidos: ADT, PP01..PPnn, PSF, restantes
export function ordemPedido(c) {
  if (c === "ADT") return 0;
  if (/^PP\d+$/.test(c)) return Number(c.slice(2));
  if (c === "PSF") return 900;
  return 1000;
}

// Datas no formato AAAA-MM-DD; EDATE(início, meses) - 1 dia
export function fimElegibilidade(inicio, duracao) {
  if (!inicio || !duracao) return "";
  const [a, m, d] = inicio.split("-").map(Number);
  const fim = new Date(Date.UTC(a, m - 1 + Number(duracao), d));
  fim.setUTCDate(fim.getUTCDate() - 1);
  return fim.toISOString().slice(0, 10);
}

export function mesesProjeto(inicio, duracao) {
  if (!inicio || !duracao) return [];
  const [a, m] = inicio.split("-").map(Number);
  return Array.from({ length: Number(duracao) }, (_, i) => {
    const dt = new Date(Date.UTC(a, m - 1 + i, 1));
    return dt.toISOString().slice(0, 7); // AAAA-MM
  });
}

/* Calcula os campos automáticos e as verificações de todas as despesas.
 * despesas: lista ordenada pelo campo "ordem" (equivalente à ordem das linhas no Excel). */
export function calcularDespesas(despesas, parametros, pedidos) {
  const fim = fimElegibilidade(parametros.inicio, parametros.duracao);
  const contagemDoc = {};
  for (const d of despesas) {
    if (d.nif && d.documento) {
      const k = d.nif.trim() + "|" + d.documento.trim().toUpperCase();
      contagemDoc[k] = (contagemDoc[k] || 0) + 1;
    }
  }
  const acumulado = {};
  const ordenadas = [...despesas].sort((a, b) => n(a.ordem) - n(b.ordem));

  return ordenadas.map((d, i) => {
    const linha = LINHA[d.linha];
    const taxa = taxaLinha(d.linha, parametros);
    const semIva = typeof d.semIva === "number" ? d.semIva : null;
    const iva = n(d.iva);
    const valorTotal = semIva === null && !d.iva ? null : arred(n(semIva) + iva);
    const elegivel = semIva === null ? null : arred(semIva + (d.ivaElegivel ? iva : 0));
    const naoElegivel = d.estado === "Não elegível";
    const comparticipacao = elegivel === null || taxa === null ? null : naoElegivel ? 0 : arred(elegivel * taxa);
    const compValidada = typeof d.valorValidado === "number" && taxa !== null ? arred(d.valorValidado * taxa) : null;

    const alertas = [];
    if (!linha) alertas.push("Linha inválida");
    if (d.nif && d.documento && contagemDoc[d.nif.trim() + "|" + d.documento.trim().toUpperCase()] > 1) alertas.push("Fatura duplicada");
    if (d.dataDocumento && parametros.inicio && (d.dataDocumento < parametros.inicio || d.dataDocumento > fim)) alertas.push("Fora do período");
    if (linha && elegivel !== null && !naoElegivel) {
      acumulado[d.linha] = arred(n(acumulado[d.linha]) + elegivel);
      if (acumulado[d.linha] > linha.valor) alertas.push("Excede saldo da linha");
    }
    if (linha && linha.rubrica === 4 && !d.mesReferencia) alertas.push("Falta mês de referência");
    if (semIva === null) alertas.push("Falta valor");
    if (!d.dataPagamento) alertas.push("Sem data de pagamento");
    if (!d.pedido) alertas.push("Sem pedido de pagamento");

    const pedido = d.pedido ? pedidos[d.pedido] : null;
    const fechado = !!(pedido && ESTADOS_FECHADOS.includes(pedido.estado));

    return { ...d, numero: i + 1, rubrica: linha ? linha.rubrica : null, taxa, valorTotal, elegivel, comparticipacao, compValidada, alertas, fechado };
  });
}

// Quadro de Investimento: execução por linha (comparticipação limitada ao valor aprovado)
export function calcularQuadro(calculadas, parametros) {
  return QUADRO.map((l) => {
    const taxa = taxaRubrica(l.rubrica, parametros);
    const daLinha = calculadas.filter((d) => d.linha === l.codigo);
    const executada = arred(daLinha.filter((d) => d.estado !== "Não elegível").reduce((s, d) => s + n(d.elegivel), 0));
    const validada = arred(daLinha.reduce((s, d) => s + n(d.valorValidado), 0));
    return {
      ...l,
      taxa,
      taxaAprovada: RUBRICAS[l.rubrica].taxa,
      taxaAlterada: taxa !== RUBRICAS[l.rubrica].taxa,
      compAprovada: arred(l.valor * taxa),
      contribuicaoPropria: arred(l.valor - l.valor * taxa),
      executada,
      compExecutada: arred(Math.min(executada, l.valor) * taxa),
      validada,
      compValidada: arred(Math.min(validada, l.valor) * taxa),
      saldo: arred(l.valor - executada),
      percentagem: l.valor ? executada / l.valor : 0,
    };
  });
}

export function calcularRubricas(quadro) {
  return Object.entries(RUBRICAS).map(([num, r]) => {
    const ls = quadro.filter((l) => l.rubrica === Number(num));
    const soma = (k) => arred(ls.reduce((s, l) => s + l[k], 0));
    const aprovado = soma("valor");
    return {
      numero: Number(num), nome: r.nome, curto: r.curto, taxa: ls.length ? ls[0].taxa : r.taxa,
      taxaAlterada: ls.length ? ls[0].taxaAlterada : false, aprovado,
      compAprovada: soma("compAprovada"), executada: soma("executada"),
      percentagem: aprovado ? soma("executada") / aprovado : 0,
      compExecutada: soma("compExecutada"), compValidada: soma("compValidada"), saldo: soma("saldo"),
    };
  });
}

// Controlo de transferências por pedido
export function calcularPedidos(pedidos, calculadas) {
  return Object.values(pedidos)
    .sort((a, b) => ordemPedido(a.codigo) - ordemPedido(b.codigo) || a.codigo.localeCompare(b.codigo))
    .map((p) => {
      const ds = calculadas.filter((d) => d.pedido === p.codigo);
      const imputada = arred(ds.filter((d) => d.estado !== "Não elegível").reduce((s, d) => s + n(d.elegivel), 0));
      const apresentada = arred(ds.reduce((s, d) => s + n(d.comparticipacao), 0));
      const validada = arred(ds.reduce((s, d) => s + n(d.compValidada), 0));
      const temTransf = typeof p.valorTransferido === "number";
      const diferenca = !temTransf && apresentada === 0 ? null : arred(n(p.valorTransferido) - (validada > 0 ? validada : apresentada));
      return { ...p, imputada, apresentada, validada, diferenca, fechado: ESTADOS_FECHADOS.includes(p.estado), despesas: ds.length };
    });
}

export function calcularContratacao(parametros, calculadas, hoje) {
  const meses = mesesProjeto(parametros.inicio, parametros.duracao);
  const referencia = parametros.duracao ? arred(LINHA["4.1"].valor / Number(parametros.duracao)) : null;
  const mesAtual = hoje.slice(0, 7);
  const porConsultor = (codigo) => meses.map((mes, i) => {
    const valor = arred(calculadas
      .filter((d) => d.linha === codigo && d.mesReferencia === mes && d.estado !== "Não elegível")
      .reduce((s, d) => s + n(d.elegivel), 0));
    const estado = valor > 0 ? "Lançado" : mes <= mesAtual ? "Em falta" : "Por lançar";
    return { numero: i + 1, mes, valor, estado, desvio: valor > 0 && referencia !== null ? arred(valor - referencia) : null };
  });
  const c1 = porConsultor("4.1");
  const c2 = porConsultor("4.2");
  return {
    referencia, c1, c2,
    emFalta: c1.filter((m) => m.estado === "Em falta").length + c2.filter((m) => m.estado === "Em falta").length,
  };
}

export function calcularResumo(quadro, pedidosCalc, calculadas, contratacao) {
  const compAprovada = arred(quadro.reduce((s, l) => s + l.compAprovada, 0));
  const compExecutada = arred(quadro.reduce((s, l) => s + l.compExecutada, 0));
  const compValidada = arred(quadro.reduce((s, l) => s + l.compValidada, 0));
  const executada = arred(quadro.reduce((s, l) => s + l.executada, 0));
  const recebido = arred(pedidosCalc.reduce((s, p) => s + n(p.valorTransferido), 0));
  const apresentada = arred(pedidosCalc.reduce((s, p) => s + p.apresentada, 0));
  return {
    totalAprovado: TOTAL_APROVADO,
    compAprovada, compExecutada, compValidada, executada, recebido, apresentada,
    saldoReceber: arred(compAprovada - recebido),
    porJustificar: arred(Math.max(0, recebido - apresentada)),
    semPedido: arred(calculadas.filter((d) => !d.pedido).reduce((s, d) => s + n(d.comparticipacao), 0)),
    execucaoGlobal: TOTAL_APROVADO ? executada / TOTAL_APROVADO : 0,
    comAlertas: calculadas.filter((d) => d.alertas.length).length,
    mesesEmFalta: contratacao.emFalta,
  };
}

// Validação de uma despesa antes de gravar (espelha as regras do Firestore)
export function validarDespesa(d) {
  const erros = [];
  if (!LINHA[d.linha]) erros.push("Escolha a linha orçamental.");
  if (typeof d.semIva !== "number" || d.semIva < 0) erros.push("Indique o valor sem IVA.");
  if (d.iva !== null && (typeof d.iva !== "number" || d.iva < 0)) erros.push("O IVA tem de ser um valor positivo.");
  if (d.nif && !/^\d{9}$/.test(d.nif)) erros.push("O NIF tem de ter 9 dígitos.");
  if (!ESTADOS_DESPESA.includes(d.estado)) erros.push("Escolha o estado da despesa.");
  if (LINHA[d.linha] && LINHA[d.linha].rubrica === 4 && !d.mesReferencia) erros.push("Nas linhas de contratação, o mês de referência é obrigatório.");
  return erros;
}

/* Leitura do QR code das faturas portuguesas (Portaria n.º 195/2020, especificações técnicas da AT).
 * Formato: campos "CHAVE:valor" separados por "*". Devolve null se o texto não for um QR de fatura. */
export function lerQrFatura(texto) {
  if (typeof texto !== "string" || texto.length > 2000) return null;
  const c = {};
  for (const parte of texto.trim().split("*")) {
    const i = parte.indexOf(":");
    if (i > 0) c[parte.slice(0, i).trim().toUpperCase()] = parte.slice(i + 1).trim();
  }
  if (!/^\d{9}$/.test(c.A || "") || !/^\d{8}$/.test(c.F || "") || c.O === undefined) return null;
  const num = (k) => { const v = Number(c[k]); return c[k] !== undefined && c[k] !== "" && isFinite(v) ? v : 0; };
  const soma = (ks) => arred(ks.reduce((s, k) => s + num(k), 0));
  const bases = soma(["I2", "I3", "I5", "I7", "J2", "J3", "J5", "J7", "K2", "K3", "K5", "K7", "L"]);
  const iva = soma(["I4", "I6", "I8", "J4", "J6", "J8", "K4", "K6", "K8"]);
  const total = num("O"), selo = num("M"), impostos = num("N");
  const semIva = bases > 0 ? bases : arred(total - impostos);
  const dataDocumento = c.F.slice(0, 4) + "-" + c.F.slice(4, 6) + "-" + c.F.slice(6, 8);

  const avisos = [];
  if (c.B && c.B !== NIF_BENEFICIARIO) avisos.push("A fatura foi emitida ao NIF " + c.B + " e não ao NIF da DCAB (" + NIF_BENEFICIARIO + "). Pode não ser elegível.");
  if (c.E === "A") avisos.push("O documento está anulado.");
  if (c.D === "NC") avisos.push("É uma nota de crédito: confirme como a registar.");
  if (c.D === "OR" || c.D === "PF" || c.D === "FO") avisos.push("É um orçamento ou fatura pró-forma, que não é comprovativo de despesa.");
  if (Math.abs(semIva + iva + selo - total) > 0.05) avisos.push("Os valores lidos não somam o total do documento (" + total.toFixed(2) + " €). Confirme-os.");

  return {
    nif: c.A, adquirente: c.B || "", tipo: c.D || "", documento: (c.G || "").slice(0, 60), dataDocumento,
    atcud: c.H || "", semIva, iva, total, avisos,
  };
}
````

## `public/reservado/reservado.css`

Área reservada: estilos. **Substituir.**

````css
/* Área reservada DCAB — complementa /assets/css/estilo.css */

.reservado { background: var(--nevoa); min-height: 100vh; }
.reservado .topo { background: var(--papel); }
.sessao { margin-left: auto; display: flex; align-items: center; gap: 16px; font-size: .92rem; }
.sessao__email { color: var(--aco); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 32ch; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Avisos */
.aviso {
  position: fixed; left: 50%; top: 84px; transform: translateX(-50%); z-index: 80;
  max-width: min(640px, calc(100% - 32px));
  padding: 14px 20px; background: var(--tinta); color: var(--papel);
  border-left: 4px solid var(--sinal); box-shadow: 0 8px 24px rgba(0,0,0,.18); font-size: .96rem;
}
.aviso--erro { border-left-color: #E5484D; }
.aviso--ok { border-left-color: #30A46C; }

/* Ecrãs de acesso */
.ecra { padding: clamp(40px, 8vw, 96px) var(--margem); display: flex; justify-content: center; }
.cartao-acesso { background: var(--papel); border-top: 4px solid var(--sinal); padding: clamp(28px, 5vw, 48px); max-width: 520px; width: 100%; }
.cartao-acesso--largo { max-width: 680px; }
.cartao-acesso h1 { font-size: clamp(1.7rem, 3vw, 2.2rem); margin-bottom: 14px; }
.cartao-acesso h1:focus { outline: none; }
.cartao-acesso p { color: var(--aco); }
.acesso__botoes { display: flex; flex-direction: column; gap: 12px; margin: 28px 0 20px; }
.botao--fornecedor { background: var(--papel); color: var(--tinta); border-color: #B7C3CA; gap: 12px; justify-content: flex-start; padding: 0 20px; }
.botao--fornecedor:hover { border-color: var(--tinta); background: var(--papel); color: var(--tinta); }
.acesso__nota { font-size: .9rem; margin: 0; }
.acesso__form { display: flex; flex-direction: column; gap: 14px; margin-top: 24px; }
.acesso__form .botao { width: 100%; }
.acesso__form .ligacao { align-self: flex-start; padding: 0; }
.acesso__separador { display: flex; align-items: center; gap: 12px; margin: 22px 0 0; color: var(--aco); font-size: .9rem; }
.acesso__separador::before, .acesso__separador::after { content: ""; flex: 1; border-top: 1px solid var(--linha); }
.acesso__separador + .acesso__botoes { margin-top: 18px; }

.passos-mfa { padding-left: 1.2em; color: var(--aco); margin: 0 0 24px; }
.passos-mfa li { margin-bottom: 6px; }
.mfa__qr { display: flex; flex-wrap: wrap; gap: 28px; align-items: center; margin-bottom: 28px; }
#mfa-qr { padding: 12px; background: var(--papel); border: 1px solid var(--linha); min-width: 210px; min-height: 210px; }
.mfa__rotulo { font-weight: 500; color: var(--tinta) !important; margin-bottom: 6px; }
.mfa__chave { display: block; font-size: 1.05rem; letter-spacing: .06em; background: var(--nevoa); padding: 10px 12px; word-break: break-all; max-width: 30ch; }
.mfa__form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin-top: 8px; }
.mfa__form label { flex-basis: 100%; font-weight: 500; }
.mfa__form input { font: inherit; font-size: 1.5rem; letter-spacing: .3em; width: 9ch; padding: 8px 12px; border: 1px solid #B7C3CA; min-height: 48px; }
.mfa__form input:focus { outline: none; border-color: var(--tinta); box-shadow: 0 0 0 3px rgba(0, 162, 219, .35); }

/* Aplicação */
.app { max-width: 1320px; margin: 0 auto; padding: 32px var(--margem) 80px; }
.app__cabeca { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 24px; }
.app__cabeca h1 { font-size: clamp(1.9rem, 3.4vw, 2.6rem); }
.app__cabeca h1:focus { outline: none; }
.app__projeto { color: var(--sinal-texto); font-family: var(--f-titulo); font-weight: 600; margin: 0 0 4px; }
.app__papel { margin: 0; font-size: .9rem; color: var(--aco); }

.separadores { display: flex; gap: 2px; overflow-x: auto; border-bottom: 1px solid var(--linha); margin-bottom: 28px; }
.separadores button {
  font: inherit; font-weight: 500; background: none; border: 0; border-bottom: 3px solid transparent;
  padding: 12px 16px; color: var(--aco); cursor: pointer; white-space: nowrap;
}
.separadores button:hover { color: var(--tinta); }
.separadores button[aria-selected="true"] { color: var(--tinta); border-bottom-color: var(--sinal); }

.painel__titulo { font-size: 1.3rem; margin: 36px 0 16px; }
.painel > .painel__titulo:first-child { margin-top: 0; }
.nota { color: var(--aco); font-size: .95rem; max-width: 90ch; }
.vazio { background: var(--papel); padding: 28px; color: var(--aco); }
.vazio .botao { margin-top: 8px; }

/* Fases da candidatura: faixa sequencial */
.fases { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.fase { background: var(--papel); padding: 14px 14px 12px; border-top: 4px solid var(--linha); display: flex; flex-direction: column; gap: 2px; }
.fase--ok { border-top-color: #30A46C; }
.fase--info { border-top-color: var(--sinal); }
.fase--alerta { border-top-color: #E5933B; }
.fase__codigo { font-family: var(--f-titulo); font-weight: 600; font-size: 1.15rem; }
.fase__estado { font-size: .85rem; color: var(--aco); }
.fase__valor { font-size: .85rem; font-variant-numeric: tabular-nums; }

/* Indicadores */
.indicadores { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-bottom: 2px; }
.indicador { background: var(--papel); padding: 18px 20px; }
.indicador__rotulo { font-size: .88rem; color: var(--aco); margin: 0 0 6px; }
.indicador__valor { font-family: var(--f-titulo); font-weight: 600; font-size: 1.45rem; margin: 0; font-variant-numeric: tabular-nums; }
.indicador__nota { font-size: .85rem; color: var(--aco); margin: 6px 0 0; }
.indicador--alerta { box-shadow: inset 4px 0 0 #E5933B; }
.indicador--ok { box-shadow: inset 4px 0 0 #30A46C; }
.barra { height: 10px; background: var(--papel); margin: 2px 0 0; }
.barra__preenchimento { height: 100%; width: 0; background: var(--sinal); transition: width .4s ease; }

/* Tabelas */
.tabela-envolvente { overflow-x: auto; background: var(--papel); }
.tabela { width: 100%; border-collapse: collapse; font-size: .92rem; }
.tabela th, .tabela td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--linha); vertical-align: top; }
.tabela th { font-weight: 600; background: #F7FAFB; white-space: nowrap; position: sticky; top: 0; }
.tabela .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tabela tfoot td { font-weight: 600; border-top: 2px solid var(--tinta); border-bottom: 0; }
.linha--grupo td { background: #F2F6F8; font-weight: 600; font-size: .88rem; }
.linha--fechada { background: #F7F8F9; color: var(--aco); }
.valor--alerta { color: #A35200; }
.valor--erro { color: #B3261E; font-weight: 600; }
.acoes { white-space: nowrap; }
.alertas { margin: 0; padding: 0; list-style: none; color: #A35200; font-size: .85rem; }
.alertas li::before { content: "• "; }

.etiqueta { display: inline-block; font-size: .8rem; font-weight: 500; padding: 2px 8px; background: var(--nevoa); white-space: nowrap; }
.etiqueta--ok { background: #E6F6EC; color: #1D6B40; }
.etiqueta--info { background: #E1F3FA; color: #00587A; }
.etiqueta--alerta { background: #FDF0E1; color: #8A4500; }

.ligacao { font: inherit; font-size: .9rem; background: none; border: 0; padding: 0 6px; color: var(--sinal-texto); text-decoration: underline; cursor: pointer; }
.ligacao--perigo { color: #B3261E; }
.botao--perigo { background: #B3261E; border-color: #B3261E; }
.botao--perigo:hover { background: #8C1D17; border-color: #8C1D17; color: var(--papel); }

.barra-ferramentas { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 16px; }
.filtros, .ferramentas { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.ferramentas--esquerda { margin-bottom: 12px; }
.filtros select { font: inherit; font-size: .92rem; padding: 8px 10px; border: 1px solid #B7C3CA; background: var(--papel); max-width: 280px; min-height: 40px; }
.filtro-caixa { display: flex; align-items: center; gap: 6px; font-size: .92rem; }

/* Formulários */
.formulario-parametros, .grelha-form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
.formulario-parametros { background: var(--papel); padding: 28px; }
.campo__ajuda { font-size: .85rem; color: var(--aco); margin: 0; }
.campo input:disabled { background: var(--nevoa); color: var(--aco); }
.previsao { background: var(--nevoa); padding: 12px 14px; margin: 0; font-variant-numeric: tabular-nums; }
.lista-importacao { padding-left: 1.2em; }

/* Diálogo */
.dialogo { border: 0; padding: 0; width: min(780px, calc(100% - 24px)); max-height: calc(100vh - 32px); border-top: 4px solid var(--sinal); }
.dialogo::backdrop { background: rgba(0, 0, 0, .45); }
.dialogo__form { padding: 28px; display: flex; flex-direction: column; gap: 16px; }
.dialogo__form h2 { font-size: 1.5rem; }
.dialogo__corpo { overflow-y: auto; }
.dialogo__erros { color: #B3261E; margin: 0; }
.dialogo__erros:empty { display: none; }
.dialogo__acoes { display: flex; justify-content: flex-end; gap: 12px; }

.contratacao { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }

@media (max-width: 1000px) {
  .fases { grid-template-columns: repeat(4, 1fr); }
  .indicadores { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 860px) {
  .formulario-parametros, .grelha-form, .contratacao { grid-template-columns: 1fr; }
  .sessao__email { display: none; }
}

@media (max-width: 520px) {
  .fases { grid-template-columns: repeat(2, 1fr); }
  .indicadores { grid-template-columns: 1fr; }
  .app__cabeca { flex-direction: column; align-items: flex-start; }
}

.carregar__detalhe { font-family: ui-monospace, Menlo, monospace; font-size: .85rem; background: var(--nevoa); padding: 10px 12px; word-break: break-word; }

/* Leitor de QR code de faturas */
.leitor { background: var(--nevoa); border-left: 4px solid var(--sinal); padding: 14px 16px; margin-bottom: 4px; }
.leitor__titulo { font-weight: 600; margin: 0 0 10px; }
.leitor__botoes { display: flex; flex-wrap: wrap; gap: 10px; }
.leitor__video { display: block; width: 100%; max-width: 420px; margin-top: 12px; background: #000; aspect-ratio: 4 / 3; object-fit: cover; }
.leitor__estado p { margin: 10px 0 0; font-size: .92rem; }
.leitor__ok { color: #1D6B40; }
.leitor__erro { color: #B3261E; }
.leitor__estado .alertas { margin-top: 6px; }
.valor--alterado { color: var(--sinal-texto); font-weight: 600; }

/* Acessos */
.convite__resultado p { margin: 4px 0 0; }
.convite__mensagem { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.convite__texto { font: inherit; font-size: .9rem; width: 100%; padding: 10px 12px; border: 1px solid #B7C3CA; background: var(--papel); resize: vertical; }
.barra-ferramentas--titulo { align-items: flex-end; margin: 36px 0 16px; }
.barra-ferramentas--titulo .painel__titulo { margin: 0; }
````

## `public/reservado/arranque.js`

Área reservada: diagnóstico de arranque. **Manter / substituir.**

````javascript
/* Área reservada — vigilância do arranque.
 * Se a aplicação não arrancar (biblioteca bloqueada, configuração em falta, erro de rede),
 * mostra a causa em vez de uma página vazia. Script clássico, carregado antes do módulo principal.
 */
(function () {
  var ultimoErro = "";
  function registar(msg) { if (msg && !ultimoErro) ultimoErro = String(msg).slice(0, 300); }
  window.addEventListener("error", function (e) {
    if (e && e.target && e.target.tagName === "SCRIPT") registar("Não foi possível carregar " + (e.target.src || "um script"));
    else registar(e && (e.message || (e.error && e.error.message)));
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    registar(r && (r.code ? r.code + " — " + (r.message || "") : r.message || r));
  });

  window.__falhaArranque = function (titulo, texto, detalhe) {
    var ecra = document.getElementById("ecra-carregar");
    if (!ecra) return;
    document.querySelectorAll(".ecra, #app").forEach(function (el) { el.hidden = el !== ecra; });
    document.getElementById("carregar-titulo").textContent = titulo;
    document.getElementById("carregar-texto").textContent = texto;
    var d = document.getElementById("carregar-detalhe");
    d.textContent = "Detalhe técnico: " + (detalhe || ultimoErro || "sem resposta dos serviços de autenticação");
    d.hidden = false;
  };

  setTimeout(function () {
    var ecra = document.getElementById("ecra-carregar");
    if (ecra && !ecra.hidden) {
      window.__falhaArranque(
        "Não foi possível iniciar a área reservada",
        "Recarregue a página com Cmd + Shift + R. Se o problema continuar, envie ao administrador o detalhe técnico abaixo."
      );
    }
  }, 12000);
})();
````

## `public/reservado/config.js`

Área reservada: ligação ao projeto Firebase (já preenchido). **Substituir.**

````javascript
/* Configuração da área reservada DCAB Consulting.
 * Estes valores identificam o projeto Firebase e são públicos por natureza;
 * a proteção dos dados é feita pelas regras do Firestore e pela autenticação.
 */
export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyD5bcfJ7tKvuMuLcs-sjkZhihsVcTKn_GU",
    authDomain: "dcabconsulting.com",
    projectId: "dcab-consulting",
    appId: "1:921274534415:web:2387c3aebc151cbc5b717a",
  },
  projetoId: "ai4cybersecurity",
  dominioGoogle: "dcabconsulting.com",
  emissorMfa: "DCAB Consulting",
  inatividadeMinutos: 30,
};
````

## `firebase.json`

Alojamento, cabeçalhos de segurança e funções. **Substituir.**

````json
{
  "hosting": {
    "site": "dcab-consulting",
    "public": "public",
    "cleanUrls": true,
    "trailingSlash": false,
    "ignore": [
      "firebase.json",
      "**/.*"
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=63072000; includeSubDomains; preload"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Cross-Origin-Opener-Policy",
            "value": "same-origin-allow-popups"
          }
        ]
      },
      {
        "source": "{/,/index.html,/privacidade,/privacidade.html,/404.html,/solucoes/**}",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://script.google.com https://script.googleusercontent.com; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "Permissions-Policy",
            "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
          }
        ]
      },
      {
        "source": "/reservado{,/**}",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' https://www.gstatic.com https://apis.google.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.sheetjs.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com https://apis.google.com https://europe-west1-dcab-consulting.cloudfunctions.net; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com; worker-src 'self' blob:; form-action 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"
          },
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-Robots-Tag",
            "value": "noindex, nofollow"
          },
          {
            "key": "Cache-Control",
            "value": "no-store"
          },
          {
            "key": "Permissions-Policy",
            "value": "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
          }
        ]
      },
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=86400"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "runtime": "nodejs22",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ]
}
````

## `firestore.rules`

Regras de segurança da base de dados. **Substituir.**

````javascript
rules_version = '2';

// Área reservada DCAB Consulting
// Princípios: negar por omissão; exigir email/palavra-passe (por convite) ou Google + email verificado + segundo fator TOTP;
// autorização explícita por email na coleção "acessos"; validação de esquema; auditoria só de escrita.
service cloud.firestore {
  match /databases/{database}/documents {

    /* ---------- Identidade e autorização ---------- */

    function email() {
      return request.auth.token.email.lower();
    }
    function autenticado() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.firebase.sign_in_provider in ['google.com', 'password'];
    }
    function comMfa() {
      return request.auth.token.firebase.sign_in_second_factor == 'totp';
    }
    function acesso() {
      return get(/databases/$(database)/documents/acessos/$(email())).data;
    }
    function autorizado() {
      return autenticado() && comMfa()
        && exists(/databases/$(database)/documents/acessos/$(email()))
        && acesso().ativo == true;
    }
    function editor() { return autorizado() && acesso().papel in ['admin', 'editor']; }
    function admin()  { return autorizado() && acesso().papel == 'admin'; }

    /* ---------- Validação ---------- */

    function txt(v, max) { return v is string && v.size() <= max; }
    function dataOuVazio(v) { return v is string && (v == '' || v.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')); }
    function valor(v) { return v is number && v >= 0 && v < 100000000; }
    function valorOuNulo(v) { return v == null || valor(v); }
    function codigoPedido(v) { return v is string && v.matches('^(ADT|PSF|PP[0-9]{2}|AC[0-9]{2})$'); }
    function carimbo(d) { return d.atualizadoPor == email() && d.atualizadoEm == request.time; }

    function pedidoFechado(projeto, codigo) {
      return codigo != ''
        && exists(/databases/$(database)/documents/projetos/$(projeto)/pedidos/$(codigo))
        && get(/databases/$(database)/documents/projetos/$(projeto)/pedidos/$(codigo)).data.estado
             in ['Submetido', 'Em análise', 'Aprovado', 'Pago'];
    }

    function despesaValida(d) {
      return d.keys().hasOnly(['linha', 'fornecedor', 'nif', 'documento', 'dataDocumento', 'mesReferencia', 'descricao',
               'semIva', 'iva', 'ivaElegivel', 'dataPagamento', 'meioPagamento', 'pedido', 'estado', 'valorValidado',
               'comprovativo', 'observacoes', 'ordem', 'criadoEm', 'criadoPor', 'atualizadoEm', 'atualizadoPor'])
        && d.linha in ['1.1', '1.2', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8',
                       '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '4.1', '4.2', '5.1']
        && txt(d.fornecedor, 150) && d.nif is string && (d.nif == '' || d.nif.matches('^[0-9]{9}$'))
        && txt(d.documento, 60) && dataOuVazio(d.dataDocumento)
        && d.mesReferencia is string && (d.mesReferencia == '' || d.mesReferencia.matches('^[0-9]{4}-[0-9]{2}$'))
        && txt(d.descricao, 300) && valor(d.semIva) && valorOuNulo(d.iva) && d.ivaElegivel is bool
        && dataOuVazio(d.dataPagamento)
        && d.meioPagamento in ['', 'Transferência bancária', 'Débito direto', 'Cartão', 'Cheque', 'Processamento salarial', 'Outro']
        && (d.pedido == '' || codigoPedido(d.pedido))
        && d.estado in ['Lançada', 'Paga', 'Submetida em PP', 'Validada', 'Não elegível']
        && valorOuNulo(d.valorValidado) && txt(d.comprovativo, 200) && txt(d.observacoes, 500)
        && d.ordem is number && d.criadoPor is string && carimbo(d);
    }

    function pedidoValido(d) {
      return d.keys().hasOnly(['tipo', 'periodoInicio', 'periodoFim', 'dataSubmissao', 'valorSolicitado',
               'dataTransferencia', 'valorTransferido', 'estado', 'observacoes', 'atualizadoEm', 'atualizadoPor'])
        && d.tipo in ['Adiantamento', 'Pedido de pagamento intercalar', 'Pedido de pagamento de saldo final', 'Reembolso / Acerto']
        && dataOuVazio(d.periodoInicio) && dataOuVazio(d.periodoFim) && dataOuVazio(d.dataSubmissao)
        && dataOuVazio(d.dataTransferencia) && valorOuNulo(d.valorSolicitado) && valorOuNulo(d.valorTransferido)
        && d.estado in ['Em preparação', 'Submetido', 'Em análise', 'Aprovado', 'Pago', 'Com correções']
        && txt(d.observacoes, 300) && carimbo(d);
    }

    // Taxas de comparticipação alteradas por rubrica: valores entre 0 e 1
    function taxaOk(m, k) { return !(k in m) || (m[k] is number && m[k] >= 0 && m[k] <= 1); }
    function taxasValidas(m) {
      return m is map && m.keys().hasOnly(['1', '2', '3', '4', '5'])
        && taxaOk(m, '1') && taxaOk(m, '2') && taxaOk(m, '3') && taxaOk(m, '4') && taxaOk(m, '5');
    }

    function parametrosValidos(d) {
      return d.keys().hasOnly(['parametros', 'atualizadoEm', 'atualizadoPor'])
        && d.parametros.keys().hasOnly(['entidade', 'projeto', 'inicio', 'duracao', 'entidadeConsultora', 'consultor1', 'consultor2', 'taxas'])
        && (!('taxas' in d.parametros) || taxasValidas(d.parametros.taxas))
        && txt(d.parametros.entidade, 120) && txt(d.parametros.projeto, 120) && dataOuVazio(d.parametros.inicio)
        && d.parametros.duracao is int && d.parametros.duracao >= 1 && d.parametros.duracao <= 60
        && txt(d.parametros.entidadeConsultora, 120) && txt(d.parametros.consultor1, 120) && txt(d.parametros.consultor2, 120)
        && carimbo(d);
    }

    /* ---------- Coleções ---------- */

    // Gerida apenas na consola Firebase. Cada utilizador só pode ler o seu próprio registo.
    match /acessos/{conta} {
      allow read: if autenticado() && conta == email();
      allow write: if false;
    }

    match /projetos/{projeto} {
      allow read: if autorizado();
      allow write: if admin() && parametrosValidos(request.resource.data);

      match /despesas/{id} {
        allow read: if autorizado();
        allow create: if editor()
          && despesaValida(request.resource.data)
          && request.resource.data.criadoPor == email()
          && request.resource.data.criadoEm == request.time
          && !pedidoFechado(projeto, request.resource.data.pedido);
        allow update: if editor()
          && despesaValida(request.resource.data)
          && request.resource.data.criadoPor == resource.data.criadoPor
          && request.resource.data.criadoEm == resource.data.criadoEm
          && request.resource.data.ordem == resource.data.ordem
          && !pedidoFechado(projeto, resource.data.pedido)
          && !pedidoFechado(projeto, request.resource.data.pedido);
        allow delete: if admin() && !pedidoFechado(projeto, resource.data.pedido);
      }

      match /pedidos/{codigo} {
        allow read: if autorizado();
        allow create: if admin() && codigoPedido(codigo) && pedidoValido(request.resource.data);
        // Um pedido fechado só pode ser alterado (ou reaberto) pelo administrador
        allow update: if pedidoValido(request.resource.data)
          && (admin() || (editor() && !(resource.data.estado in ['Submetido', 'Em análise', 'Aprovado', 'Pago']) ));
        allow delete: if false;
      }

      // Registo de auditoria: só criação, pelo próprio utilizador, com hora do servidor
      match /auditoria/{id} {
        allow read: if admin();
        allow create: if editor()
          && request.resource.data.keys().hasOnly(['acao', 'colecao', 'docId', 'resumo', 'por', 'em'])
          && request.resource.data.por == email()
          && request.resource.data.em == request.time
          && txt(request.resource.data.resumo, 200);
        allow update, delete: if false;
      }
    }

    // Tudo o resto é negado
    match /{documento=**} {
      allow read, write: if false;
    }
  }
}
````

## `.firebaserc`

Projeto Firebase (dcab-consulting). **Manter / substituir.**

````json
{
  "projects": {
    "default": "dcab-consulting"
  }
}
````

## `publicar.sh`

Script de publicação com verificações. **Substituir.**

````bash
#!/bin/bash
# DCAB Consulting — publicação verificada
# Utilização: na pasta do site, executar:  bash publicar.sh
#             para publicar também as funções do servidor (gestão de acessos):  bash publicar.sh funcoes
# Confirma que os ficheiros estão completos e corretos, publica, e testa o site no fim.

cd "$(dirname "$0")" || exit 1
ALVO="hosting,firestore:rules"
[ "${1:-}" = "funcoes" ] && ALVO="hosting,firestore:rules,functions"
V=$'\033[32m'; E=$'\033[31m'; A=$'\033[33m'; N=$'\033[1m'; F=$'\033[0m'
ok()    { echo "${V}✔${F} $1"; }
aviso() { echo "${A}!${F} $1"; }
falha() { echo; echo "${E}✘ $1${F}"; echo "  Nada foi publicado. Corrija o ponto acima e execute de novo: bash publicar.sh"; exit 1; }

echo "${N}1. Pasta do site${F}"
echo "   $(pwd)"
case "$(pwd)" in
  *CloudStorage*|*OneDrive*|*"Mobile Documents"*) aviso "Esta pasta está sincronizada com a nuvem (OneDrive/iCloud). Recomenda-se usar ~/Documents/site-dcabconsulting.";;
esac

echo "${N}2. Ficheiros${F}"
for f in firebase.json firestore.rules .firebaserc \
         public/index.html public/privacidade.html public/404.html public/robots.txt public/sitemap.xml \
         public/assets/css/estilo.css public/assets/js/principal.js public/assets/js/abertura.js \
         public/assets/video/dcab-intro.webm public/assets/video/dcab-intro.mp4 \
         public/assets/video/dcab-ciclo.webm public/assets/video/dcab-ciclo.mp4 \
         public/assets/img/dcab-intro-inicio.jpg public/assets/img/dcab-intro-final.jpg public/assets/img/og-dcab.jpg \
         public/solucoes/prevencao-fuga-dados.html public/solucoes/classificacao-informacao.html \
         public/solucoes/continuidade-negocio.html public/solucoes/resposta-incidentes.html \
         public/reservado/index.html public/reservado/app.js public/reservado/arranque.js \
         public/reservado/config.js public/reservado/modelo.js public/reservado/reservado.css \
         public/reservado/vendor/pdf.min.mjs public/reservado/vendor/pdf.worker.min.mjs; do
  [ -f "$f" ] || falha "Falta o ficheiro: $f"
done
if [ "$ALVO" != "hosting,firestore:rules" ]; then
  for f in functions/index.js functions/logica.js functions/package.json; do [ -f "$f" ] || falha "Falta o ficheiro: $f"; done
  node --check functions/index.js 2>/dev/null && node --check functions/logica.js 2>/dev/null || falha "Erro de escrita no código das funções."
  echo "   A instalar as bibliotecas das funções (pode demorar 1 a 2 minutos)…"
  ( cd functions && npm install --no-audit --no-fund >/tmp/dcab-npm.log 2>&1 ) || { tail -15 /tmp/dcab-npm.log; falha "Não foi possível instalar as bibliotecas das funções (ver linhas acima)."; }
  [ -d functions/node_modules/firebase-functions ] && [ -d functions/node_modules/firebase-admin ] || falha "As bibliotecas das funções não ficaram instaladas."
  ok "Bibliotecas das funções instaladas"
fi
ok "Todos os ficheiros presentes"

command -v node >/dev/null 2>&1 || falha "O Node.js não está instalado (guia, passo 4)."
node -e "JSON.parse(require('fs').readFileSync('firebase.json','utf8'))" 2>/dev/null || falha "firebase.json tem um erro de formato."
node -e "JSON.parse(require('fs').readFileSync('.firebaserc','utf8'))" 2>/dev/null || falha ".firebaserc tem um erro de formato (aspas curvas?)."
for f in public/reservado/config.js public/reservado/app.js public/reservado/modelo.js public/assets/js/principal.js; do
  node --input-type=module --check < "$f" 2>/dev/null || falha "Erro de escrita no código de $f (aspas curvas ou texto colado a meio?)."
done
ok "Formato e sintaxe corretos"

echo "${N}3. Configuração${F}"
grep -q '"default": "dcab-consulting"' .firebaserc || falha ".firebaserc não aponta para o projeto dcab-consulting."
grep -q '"site": "dcab-consulting"' firebase.json || falha "firebase.json não indica o site de alojamento (\"site\": \"dcab-consulting\")."
grep -q '^export const CONFIG' public/reservado/config.js || falha "config.js tem de começar por: export const CONFIG"
grep -q 'COLAR' public/reservado/config.js && falha "config.js ainda tem valores por preencher (COLAR_...)."
ok "Área reservada ligada ao projeto dcab-consulting"

if grep -q 'COLAR_AQUI_O_URL_DO_APPS_SCRIPT' public/assets/js/principal.js; then
  aviso "Falta o URL do Apps Script do formulário de contacto."
  echo "   Onde o encontra: script.google.com › Formulário site DCAB › Implementar › Gerir implementações › URL da Aplicação Web"
  printf "   Cole aqui o URL (termina em /exec) e prima Enter: "
  read -r URL
  URL="$(echo "$URL" | tr -d '[:space:]')"
  case "$URL" in
    https://script.google.com/macros/s/*/exec) ;;
    *) falha "URL inválido. Tem de começar por https://script.google.com/macros/s/ e terminar em /exec";;
  esac
  sed -i '' "s#COLAR_AQUI_O_URL_DO_APPS_SCRIPT#${URL}#" public/assets/js/principal.js || falha "Não foi possível gravar o URL."
fi
grep -q 'https://script.google.com/macros/s/.*/exec' public/assets/js/principal.js || falha "principal.js não tem um URL válido do Apps Script."
ok "Formulário de contacto ligado ao Apps Script"

echo "${N}4. Sessão Firebase${F}"
command -v firebase >/dev/null 2>&1 || falha "A ferramenta Firebase não está instalada. Execute: sudo npm install -g firebase-tools"
firebase login:list 2>/dev/null | grep -q "@" || falha "Sem sessão iniciada. Execute: firebase login"
ok "Sessão: $(firebase login:list 2>/dev/null | grep -o '[A-Za-z0-9._%+-]*@[A-Za-z0-9.-]*' | head -1)"

echo "${N}5. Publicação${F}"
[ "$ALVO" != "hosting,firestore:rules" ] && aviso "A publicação das funções do servidor demora 3 a 6 minutos. Se perguntar por uma política de limpeza (cleanup policy), prima Enter."
if ! firebase deploy --only "$ALVO" --project dcab-consulting; then
  echo
  aviso "Se o erro mencionar «Cloud Firestore API» ou «database», a base de dados ainda não foi criada (guia, passo 47)."
  falha "A publicação falhou. Copie as últimas linhas acima e envie-as."
fi
ok "Publicado"

echo "${N}6. Testes no domínio${F}"
sleep 5
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/)
[ "$c" = "200" ] && ok "Página inicial responde (200)" || aviso "Página inicial respondeu $c"
curl -s https://dcabconsulting.com/robots.txt | grep -q "Disallow: /reservado" && ok "É o site da DCAB que está a responder" || aviso "O domínio não está a servir esta versão (DNS ou certificado por concluir?)"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/reservado/arranque.js)
[ "$c" = "200" ] && ok "Área reservada atualizada no servidor" || aviso "arranque.js respondeu $c — a área reservada pode não estar atualizada"
curl -s https://dcabconsulting.com/reservado/config.js | grep -q "export const CONFIG" && ok "config.js publicado corretamente" || aviso "config.js publicado não está no formato esperado"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/solucoes/prevencao-fuga-dados)
[ "$c" = "200" ] && ok "Páginas das soluções publicadas" || aviso "Página das soluções respondeu $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/assets/video/dcab-ciclo.webm)
[ "$c" = "200" ] && ok "Vídeo da abertura publicado" || aviso "Vídeo respondeu $c"

echo
echo "${V}${N}Concluído.${F} Abra https://dcabconsulting.com/reservado numa janela privada (Cmd + Shift + N)."
````

## `functions/index.js`

Funções do servidor (gestão de acessos). **Manter (sem alterações).**

````javascript
/* DCAB Consulting — Cloud Functions da área reservada (região: Bélgica, europe-west1) */
"use strict";
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { beforeUserCreated } = require("firebase-functions/v2/identity");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const L = require("./logica");

setGlobalOptions({ region: "europe-west1", maxInstances: 5 });
initializeApp();

const PROJETO = "ai4cybersecurity";
const db = () => getFirestore();

const contexto = {
  agora: () => new Date().toISOString(),
  async lerAcesso(email) {
    const s = await db().collection("acessos").doc(email).get();
    return s.exists ? s.data() : null;
  },
  async gravarAcesso(email, dados, juntar) {
    await db().collection("acessos").doc(email).set(dados, { merge: !!juntar });
  },
  async listarAcessos() {
    const s = await db().collection("acessos").get();
    return s.docs.map((d) => ({ email: d.id, ...d.data() }));
  },
  async contarAdminsAtivos() {
    const s = await db().collection("acessos").where("papel", "==", "admin").where("ativo", "==", true).get();
    return s.size;
  },
  async obterUtilizador(email) {
    try {
      const u = await getAuth().getUserByEmail(email);
      return {
        uid: u.uid, desativada: u.disabled,
        mfa: !!(u.multiFactor && u.multiFactor.enrolledFactors && u.multiFactor.enrolledFactors.length),
        ultimoAcesso: u.metadata && u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
      };
    } catch (e) {
      if (e.code === "auth/user-not-found") return null;
      throw e;
    }
  },
  async criarUtilizador(email, nome, senha) {
    await getAuth().createUser({ email, password: senha, displayName: nome || undefined, emailVerified: false });
  },
  async atualizarUtilizador(uid, props) { await getAuth().updateUser(uid, props); },
  async revogarSessoes(uid) { await getAuth().revokeRefreshTokens(uid); },
  async auditar(r) {
    await db().collection("projetos").doc(PROJETO).collection("auditoria").add({
      acao: r.acao, colecao: r.colecao, docId: r.docId, resumo: String(r.resumo).slice(0, 200), por: r.por, em: FieldValue.serverTimestamp(),
    });
  },
};

// Converte erros da lógica em erros que o navegador entende
const executar = (fn) => async (request) => {
  try {
    return await fn(contexto, request.auth, request.data);
  } catch (e) {
    if (e instanceof L.ErroAcesso) throw new HttpsError(e.codigo, e.message);
    console.error(e);
    throw new HttpsError("internal", "Erro no servidor. Tente novamente.");
  }
};

exports.convidar = onCall(executar(L.convidar));
exports.listarAcessos = onCall(executar(L.listar));
exports.alterarAcesso = onCall(executar(L.alterar));

// Bloqueia a criação de contas sem convite (Google ou email)
exports.antesDeCriarConta = beforeUserCreated(async (event) => {
  try {
    await L.permitirCriacao(contexto, event.data);
  } catch (e) {
    if (e instanceof L.ErroAcesso) throw new HttpsError("permission-denied", "Acesso apenas por convite.");
    console.error(e);
    throw new HttpsError("internal", "Erro ao validar o convite.");
  }
});
````

## `functions/logica.js`

Lógica das funções do servidor. **Manter (sem alterações).**

````javascript
/* DCAB Consulting — gestão de acessos à área reservada (lógica do servidor).
 * Independente do Firebase: recebe um "contexto" com as operações de dados,
 * o que permite testá-la sem ligação ao projeto.
 */
"use strict";
const crypto = require("crypto");

const PAPEIS = ["admin", "editor", "leitor"];
const METODOS = ["google", "email"];

class ErroAcesso extends Error {
  constructor(codigo, mensagem) { super(mensagem); this.codigo = codigo; }
}

const normalizarEmail = (e) => String(e || "").trim().toLowerCase();
const emailValido = (e) => e.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// Palavra-passe temporária forte (ninguém a usa: a pessoa define a sua pelo email de convite)
function senhaTemporaria() {
  return crypto.randomBytes(24).toString("base64").replace(/[+/=]/g, "x") + "-Aa9!";
}

// Só administradores ativos, com email verificado e segundo fator na sessão atual
async function verificarAdmin(ctx, auth) {
  if (!auth || !auth.token) throw new ErroAcesso("unauthenticated", "Sessão inválida. Entre novamente.");
  const t = auth.token;
  if (!t.email || t.email_verified !== true) throw new ErroAcesso("permission-denied", "Email não verificado.");
  if (!t.firebase || t.firebase.sign_in_second_factor !== "totp") throw new ErroAcesso("permission-denied", "É obrigatório o segundo fator.");
  const email = normalizarEmail(t.email);
  const acesso = await ctx.lerAcesso(email);
  if (!acesso || acesso.ativo !== true || acesso.papel !== "admin") throw new ErroAcesso("permission-denied", "Apenas o administrador pode gerir acessos.");
  return email;
}

async function convidar(ctx, auth, dados) {
  const por = await verificarAdmin(ctx, auth);
  const email = normalizarEmail(dados && dados.email);
  const nome = String((dados && dados.nome) || "").trim().slice(0, 120);
  const papel = dados && dados.papel;
  const metodo = dados && dados.metodo;
  if (!emailValido(email)) throw new ErroAcesso("invalid-argument", "Email inválido.");
  if (!PAPEIS.includes(papel)) throw new ErroAcesso("invalid-argument", "Papel inválido.");
  if (!METODOS.includes(metodo)) throw new ErroAcesso("invalid-argument", "Método de entrada inválido.");

  const existente = await ctx.lerAcesso(email);
  if (existente && existente.ativo === true) throw new ErroAcesso("already-exists", "Este email já tem acesso.");

  let contaCriada = false;
  if (metodo === "email") {
    const conta = await ctx.obterUtilizador(email);
    if (!conta) { await ctx.criarUtilizador(email, nome, senhaTemporaria()); contaCriada = true; }
    else if (conta.desativada) await ctx.atualizarUtilizador(conta.uid, { disabled: false });
  }

  await ctx.gravarAcesso(email, {
    papel, ativo: true, nome, metodo, convidadoPor: por, convidadoEm: ctx.agora(),
  });
  await ctx.auditar({ acao: "convidar", colecao: "acessos", docId: email, resumo: papel + " · " + metodo + (nome ? " · " + nome : ""), por });
  return { email, metodo, contaCriada };
}

async function listar(ctx, auth) {
  await verificarAdmin(ctx, auth);
  const acessos = await ctx.listarAcessos();
  const linhas = [];
  for (const a of acessos) {
    const conta = await ctx.obterUtilizador(a.email);
    linhas.push({
      email: a.email, nome: a.nome || "", papel: a.papel, ativo: a.ativo === true, metodo: a.metodo || "",
      convidadoEm: a.convidadoEm || null,
      conta: !!conta, mfa: !!(conta && conta.mfa), desativada: !!(conta && conta.desativada),
      ultimoAcesso: conta ? conta.ultimoAcesso || null : null,
    });
  }
  return linhas.sort((x, y) => x.email.localeCompare(y.email));
}

async function alterar(ctx, auth, dados) {
  const por = await verificarAdmin(ctx, auth);
  const email = normalizarEmail(dados && dados.email);
  const acao = dados && dados.acao;
  const acesso = await ctx.lerAcesso(email);
  if (!acesso) throw new ErroAcesso("not-found", "Este email não tem convite.");

  // Proteções contra ficar sem administrador
  const proprio = email === por;
  if (proprio && (acao === "desativar" || (acao === "papel" && dados.papel !== "admin"))) {
    throw new ErroAcesso("failed-precondition", "Não pode retirar o seu próprio acesso de administrador.");
  }
  if (acesso.papel === "admin" && (acao === "desativar" || (acao === "papel" && dados.papel !== "admin"))) {
    if ((await ctx.contarAdminsAtivos()) <= 1) throw new ErroAcesso("failed-precondition", "Tem de existir pelo menos um administrador ativo.");
  }

  const conta = await ctx.obterUtilizador(email);
  let resumo;
  if (acao === "desativar") {
    await ctx.gravarAcesso(email, { ativo: false }, true);
    if (conta) { await ctx.atualizarUtilizador(conta.uid, { disabled: true }); await ctx.revogarSessoes(conta.uid); }
    resumo = "acesso desativado";
  } else if (acao === "reativar") {
    await ctx.gravarAcesso(email, { ativo: true }, true);
    if (conta && conta.desativada) await ctx.atualizarUtilizador(conta.uid, { disabled: false });
    resumo = "acesso reativado";
  } else if (acao === "papel") {
    if (!PAPEIS.includes(dados.papel)) throw new ErroAcesso("invalid-argument", "Papel inválido.");
    await ctx.gravarAcesso(email, { papel: dados.papel }, true);
    resumo = "papel alterado para " + dados.papel;
  } else if (acao === "reporMfa") {
    if (proprio) throw new ErroAcesso("failed-precondition", "Não pode repor o seu próprio segundo fator a partir daqui.");
    if (!conta) throw new ErroAcesso("not-found", "Esta pessoa ainda não tem conta.");
    await ctx.atualizarUtilizador(conta.uid, { multiFactor: { enrolledFactors: null } });
    await ctx.revogarSessoes(conta.uid);
    resumo = "segundo fator reposto";
  } else {
    throw new ErroAcesso("invalid-argument", "Ação desconhecida.");
  }
  await ctx.auditar({ acao: "alterar", colecao: "acessos", docId: email, resumo, por });
  return { email, acao };
}

// Executada pelo Firebase antes de criar qualquer conta: só aceita emails com convite ativo
async function permitirCriacao(ctx, utilizador) {
  const email = normalizarEmail(utilizador && utilizador.email);
  const acesso = email ? await ctx.lerAcesso(email) : null;
  if (!acesso || acesso.ativo !== true) throw new ErroAcesso("permission-denied", "Acesso apenas por convite.");
}

module.exports = { convidar, listar, alterar, permitirCriacao, verificarAdmin, ErroAcesso, PAPEIS, METODOS, senhaTemporaria };
````

## `functions/package.json`

Bibliotecas das funções. **Manter (sem alterações).**

````json
{
  "name": "dcab-funcoes",
  "private": true,
  "description": "Cloud Functions da área reservada DCAB Consulting",
  "main": "index.js",
  "engines": {
    "node": "22"
  },
  "dependencies": {
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^6.1.0"
  }
}
````

## `apps-script/Codigo.gs`

Formulário no Google Apps Script (não vai para o site). **Colar no Apps Script (Parte 2).**

````javascript
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
const LIMITE_GLOBAL_HORA = 30;       // máximo de pedidos por hora, de todos os remetentes (proteção contra inundação)
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
    // Limite global: impede que alguém esgote a quota de envio variando o email
    const chaveHora = "global_" + Utilities.formatDate(new Date(), "UTC", "yyyyMMddHH");
    const totalHora = Number(cache.get(chaveHora) || 0);
    if (totalHora >= LIMITE_GLOBAL_HORA) return resposta_({ ok: false, erro: "limite" });
    cache.put(chaveHora, String(totalHora + 1), 3600);
    cache.put(chave, String(contagem + 1), JANELA_SEGUNDOS);

    const props = PropertiesService.getScriptProperties();
    const destino = props.getProperty("EMAIL_DESTINO");
    if (!destino) throw new Error("EMAIL_DESTINO não configurado");

    const quando = Utilities.formatDate(new Date(), "Europe/Lisbon", "dd/MM/yyyy HH:mm");

    MailApp.sendEmail({
      to: destino,
      replyTo: limpo.email,
      name: "Site DCAB Consulting",
      subject: "[Site DCAB] " + limpo.assunto + " — " + limpo.empresa.replace(/[\r\n\t]+/g, " "),
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
````

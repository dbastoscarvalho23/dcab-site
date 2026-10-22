"""Peças comuns às páginas públicas do site da DCAB Consulting."""
import json

SITE = "https://dcabconsulting.com"
ANKORA = "https://ankoraone.com"

FONTES = """  <link rel="preload" href="/assets/fontes/jost-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fontes/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>"""

SOLUCOES = [
    ("prevencao-fuga-dados", "Prevenção de fuga de dados"),
    ("classificacao-informacao", "Classificação da informação"),
    ("continuidade-negocio", "Continuidade de negócio"),
    ("resposta-incidentes", "Resposta a incidentes"),
    ("nis2-decreto-lei-125-2025", "Adequação à NIS2"),
]


def cabeca(titulo, descricao, caminho, og_titulo=None, jsonld=None, extra_js=""):
    url = SITE + caminho
    ld = ""
    if jsonld:
        ld = '\n  <script type="application/ld+json">\n' + json.dumps(jsonld, ensure_ascii=False, indent=2) + "\n  </script>"
    return f"""<!doctype html>
<html lang="pt-PT" class="sem-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{titulo}</title>
  <meta name="description" content="{descricao}">
  <link rel="canonical" href="{url}">
  <meta name="theme-color" content="#00A2DB">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:site_name" content="DCAB Consulting">
  <meta property="og:title" content="{og_titulo or titulo}">
  <meta property="og:description" content="{descricao}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}/assets/img/og-dcab.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Logótipo DCAB Consulting">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
{FONTES}
  <link rel="stylesheet" href="/assets/css/estilo.css?v=20261017">
  <script src="/assets/js/menu.js"></script>
  <script src="/assets/js/principal.js" defer></script>{extra_js}{ld}
</head>"""


def topo(inicio=False):
    p = "" if inicio else "/"
    return f"""<body>
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>

  <header class="topo">
    <div class="topo__interior">
      <a class="topo__marca" href="/" aria-label="DCAB Consulting, página inicial">
        <img src="/assets/img/monograma-preto.png" alt="" width="34" height="43">
        <span>DCAB Consulting</span>
      </a>
      <button class="topo__menu" type="button" aria-expanded="false" aria-controls="menu-principal"><span class="topo__menu-icone" aria-hidden="true"></span>Menu</button>
      <nav class="topo__nav" id="menu-principal" aria-label="Navegação principal">
        <a href="{p}#solucoes">Soluções</a>
        <a href="/solucoes/nis2-decreto-lei-125-2025">NIS2</a>
        <a href="{p}#quem-somos">Quem somos</a>
        <a href="{p}#parceria">Parceria</a>
        <a class="topo__destaque" href="{p}#ankoraone">AnkoraOne</a>
        <a class="topo__contacto" href="{p}#contacto">Pedir contacto</a>
      </nav>
      <a class="botao botao--pequeno" href="{p}#contacto">Pedir contacto</a>
    </div>
  </header>
"""


def rodape():
    links = "\n".join(
        f'            <li><a href="/solucoes/{s}">{n}</a></li>' for s, n in SOLUCOES
    )
    return f"""
  <footer class="rodape">
    <div class="bloco__interior rodape__interior">
      <img src="/assets/img/logo-dcab-branco.png" alt="DCAB Consulting" width="96" height="136">
      <nav aria-labelledby="rodape-solucoes">
        <h2 id="rodape-solucoes">Soluções</h2>
        <ul class="rodape__lista">
{links}
        </ul>
      </nav>
      <div>
        <h2>Ferramentas e parceria</h2>
        <ul class="rodape__lista">
          <li><a href="https://observatorio.dcabconsulting.com">Diagnóstico gratuito do domínio</a></li>
          <li><a href="/solucoes/simulador-classificacao">Simulador de classificação</a></li>
          <li><a href="https://observatorio.dcabconsulting.com/#detetor">Detetor de informação sensível</a></li>
          <li><a href="{ANKORA}" target="_blank" rel="noopener">AnkoraOne</a></li>
          <li><a href="{ANKORA}/#planos" target="_blank" rel="noopener">Planos da AnkoraOne</a></li>
          <li><a href="https://www.linkedin.com/company/ankoraone/" target="_blank" rel="noopener">AnkoraOne no LinkedIn</a></li>
        </ul>
      </div>
      <div class="rodape__legal">
        <a href="/privacidade">Política de privacidade</a>
        <p><a href="/referencias">Referências e versão</a></p>
        <p><a href="/reservado/">Área reservada</a></p>
        <p>© <span id="ano">2026</span> DCAB Consulting Unipessoal, Lda.</p>
        <p>Sociedade por quotas · capital social de 500,00&nbsp;€</p>
        <p>Sede: Urbanização do Torrão, n.º 66, 4825-458 Água Longa</p>
        <p>Matriculada na Conservatória do Registo Comercial de Coimbra · matrícula e NIPC 518&nbsp;180&nbsp;964</p>
      </div>
    </div>
  </footer>
</body>
</html>
"""


def captura(nome, alt, largura_css="(max-width: 760px) 100vw, 1180px", carregamento="lazy"):
    alturas = {"painel": 833, "jornada-conformidade": 929, "riscos": 743, "incidentes": 743,
               "documentos": 743, "relatorios-auditoria": 762}
    h = alturas[nome]
    return (f'<img src="/assets/img/ankoraone/{nome}.webp" '
            f'srcset="/assets/img/ankoraone/{nome}-720.webp 720w, /assets/img/ankoraone/{nome}.webp 1400w" '
            f'sizes="{largura_css}" width="1400" height="{h}" alt="{alt}" loading="{carregamento}" decoding="async">')

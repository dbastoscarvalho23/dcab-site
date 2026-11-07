"""Aplica a camada visual da versão 1.5 às páginas públicas do site DCAB.
Idempotente: não repete alterações já feitas. Executar a partir da pasta do site."""
import re, sys, pathlib
P = pathlib.Path("public")
CSS_V = "20261106"

TEMA_BOTAO = ('<button class="tema" type="button" data-tema hidden aria-pressed="false" aria-label="Mudar para o tema escuro">'
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/>'
  '<path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg><span>Tema escuro</span></button>\n      ')
BARRA = ('<div class="classificacao"><div class="classificacao__interior">'
  '<span>Classificação: <b>Público</b></span><span>DCAB Consulting · Segurança da informação</span></div></div>\n  ')
RODAPE = '\n      <p class="rodape__classificacao">Classificação: <b>Público</b> · Informação de divulgação livre</p>'

DEMO = '''
    <!-- Demonstração de prevenção de fuga de dados (v1.5) -->
    <section class="demo" id="demonstracao" aria-labelledby="demo-titulo" data-demo-dlp>
      <div class="bloco__interior demo__interior">
        <div class="demo__texto">
          <span class="ref">Prevenção de fuga de dados · ISO/IEC 27001 A.8.12</span>
          <{h} id="demo-titulo">Veja o que acontece a um email confidencial</{h}>
          <p>Uma política de prevenção de fuga de dados analisa o conteúdo antes de a mensagem sair. Escolha o destinatário e envie: a mesma mensagem tem um resultado diferente consoante fique dentro ou saia da organização.</p>
          <fieldset class="demo__destinos">
            <legend>Destinatário</legend>
            <label class="demo__destino"><input type="radio" name="demo-destino" value="interno" data-endereco="a.costa@empresa-exemplo.pt"><span>Colega da direção financeira<small>a.costa@empresa-exemplo.pt</small></span></label>
            <label class="demo__destino"><input type="radio" name="demo-destino" value="externo" data-endereco="a.costa.pessoal@correio-exemplo.com" checked><span>Endereço pessoal, fora da organização<small>a.costa.pessoal@correio-exemplo.com</small></span></label>
          </fieldset>
          <div class="demo__acoes">
            <button class="botao botao--claro" type="button" data-demo-enviar>Enviar email</button>
            <p class="demo__aviso">Dados fictícios. Nada é enviado.</p>
          </div>
        </div>
        <figure class="email" aria-label="Email de exemplo com informação confidencial">
          <div class="email__barra"><span>Nova mensagem</span><span class="email__etiqueta">Confidencial</span></div>
          <dl class="email__campos">
            <div><dt>Para</dt><dd data-demo-para>a.costa.pessoal@correio-exemplo.com</dd></div>
            <div><dt>Assunto</dt><dd>Proposta revista e dados de faturação</dd></div>
            <div><dt>Anexo</dt><dd>proposta_cliente_v3.docx</dd></div>
          </dl>
          <div class="email__corpo">
            <div class="email__varrimento" aria-hidden="true"></div>
            <span class="email__carimbo" aria-hidden="true"></span>
            <p>Bom dia,</p>
            <p>Segue a proposta revista. Para a faturação, use o NIF <span class="sensivel">999 999 990</span> e o IBAN <span class="sensivel">PT50 0000 0000 0000 0000 0000 0</span>.</p>
            <p>Acesso temporário ao portal: <span class="sensivel">m.silva</span> com a palavra-passe <span class="sensivel">Exemplo#2026</span>.</p>
          </div>
          <div class="email__registo" aria-live="polite"><p>O registo da política aparece aqui depois do envio.</p></div>
        </figure>
      </div>
    </section>
'''

def escala(h, intro):
    return '''
        <div class="escala-bloco" id="niveis-classificacao">
          <{h}>Cada documento com o nível de proteção certo</{h}>
          <p>{intro}</p>
          <div class="escala" role="group" aria-label="Níveis de classificação" data-escala>
            <button class="escala__nivel escala__nivel--publico" type="button" data-nivel="publico" aria-pressed="false"><span class="escala__barra"></span><span class="escala__nome">Público</span></button>
            <button class="escala__nivel escala__nivel--interno" type="button" data-nivel="interno" aria-pressed="false"><span class="escala__barra"></span><span class="escala__nome">Interno</span></button>
            <button class="escala__nivel escala__nivel--confidencial" type="button" data-nivel="confidencial" aria-pressed="true"><span class="escala__barra"></span><span class="escala__nome">Confidencial</span></button>
            <button class="escala__nivel escala__nivel--restrito" type="button" data-nivel="restrito" aria-pressed="false"><span class="escala__barra"></span><span class="escala__nome">Restrito</span></button>
          </div>
          <dl class="escala__detalhe" aria-live="polite">
            <div><dt>Quem pode ver</dt><dd>Equipas e pessoas autorizadas.</dd></div>
            <div><dt>Exemplos</dt><dd>Propostas a clientes, contratos, dados de faturação.</dd></div>
            <div><dt>Controlos aplicados</dt><dd>Cifragem, bloqueio de envio para domínios externos e registo de acessos.</dd></div>
          </dl>
          <p class="escala__rodape">Os níveis e os controlos são exemplos: cada organização define os seus. Treine a escolha no <a href="/solucoes/simulador-classificacao">simulador de classificação</a>.</p>
        </div>
'''.format(h=h, intro=intro)

REFS_PAGINA = {
  "prevencao-fuga-dados.html": "ISO/IEC 27001 A.8.12 · RGPD art. 32.º",
  "classificacao-informacao.html": "ISO/IEC 27001 A.5.12 e A.5.13",
  "continuidade-negocio.html": "ISO 22301 · ISO/IEC 27001 A.5.30",
  "resposta-incidentes.html": "NIS2 art. 23.º · RGPD art. 33.º e 34.º · ISO/IEC 27001 A.5.24 a A.5.28",
  "nis2-decreto-lei-125-2025.html": "Diretiva (UE) 2022/2555 · DL 125/2025",
  "simulador-classificacao.html": "ISO/IEC 27001 A.5.12 e A.5.13",
}

def subst(txt, a, b, n=1, obrigatorio=True):
    c = txt.count(a)
    if c != n:
        if obrigatorio: sys.exit("Esperava %d ocorrência(s) de %r e encontrei %d" % (n, a[:70], c))
        return txt
    return txt.replace(a, b)

def comum(txt, nome):
    if "data-tema" in txt: return txt
    txt = re.sub(r'estilo\.css\?v=\d+', 'estilo.css?v=' + CSS_V, txt)
    if 'menu.js' in txt:
        txt = subst(txt, '<script src="/assets/js/menu.js"></script>', '<script src="/assets/js/menu.js"></script>\n  <script src="/assets/js/tema.js"></script>')
        txt = subst(txt, '<header class="topo">', BARRA + '<header class="topo">')
        txt = subst(txt, '<a class="botao botao--pequeno"', TEMA_BOTAO + '<a class="botao botao--pequeno"')
        # fecho do rodapé: a última </div> antes de </footer>
        i = txt.rindex('</footer>'); j = txt.rindex('</div>', 0, i)
        txt = txt[:j] + RODAPE.lstrip('\n').join(['', '']) if False else txt[:j] + RODAPE + '\n    ' + txt[j:]
    return txt

def interacao(txt):
    if 'interacao.js' in txt: return txt
    return subst(txt, '<script src="/assets/js/principal.js" defer></script>', '<script src="/assets/js/principal.js" defer></script>\n  <script src="/assets/js/interacao.js" defer></script>')

def pagina_inicial(txt):
    if 'data-demo-dlp' in txt: return txt
    atalhos = [
      ('<span>A plataforma de governação, risco e conformidade da DCAB</span>', '<span class="ref">SaaS · nove módulos</span>'),
      ('<span>Controlo da informação que sai da organização</span>', '<span class="ref">ISO/IEC 27001 A.8.12</span>'),
      ('<span>Etiquetas que acompanham cada documento</span>', '<span class="ref">ISO/IEC 27001 A.5.12</span>'),
      ('<span>Recuperação depois de um incidente</span>', '<span class="ref">ISO 22301</span>'),
      ('<span>Passos para cumprir o regime jurídico da cibersegurança</span>', '<span class="ref">DL 125/2025</span>'),
    ]
    for a, r in atalhos:
        txt = subst(txt, a + '</a>', a + r + '</a>')
    comps = [
      ('<dt>Prevenção de fuga de dados (DLP)</dt>', 'ISO/IEC 27001 A.8.12'),
      ('<dt>Descoberta de dados sensíveis</dt>', 'ISO/IEC 27001 A.5.9'),
      ('<dt>Classificação e rotulagem</dt>', 'ISO/IEC 27001 A.5.12 e A.5.13'),
      ('<dt>Proteção da informação interna</dt>', 'ISO/IEC 27001 A.5.15 e A.8.24'),
      ('<dt>Informação e inteligência artificial</dt>', 'ISO/IEC 27001 A.5.10'),
      ('<dt>Planos de continuidade e recuperação</dt>', 'ISO 22301'),
      ('<dt>Cópias de segurança protegidas</dt>', 'ISO/IEC 27001 A.8.13'),
      ('<dt>Resposta a incidentes</dt>', 'NIS2 art. 23.º'),
      ('<dt>Adequação à NIS2</dt>', 'NIS2 art. 21.º · DL 125/2025'),
    ]
    for a, r in comps:
        txt = subst(txt, a, a.replace('<dt>', '<dt><span class="ref">' + r + '</span>'))
    # demonstração depois da AnkoraOne
    txt = subst(txt, '    <!-- Soluções: preto e azul sobre branco -->', DEMO.format(h='h2').lstrip('\n') + '\n    <!-- Soluções: preto e azul sobre branco -->')
    # escala no fim das soluções, antes das ferramentas
    txt = subst(txt, '''      </div>

      <div class="bloco__interior ferramentas">''', escala('h3', 'A classificação decide quem pode ver, partilhar ou enviar cada documento, e é ela que a política de prevenção de fuga de dados lê. Escolha um nível para ver o que muda.').rstrip('\n') + '''
      </div>

      <div class="bloco__interior ferramentas">''')
    return txt

def solucao(txt, nome):
    ref = REFS_PAGINA.get(nome)
    if ref and 'ref-normativa' not in txt:
        txt = re.sub(r'(<nav class="migalhas"[^\n]*</nav>)', r'\1\n        <p class="ref-normativa">Referências: ' + ref + '</p>', txt, count=1)
    if nome == "prevencao-fuga-dados.html" and 'data-demo-dlp' not in txt:
        txt = interacao(txt)
        txt = subst(txt, '    <section class="na-ankora"', DEMO.format(h='h2').lstrip('\n') + '\n    <section class="na-ankora"')
    if nome == "classificacao-informacao.html" and 'data-escala' not in txt:
        txt = interacao(txt)
        bloco = '    <div class="bloco__interior pagina-corpo">' + escala('h2', 'Os quatro níveis mais usados, com exemplos e com os controlos que normalmente lhes correspondem. Escolha um nível para ver o que muda.').rstrip('\n') + '\n    </div>\n\n'
        txt = subst(txt, '    <section class="na-ankora"', bloco + '    <section class="na-ankora"')
    return txt

for f in [P/"index.html", P/"privacidade.html", P/"referencias.html"] + sorted((P/"solucoes").glob("*.html")):
    t = f.read_text(encoding="utf-8"); o = t
    t = comum(t, f.name)
    if f.name == "index.html": t = interacao(pagina_inicial(t))
    elif f.parent.name == "solucoes": t = solucao(t, f.name)
    if t != o: f.write_text(t, encoding="utf-8"); print("alterado:", f)
f = P/"404.html"; t = f.read_text(encoding="utf-8")
if 'class="classificacao"' not in t:
    t = re.sub(r'estilo\.css\?v=\d+', 'estilo.css?v=' + CSS_V, t)
    t = t.replace('<body>\n', '<body>\n  ' + BARRA.rstrip() + '\n', 1)
    f.write_text(t, encoding="utf-8"); print("alterado:", f)

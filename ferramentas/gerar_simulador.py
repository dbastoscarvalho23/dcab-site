"""Gera public/solucoes/simulador-classificacao.html (simulador de classificação da informação)."""
import pathlib
from comum import cabeca, topo, rodape, SITE

RAIZ = pathlib.Path(__file__).resolve().parent.parent / "public" / "solucoes"
URL = SITE + "/solucoes/simulador-classificacao"
DESCRICAO = ("Dez casos fictícios para treinar a classificação da informação: escolha o nível (Público, Interno, "
             "Confidencial ou Restrito) e a forma de tratar cada documento. Inclui dados de saúde, credenciais e informação privilegiada.")

JSONLD = {
    "@context": "https://schema.org",
    "@graph": [
        {"@type": "WebPage", "@id": URL + "#pagina", "url": URL, "name": "Simulador de classificação da informação",
         "description": DESCRICAO, "inLanguage": "pt-PT", "isAccessibleForFree": True,
         "about": {"@type": "Thing", "name": "Classificação da informação"},
         "publisher": {"@type": "Organization", "@id": SITE + "/#organizacao", "name": "DCAB Consulting", "url": SITE + "/"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Classificação da informação", "item": SITE + "/solucoes/classificacao-informacao"},
            {"@type": "ListItem", "position": 3, "name": "Simulador", "item": URL}]},
    ],
}

html = cabeca("Simulador de classificação da informação | DCAB Consulting", DESCRICAO, "/solucoes/simulador-classificacao",
              og_titulo="Simulador de classificação da informação | DCAB Consulting", jsonld=JSONLD,
              extra_js='\n  <script src="/assets/js/simulador.js" defer></script>') + "\n" + topo() + """
  <main id="conteudo">
    <section class="pagina-cabeca pagina-cabeca--azul">
      <div class="bloco__interior">
        <nav class="migalhas" aria-label="Localização"><a href="/">Início</a> <span aria-hidden="true">›</span> <a href="/solucoes/classificacao-informacao">Classificação da informação</a> <span aria-hidden="true">›</span> <span aria-current="page">Simulador</span></nav>
        <h1>Simulador de classificação da informação</h1>
        <p class="pagina-cabeca__intro">Dez documentos do dia a dia de uma empresa fictícia. Para cada um, escolha o nível de classificação e o que faria numa situação concreta. No fim vê a pontuação e onde vale a pena rever as regras. Demora cerca de cinco minutos.</p>
        <a class="botao" href="#simulador">Começar o simulador</a>
      </div>
    </section>

    <section class="bloco__interior simulador-bloco" aria-label="Simulador">
      <div class="simulador" id="simulador">
        <h2 class="sim__titulo">Os quatro níveis</h2>
        <dl class="sim__legenda">
          <div class="sim__legenda--publico"><dt>Público</dt><dd>Feito para ser divulgado.</dd></div>
          <div class="sim__legenda--interno"><dt>Interno</dt><dd>Para quem trabalha na organização ou para ela.</dd></div>
          <div class="sim__legenda--confidencial"><dt>Confidencial</dt><dd>Só para as pessoas que precisam; prejudica se sair.</dd></div>
          <div class="sim__legenda--restrito"><dt>Restrito</dt><dd>Acesso nominal; uma fuga causa dano grave ou viola a lei.</dd></div>
        </dl>
        <button type="button" class="botao" id="sim-comecar">Começar</button>
        <noscript><p class="sim__nota">O simulador precisa de JavaScript ativo no navegador.</p></noscript>
        <p class="sim__nota">Os casos e os dados são fictícios. As respostas ficam só no seu navegador e não são guardadas.</p>
      </div>
    </section>

    <article class="bloco__interior pagina-corpo">
      <h2>Porque treinar a classificação</h2>
      <p>As ferramentas reconhecem um NIF ou um IBAN, mas não sabem se uma ata, uma proposta ou um rascunho de resultados pode sair da empresa. Essa decisão é de quem cria e envia o documento. Um esquema com poucos níveis, regras claras para cada um e exemplos dos documentos de cada equipa é o que torna a classificação coerente.</p>
      <p>Para ver o que um documento real revela, use o <a href="https://observatorio.dcabconsulting.com/#detetor">detetor de informação sensível do Observatório</a>, que analisa textos e ficheiros só no seu navegador.</p>
      <h2>Enquadramento</h2>
      <p>A classificação e a rotulagem da informação são os controlos 5.12 e 5.13 da ISO/IEC 27001:2022. Os dados de saúde e as outras categorias especiais seguem o artigo 9.º do RGPD. A informação privilegiada de emitentes cotados segue o Regulamento (UE) n.º 596/2014, sobre abuso de mercado. O Decreto-Lei n.º 125/2025 e o Regulamento n.º 756/2026 exigem a gestão dos ativos de informação nas entidades abrangidas.</p>
      <p class="nota-legal">Ferramenta de sensibilização, que não substitui a política de classificação da organização nem aconselhamento jurídico.</p>
    </article>

    <section class="pagina-cta">
      <div class="bloco__interior pagina-cta__interior">
        <div>
          <h2>Um esquema de classificação para a sua organização</h2>
          <p>Definimos os níveis, as regras e a rotulagem com os documentos da sua organização.</p>
        </div>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>
  </main>
""" + rodape()
(RAIZ / "simulador-classificacao.html").write_text(html, encoding="utf-8")
print("gerada simulador-classificacao")

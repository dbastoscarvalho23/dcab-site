"""Aplica o cabeçalho, o menu e o rodapé novos à política de privacidade e à página 404."""
import pathlib, re
from comum import topo, rodape
P = pathlib.Path(__file__).resolve().parent.parent / "public"
# privacidade
t = (P/"privacidade.html").read_text(encoding="utf-8")
t = t.replace('<html lang="pt-PT">', '<html lang="pt-PT" class="sem-js">')
if "menu.js" not in t:
    t = t.replace('<script src="/assets/js/principal.js" defer></script>',
                  '<script src="/assets/js/menu.js" defer></script>\n  <script src="/assets/js/principal.js" defer></script>')
t = re.sub(r"<body>.*?</header>\n", topo().rstrip("\n").replace("<body>", "<body>", 1) + "\n", t, count=1, flags=re.S)
t = re.sub(r"\n  <footer class=\"rodape\">.*$", rodape(), t, flags=re.S)
(P/"privacidade.html").write_text(t, encoding="utf-8")
print("privacidade ok")

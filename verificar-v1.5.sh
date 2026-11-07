#!/bin/bash
# DCAB Consulting — verificação da versão 1.5 do site e 1.4 do Observatório
# Só lê; não altera nada nem publica. Utilização, na pasta do site:  bash verificar-v1.5.sh
cd "$(dirname "$0")" || exit 1
V=$'\033[32m'; E=$'\033[31m'; A=$'\033[33m'; N=$'\033[1m'; F=$'\033[0m'
falhas=0
ok()    { echo "${V}✔${F} $1"; }
erro()  { echo "${E}✘${F} $1"; falhas=$((falhas+1)); }
aviso() { echo "${A}!${F} $1"; }
H() { shasum -a 256 | cut -c1-16; }
SITE=https://dcabconsulting.com
OBS=https://observatorio.dcabconsulting.com

echo "${N}1. Pasta local${F}"
[ -f public/assets/js/principal.js ] && grep -q "script.google.com" public/assets/js/principal.js \
  && ok "principal.js presente e intacto (formulário de contacto)" || erro "principal.js em falta ou sem o endereço do Apps Script"
for f in public/index.html public/privacidade.html public/referencias.html public/solucoes/*.html; do
  grep -q 'data-tema' "$f" || erro "$f sem o botão do tema (execute: python3 ferramentas/aplicar_v15.py)"
done
ok "Botão do tema nas páginas públicas"
grep -q 'data-demo-dlp' public/index.html && grep -q 'data-escala' public/index.html \
  && ok "Página inicial com a demonstração e a escala" || erro "Página inicial sem a demonstração ou sem a escala"
grep -q 'dcab-tema' public/privacidade.html && ok "Política de privacidade com a escolha do tema" || erro "Política de privacidade sem a escolha do tema"
[ -s public/assets/fontes/ibm-plex-mono-latin-400-normal.woff ] && ok "Letra técnica alojada no site" || erro "Falta public/assets/fontes/ibm-plex-mono-latin-400-normal.woff"
grep -q 'fonts.googleapis' public/*.html public/solucoes/*.html public/assets/css/estilo.css && erro "Há pedidos ao Google Fonts (não pode haver)" || ok "Sem pedidos ao Google Fonts"

echo "${N}2. Site publicado igual à pasta local${F}"
for f in index.html privacidade.html referencias.html assets/css/estilo.css assets/js/tema.js assets/js/interacao.js \
         solucoes/prevencao-fuga-dados.html solucoes/classificacao-informacao.html; do
  l=$(H < "public/$f")
  u="$SITE/$f"; case "$f" in *.html) u="$SITE/${f%.html}";; esac
  [ "$f" = "index.html" ] && u="$SITE/"
  r=$(curl -sL --max-time 15 "$u" | H)
  [ "$l" = "$r" ] && ok "$f igual ao publicado" || erro "$f diferente do publicado (publique de novo ou confirme a pasta)"
done
c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$SITE/assets/fontes/ibm-plex-mono-latin-400-normal.woff")
[ "$c" = "200" ] && ok "Letra técnica publicada" || erro "Letra técnica respondeu $c (esperado 200)"
curl -sI --max-time 15 "$SITE/" | grep -qi "content-security-policy: default-src 'self'; script-src 'self';" \
  && ok "Política de segurança de conteúdo (CSP) mantida" || erro "Cabeçalho CSP do site diferente do esperado"
c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$SITE/api/incidentes/tarefas")
[ "$c" = "405" ] && ok "Funções da área reservada continuam ativas" || erro "/api/incidentes respondeu $c (esperado 405)"

echo "${N}3. Observatório${F}"
OBSDIR="${OBSERVATORIO:-$HOME/Documents/diagnostico-dcab}"
if [ -d "$OBSDIR/public" ]; then
  for f in index.html estilo.css tema.js; do
    l=$(H < "$OBSDIR/public/$f")
    u="$OBS/$f"; [ "$f" = "index.html" ] && u="$OBS/"
    r=$(curl -sL --max-time 15 "$u" | H)
    [ "$l" = "$r" ] && ok "Observatório: $f igual ao publicado" || erro "Observatório: $f diferente do publicado"
  done
else
  aviso "Não encontrei a pasta do Observatório em $OBSDIR (defina OBSERVATORIO=/caminho para a indicar)"
fi
curl -sL --max-time 15 "$OBS/" | grep -q 'data-tema' && ok "Observatório publicado com o botão do tema" || erro "Observatório publicado sem o botão do tema"
c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$OBS/assets/fontes/ibm-plex-mono-latin-400-normal.woff")
[ "$c" = "200" ] && ok "Observatório: letra técnica publicada" || erro "Observatório: letra técnica respondeu $c (esperado 200)"

echo
if [ "$falhas" -eq 0 ]; then echo "${V}${N}Versão 1.5 conciliada.${F}"; else echo "${E}${N}$falhas ponto(s) por corrigir.${F} Envie-me as linhas com ✘."; fi

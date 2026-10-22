#!/bin/bash
# DCAB Consulting — descarrega para o próprio site as bibliotecas da área reservada e os tipos de letra.
# Executar uma vez, na pasta do site:  bash obter-bibliotecas.sh
# Depois disso o site deixa de depender de cdnjs, jsdelivr, cdn.sheetjs.com e Google Fonts.

cd "$(dirname "$0")" || exit 1
V=$'\033[32m'; E=$'\033[31m'; N=$'\033[1m'; F=$'\033[0m'
ok()    { echo "${V}✔${F} $1"; }
falha() { echo; echo "${E}✘ $1${F}"; echo "  Nada foi alterado no site publicado. Corrija o ponto acima e execute de novo: bash obter-bibliotecas.sh"; exit 1; }

[ -f firebase.json ] && [ -d public/reservado ] || falha "Execute este script dentro da pasta do site (~/Documents/site-dcabconsulting)."
command -v curl >/dev/null 2>&1 || falha "O comando curl não está disponível."

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# descarregar URL DESTINO TEXTO_ESPERADO
descarregar() {
  local url="$1" destino="$2" esperado="$3" nome
  nome="$(basename "$destino")"
  curl -fsSL --retry 3 --max-time 60 -o "$TMP/$nome" "$url" || falha "Não foi possível descarregar $nome ($url)."
  [ -s "$TMP/$nome" ] || falha "$nome veio vazio."
  if [ "$esperado" = "WOFF2" ]; then
    [ "$(head -c 4 "$TMP/$nome")" = "wOF2" ] || falha "$nome não é um tipo de letra válido."
  else
    grep -q "$esperado" "$TMP/$nome" || falha "$nome não tem o conteúdo esperado."
  fi
  mkdir -p "$(dirname "$destino")"
  mv "$TMP/$nome" "$destino"
  ok "$nome ($(wc -c < "$destino" | tr -d ' ') bytes) · SHA-256 $(shasum -a 256 "$destino" | cut -c1-16)…"
}

echo "${N}1. Bibliotecas da área reservada${F}"
VEN=public/reservado/vendor
descarregar "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" "$VEN/qrcode.min.js" "QRCode"
descarregar "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js" "$VEN/xlsx.full.min.js" "XLSX"
descarregar "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js" "$VEN/jsQR.js" "jsQR"

echo "${N}2. Tipos de letra${F}"
FON=public/assets/fontes
for p in 500 600 700; do
  descarregar "https://cdn.jsdelivr.net/npm/@fontsource/jost@5/files/jost-latin-$p-normal.woff2" "$FON/jost-latin-$p-normal.woff2" WOFF2
done
for p in 400 500 600; do
  descarregar "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5/files/ibm-plex-sans-latin-$p-normal.woff2" "$FON/ibm-plex-sans-latin-$p-normal.woff2" WOFF2
done

echo
echo "${V}${N}Concluído.${F} Agora execute: bash publicar.sh"

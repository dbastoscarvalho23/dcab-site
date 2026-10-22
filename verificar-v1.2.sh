#!/bin/bash
# DCAB Consulting — verificação da versão 1.2 (só lê; não altera nada nem publica)
# Utilização, na pasta do site:  bash verificar-v1.2.sh
cd "$(dirname "$0")" || exit 1
V=$'\033[32m'; E=$'\033[31m'; A=$'\033[33m'; N=$'\033[1m'; F=$'\033[0m'
falhas=0
ok()    { echo "${V}✔${F} $1"; }
erro()  { echo "${E}✘${F} $1"; falhas=$((falhas+1)); }
aviso() { echo "${A}!${F} $1"; }
H() { shasum -a 256 | cut -c1-16; }

echo "${N}1. Pasta local${F}"
[ -f public/assets/js/principal.js ] && grep -q "script.google.com" public/assets/js/principal.js \
  && ok "principal.js presente (formulário de contacto)" || erro "principal.js em falta ou sem o endereço do Apps Script"
grep -q "papelIncidentes" firestore.rules \
  && ok "Regras com a correção do limite de 1000 expressões" \
  || erro "firestore.rules é a versão antiga: descompacte o zip mais recente e publique de novo (bash publicar.sh funcoes)"
grep -q "seminc@" testes-regras/regras.test.mjs 2>/dev/null && ok "Testes das regras na versão corrigida" || aviso "Testes das regras desatualizados (não afeta o site)"

echo "${N}2. Site publicado igual à pasta local${F}"
for f in reservado/incidentes.js reservado/app.js reservado/index.html reservado/reservado.css \
         privacidade.html referencias.html solucoes/nis2-decreto-lei-125-2025.html; do
  l=$(H < "public/$f")
  r=$(curl -sL --max-time 15 "https://dcabconsulting.com/$f" | H)
  [ "$l" = "$r" ] && ok "$f igual ao publicado" || erro "$f diferente do publicado (publique de novo ou confirme a pasta)"
done

echo "${N}3. Testes das funções${F}"
if ( cd functions && node --test test/*.test.js test/*.test.mjs >/tmp/dcab-verif.log 2>&1 ); then
  ok "Testes das funções: $(grep -E '^# pass' /tmp/dcab-verif.log)"
else
  erro "Testes das funções falharam (ver /tmp/dcab-verif.log)"
fi

echo "${N}4. Git${F}"
if [ -d .git ]; then
  [ -z "$(git status --porcelain)" ] && ok "Sem alterações por guardar no Git" \
    || aviso "Há alterações por guardar: git add -A && git commit -m \"Versão 1.2\""
else
  aviso "A pasta não está em Git"
fi

echo "${N}5. Cópias diárias do Firestore${F}"
if command -v gcloud >/dev/null 2>&1; then
  gcloud firestore backups schedules list --database='(default)' --project=dcab-consulting 2>/dev/null | grep -q "dailyRecurrence\|DAILY\|daily" \
    && ok "Cópias diárias ativas" || aviso "Sem cópias diárias (ver Fase 6 do guia)"
else
  aviso "gcloud não está instalado neste Mac: confirme as cópias diárias no Cloud Shell"
fi

echo
[ $falhas -eq 0 ] && echo "${V}${N}Versão 1.2 conciliada: pasta local e site publicado coincidem.${F}" \
  || echo "${E}${N}$falhas ponto(s) por corrigir (ver ✘ acima).${F}"

#!/bin/bash
# DCAB Consulting — verificação da versão 1.4 (só lê; não altera nada nem publica)
# Utilização, na pasta do site:  bash verificar-v1.4.sh
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
grep -q "papelCve" firestore.rules && ok "Regras da versão 1.4 (ativos, preferências e vulnerabilidades)" || erro "firestore.rules não é a versão 1.4"
grep -q "1.4 ·" testes-regras/regras.test.mjs 2>/dev/null && ok "Testes das regras da versão 1.4" || aviso "Testes das regras desatualizados (não afeta o site)"
cmp -s functions/incidentes-prazos.mjs public/reservado/incidentes.js && ok "Prazos iguais na área reservada e nas funções" || erro "functions/incidentes-prazos.mjs diferente de public/reservado/incidentes.js"
cmp -s functions/cve-logica.mjs public/reservado/cve.js && ok "Catálogo e correspondência iguais na área reservada e nas funções" || erro "functions/cve-logica.mjs diferente de public/reservado/cve.js"
grep -q "cve-imediato" apps-script/Incidentes.gs && ok "Incidentes.gs da versão 1.4 (para colar no Apps Script)" || erro "apps-script/Incidentes.gs não é a versão 1.4"

echo "${N}2. Site publicado igual à pasta local${F}"
for f in reservado/cve.js reservado/app.js reservado/index.html reservado/reservado.css reservado/incidentes.js privacidade.html referencias.html; do
  l=$(H < "public/$f")
  r=$(curl -sL --max-time 15 "https://dcabconsulting.com/$f" | H)
  [ "$l" = "$r" ] && ok "$f igual ao publicado" || erro "$f diferente do publicado (publique de novo ou confirme a pasta)"
done
c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://dcabconsulting.com/api/incidentes/tarefas)
[ "$c" = "405" ] && ok "Ligação automática dos incidentes publicada" || erro "/api/incidentes respondeu $c (esperado 405)"

echo "${N}3. Testes das funções${F}"
if ( cd functions && node --test test/*.test.js test/*.test.mjs >/tmp/dcab-verif.log 2>&1 ); then
  ok "Testes das funções: $(grep -E '^# pass' /tmp/dcab-verif.log)"
else
  erro "Testes das funções falharam (ver /tmp/dcab-verif.log)"
fi

echo "${N}4. Funções publicadas${F}"
if command -v firebase >/dev/null 2>&1; then
  l=$(firebase functions:list --project dcab-consulting 2>/dev/null)
  for fn in recolherCves recolherCvesAgora incidentesApi recolherAlertas; do
    echo "$l" | grep -q "$fn" && ok "Função $fn publicada" || erro "Função $fn em falta"
  done
else
  aviso "Ferramenta Firebase não encontrada: confirme as funções na consola"
fi

echo "${N}5. Git${F}"
if [ -d .git ]; then
  [ -z "$(git status --porcelain)" ] && ok "Sem alterações por guardar no Git" \
    || aviso "Há alterações por guardar: git add -A && git commit -m \"Versão 1.4\""
else
  aviso "A pasta não está em Git"
fi

echo
[ $falhas -eq 0 ] && echo "${V}${N}Versão 1.4 conciliada: pasta local e site publicado coincidem.${F}" \
  || echo "${E}${N}$falhas ponto(s) por corrigir (ver ✘ acima).${F}"

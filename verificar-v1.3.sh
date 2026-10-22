#!/bin/bash
# DCAB Consulting — verificação da versão 1.3 (só lê; não altera nada nem publica)
# Utilização, na pasta do site:  bash verificar-v1.3.sh
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
grep -q "pedidosIncidente" firestore.rules && ok "Regras da versão 1.3 (provas, pedidos por triar, clientes)" || erro "firestore.rules não é a versão 1.3"
grep -q "1.3 ·" testes-regras/regras.test.mjs 2>/dev/null && ok "Testes das regras da versão 1.3" || aviso "Testes das regras desatualizados (não afeta o site)"
cmp -s functions/incidentes-prazos.mjs public/reservado/incidentes.js && ok "Prazos iguais na área reservada e nas funções" || erro "functions/incidentes-prazos.mjs diferente de public/reservado/incidentes.js"
[ -f apps-script/Incidentes.gs ] && ok "Incidentes.gs presente (para colar no Apps Script)" || erro "Falta apps-script/Incidentes.gs"

echo "${N}2. Site publicado igual à pasta local${F}"
for f in reservado/incidentes.js reservado/app.js reservado/index.html reservado/reservado.css assets/js/assunto.js assets/css/estilo.css \
         index.html privacidade.html referencias.html solucoes/nis2-decreto-lei-125-2025.html solucoes/resposta-incidentes.html; do
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

echo "${N}4. Git${F}"
if [ -d .git ]; then
  [ -z "$(git status --porcelain)" ] && ok "Sem alterações por guardar no Git" \
    || aviso "Há alterações por guardar: git add -A && git commit -m \"Versão 1.3\""
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
[ $falhas -eq 0 ] && echo "${V}${N}Versão 1.3 conciliada: pasta local e site publicado coincidem.${F}" \
  || echo "${E}${N}$falhas ponto(s) por corrigir (ver ✘ acima).${F}"

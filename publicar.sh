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
         public/assets/css/estilo.css public/assets/js/principal.js public/assets/js/abertura.js public/assets/js/menu.js \
         public/assets/img/logo-dcab-azul.png public/assets/img/logo-dcab-branco-total.png public/assets/img/ankoraone/painel.webp \
         public/assets/video/dcab-intro.webm public/assets/video/dcab-intro.mp4 \
         public/assets/video/dcab-ciclo.webm public/assets/video/dcab-ciclo.mp4 \
         public/assets/img/dcab-intro-inicio.jpg public/assets/img/dcab-intro-final.jpg public/assets/img/og-dcab.jpg \
         public/solucoes/prevencao-fuga-dados.html public/solucoes/classificacao-informacao.html \
         public/solucoes/continuidade-negocio.html public/solucoes/resposta-incidentes.html \
         public/solucoes/nis2-decreto-lei-125-2025.html public/solucoes/simulador-classificacao.html public/assets/js/simulador.js public/referencias.html public/assets/js/assunto.js \
         public/assets/js/tema.js public/assets/js/interacao.js public/assets/fontes/ibm-plex-mono-latin-400-normal.woff \
         public/reservado/index.html public/reservado/app.js public/reservado/arranque.js \
         public/reservado/config.js public/reservado/modelo.js public/reservado/incidentes.js public/reservado/cve.js public/reservado/reservado.css \
         public/reservado/vendor/pdf.min.mjs public/reservado/vendor/pdf.worker.min.mjs; do
  [ -f "$f" ] || falha "Falta o ficheiro: $f"
done
if [ "$ALVO" != "hosting,firestore:rules" ]; then
  for f in functions/index.js functions/logica.js functions/vigilancia.js functions/fontes.js functions/incidentes-api.js functions/incidentes-prazos.mjs \
           functions/fontes-cve.js functions/cve-servidor.mjs functions/cve-logica.mjs functions/package.json; do [ -f "$f" ] || falha "Falta o ficheiro: $f"; done
  for f in functions/index.js functions/logica.js functions/vigilancia.js functions/fontes.js functions/incidentes-api.js functions/fontes-cve.js functions/cve-servidor.mjs; do node --check "$f" 2>/dev/null || falha "Erro de escrita no código de $f."; done
  for f in fontes.js vigilancia.js logica.js incidentes-api.js fontes-cve.js; do ( cd functions && node -e "require('./$f')" ) 2>/dev/null || falha "functions/$f não carrega (erro ao executar o módulo)."; done
  cmp -s functions/incidentes-prazos.mjs public/reservado/incidentes.js \
    || falha "functions/incidentes-prazos.mjs é diferente de public/reservado/incidentes.js. Execute: cp public/reservado/incidentes.js functions/incidentes-prazos.mjs" 
  cmp -s functions/cve-logica.mjs public/reservado/cve.js \
    || falha "functions/cve-logica.mjs é diferente de public/reservado/cve.js. Execute: cp public/reservado/cve.js functions/cve-logica.mjs" 
  ( cd functions && node --test >/tmp/dcab-testes.log 2>&1 ) || { tail -25 /tmp/dcab-testes.log; falha "Os testes das funções falharam (ver acima)."; }
  ok "Testes das funções passaram"
  firebase functions:secrets:get HIBP_API_KEY >/dev/null 2>&1 \
    || falha "Falta o segredo HIBP_API_KEY. Execute: firebase functions:secrets:set HIBP_API_KEY (ver GUIA-VIGILANCIA.md; o valor «-» desliga o HIBP na vigilância)."
  for s in INCIDENTES_SEGREDO INCIDENTES_SEGREDO_CRM; do
    firebase functions:secrets:get "$s" >/dev/null 2>&1 \
      || falha "Falta o segredo $s (assinatura dos pedidos do Apps Script e do CRM). Ver o guia da versão 1.3, fase 2."
  done
  echo "   A instalar as bibliotecas das funções (pode demorar 1 a 2 minutos)…"
  ( cd functions && npm install --no-audit --no-fund >/tmp/dcab-npm.log 2>&1 ) || { tail -15 /tmp/dcab-npm.log; falha "Não foi possível instalar as bibliotecas das funções (ver linhas acima)."; }
  [ -d functions/node_modules/firebase-functions ] && [ -d functions/node_modules/firebase-admin ] || falha "As bibliotecas das funções não ficaram instaladas."
  ok "Bibliotecas das funções instaladas"
fi
for f in public/reservado/vendor/qrcode.min.js public/reservado/vendor/xlsx.full.min.js public/reservado/vendor/jsQR.js \
         public/assets/fontes/jost-latin-500-normal.woff2 public/assets/fontes/jost-latin-600-normal.woff2 public/assets/fontes/jost-latin-700-normal.woff2 \
         public/assets/fontes/ibm-plex-sans-latin-400-normal.woff2 public/assets/fontes/ibm-plex-sans-latin-500-normal.woff2 public/assets/fontes/ibm-plex-sans-latin-600-normal.woff2; do
  [ -s "$f" ] || falha "Falta $f. Execute primeiro: bash obter-bibliotecas.sh"
done
ok "Todos os ficheiros presentes"
for f in public/index.html public/privacidade.html public/referencias.html public/solucoes/*.html; do
  grep -q 'data-tema' "$f" || falha "$f não tem o aspeto da versão 1.5 (botão do tema). Execute: python3 ferramentas/aplicar_v15.py"
done
grep -q 'data-demo-dlp' public/index.html || falha "A página inicial não tem a demonstração de prevenção de fuga de dados. Execute: python3 ferramentas/aplicar_v15.py"
ok "Aspeto da versão 1.5 presente em todas as páginas"

command -v node >/dev/null 2>&1 || falha "O Node.js não está instalado (guia, passo 4)."
node -e "JSON.parse(require('fs').readFileSync('firebase.json','utf8'))" 2>/dev/null || falha "firebase.json tem um erro de formato."
node -e "JSON.parse(require('fs').readFileSync('.firebaserc','utf8'))" 2>/dev/null || falha ".firebaserc tem um erro de formato (aspas curvas?)."
for f in public/reservado/config.js public/reservado/app.js public/reservado/modelo.js public/reservado/cve.js public/assets/js/principal.js; do
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
curl -s https://dcabconsulting.com/reservado/cve.js | grep -q "export const FABRICANTES" && ok "Catálogo de fabricantes publicado (alertas de vulnerabilidades)" || aviso "reservado/cve.js não está publicado"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/solucoes/prevencao-fuga-dados)
[ "$c" = "200" ] && ok "Páginas das soluções publicadas" || aviso "Página das soluções respondeu $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/solucoes/nis2-decreto-lei-125-2025)
[ "$c" = "200" ] && ok "Página NIS2 publicada" || aviso "Página NIS2 respondeu $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/solucoes)
[ "$c" = "301" ] && ok "Redirecionamento de /solucoes ativo" || aviso "/solucoes respondeu $c (esperado 301)"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/assets/fontes/jost-latin-700-normal.woff2)
[ "$c" = "200" ] && ok "Tipos de letra publicados no próprio site" || aviso "Tipos de letra responderam $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/reservado/vendor/xlsx.full.min.js)
[ "$c" = "200" ] && ok "Bibliotecas da área reservada publicadas" || aviso "Bibliotecas da área reservada responderam $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/assets/video/dcab-ciclo.webm)
[ "$c" = "200" ] && ok "Vídeo da abertura publicado" || aviso "Vídeo respondeu $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/solucoes/simulador-classificacao)
[ "$c" = "200" ] && ok "Simulador de classificação publicado" || aviso "Simulador respondeu $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/referencias)
[ "$c" = "200" ] && ok "Página Referências e versão publicada" || aviso "Referências responderam $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/reservado/incidentes.js)
[ "$c" = "200" ] && ok "Módulo de incidentes publicado" || aviso "incidentes.js respondeu $c"
c=$(curl -s -o /dev/null -w "%{http_code}" https://dcabconsulting.com/api/incidentes/tarefas)
[ "$c" = "405" ] && ok "Ligação automática dos incidentes ativa (recusa pedidos sem assinatura)" || aviso "/api/incidentes respondeu $c (esperado 405; publique com: bash publicar.sh funcoes)"
curl -s https://dcabconsulting.com/solucoes/resposta-incidentes | grep -q "Pedir apoio urgente" && ok "Pedido de apoio urgente publicado" || aviso "A página de resposta a incidentes não tem o pedido de apoio urgente"
curl -s https://dcabconsulting.com/.well-known/security.txt | grep -q "^Contact:" && ok "security.txt publicado" || aviso "security.txt não está publicado"
curl -sI https://dcabconsulting.com/assets/js/menu.js | grep -qi "cache-control: no-cache" && ok "JavaScript sem cache longa" || aviso "O JavaScript ainda tem cache longa (confirme o firebase.json)"

echo
echo "${V}${N}Concluído.${F} Abra https://dcabconsulting.com/reservado numa janela privada (Cmd + Shift + N)."

#!/bin/bash
# DCAB Consulting — alertas de operação do projeto dcab-consulting (executar uma vez).
# Cria:
#   1. um canal de notificação por email;
#   2. duas métricas a partir dos registos: «hibp_429» (limite da HIBP atingido) e «erros_funcoes»;
#   3. três verificações de disponibilidade: site, área reservada e Observatório;
#   4. três políticas de alerta: quota HIBP, erros das funções e indisponibilidade;
#   5. retenção dos registos em 90 dias e uma exclusão nos registos: os registos de pedidos do Cloud Run (que trazem o IP de quem pede) deixam de ser guardados.
# Requer a Google Cloud CLI (gcloud), com sessão iniciada:  gcloud auth login
# Utilização, na pasta do site:  bash monitorizacao.sh
# Pode ser repetido: o que já existe não é criado de novo.

PROJ=dcab-consulting
V=$'\033[32m'; E=$'\033[31m'; A=$'\033[33m'; N=$'\033[1m'; F=$'\033[0m'
ok()    { echo "${V}✔${F} $1"; }
aviso() { echo "${A}!${F} $1"; }
falha() { echo; echo "${E}✘ $1${F}"; exit 1; }

command -v gcloud >/dev/null 2>&1 || falha "A Google Cloud CLI não está instalada. Instale-a (https://cloud.google.com/sdk/docs/install) e execute: gcloud auth login"
gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@" || falha "Sem sessão iniciada na Google Cloud CLI. Execute: gcloud auth login"
gcloud config set project "$PROJ" >/dev/null 2>&1 || falha "Não foi possível escolher o projeto $PROJ."
gcloud services enable monitoring.googleapis.com logging.googleapis.com --project "$PROJ" >/dev/null 2>&1 || aviso "Não foi possível confirmar as APIs de Monitoring e Logging (podem já estar ativas)."

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "${N}1. Canal de notificação${F}"
read -r -p "   Email que recebe os alertas: " EMAIL
[[ "$EMAIL" == *@*.* ]] || falha "Endereço de email inválido."
CANAL=$(gcloud beta monitoring channels list --project "$PROJ" --filter="type=\"email\" AND labels.email_address=\"$EMAIL\"" --format="value(name)" 2>/dev/null | head -1)
if [ -z "$CANAL" ]; then
  CANAL=$(gcloud beta monitoring channels create --project "$PROJ" --display-name="Alertas DCAB ($EMAIL)" --type=email \
          --channel-labels=email_address="$EMAIL" --format="value(name)") || falha "Não foi possível criar o canal de notificação."
fi
ok "Canal: $CANAL"

echo "${N}2. Métricas a partir dos registos${F}"
metrica() {
  gcloud logging metrics describe "$1" --project "$PROJ" >/dev/null 2>&1 && { ok "Métrica $1 já existe"; return; }
  gcloud logging metrics create "$1" --project "$PROJ" --description="$2" --log-filter="$3" >/dev/null && ok "Métrica $1 criada" || falha "Não foi possível criar a métrica $1."
}
metrica hibp_429 "Pedidos recusados pela HIBP por limite (Observatório e vigilância)" 'jsonPayload.evento="hibp_429"'
metrica erros_funcoes "Erros registados pelas Cloud Functions" 'resource.type="cloud_run_revision" AND (jsonPayload.evento="erro_funcao" OR (severity>=ERROR AND NOT log_id("run.googleapis.com/requests")))'

echo "${N}3. Verificações de disponibilidade${F}"
disponibilidade() {
  local nome="$1" host="$2" caminho="$3"
  gcloud monitoring uptime list-configs --project "$PROJ" --filter="displayName=\"$nome\"" --format="value(name)" 2>/dev/null | grep -q . && { ok "Verificação «$nome» já existe"; return; }
  gcloud monitoring uptime create "$nome" --project "$PROJ" --resource-type=uptime-url \
    --resource-labels=host="$host",project_id="$PROJ" --path="$caminho" --protocol=https --period=5 >/dev/null \
    && ok "Verificação «$nome» criada (https://$host$caminho, de 5 em 5 minutos)" \
    || aviso "Não foi possível criar «$nome» pela linha de comandos. Crie-a na consola: Monitoring › Verificações de disponibilidade."
}
disponibilidade "Site DCAB" "dcabconsulting.com" "/"
disponibilidade "Área reservada" "dcabconsulting.com" "/reservado"
disponibilidade "Observatório (observatorio.dcabconsulting.com)" "observatorio.dcabconsulting.com" "/"

echo "${N}4. Políticas de alerta${F}"
politica() {
  local nome="$1" ficheiro="$2"
  gcloud alpha monitoring policies list --project "$PROJ" --filter="displayName=\"$nome\"" --format="value(name)" 2>/dev/null | grep -q . && { ok "Alerta «$nome» já existe"; return; }
  gcloud alpha monitoring policies create --project "$PROJ" --policy-from-file="$ficheiro" >/dev/null \
    && ok "Alerta «$nome» criado" || aviso "Não foi possível criar o alerta «$nome». Veja GUIA-MONITORIZACAO.md para o criar na consola."
}

cat > "$TMP/hibp.json" <<JSON
{
  "displayName": "HIBP: limite de pedidos atingido",
  "documentation": { "content": "A Have I Been Pwned recusou pedidos por limite. A chave é partilhada entre o Observatório e a vigilância. Ver os registos com jsonPayload.evento=\"hibp_429\".", "mimeType": "text/markdown" },
  "combiner": "OR",
  "conditions": [{
    "displayName": "Pedidos recusados pela HIBP",
    "conditionThreshold": {
      "filter": "metric.type=\"logging.googleapis.com/user/hibp_429\" AND resource.type=\"cloud_run_revision\"",
      "aggregations": [{ "alignmentPeriod": "600s", "perSeriesAligner": "ALIGN_SUM", "crossSeriesReducer": "REDUCE_SUM" }],
      "comparison": "COMPARISON_GT", "thresholdValue": 0, "duration": "0s",
      "trigger": { "count": 1 }
    }
  }],
  "alertStrategy": { "autoClose": "86400s" },
  "notificationChannels": ["$CANAL"]
}
JSON
cat > "$TMP/erros.json" <<JSON
{
  "displayName": "Cloud Functions: erros",
  "documentation": { "content": "Mais de 3 erros em 10 minutos nas funções do site ou do Observatório. Ver os registos com jsonPayload.evento=\"erro_funcao\".", "mimeType": "text/markdown" },
  "combiner": "OR",
  "conditions": [{
    "displayName": "Erros das funções",
    "conditionThreshold": {
      "filter": "metric.type=\"logging.googleapis.com/user/erros_funcoes\" AND resource.type=\"cloud_run_revision\"",
      "aggregations": [{ "alignmentPeriod": "600s", "perSeriesAligner": "ALIGN_SUM", "crossSeriesReducer": "REDUCE_SUM" }],
      "comparison": "COMPARISON_GT", "thresholdValue": 3, "duration": "0s",
      "trigger": { "count": 1 }
    }
  }],
  "alertStrategy": { "autoClose": "86400s" },
  "notificationChannels": ["$CANAL"]
}
JSON
cat > "$TMP/disponibilidade.json" <<JSON
{
  "displayName": "Disponibilidade: site, área reservada ou Observatório em baixo",
  "documentation": { "content": "Uma verificação de disponibilidade falhou em mais de uma região durante 10 minutos.", "mimeType": "text/markdown" },
  "combiner": "OR",
  "conditions": [{
    "displayName": "Verificação de disponibilidade a falhar",
    "conditionThreshold": {
      "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\"",
      "aggregations": [{ "alignmentPeriod": "1200s", "perSeriesAligner": "ALIGN_NEXT_OLDER", "crossSeriesReducer": "REDUCE_COUNT_FALSE", "groupByFields": ["metric.label.check_id"] }],
      "comparison": "COMPARISON_GT", "thresholdValue": 1, "duration": "600s",
      "trigger": { "count": 1 }
    }
  }],
  "alertStrategy": { "autoClose": "86400s" },
  "notificationChannels": ["$CANAL"]
}
JSON
politica "HIBP: limite de pedidos atingido" "$TMP/hibp.json"
politica "Cloud Functions: erros" "$TMP/erros.json"
politica "Disponibilidade: site, área reservada ou Observatório em baixo" "$TMP/disponibilidade.json"

echo "${N}5. Registos: 90 dias e sem endereços IP${F}"
gcloud logging buckets update _Default --location=global --retention-days=90 --project "$PROJ" >/dev/null 2>&1 \
  && ok "Registos guardados durante 90 dias" || aviso "Não foi possível alterar a retenção. Faça-o na consola: Logging › Armazenamento de registos › _Default."
if gcloud logging sinks describe _Default --project "$PROJ" --format=json 2>/dev/null | grep -q '"pedidos-sem-ip"'; then
  ok "Exclusão «pedidos-sem-ip» já existe"
else
  gcloud logging sinks update _Default --project "$PROJ" \
    --add-exclusion=name=pedidos-sem-ip,description="Não guardar registos de pedidos do Cloud Run (incluem o IP de quem pede)",filter='log_id("run.googleapis.com/requests")' >/dev/null \
    && ok "Os registos de pedidos do Cloud Run deixaram de ser guardados" \
    || aviso "Não foi possível criar a exclusão. Faça-a na consola: Logging › Router de registos › _Default › Editar › Exclusões."
fi

echo
echo "${V}${N}Concluído.${F} Na consola: Monitoring › Alertas, para ver as políticas, e Monitoring › Verificações de disponibilidade."

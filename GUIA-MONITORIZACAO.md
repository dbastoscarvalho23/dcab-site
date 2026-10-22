# Monitorização e alertas (dcab-consulting)

O script `monitorizacao.sh` cria tudo de uma vez. Precisa da Google Cloud CLI.

```bash
# instalar (uma vez): https://cloud.google.com/sdk/docs/install  — no Mac também: brew install --cask google-cloud-sdk
gcloud auth login
cd ~/Documents/site-dcabconsulting
bash monitorizacao.sh
```

| O que cria | Para quê |
|---|---|
| Canal de email | Recebe os alertas |
| Métrica `hibp_429` | Conta as vezes que a Have I Been Pwned recusou pedidos por limite. A chave é a mesma no Observatório e na vigilância |
| Métrica `erros_funcoes` | Conta os erros das Cloud Functions (os registos já não levam emails nem IPs) |
| 3 verificações de disponibilidade | dcabconsulting.com, /reservado e observatorio.dcabconsulting.com, de 5 em 5 minutos |
| 3 alertas | HIBP com limite atingido (qualquer ocorrência em 10 min), mais de 3 erros em 10 min, verificação a falhar durante 10 min |
| Retenção de 90 dias | Registos de erros e funcionamento, o prazo indicado na política de privacidade |
| Exclusão `pedidos-sem-ip` | Os registos de pedidos do Cloud Run trazem o IP de quem pede; deixam de ser guardados |

## Se preferir a consola

1. **Logging › Métricas baseadas em registos › Criar métrica** (tipo contador):
   - `hibp_429`, filtro `jsonPayload.evento="hibp_429"`;
   - `erros_funcoes`, filtro `resource.type="cloud_run_revision" AND (jsonPayload.evento="erro_funcao" OR (severity>=ERROR AND NOT log_id("run.googleapis.com/requests")))`.
2. **Monitoring › Verificações de disponibilidade › Criar**: HTTPS, anfitrião e caminho como na tabela, de 5 em 5 minutos.
3. **Monitoring › Alertas › Criar política**: escolha a métrica (`logging/user/hibp_429`, `logging/user/erros_funcoes` ou «Uptime check: Check passed»), limiar como na tabela, canal de email.
4. **Logging › Router de registos › _Default › Editar › Exclusões › Adicionar**: nome `pedidos-sem-ip`, filtro `log_id("run.googleapis.com/requests")`.
5. **Logging › Armazenamento de registos › _Default**: retenção de 90 dias (o prazo da política de privacidade).

## Consultar

- Limites da HIBP: Logging › Explorador de registos › `jsonPayload.evento="hibp_429"`.
- Erros: `jsonPayload.evento="erro_funcao"` (campo `contexto` indica a função).
- Quota da HIBP: painel da HIBP › API key › utilização. O plano Core tem um limite de pedidos por minuto; se os alertas se repetirem, separar a chave do Observatório da chave da vigilância.

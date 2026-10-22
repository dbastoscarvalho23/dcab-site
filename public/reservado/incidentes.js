/* Área reservada DCAB — incidentes: prazos de notificação e minutas.
 * Módulo sem dependências: pode ser testado fora do navegador (functions/test/incidentes.test.mjs).
 * Base legal verificada a 18-10-2026: DL 125/2025, anexo (RJC), arts. 40.º a 44.º; Regulamento n.º 756/2026, arts. 17.º, 20.º e 22.º;
 * RGPD, arts. 33.º e 34.º; Reg. Delegado (UE) 2025/301, art. 5.º; Lei 109/2009, arts. 4.º e 6.º; Código Penal, art. 115.º.
 * Por confirmar no Diário da República: o texto do art. 48.º do RJC (comunicação aos destinatários dos serviços).
 * A obrigação é sempre da entidade: a DCAB prepara as minutas e o cliente submete.
 */

// «Por triar»: aberto automaticamente (formulário do site ou CRM) e ainda sem avaliação da equipa
export const ESTADOS = ["Por triar", "Aberto", "Contido", "Erradicado", "Recuperado", "Encerrado"];
export const ESTADOS_PROVA = ["Pedida", "Recebida", "Validada", "Recusada", "Anulada"];
export const ORIGENS = { manual: "Registado na área reservada", formulario: "Pedido pelo formulário do site", crm: "Aberto a partir do CRM" };
export const SIM_NAO = ["Em avaliação", "Sim", "Não"];
export const QUALIFICACOES = ["Por confirmar", "Entidade essencial", "Entidade importante", "Entidade pública relevante", "Não abrangida pelo DL 125/2025"];
export const RISCOS = ["Por avaliar", "Improvável", "Risco", "Risco elevado"];
// Classes da Taxonomia Comum da Rede Nacional de CSIRT, versão 3.3
export const TIPOS = ["Conteúdo abusivo", "Código malicioso", "Recolha de informação", "Tentativa de intrusão", "Intrusão",
  "Disponibilidade", "Segurança da informação", "Fraude", "Vulnerabilidade", "Outro"];
export const ESTADOS_NOTIFICACAO = ["Por enviar", "Enviada", "Não aplicável"];

const H = 3600000;
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.toISOString().slice(0, 10);

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em UTC
export function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

// Feriados nacionais obrigatórios (Código do Trabalho, art. 234.º). O Carnaval e os feriados municipais não contam.
export function feriados(ano) {
  const p = pascoa(ano);
  const desloca = (dias) => iso(new Date(p.getTime() + dias * 86400000));
  return new Set([
    ano + "-01-01", desloca(-2), iso(p), ano + "-04-25", ano + "-05-01", desloca(60), ano + "-06-10",
    ano + "-08-15", ano + "-10-05", ano + "-11-01", ano + "-12-01", ano + "-12-08", ano + "-12-25",
  ]);
}

const diaUtil = (d) => { const w = d.getUTCDay(); return w !== 0 && w !== 6 && !feriados(d.getUTCFullYear()).has(iso(d)); };

// Dia civil e desvio horário em Lisboa (hora de verão incluída)
const fmtLisboa = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
function partesLisboa(d) {
  const p = Object.fromEntries(fmtLisboa.formatToParts(d).map((x) => [x.type, x.value]));
  return { ano: +p.year, mes: +p.month, dia: +p.day, h: +p.hour, m: +p.minute, s: +p.second };
}
function fimDoDiaLisboa(ano, mes, dia) {
  const aprox = Date.UTC(ano, mes - 1, dia, 23, 59, 59);
  const p = partesLisboa(new Date(aprox));
  const desvio = Date.UTC(p.ano, p.mes - 1, p.dia, p.h, p.m, p.s) - aprox;
  return new Date(aprox - desvio);
}

/* Soma dias úteis a uma data (contagem como no CPA, art. 87.º: o dia do evento não conta;
 * o prazo termina às 23:59:59 de Lisboa do último dia útil). */
export function somarDiasUteis(data, dias) {
  const l = partesLisboa(data);
  const d = new Date(Date.UTC(l.ano, l.mes - 1, l.dia));
  let n = 0;
  while (n < dias) { d.setUTCDate(d.getUTCDate() + 1); if (diaUtil(d)) n++; }
  return fimDoDiaLisboa(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export const lerData = (s) => {
  if (!s || typeof s !== "string") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const notif = (inc, chave) => (inc.notificacoes && inc.notificacoes[chave]) || { estado: "Por enviar" };

/* Lista de comunicações aplicáveis, com o prazo de cada uma.
 * Devolve [{ chave, destinatario, momento, base, limite (Date|null), regra, estado, atraso, obrigatoria }] */
export function calcularPrazos(inc, agora = new Date()) {
  const r = [];
  const T0 = lerData(inc.verificadoEm);
  const detecao = lerData(inc.detetadoEm);
  const fim = lerData(inc.fimImpactoEm);
  // Os prazos correm desde a verificação de que existe, ou pode vir a existir, um incidente significativo:
  // com a hora da verificação preenchida, contam mesmo que a avaliação ainda esteja «Em avaliação».
  const nis2 = inc.regimes && inc.regimes.nis2 && (inc.significativo === "Sim" || (inc.significativo === "Em avaliação" && !!T0));
  const doisHoras = nis2 && detecao && fim && fim.getTime() - detecao.getTime() <= 2 * H;

  const juntar = (chave, destinatario, momento, base, limite, regra, obrigatoria = true) => {
    const n = notif(inc, chave);
    const enviada = n.estado === "Enviada";
    const naoAplica = n.estado === "Não aplicável";
    r.push({ chave, destinatario, momento, base, limite, regra, obrigatoria, estado: n.estado, enviadaEm: n.enviadaEm || "", referencia: n.referencia || "",
      atraso: !enviada && !naoAplica && limite && agora > limite ? true : false,
      restante: !enviada && !naoAplica && limite ? limite.getTime() - agora.getTime() : null });
  };

  if (nis2) {
    if (doisHoras) {
      juntar("cncs-fim", "CNCS", "Notificação de fim do impacto significativo", "Fim do impacto", fim ? new Date(fim.getTime() + 24 * H) : null,
        "Resolvido nas 2 horas seguintes à deteção: basta a notificação do fim do impacto, até 24 horas depois de o impacto terminar (DL 125/2025, anexo, arts. 41.º, n.º 2, e 43.º).");
    } else {
      juntar("cncs-inicial", "CNCS", "Notificação inicial", "Verificação do incidente significativo", T0 ? new Date(T0.getTime() + 24 * H) : null,
        "Sem demora injustificada e até 24 horas depois de verificar que existe, ou pode vir a existir, um incidente significativo (DL 125/2025, anexo, arts. 40.º e 42.º, n.º 1). Nas comunicações eletrónicas e serviços postais a autoridade é a ANACOM; nos serviços de confiança, o GNS.");
      juntar("cncs-atualizacao", "CNCS", "Atualização da notificação", "Verificação do incidente significativo", T0 ? new Date(T0.getTime() + 72 * H) : null,
        "Quando necessário, até 72 horas depois da verificação: avaliação inicial da gravidade e do impacto e, se houver, indicadores de exposição (art. 42.º, n.º 3).", false);
      juntar("cncs-fim", "CNCS", "Notificação de fim do impacto significativo", "Fim do impacto", fim ? new Date(fim.getTime() + 24 * H) : null,
        "Até 24 horas depois de o impacto deixar de ser significativo (art. 43.º, n.º 1).");
    }
    const nf = notif(inc, "cncs-fim");
    const baseFinal = lerData(nf.enviadaEm);
    juntar("cncs-final", "CNCS", "Relatório final", "Envio da notificação de fim do impacto", baseFinal ? somarDiasUteis(baseFinal, 30) : null,
      "Até 30 dias úteis depois da notificação de fim do impacto (art. 44.º, n.º 1).");
    juntar("cncs-intercalar", "CNCS", "Relatório intercalar", "Pedido da autoridade ou incidente ainda em curso", null,
      "A pedido da autoridade. Se o incidente ainda estiver em curso quando terminar o prazo do relatório final, segue um relatório intercalar por semana até ao final (arts. 41.º, n.º 3, e 44.º, n.os 3 e 4).", false);
    juntar("destinatarios", "Destinatários dos serviços", "Comunicação aos destinatários afetados", "Verificação do incidente significativo", null,
      "Quando o incidente puder afetar a prestação dos serviços (DL 125/2025, anexo, art. 48.º). Confirme os termos do artigo no Diário da República antes de usar esta minuta.", false);
  }

  const pessoais = inc.dados && (inc.dados.pessoais === "Sim" || (inc.dados.pessoais === "Em avaliação" && !!lerData(inc.dados.conhecimentoEm)));
  if (pessoais) {
    const conhecimento = lerData(inc.dados.conhecimentoEm);
    const risco = inc.dados.risco || "Por avaliar";
    if (risco !== "Improvável") {
      juntar("cnpd", "CNPD", "Notificação de violação de dados pessoais", "Conhecimento da violação", conhecimento ? new Date(conhecimento.getTime() + 72 * H) : null,
        "Sem demora injustificada e, sempre que possível, até 72 horas depois de ter conhecimento (com um grau razoável de certeza). Depois das 72 horas, a notificação explica o atraso. Pode ser feita por fases (RGPD, art. 33.º, n.os 1 e 4).");
    }
    if (risco === "Risco elevado") {
      juntar("titulares", "Titulares dos dados", "Comunicação aos titulares", "Conhecimento da violação", null,
        "Sem demora injustificada, quando houver risco elevado. Dispensada se os dados estiverem cifrados ou se medidas posteriores eliminarem o risco elevado; com esforço desproporcionado, faz-se comunicação pública (RGPD, art. 34.º).");
    }
    juntar("registo-rgpd", "Registo interno", "Registo da violação", "Conhecimento da violação", null,
      "Obrigatório em todos os casos, mesmo sem notificação (RGPD, art. 33.º, n.º 5).");
  }

  if (inc.regimes && inc.regimes.dora) {
    juntar("dora", "Banco de Portugal, ASF ou CMVM", "Notificação inicial DORA", "Classificação como incidente grave", null,
      "Até 4 horas depois da classificação como incidente grave e, no máximo, 24 horas depois do conhecimento; relatório intercalar até 72 horas depois da notificação inicial; relatório final até 1 mês depois do último intercalar (Regulamento Delegado (UE) 2025/301, art. 5.º). Segue o modelo da autoridade.", true);
  }

  if (inc.suspeitaIlicito === "Sim") {
    const base = detecao;
    juntar("queixa", "Polícia Judiciária ou Ministério Público", "Queixa-crime", "Conhecimento do facto e dos autores", base ? new Date(base.getTime() + 183 * 86400000) : null,
      "O acesso ilegítimo e o dano informático nas formas simples dependem de queixa: 6 meses a contar do conhecimento do facto e dos autores (Lei 109/2009, arts. 4.º, n.º 6, e 6.º, n.º 7; Código Penal, art. 115.º). A sabotagem e a falsidade informáticas são crimes públicos. Prazo calculado a partir da deteção, por prudência. Preservar as provas antes de reinstalar.", false);
  }

  juntar("administracao", "Órgão de administração", "Informação à administração", "Deteção", null, "Interna. Para a administração decidir as notificações, a comunicação a clientes, o contacto com a seguradora e a queixa.", false);
  return r;
}

export function proximoPrazo(prazos) {
  return prazos.filter((p) => p.limite && p.estado === "Por enviar").sort((a, b) => a.limite - b.limite)[0] || null;
}

export function formatarRestante(ms) {
  if (ms === null || ms === undefined) return "";
  const neg = ms < 0, a = Math.abs(ms);
  const h = Math.floor(a / H), m = Math.floor((a % H) / 60000);
  const t = h >= 48 ? Math.floor(h / 24) + " dias" : h + " h " + pad(m) + " min";
  return neg ? "em atraso há " + t : "faltam " + t;
}

/* ---------- Minutas ----------
 * Texto simples para copiar para a plataforma do CNCS, o formulário da CNPD, um email ou uma carta.
 * Os campos por preencher aparecem entre parênteses retos. */
const v = (x, alt) => (x && String(x).trim() ? String(x).trim() : "[" + alt + "]");
const dh = (s) => {
  const d = lerData(s);
  return d ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(d) + " (hora de Lisboa)" : "[data e hora]";
};

function cabecalho(inc, cli, titulo) {
  return [titulo, "",
    "Entidade: " + v(cli.nome, "denominação social"),
    "NIPC: " + v(cli.nipc, "NIPC"),
    "Qualificação: " + v(inc.qualificacao, "qualificação no DL 125/2025"),
    "Referência interna do incidente: " + v(inc.referencia, "referência"),
    "Responsável de cibersegurança: " + v(inc.contactos && inc.contactos.responsavel, "nome, email e telefone"),
    "Ponto de contacto permanente: " + v(inc.contactos && inc.contactos.pontoContacto, "nome, email e telefone"), ""];
}

export const MINUTAS = {
  "cncs-inicial": { titulo: "CNCS · Notificação inicial", texto: (inc, cli) => [
    ...cabecalho(inc, cli, "NOTIFICAÇÃO INICIAL DE INCIDENTE SIGNIFICATIVO (DL 125/2025, anexo, art. 42.º)"),
    "a) Representante para este incidente (se diferente do ponto de contacto permanente): [nome, telefone e email]",
    "b) Data e hora do início do incidente: [início, se conhecido] · data e hora da deteção: " + dh(inc.detetadoEm),
    "   Verificação de que é ou pode vir a ser significativo: " + dh(inc.verificadoEm),
    "c) Descrição breve: " + v(inc.descricao, "o que aconteceu"),
    "   Categoria da causa e dos efeitos (taxonomia do CNCS): " + v(inc.tipo, "categoria"),
    "d) Estimativa do impacto: " + v(inc.impacto, "utilizadores afetados, duração, distribuição geográfica"),
    "   Serviços afetados: " + v(inc.servicosAfetados, "serviços"),
    "   Impacto noutros Estados-Membros: " + v(inc.transfronteirico, "Sim / Não / Em avaliação"),
    "   Suspeita de ato ilícito ou malicioso: " + v(inc.suspeitaIlicito, "Sim / Não / Em avaliação"),
    "   Medidas já tomadas: " + v(inc.medidas, "contenção em curso"),
    "", "Submeter no formulário da área reservada da plataforma do CNCS (Regulamento n.º 756/2026, art. 20.º). Se a plataforma estiver indisponível, usar o email ou o telefone publicados no site do CNCS (art. 17.º). Guardar o comprovativo e a referência."].join("\n") },
  "cncs-atualizacao": { titulo: "CNCS · Atualização da notificação", texto: (inc, cli) => [
    ...cabecalho(inc, cli, "ATUALIZAÇÃO DA NOTIFICAÇÃO (DL 125/2025, anexo, art. 42.º, n.º 3)"),
    "Referência da notificação inicial: " + v(inc.notificacoes && inc.notificacoes["cncs-inicial"] && inc.notificacoes["cncs-inicial"].referencia, "referência"),
    "1. Avaliação inicial da gravidade e do impacto: " + v(inc.impacto, "gravidade, duração, utilizadores e serviços afetados"),
    "2. Indicadores de exposição: " + v(inc.iocs, "indicadores, se existirem"),
    "3. Estado atual e medidas tomadas: " + v(inc.estado, "estado") + " · " + v(inc.medidas, "medidas"),
    "", "Submeter na plataforma do CNCS, associada ao mesmo incidente."].join("\n") },
  "cncs-fim": { titulo: "CNCS · Fim do impacto significativo", texto: (inc, cli) => [
    ...cabecalho(inc, cli, "NOTIFICAÇÃO DE FIM DO IMPACTO SIGNIFICATIVO (DL 125/2025, anexo, art. 43.º)"),
    "Referência da notificação inicial: " + v(inc.notificacoes && inc.notificacoes["cncs-inicial"] && inc.notificacoes["cncs-inicial"].referencia, "referência, se houve notificação inicial"),
    "a) Atualização da notificação inicial: " + v(inc.descricao, "descrição atualizada"),
    "b) Medidas de resolução: " + v(inc.medidas, "medidas"),
    "c) Situação quando o impacto deixou de ser significativo (" + dh(inc.fimImpactoEm) + "): " + v(inc.impacto, "utilizadores afetados, duração, distribuição geográfica, impacto noutros Estados-Membros"),
    "   Tempo estimado para a recuperação total: [estimativa]",
    "   Causa provável (preliminar): " + v(inc.causa, "causa"),
    "", "Submeter na plataforma do CNCS. O relatório final segue até 30 dias úteis depois desta notificação."].join("\n") },
  "cncs-final": { titulo: "CNCS · Relatório final", texto: (inc, cli) => {
    const n = inc.notificacoes || {};
    const feitas = [n.cnpd && n.cnpd.estado === "Enviada" ? "CNPD (" + (n.cnpd.referencia || "sem referência") + ")" : null,
      n.queixa && n.queixa.estado === "Enviada" ? "queixa-crime (" + (n.queixa.referencia || "sem referência") + ")" : null,
      n.dora && n.dora.estado === "Enviada" ? "autoridade financeira (" + (n.dora.referencia || "sem referência") + ")" : null].filter(Boolean);
    return [
    ...cabecalho(inc, cli, "RELATÓRIO FINAL (DL 125/2025, anexo, art. 44.º)"),
    "Referência da notificação inicial: " + v(n["cncs-inicial"] && n["cncs-inicial"].referencia, "referência"),
    "a) Data e hora em que o incidente assumiu impacto significativo: " + dh(inc.verificadoEm) + " · e em que o perdeu: " + dh(inc.fimImpactoEm),
    "b) Impacto: " + v(inc.impacto, "utilizadores afetados, duração, distribuição geográfica, descrição segundo a taxonomia"),
    "   Categoria (taxonomia do CNCS): " + v(inc.tipo, "categoria") + " · Causa raiz: " + v(inc.causa, "causa"),
    "c) Medidas de mitigação aplicadas: " + v(inc.medidas, "medidas"),
    "d) Impacto residual: [o que ainda não está recuperado]",
    "e) Notificações feitas ao Ministério Público, à CNPD ou a autoridades setoriais: " + (feitas.length ? feitas.join("; ") : "[nenhuma ou indicar quais]"),
    "f) Outra informação relevante: " + v(inc.iocs, "indicadores, lições aprendidas e ações corretivas"),
    "", "Submeter na plataforma do CNCS."].join("\n"); } },
  "cncs-intercalar": { titulo: "CNCS · Relatório intercalar", texto: (inc, cli) => [
    ...cabecalho(inc, cli, "RELATÓRIO INTERCALAR (DL 125/2025, anexo, art. 44.º, n.os 3 e 4)"),
    "Referência da notificação inicial: " + v(inc.notificacoes && inc.notificacoes["cncs-inicial"] && inc.notificacoes["cncs-inicial"].referencia, "referência"),
    "1. Ponto de situação: " + v(inc.estado, "estado") + " · " + v(inc.descricao, "atualização"),
    "2. Medidas tomadas: " + v(inc.medidas, "medidas"),
    "3. Situação do impacto: " + v(inc.impacto, "utilizadores, duração, distribuição geográfica, tempo estimado de recuperação"),
    "", "Enviar a pedido da autoridade e, se o incidente continuar em curso no fim do prazo do relatório final, todas as semanas."].join("\n") },
  destinatarios: { titulo: "Destinatários dos serviços", texto: (inc, cli) => [
    "Assunto: Incidente de cibersegurança que pode afetar o serviço " + v(inc.servicosAfetados, "serviço"), "",
    "Exmo.(a) Senhor(a),", "",
    v(cli.nome, "entidade") + " detetou em " + dh(inc.detetadoEm) + " um incidente de cibersegurança que pode afetar o serviço que lhe prestamos.", "",
    "O que aconteceu: " + v(inc.descricao, "descrição em linguagem simples"), "",
    "O que estamos a fazer: " + v(inc.medidas, "medidas"), "",
    "O que pode fazer para se proteger: [medidas que o destinatário pode tomar, por exemplo mudar a palavra-passe ou desconfiar de mensagens em nome da entidade]", "",
    "Contacto para esclarecimentos: " + v(inc.contactos && inc.contactos.pontoContacto, "contacto"), "",
    "Com os melhores cumprimentos,", v(cli.nome, "entidade")].join("\n") },
  cnpd: { titulo: "CNPD · Notificação de violação de dados pessoais", texto: (inc, cli) => [
    "NOTIFICAÇÃO DE VIOLAÇÃO DE DADOS PESSOAIS (RGPD, art. 33.º)", "",
    "Responsável pelo tratamento: " + v(cli.nome, "denominação social") + " · NIPC " + v(cli.nipc, "NIPC"),
    "Encarregado da proteção de dados ou contacto: " + v(inc.contactos && inc.contactos.epd, "nome, email e telefone"), "",
    "a) Natureza da violação: " + v(inc.descricao, "confidencialidade, integridade ou disponibilidade; o que aconteceu"),
    "   Categorias de titulares e número aproximado: " + v(inc.dados && inc.dados.titulares, "categorias e número"),
    "   Categorias de dados e número aproximado de registos: " + v(inc.dados && inc.dados.categorias, "categorias e número"),
    "b) Contacto onde obter mais informação: " + v(inc.contactos && inc.contactos.epd, "contacto"),
    "c) Consequências prováveis: " + v(inc.impacto, "consequências para os titulares"),
    "d) Medidas adotadas ou propostas, incluindo para atenuar os efeitos: " + v(inc.medidas, "medidas"), "",
    "Data e hora em que teve conhecimento da violação: " + dh(inc.dados && inc.dados.conhecimentoEm),
    "Avaliação do risco para os titulares: " + v(inc.dados && inc.dados.risco, "avaliação"),
    "Se passaram mais de 72 horas: motivo do atraso: [motivo]", "",
    "Submeter no formulário de notificação de violações de dados da CNPD (www.cnpd.pt/databreach). A informação pode ser dada por fases (art. 33.º, n.º 4)."].join("\n") },
  titulares: { titulo: "Comunicação aos titulares dos dados", texto: (inc, cli) => [
    "Assunto: Informação sobre uma violação dos seus dados pessoais", "",
    "Caro(a) [nome],", "",
    "Informamos que " + v(cli.nome, "entidade") + " sofreu um incidente de segurança que afetou dados pessoais seus.", "",
    "O que aconteceu: " + v(inc.descricao, "descrição em linguagem clara e simples"), "",
    "Que dados foram afetados: " + v(inc.dados && inc.dados.categorias, "categorias de dados"), "",
    "Consequências prováveis: " + v(inc.impacto, "consequências"), "",
    "O que fizemos: " + v(inc.medidas, "medidas"), "",
    "O que recomendamos que faça: [por exemplo mudar a palavra-passe, desconfiar de mensagens e chamadas em nosso nome, vigiar movimentos bancários]", "",
    "Para mais informações, contacte: " + v(inc.contactos && inc.contactos.epd, "encarregado da proteção de dados ou contacto"), "",
    "Com os melhores cumprimentos,", v(cli.nome, "entidade"), "",
    "(RGPD, art. 34.º: linguagem clara e simples, com a informação das alíneas b), c) e d) do art. 33.º, n.º 3.)"].join("\n") },
  "registo-rgpd": { titulo: "Registo interno da violação", texto: (inc) => [
    "REGISTO DE VIOLAÇÃO DE DADOS PESSOAIS (RGPD, art. 33.º, n.º 5)", "",
    "Referência: " + v(inc.referencia, "referência"),
    "Factos: " + v(inc.descricao, "factos"),
    "Efeitos: " + v(inc.impacto, "efeitos"),
    "Medidas de reparação: " + v(inc.medidas, "medidas"),
    "Avaliação do risco: " + v(inc.dados && inc.dados.risco, "avaliação") + " · Fundamentação: " + v(inc.fundamentacao, "porque se notificou ou não"),
    "Data de conhecimento: " + dh(inc.dados && inc.dados.conhecimentoEm)].join("\n") },
  queixa: { titulo: "Queixa-crime", texto: (inc, cli) => [
    "Exmo. Senhor Procurador da República / Polícia Judiciária,", "",
    v(cli.nome, "entidade") + ", NIPC " + v(cli.nipc, "NIPC") + ", com sede em [morada], vem apresentar queixa contra desconhecidos pelos factos seguintes:", "",
    "1. Em " + dh(inc.detetadoEm) + " foi detetado: " + v(inc.descricao, "descrição dos factos"),
    "2. Sistemas e dados afetados: " + v(inc.servicosAfetados, "sistemas"),
    "3. Prejuízos estimados: [valor e natureza]",
    "4. Elementos de prova recolhidos e preservados: " + v(inc.iocs, "registos, mensagens, indicadores"),
    "", "Os factos podem integrar crimes previstos na Lei n.º 109/2009, de 15 de setembro (Lei do Cibercrime), designadamente acesso ilegítimo (art. 6.º), dano informático (art. 4.º) ou sabotagem informática (art. 5.º).",
    "Disponibilizamos os elementos de prova preservados e os contactos de " + v(inc.contactos && inc.contactos.responsavel, "responsável") + ".", "",
    "[Local e data] · [Assinatura de quem obriga a entidade]", "",
    "(A queixa identifica e é assinada por quem a apresenta: Código de Processo Penal, art. 246.º. Apresenta-se em qualquer departamento policial ou do Ministério Público.)"].join("\n") },
  administracao: { titulo: "Informação à administração", texto: (inc, cli) => [
    "Para: Órgão de administração de " + v(cli.nome, "entidade"), "Assunto: Incidente " + v(inc.referencia, "referência") + " · ponto de situação", "",
    "Deteção: " + dh(inc.detetadoEm) + " · Estado: " + v(inc.estado, "estado"),
    "Resumo: " + v(inc.descricao, "resumo"),
    "Incidente significativo (DL 125/2025): " + v(inc.significativo, "em avaliação") + (inc.fundamentacao ? " · " + inc.fundamentacao : ""),
    "Dados pessoais afetados: " + v(inc.dados && inc.dados.pessoais, "em avaliação") + " · risco: " + v(inc.dados && inc.dados.risco, "por avaliar"),
    "Impacto: " + v(inc.impacto, "impacto"),
    "Medidas: " + v(inc.medidas, "medidas"), "",
    "Decisões pedidas à administração: [aprovar notificações, comunicação a clientes, contacto com a seguradora, apresentação de queixa]"].join("\n") },
};

export function gerarReferencia(ano, existentes) {
  const usados = existentes.map((r) => { const m = /^INC-(\d{4})-(\d{3})$/.exec(r || ""); return m && Number(m[1]) === ano ? Number(m[2]) : 0; });
  return "INC-" + ano + "-" + String(Math.max(0, ...usados) + 1).padStart(3, "0");
}

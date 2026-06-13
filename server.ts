import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { FormState, Submission, MonthlyFormState, MonthlyReport } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// In-memory store (NÃO persistente — reinicia a cada restart do servidor).
// O registro permanente são os arquivos PDF/.md baixados pelo usuário.
const submissions: Submission[] = [];
let lastMonthlyReport: MonthlyReport | null = null;

// Helper to initialize custom server-side Gemini client safely (failsafe fallback if API key missing)
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ GEMINI_API_KEY is not configured or uses placeholder value. Gemini features will run in mock mode.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return null;
  }
}

// Calculate simple herd characteristics
function calculateMetrics(formState: FormState) {
  let totalHeads = 0;
  let totalBiomass = 0;
  let totalMsDia = 0;

  // Process standard categories
  const categories = Object.keys(formState.herd);
  categories.forEach((cat) => {
    const info = formState.herd[cat];
    if (info && info.heads > 0) {
      totalHeads += Number(info.heads);
      const biomass = Number(info.heads) * Number(info.weight);
      totalBiomass += biomass;
      // MS calculation: heads * weight * (imsCoef / 100)
      const ms = Number(info.heads) * Number(info.weight) * (Number(info.imsCoef) / 100);
      totalMsDia += ms;
    }
  });

  // Process extra categories (dynamic custom rows) if supplied
  (formState.extraCategories || []).forEach((cat) => {
    if (cat && Number(cat.heads) > 0) {
      totalHeads += Number(cat.heads);
      const biomass = Number(cat.heads) * Number(cat.weight);
      totalBiomass += biomass;
      const ms = Number(cat.heads) * Number(cat.weight) * (Number(cat.imsCoef) / 100);
      totalMsDia += ms;
    }
  });
  // Backward compatibility: legacy single extra category
  if (formState.extraCatName && formState.extraCatHeads > 0) {
    totalHeads += Number(formState.extraCatHeads);
    const biomass = Number(formState.extraCatHeads) * Number(formState.extraCatWeight);
    totalBiomass += biomass;
    const ms = Number(formState.extraCatHeads) * Number(formState.extraCatWeight) * (Number(formState.extraCatImsCoef) / 100);
    totalMsDia += ms;
  }

  const totalMsMes = totalMsDia * 30;

  // Monthly feeds
  const totalMonthlyFeedCost =
    Number(formState.custoMensalPastagem || 0) +
    Number(formState.custoVolumoso || 0) +
    Number(formState.custoSuplemento || 0);

  const costPerAnimalMonth = totalHeads > 0 ? totalMonthlyFeedCost / totalHeads : 0;

  // Suggested sizing calculations
  // Vertical Mixer size: We recommend a mixer that can process the daily demand in standard batches.
  // Generally, cows eat concentrado (around 1.5% to 2.5% of body weight for dry matter, but pasture provides forage).
  // Assuming cows eat ~2.5 kg of concentrado per day.
  const concentradoDailyKg = totalHeads * 2.5;
  let suggestedMixerCapacityKg = 500;
  if (concentradoDailyKg > 2000) {
    suggestedMixerCapacityKg = 1000;
  } else if (concentradoDailyKg > 4000) {
    suggestedMixerCapacityKg = 2000;
  } else if (concentradoDailyKg < 500) {
    suggestedMixerCapacityKg = 300;
  }

  // Silo suggested volume (m3) – based on monthly feed requirements.
  // 1 ton of feed of specific gravity 0.65 t/m3 requires 1.5 m3 of silo space.
  const feedMonthlyTons = (concentradoDailyKg * 30) / 1000;
  const suggestedSiloVolumeM3 = Math.max(15, Math.ceil(feedMonthlyTons * 1.54));

  return {
    totalHeads,
    totalBiomass: Math.round(totalBiomass),
    totalMsDia: parseFloat(totalMsDia.toFixed(1)),
    totalMsMes: parseFloat(totalMsMes.toFixed(1)),
    totalMonthlyFeedCost,
    costPerAnimalMonth: parseFloat(costPerAnimalMonth.toFixed(2)),
    suggestedMixerCapacityKg,
    suggestedSiloVolumeM3,
  };
}

// Rótulos legíveis das categorias do plantel
const HERD_LABELS: Record<string, string> = {
  bezerroLactente: "Bezerro(a) Lactente",
  bezerroDesmamado: "Bezerro(a) Desmamado(a)",
  novilha: "Novilha (8 a 24 meses)",
  vacaSolteira: "Vaca Solteira / Vazia",
  vacaParida: "Vaca Parida / Lactante",
  vacaGestanteSeca: "Vaca Gestante (Seca)",
  garroteRecria: "Garrote/Garrota",
  boiTerminacao: "Animal em Terminação",
  touro: "Touro",
};

const EQUIP_LABELS: Record<string, string> = {
  balancaTronco: "Balança de Tronco",
  forrageira: "Forrageira/Ensiladeira",
  misturador: "Misturador de Ração",
  moinho: "Moinho/Triturador",
  trator: "Trator",
  deposito: "Depósito/Galpão",
  balancaPesagem: "Balança de Pesagem de Fluxo",
  bombaTransferencia: "Bomba de Transferência",
};

const confinamentoLabel = (v: string) =>
  v === "sim_total" ? "Sim — confinamento total" :
  v === "sim_semi" ? "Sim — semi-confinamento" :
  v === "nao" ? "Não — manter a pasto" : "Ainda a avaliar";

// ESPELHO DO FORMULÁRIO — reprodução fiel e determinística das respostas (sem IA)
function buildFormMirror(f: FormState, m: any): string {
  const L: string[] = [];
  const line = (label: string, val: any) => {
    const v = (val === undefined || val === null || val === "") ? "—" : val;
    L.push(`   • ${label}: ${v}`);
  };
  L.push("================ ESPELHO DO FORMULÁRIO (respostas exatamente como preenchidas) ================\n");

  L.push("BLOCO 01 — IDENTIFICAÇÃO DO PREENCHEDOR");
  line("Nome", f.nomeProdutor);
  line("Cargo/Função", f.cargo);
  line("WhatsApp", f.contatoZap);
  line("E-mail", f.email);
  line("Cidade/Unidade", f.cidade);

  L.push("\nBLOCO 02 — COMPOSIÇÃO DO PLANTEL");
  Object.keys(HERD_LABELS).forEach((k) => {
    const i: any = (f.herd as any)[k];
    if (i && (i.heads > 0 || i.weight > 0)) line(HERD_LABELS[k], `${i.heads} cab. | PV ${i.weight} kg | IMS ${i.imsCoef}%`);
  });
  (f.extraCategories || []).forEach((c) => {
    if (c.name || c.heads > 0) line(`Categoria adicional: ${c.name || "(sem nome)"}`, `${c.heads} cab. | PV ${c.weight} kg | IMS ${c.imsCoef}%`);
  });
  line("TOTAL apurado", `${m.totalHeads} cabeças | Biomassa ${m.totalBiomass} kg PV | MS ${m.totalMsDia} kg/dia`);
  line("Rotina de controle do plantel", f.rotinaControle);

  L.push("\nBLOCO 03 — DESEMPENHO (GMD) E GENÉTICA");
  line("GMD bezerro desmamado (kg/dia)", f.bezerroDesmGmd);
  line("GMD novilha (kg/dia)", f.novilhaGmd);
  line("GMD garrote/garrota (kg/dia)", f.garroteGmd);
  line("GMD animal em terminação (kg/dia)", f.boiGmd);
  line("GMD vaca (kg/dia)", f.vacaGmd);
  line("Origem do GMD", f.gmdMedido);
  line("Peso de entrada (kg)", f.pesoEntrada);
  line("Peso alvo de abate (kg)", f.pesoAlvo);
  line("Rendimento de carcaça (%)", f.rendimentoCarcaça);
  line("Tempo de aprovação/terminação (dias)", f.tempoAprov);
  line("Raças predominantes", (f.racas && f.racas.length) ? f.racas.join(", ") : f.racaPredominante);
  line("Animais vendidos (12m)", f.animaisVendidosAnual);
  line("Rotina de aferição de desempenho", f.rotinaDesempenho);

  L.push("\nBLOCO 04 — COMERCIALIZAÇÃO");
  line("Preço da arroba (R$)", f.precoArroba);
  line("Destino principal da venda", f.destinoPrincipal === "Outro" && f.destinoPrincipalOutro ? `Outro (${f.destinoPrincipalOutro})` : f.destinoPrincipal);
  line("Custos de comercialização (R$/cabeça)", f.custoComercializacao);
  line("Tipo de contrato", f.contrato);
  line("Meses de maior venda", (f.sazonalidade || []).join(", "));
  line("Meta de receita anual (R$)", f.metaReceitaAnual);
  line("Rotina comercial", f.rotinaComercial);

  L.push("\nBLOCO 05 — ALIMENTAÇÃO E PASTAGEM");
  line("Área total de pastagem (ha)", f.areaTotalPastagem);
  line("Espécie predominante de pasto", f.especiePredominantePastagem);
  line("Estado de degradação", f.estadoMedioPastagem);
  line("Sistema de pastagem", f.sistemaPastejo);
  line("Controle de entrada/saída do pasto", f.metodoControlePastejo);
  line("Correção de solo/adubação", f.correcaoSoloAdubacao);
  line("Uso de vinhaça (alambique)", f.usoVinhaca);
  line("Custo da vinhaça (R$/ha)", f.custoVinhacaHa);
  line("Pragas mais comuns", f.pragasComuns);
  line("Técnicas de manejo de pasto", f.tecnicasManejo);
  line("Nº de piquetes", f.numPiquetes);
  line("Custo mensal de pastagem (R$)", f.custoMensalPastagem);
  line("Volumosos complementares", (f.volumosos || []).join(", ") + (f.capimTipo ? ` | Capim: ${f.capimTipo}` : ""));
  line("Volume de volumoso (ton/mês)", f.volumeMesVolumoso);
  line("Custo de volumoso (R$/mês)", f.custoVolumoso);
  line("Suplementos utilizados", (f.suplementos || []).join(", "));
  line("Volume de suplemento (ton/mês)", f.volumeSuplMes);
  line("Custo de suplemento (R$/mês)", f.custoSuplemento);
  line("Fornecedor de suplemento", f.fornecedorSuplemento);
  line("Distância do fornecedor (km)", f.distanciaFornecedor);
  line("Frequência de fornecimento", f.frequenciaFornecimento);
  line("Rotina de alimentação", f.rotinaAlimentacao);
  line("Planejamento estratégico de suplemento/ração", f.planejamentoSuplemento);

  L.push("\nBLOCO 06 — CUSTOS OPERACIONAIS");
  line("Mão de obra direta (R$/mês)", f.maoDeObraDireta);
  line("Sanidade (R$/mês)", f.sanidade);
  line("Manutenção de equipamentos (R$/mês)", f.manutencaoEquip);
  line("Outro custo (R$/mês)", `${f.custoExtra} ${f.descCustoExtra ? "(" + f.descCustoExtra + ")" : ""}`);
  line("Rotina de apuração de custos", f.rotinaCustos);

  L.push("\nBLOCO 07 — INFRAESTRUTURA EXISTENTE (EQUIPAMENTOS E INSTALAÇÕES)");
  Object.keys(EQUIP_LABELS).forEach((k) => {
    const e: any = (f.equipments as any)[k];
    if (e) line(EQUIP_LABELS[k], e.possui ? `Possui — ${e.status}${e.capacidade ? " | " + e.capacidade : ""}${e.obs ? " | " + e.obs : ""}` : "Não possui");
  });
  line("Terreno disponível", f.terrenoDisponivel);
  line("Energia trifásica", f.energiaTrifasica);
  line("Distância até o curral (m)", f.distanciaCurral);
  line("Rotina de infraestrutura", f.rotinaInfra);

  L.push("\nBLOCO 08 — PERSPECTIVAS E VISÃO ESTRATÉGICA");
  line("Vocação da propriedade", f.vocacaoPropriedade);
  line("Papel de uma eventual fábrica de ração", f.papelFabricaRacao);
  line("Categoria prioritária", f.categoriaPrioritaria);
  line("Planeja confinamento", confinamentoLabel(f.confinamentoFuturo));
  line("Rebanho planejado (24m)", f.metaSurgimento24);
  line("Rebanho planejado (36m)", f.metaSurgimento36);
  line("CAPEX pretendido (R$)", f.capexOrcamento);
  line("Payback meta", f.paybackMeta);
  line("Visão do proprietário", f.visaoProprietario);
  line("Visão do gerente", f.visaoGerente);
  line("Visão da operação (vaqueiro)", f.visaoOperacional);
  line("Visão administrativa/financeira", f.visaoAdministrativa);
  line("Gargalos/restrições do processo", f.restricaoProcesso);
  line("Expectativas gerais", f.expectativasGerais);
  line("Contexto real (relato livre)", f.contextoReal);

  return L.join("\n");
}

// REFERENCIAL TÉCNICO — fontes brasileiras curadas e verificáveis (sem invenção).
// Itens fixos + itens condicionais aos gargalos identificados no formulário.
function buildReferencialTecnico(f: FormState): string {
  const R: string[] = [];
  R.push("================ REFERENCIAL TÉCNICO ================");
  R.push("Fontes institucionais brasileiras para aprofundar os pontos do diagnóstico. Recomenda-se confirmar a edição mais recente de cada material diretamente no portal da instituição.\n");

  R.push("Fontes-base (sempre aplicáveis):");
  R.push("   • EMBRAPA Gado de Corte (Campo Grande/MS) — pesquisa em nutrição, manejo e sistemas de produção de bovinos de corte. Portal: embrapa.br/gado-de-corte");
  R.push("   • EMBRAPA Pecuária Sudeste (São Carlos/SP) — pastagens, suplementação e melhoramento. Portal: embrapa.br/pecuaria-sudeste");
  R.push("   • Tabelas Brasileiras de Exigências Nutricionais — BR-CORTE (Universidade Federal de Viçosa) — referência para exigências e formulação de dietas de bovinos de corte. Portal: brcorte.com.br");
  R.push("   • Agência Embrapa de Informação Tecnológica (Ageitec) — árvores do conhecimento sobre bovinos de corte e pastagens. Portal: embrapa.br (busca por 'Ageitec')");
  R.push("   • MAPA — Ministério da Agricultura e Pecuária — normas oficiais de produção e alimentação animal. Portal: gov.br/agricultura");

  const cond: string[] = [];
  const estado = (f.estadoMedioPastagem || "").toLowerCase();
  if (estado.includes("alto") || estado.includes("moderado") || estado.includes("misto")) {
    cond.push("   • Recuperação e renovação de pastagens degradadas — publicações da EMBRAPA sobre diagnóstico de degradação, correção de solo e integração lavoura-pecuária-floresta (ILPF). Rede ILPF: embrapa.br (busca por 'pastagens degradadas' e 'ILPF').");
  }
  if ((f.usoVinhaca || "").toLowerCase().startsWith("sim") || (f.custoVinhacaHa || 0) > 0) {
    cond.push("   • Uso agrícola da vinhaça (fertirrigação) — orientações técnicas da EMBRAPA e da CETESB sobre dosagem e cuidados ambientais no aproveitamento de vinhaça. Busque por 'fertirrigação com vinhaça' no portal embrapa.br.");
  }
  if ((f.suplementos || []).includes("cama_frango")) {
    cond.push("   • Instrução Normativa nº 08/2004 do MAPA — proíbe o uso de cama de frango e outros subprodutos de origem animal na alimentação de ruminantes. Consulte o texto oficial em gov.br/agricultura (legislação).");
  }
  if ((f.suplementos || []).includes("ureia_pecuaria")) {
    cond.push("   • Uso seguro de ureia (NNP) para bovinos — material da EMBRAPA sobre adaptação gradual, dosagem e prevenção de intoxicação. Busque por 'ureia na alimentação de bovinos' no portal embrapa.br.");
  }
  const arenoso = (f.especiePredominantePastagem || "").toLowerCase();
  cond.push("   • Pecuária no semiárido e litoral nordestino — EMBRAPA Semiárido (Petrolina/PE) para estratégias de alimentação na estação seca, palma forrageira e conservação de forragem. Portal: embrapa.br/semiarido");
  cond.push("   • Fabricação de ração na fazenda — materiais técnicos da EMBRAPA e do SENAR sobre formulação, moagem, mistura e armazenamento seguro de grãos (controle de aflatoxinas). Portais: embrapa.br e senar.org.br");

  if (cond.length) {
    R.push("\nFontes específicas para os gargalos identificados neste formulário:");
    R.push(cond.join("\n"));
  }
  R.push("\nObservação: as fontes acima são instituições e publicações reais e consolidadas. Nenhuma referência foi inventada. Para citar formalmente, acesse o portal indicado e copie o título e o ano da edição vigente.");
  return R.join("\n");
}

// ANÁLISE OFFLINE — parecer técnico estruturado por bloco + geral, sem IA (determinístico).
function buildOfflineAnalysis(f: FormState, m: any): string {
  const A: string[] = [];
  const pastoCritico = (f.estadoMedioPastagem || "").toLowerCase().includes("alto") || (f.estadoMedioPastagem || "").toLowerCase().includes("moderado");
  const temTrifasica = f.energiaTrifasica === "Sim";
  const usaUreia = (f.suplementos || []).includes("ureia_pecuaria");
  const usaCamaFrango = (f.suplementos || []).includes("cama_frango");

  A.push("================ ANÁLISE TÉCNICA (PARECER) ================\n");
  A.push("⚠️ Parecer gerado em modo local (sem IA ao vivo). Estrutura técnica baseada diretamente nos dados informados.\n");

  A.push("PARTE I — ANÁLISE POR BLOCO\n");
  A.push(`• BLOCO 01 (Identificação): respondente ${f.nomeProdutor || "não informado"}${f.cargo ? " (" + f.cargo + ")" : ""}. Importante validar com proprietário, gerente e vaqueiro para triangular a visão da operação.`);
  A.push(`• BLOCO 02 (Plantel & Matéria Seca): plantel de ${m.totalHeads} cabeças, biomassa de ${m.totalBiomass} kg PV, demanda de ${m.totalMsDia} kg de MS/dia (${Math.round(m.totalMsMes)} kg/mês). Esse é o número que dimensiona qualquer fábrica de ração e a capacidade de pasto.`);
  A.push(`• BLOCO 03 (Desempenho/Genética): GMD de terminação informado de ${f.boiGmd} kg/dia; peso de abate alvo de ${f.pesoAlvo} kg em ~${f.tempoAprov} dias. Raças: ${(f.racas && f.racas.length) ? f.racas.join(", ") : (f.racaPredominante || "não informado")}. GMD baixo costuma indicar gargalo nutricional ou de pasto — alvo claro para a ração própria.`);
  A.push(`• BLOCO 04 (Comercialização): arroba a R$ ${f.precoArroba}, destino ${f.destinoPrincipal || "não informado"}, custo de comercialização de R$ ${f.custoComercializacao || 0}/cabeça. Esses custos entram no cálculo da margem que a fábrica própria pode liberar.`);
  A.push(`• BLOCO 05 (Pastagem & Suplementação — TEMA CENTRAL): pasto em estado "${f.estadoMedioPastagem || "não informado"}", sistema ${f.sistemaPastejo || "não informado"}, controle de pasto por "${f.metodoControlePastejo || "não informado"}". ${pastoCritico ? "O grau de degradação indicado exige plano de recuperação de pasto e reforço de volumoso de cocho na seca." : "Mantenha o monitoramento de altura/oferta de forragem."} Suplementos atuais: ${(f.suplementos || []).join(", ") || "nenhum"}. ${usaCamaFrango ? "ALERTA SANITÁRIO: cama de frango é PROIBIDA para ruminantes (IN 08/2004 MAPA) — recomenda-se suspender imediatamente. " : ""}${usaUreia ? "O uso de ureia exige adaptação gradual e mistura homogênea — ponto a favor de um misturador adequado. " : ""}Planejamento relatado: ${f.planejamentoSuplemento || "não informado"}.`);
  A.push(`• BLOCO 06 (Custos): mão de obra R$ ${f.maoDeObraDireta}/mês, sanidade R$ ${f.sanidade}/mês, manutenção R$ ${f.manutencaoEquip}/mês. O custo mensal estimado de alimentação apurado é de R$ ${m.totalMonthlyFeedCost?.toLocaleString?.("pt-BR") || m.totalMonthlyFeedCost} (R$ ${m.costPerAnimalMonth}/cab/mês).`);
  A.push(`• BLOCO 07 (Infraestrutura): ${f.equipments?.misturador?.possui ? "já há misturador" : "não há misturador"}; ${f.equipments?.moinho?.possui ? "moinho presente" : "sem moinho"}; energia trifásica ${temTrifasica ? "ativa (favorece moagem/mistura eficiente)" : "ausente/indefinida (avaliar adequação elétrica antes do CAPEX)"}. Equipamentos já existentes reduzem o CAPEX necessário.`);
  A.push(`• BLOCO 08 (Estratégia): vocação "${f.vocacaoPropriedade || "não informado"}"; papel pretendido da fábrica: "${f.papelFabricaRacao || "não informado"}"; metas de ${f.metaSurgimento24} (24m) e ${f.metaSurgimento36} (36m) cabeças; CAPEX de R$ ${f.capexOrcamento} com payback meta de "${f.paybackMeta || "não informado"}".`);

  A.push("\nPARTE II — ANÁLISE GERAL E PARECER\n");
  A.push(`Dimensionamento: para a demanda atual e as metas de crescimento, recomenda-se um misturador de aproximadamente ${m.suggestedMixerCapacityKg} kg/batelada e silo/depósito da ordem de ${m.suggestedSiloVolumeM3} m³. ${(f.volumosos || []).some((v) => ["cana_picada", "bagaco_cana", "capim", "silagem_capim"].includes(v)) ? "Como há volumosos fibrosos/úmidos na dieta (cana, bagaço, capim), avalie misturador HORIZONTAL helicoidal, que lida melhor com fibra — exige motor trifásico mais robusto." : "Para mistura predominantemente seca (farelos e grãos moídos), um misturador VERTICAL atende com menor CAPEX e menor exigência elétrica."}`);
  A.push(`Clima/maresia: por ser litoral úmido e salino (~40 km ao sul de Natal-RN), proteja estrutura e motores (aço galvanizado, epóxi marítimo ou inox 304) e armazene grãos suspensos a 50 cm das paredes para prevenir aflatoxinas.`);
  A.push(`Viabilidade: a economia típica da formulação própria (R$ 300–500/tonelada vs. concentrado ensacado) tende a pagar o investimento de R$ ${f.capexOrcamento} dentro de uma janela compatível com a meta de "${f.paybackMeta || "payback informado"}", desde que o volume mensal de ração justifique a operação. Recomenda-se confirmar o cálculo com o volume real de concentrado consumido.`);
  A.push(`Plano de ação imediato: (1) padronizar pesagem/dosagem; (2) ${pastoCritico ? "iniciar recuperação de pasto e planejar volumoso para a seca" : "manter monitoramento de pasto"}; (3) ${usaCamaFrango ? "suspender a cama de frango (proibição legal)" : "revisar a formulação dos suplementos"}; (4) levantar volume real de concentrado para fechar o payback; (5) adequar infraestrutura elétrica e de armazenamento antes da compra dos equipamentos.`);

  return A.join("\n");
}



// 1. ENDPOINT: Get list of all form submissions
app.get("/api/submissions", (req, res) => {
  res.json(submissions);
});

// 2. ENDPOINT: Post form submission & do AI analysis
app.post("/api/submissions", async (req, res) => {
  try {
    const formState: FormState = req.body;
    const keyMetrics = calculateMetrics(formState);
    const submissionId = "sub-" + Math.random().toString(36).substr(2, 9);

    // Call Gemini to generate a strategic diagnostic based on the farmer's detailed form input
    const ai = getGeminiClient();
    let diagnostic = "";
    let analysis = "";

    if (ai) {
      try {
        const prompt = `Você é o Consultor Técnico de Inteligência Estratégica da Fazenda Brasileira Augusta em Nísia Floresta, RN.
Analise os seguintes dados do questionário de dimensionamento e escreva um diagnóstico preliminar extremamente profissional, prático e personalizado.

DADOS DE IDENTIFICAÇÃO:
- Produtor: ${formState.nomeProdutor}
- Cargo: ${formState.cargo}
- Residente de: ${formState.cidade || "Nísia Floresta, RN"}

REBANHO E MÉTRICAS CALCULADAS:
- Total de Animais: ${keyMetrics.totalHeads} cabeças
- Biomassa Total: ${keyMetrics.totalBiomass} kg Peso Vivo (PV)
- Demanda Estimada de Matéria Seca: ${keyMetrics.totalMsDia} kg MS/dia (~${keyMetrics.totalMsMes} kg MS/mês)
- Custo Total Estimado de Alimentação Atual: R$ ${keyMetrics.totalMonthlyFeedCost}/mês
- Custo Mensal por Cabeça: R$ ${keyMetrics.costPerAnimalMonth}/animal/mês

DESEMPENHO ESPERADO:
- GMDs Médios: Bezerros (${formState.bezerroDesmGmd} kg/dia), Bois (${formState.boiGmd} kg/dia), Garrotes (${formState.garroteGmd} kg/dia), Novilhas (${formState.novilhaGmd} kg/dia), Vacas (${formState.vacaGmd} kg/dia).
- Preços praticados da arroba (@): R$ ${formState.precoArroba}
- Raça(s) predominante(s): ${(formState.racas && formState.racas.length ? formState.racas.join(", ") : formState.racaPredominante) || "Não informado"}
- Destino principal da venda: ${formState.destinoPrincipal}${formState.destinoPrincipal === "Outro" && formState.destinoPrincipalOutro ? " (" + formState.destinoPrincipalOutro + ")" : ""}
- Custo de comercialização (frete, comissões, taxas): R$ ${formState.custoComercializacao || 0}/cabeça
- Meta de Receita Bruta Anual: R$ ${formState.metaReceitaAnual}
- Rotina de acompanhamento comercial: ${formState.rotinaComercial}

FONTES ALIMENTARES ATUAIS:
- Espécie de Pasto: ${formState.especiePredominantePastagem} (${formState.areaTotalPastagem} ha, estado: ${formState.estadoMedioPastagem})
- Sistema de pastagem: ${formState.sistemaPastejo || "Não informado"} | Controle de entrada/saída: ${formState.metodoControlePastejo || "Não informado"}
- Correção de solo/adubação: ${formState.correcaoSoloAdubacao || "Não informado"} | Vinhaça: ${formState.usoVinhaca || "Não informado"}${formState.custoVinhacaHa ? " (R$ " + formState.custoVinhacaHa + "/ha)" : ""}
- Pragas comuns na região: ${formState.pragasComuns || "Não informado"} | Técnicas de manejo: ${formState.tecnicasManejo || "Não informado"}
- Volumosos complementares: ${formState.volumosos.join(", ") || "Nenhum"}${formState.capimTipo ? " | Capim: " + formState.capimTipo : ""}
- Suplementação concentrada: ${formState.suplementos.join(", ") || "Nenhuma"}
- Logística de compra e distância do fornecedor: ${formState.distanciaFornecedor} km de distância, fornecimento ${formState.frequenciaFornecimento}

INFRAESTRUTURA EXISTENTE:
- Inventário de fábrica de ração ativa:
  * Balança de Tronco: ${formState.equipments.balancaTronco.possui ? "Possui (" + formState.equipments.balancaTronco.status + ", cap: " + formState.equipments.balancaTronco.capacidade + ")" : "Não possui"}
  * Forrageira/Picadora: ${formState.equipments.forrageira.possui ? "Possui (" + formState.equipments.forrageira.status + ", cap: " + formState.equipments.forrageira.capacidade + ")" : "Não possui"}
  * Misturador de Ração: ${formState.equipments.misturador.possui ? "Possui (" + formState.equipments.misturador.status + ", cap: " + formState.equipments.misturador.capacidade + ")" : "Não possui"}
  * Moinho de grãos: ${formState.equipments.moinho.possui ? "Possui (" + formState.equipments.moinho.status + ", cap: " + formState.equipments.moinho.capacidade + ")" : "Não possui"}
  * Trator: ${formState.equipments.trator.possui ? "Possui (" + formState.equipments.trator.status + ", cap: " + formState.equipments.trator.capacidade + ")" : "Não possui"}
  * Depósito/Galpão: ${formState.equipments.deposito.possui ? "Possui (" + formState.equipments.deposito.status + ", cap: " + formState.equipments.deposito.capacidade + ")" : "Não possui"}
- Terreno disponível para Ampliação da Fábrica: ${formState.terrenoDisponivel}
- Rede de energia trifásica: ${formState.energiaTrifasica}
- Distância ideal de infraestrutura até o curral de manejo: ${formState.distanciaCurral} metros

PERSPECTIVAS DE EXPANSÃO E VISÃO ESTRATÉGICA:
- Vocação principal da propriedade: ${formState.vocacaoPropriedade || "Não informado"}
- Papel pretendido de uma eventual fábrica de ração: ${formState.papelFabricaRacao || "Não informado"}
- Categoria prioritária para a produção própria: ${formState.categoriaPrioritaria || "Não informado"}
- Visão do proprietário: ${formState.visaoProprietario || "Não informado"}
- Visão do gerente: ${formState.visaoGerente || "Não informado"}
- Visão da operação (vaqueiro): ${formState.visaoOperacional || "Não informado"}
- Visão administrativa/financeira: ${formState.visaoAdministrativa || "Não informado"}
- Rebanho planejado para 24 meses: ${formState.metaSurgimento24} cabeças
- Rebanho planejado para 36 meses: ${formState.metaSurgimento36} cabeças
- Planeja confinamento futuro: ${formState.confinamentoFuturo === "sim_total" ? "Sim, Confinamento Total" : formState.confinamentoFuturo === "sim_semi" ? "Sim, Semi-confinamento" : formState.confinamentoFuturo === "nao" ? "Não planeja" : "A avaliar"}
- CAPEX Pretendido para a Fábrica: R$ ${formState.capexOrcamento}
- Payback projetado como meta: ${formState.paybackMeta}
- Gargalos / Restrições do processo operacional: ${formState.restricaoProcesso}
- Contexto real da operação (relato livre): ${formState.contextoReal || "Não informado"}

IMPORTANTE: A propriedade AINDA NÃO POSSUI fábrica de ração. O objetivo deste diagnóstico é avaliar tecnicamente se a implantação de uma produção própria de ração é indicada ou não, com base nos dados acima. Trate a fábrica como hipótese a ser avaliada, não como algo já existente.

INSTRUÇÕES DE ESCRITA (ESCREVA EM PORTUGUÊS):
Você produzirá APENAS a parte analítica do laudo. NÃO repita os dados crus do formulário (um espelho fiel já é inserido automaticamente antes da sua resposta) e NÃO escreva bibliografia (há uma seção fixa de "Referencial Técnico" inserida automaticamente depois). NUNCA invente referências, autores ou normas.
Estruture sua resposta EXATAMENTE assim:

================ ANÁLISE TÉCNICA (PARECER) ================

PARTE I — ANÁLISE POR BLOCO
Comente um a um, com aplicabilidade técnica real e números quando possível:
- BLOCO 01 (Identificação e contexto do preenchedor)
- BLOCO 02 (Plantel e balanço de Matéria Seca — avalie se o pasto comporta a carga animal)
- BLOCO 03 (Desempenho/GMD e genética)
- BLOCO 04 (Comercialização e custos de venda)
- BLOCO 05 (Pastagem, volumoso e suplementação — TEMA CENTRAL, pois a fábrica de ração nasceu daqui)
- BLOCO 06 (Custos operacionais)
- BLOCO 07 (Infraestrutura existente e seu impacto na redução do CAPEX)
- BLOCO 08 (Visão estratégica e vocação da propriedade)

PARTE II — ANÁLISE GERAL E PARECER
Diagnóstico integrado: dimensionamento e tipo de misturador recomendado (Vertical para mistura seca; Horizontal helicoidal se houver fibra/úmido como cana e bagaço) para as metas de 24/36 meses; silos e potência de moagem considerando a energia trifásica disponível; proteção contra maresia e aflatoxinas (litoral ~40 km ao sul de Natal-RN); parecer de viabilidade (CAPEX de R$ ${formState.capexOrcamento} e estimativa realista de payback); e um plano de ação imediato e priorizado.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        analysis = response.text || buildOfflineAnalysis(formState, keyMetrics);
      } catch (aiError) {
        console.error("Gemini failed during submission diagnostic:", aiError);
        analysis = buildOfflineAnalysis(formState, keyMetrics);
      }
    } else {
      analysis = buildOfflineAnalysis(formState, keyMetrics);
    }

    // Montagem do LAUDO final: espelho fiel + análise + referencial técnico curado.
    const espelho = buildFormMirror(formState, keyMetrics);
    const referencial = buildReferencialTecnico(formState);
    diagnostic = `LAUDO TÉCNICO — FAZENDA BRASILEIRA AUGUSTA (PECUÁRIA)\n\n${espelho}\n\n${analysis}\n\n${referencial}`;

    // Build automated email logs representing real immediate notifications
    const emailsSent = [
      {
        to: formState.email,
        subject: `Diagnóstico de Dimensionamento FBA - ${formState.nomeProdutor}`,
        body: `Prezado(a) ${formState.nomeProdutor},\n\nConfirmamos o recebimento dos dados do questionário para a Fazenda Brasileira Augusta!\nSeu rebanho totaliza ${keyMetrics.totalHeads} cabeças com biomassa de ${keyMetrics.totalBiomass} kg PV.\nSua demanda de MS é de ${keyMetrics.totalMsDia} kg/dia.\n\nFábrica Sugerida: Misturador de ${keyMetrics.suggestedMixerCapacityKg} kg e Silagem de armazenamento.\nAnexamos o PDF preliminar gerado automaticamente para você em nossa central de pecuária.\n\nAtenciosamente,\nInteligência Estratégica Fazenda Brasileira Augusta`,
        date: new Date().toISOString(),
      },
      {
        to: "proprietario@fazendabrasileiraaugusta.com",
        subject: `Alerta: Nova Submissão de Formulário FBA de ${formState.nomeProdutor}`,
        body: `Olá,\n\nUm novo diagnóstico de pecuária de precisão foi finalizado.\nProdutor: ${formState.nomeProdutor} (${formState.cargo})\nE-mail: ${formState.email}\nCelular: ${formState.contatoZap}\n\nMétricas do Rebanho Mapeado:\n- Total: ${keyMetrics.totalHeads} cabeças\n- Biomassa: ${keyMetrics.totalBiomass} kg PV\n- Custo Estimado: R$ ${keyMetrics.totalMonthlyFeedCost}/mês\n- CAPEX: R$ ${formState.capexOrcamento}\n\nO plano de transição estratégica já foi gerado e enviado ao visitante.\nAcesse o Painel para conferir o PDF.`,
        date: new Date().toISOString(),
      },
    ];

    const newSubmission: Submission = {
      id: submissionId,
      timestamp: new Date().toISOString(),
      formState,
      keyMetrics,
      diagnostic,
      emailsSent,
    };

    submissions.unshift(newSubmission);
    res.json(newSubmission);
  } catch (error: any) {
    console.error("Error creating submission:", error);
    res.status(500).json({ error: error.message || "Failed to process questionnaire data" });
  }
});

// 3. ENDPOINT: AI Chat Assistant with custom system prompts & thinking levels
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, formState, model, thinkingLevel } = req.body;
    const ai = getGeminiClient();

    const selectedModel = model || "gemini-2.5-flash";

    // Setup of System Instructions with absolute professional constraints for Fazenda Augusta
    const systemPrompt = `Você é o "Assistente IA - Consultor da Fazenda Brasileira Augusta", um especialista SÊNIOR em gestão estratégica de manejo pecuário.

### SUA PERSONA E CREDENCIAIS:
- PhD em Zootecnia e Pecuária, com Pós-Doutorado em Manejo de Pasto e Suplementação.
- Formação adicional em Engenharia de Produção, com experiência prática na implantação e operação de fábricas de ração dentro de fazendas.
- Especialista de referência da EMBRAPA, com domínio das condições reais da pecuária no Nordeste brasileiro.
- Você assessora uma propriedade localizada no litoral do Nordeste (coordenadas 6°05'28" Sul, 35°12'31" Oeste), a cerca de 40 km ao sul de Natal-RN (região de Nísia Floresta), com clima quente e úmido, maresia costeira, solos predominantemente arenosos e estação seca marcada.

### SEU PAPEL:
Apoiar proprietário, gerente, vaqueiro e administrativo a dimensionarem o consumo do rebanho, avaliarem tecnicamente a viabilidade de uma fábrica de ração PRÓPRIA (que ainda NÃO existe — é uma hipótese a avaliar), resolverem gargalos de manejo de pasto e suplementação, e tomarem decisões com embasamento técnico e financeiro.

### PILARES TÉCNICOS DE CONHECIMENTO:
1. **Ingestão de Matéria Seca (IMS)**: Coeficientes de ingestão (% do Peso Vivo): bezerro lactente ~1.5%, vaca parida/lactante ~2.8%, vacas secas e touros ~1.8%, animais em terminação ~2.2%, garrotes/garrotas e demais ~2.0%. MS diária total = Cabeças × Peso Médio × (IMS%/100). Referencie as Tabelas Brasileiras de Exigências Nutricionais (BR-CORTE) e materiais da EMBRAPA quando útil.
2. **Manejo de Pasto** (sua especialidade de pós-doc): avalie sistema de pastejo (contínuo, rotacionado, diferido, alternado), altura de entrada/saída, lotação, vedação, correção de solo e adubação. Em solo arenoso de litoral, atente para baixa CTC e necessidade de manejo conservacionista. Considere déficit forrageiro na seca e o papel do volumoso de cocho.
3. **Suplementação e Formulação**: proteinado/energético, ureia (NNP) com segurança de adaptação, milho moído, farelos, volumosos (silagem, cana, palma, bagaço). ATENÇÃO sanitária: cama de frango é PROIBIDA para ruminantes pela Instrução Normativa nº 08/2004 do MAPA — sempre alerte se citada.
4. **Dimensionamento de Fábrica de Ração**: Misturador Vertical (misturas secas, 3-5 CV, menor CAPEX) vs Horizontal (fibras/úmidos como bagaço e cana, 7.5-15 CV, mistura mais rápida, CAPEX maior). Moinho de martelos: 4-5mm para corte (estimula ruminação).
5. **Clima Costeiro e Maresia**: alta umidade e salinidade oxidam estruturas de ferro — recomende aço galvanizado, epóxi marítimo ou inox 304; armazene grãos suspensos a 50cm das paredes para evitar aflatoxinas.
6. **Custos, CAPEX e Payback**: economia típica da formulação própria de R$ 300 a R$ 500/tonelada vs concentrado comercial ensacado; avalie payback com base no volume real do plantel.

### DADOS ATUAIS DA FAZENDA QUE O USUÁRIO JÁ PREENCHEU (USE SE DISPONÍVEIS):
${
  formState
    ? JSON.stringify({
        produtor: formState.nomeProdutor,
        plantel: formState.herd,
        gmdAnimaisTerminacao: formState.boiGmd,
        racas: formState.racas,
        sistemaPastejo: formState.sistemaPastejo,
        estadoPastagem: formState.estadoMedioPastagem,
        suplementos: formState.suplementos,
        planejamentoSuplemento: formState.planejamentoSuplemento,
        capexDisponivel: formState.capexOrcamento,
        vocacao: formState.vocacaoPropriedade,
        papelFabrica: formState.papelFabricaRacao,
      })
    : "O formulário ainda não foi preenchido. Ofereça-se para ajudar a preencher ou tirar dúvidas de manejo e suplementação!"
}

### DIRETRIZES DE ESTILO (RESPONDA EM PORTUGUÊS):
- Tom de consultor sênior: técnico, objetivo, confiante e didático, mas acessível ao homem do campo.
- Dê exemplos práticos e cálculos quando o usuário pedir dimensionamento.
- NUNCA invente referências bibliográficas, autores, normas ou dados que você não tenha certeza. Se não souber uma fonte exata, oriente a consultar a EMBRAPA ou um zootecnista local em vez de inventar.
- Trate a fábrica de ração como hipótese a ser avaliada tecnicamente, não como algo existente.`;


    if (!ai) {
      // Return a simulated high-quality consultant fallback chat message
      const lastUserMsg = messages[messages.length - 1]?.text || "";
      const lowerMsg = lastUserMsg.toLowerCase();
      let responseText = "";

      if (lowerMsg.includes("misturador") || lowerMsg.includes("horizontal") || lowerMsg.includes("vertical")) {
        responseText = "Para a **Fazenda Brasileira Augusta**, com base no clima úmido e maresia de Nísia Floresta, recomendo fortemente um **misturador de ração vertical** se o foco for farelo seco (milho moído + soja + núcleo). Ele consome menos energia e custa em torno de R$ 22.000. Porém, se você planeja misturar cana picada, palma ou bagaço úmido direto no concentrado, parta para o **Misturador Horizontal helicoidal de 1K**, pois o vertical travaria com umidade acima de 15%. Qual volumoso você planeja misturar no concentrado?";
      } else if (lowerMsg.includes("maresia") || lowerMsg.includes("clima") || lowerMsg.includes("unidade") || lowerMsg.includes("umidade")) {
        responseText = "Como Nísia Floresta-RN está na região litorânea, os ventos litorâneos carregam umidade salina constante. Equipamentos como o **moinho de grãos** e o **misturador** devem receber banho de tinta epóxi marítima ou, preferencialmente, partes em aço inoxidável para evitar travamento de correntes e polias. Ademais, o milho deve ser estocado em local bem arejado para afastar o risco de aflatoxinas que intoxicam o rúmen dos animais.";
      } else if (lowerMsg.includes("capex") || lowerMsg.includes("custo") || lowerMsg.includes("payback") || lowerMsg.includes("orçamento")) {
        const capexVal = formState?.capexOrcamento ? `R$ ${formState.capexOrcamento}` : "seu orçamento";
        responseText = `Avaliando o seu CAPEX projetado de **${capexVal}**, você está em uma faixa muito saudável! A verticalização da produção de ração numa fazenda de médio porte costuma economizar entre R$ 350 e R$ 520 por tonelada comparado à ração comercial de cooperativas. Isso gera uma economia que paga o conjunto de moega, moinho com martelos de 4mm, misturador vertical de 500 kg e silo pulmão básico em menos de **12 a 15 meses** de operação contínua. Gostaria de um plano de compras detalhado para esse CAPEX?`;
      } else {
        responseText = `Olá! Sou o seu Assistente Estratégico Fazenda Brasileira Augusta. Analisando as informações preenchidas do produtor **${formState?.nomeProdutor || "Visitante"}**, percebo que temos uma ótima base. Como posso lhe instruir em relação ao cálculo de matéria seca do rebanho, proteção contra a maresia potiguar no maquinário ou dimensionamento do misturador de ração próprio?`;
      }

      res.json({ text: responseText, thinking: "(Simulação offline do consultor FBA devido à falta do GEMINI_API_KEY no arquivo .env ou Secrets.)" });
      return;
    }

    // Format chat messages appropriately for @google/genai format
    const contents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const config: any = {
      systemInstruction: systemPrompt,
      temperature: 0.7,
    };

    // Configure thinking settings only for Gemini 3 series models as specified
    if (selectedModel.startsWith("gemini-3.")) {
      const level = thinkingLevel === "high" ? ThinkingLevel.HIGH : ThinkingLevel.LOW;
      config.thinkingConfig = { thinkingLevel: level };
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    res.json({
      text: response.text || "Sem resposta do assistente.",
      thinking: selectedModel === "gemini-3.1-pro-preview" && thinkingLevel === "high" ? "O modelo Pro ativou o modo raciocínio para computar este diagnóstico estratégico de infraestrutura." : undefined
    });
  } catch (error: any) {
    console.error("Error in AI Conversational Chat:", error);
    res.status(500).json({ error: error.message || "Erro no processador de diálogo inteligente." });
  }
});

// 4. ENDPOINT: Generate Feed Factory architecture sketch images as requested in user's instructions
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, width, height, resolution, aspectRatio } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Simulate/return a beautiful stable AI generated mock pasture/feed factory sketch image in base64
      // This is a SVG that behaves like a blueprint image for perfect demonstration!
      const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%" style="background-color:#1e3d2f">
        <rect x="10" y="10" width="780" height="580" fill="none" stroke="#d9a05b" stroke-width="4" stroke-dasharray="8 4"/>
        <text x="200" y="70" font-family="'Space Grotesk', sans-serif" font-size="28" fill="#fcfbf7" font-weight="bold">FBA • LAYOUT DA FÁBRICA DE RAÇÃO</text>
        <text x="250" y="105" font-family="'JetBrains Mono', monospace" font-size="14" fill="#d9a05b">DIRETRIZ DE ENGENHARIA DE IMPLANTAÇÃO</text>
        <line x1="80" y1="130" x2="720" y2="130" stroke="#d9a05b" stroke-width="2"/>
        
        <!-- Moega -->
        <rect x="80" y="180" width="120" height="100" fill="none" stroke="#fcfbf7" stroke-width="3"/>
        <polygon points="80,280 140,350 200,280" fill="none" stroke="#fcfbf7" stroke-width="3"/>
        <text x="110" y="235" font-family="'Space Grotesk', sans-serif" font-size="18" fill="#fcfbf7" font-weight="bold">MOEGA</text>
        <text x="90" y="260" font-family="'JetBrains Mono', monospace" font-size="11" fill="#c3c1b5">Abastecimento</text>
        
        <!-- Chupim Transportador de helicoide -->
        <line x1="140" y1="350" x2="280" y2="180" stroke="#d9a05b" stroke-width="4" stroke-dasharray="5 2"/>
        <text x="170" y="320" font-family="sans-serif" font-size="10" fill="#ebd0af" transform="rotate(-45 170,320)">Helicoide (Chupim)</text>
        
        <!-- Moinho Martelo -->
        <circle cx="310" cy="180" r="45" fill="none" stroke="#fcfbf7" stroke-width="3"/>
        <text x="285" y="185" font-family="'Space Grotesk', sans-serif" font-size="16" fill="#fcfbf7" font-weight="bold">MOINHO</text>
        <text x="282" y="202" font-family="'JetBrains Mono', monospace" font-size="9" fill="#c3c1b5">Martelos 4mm</text>
        
        <!-- Silo de Insumos -->
        <rect x="420" y="160" width="130" height="140" fill="none" stroke="#fcfbf7" stroke-width="3" rx="10"/>
        <polygon points="420,300 485,360 550,300" fill="none" stroke="#fcfbf7" stroke-width="3"/>
        <text x="445" y="230" font-family="'Space Grotesk', sans-serif" font-size="16" fill="#fcfbf7" font-weight="bold">SILO PULMÃO</text>
        <text x="440" y="250" font-family="'JetBrains Mono', monospace" font-size="10" fill="#d9a05b">Cap. 12 Toneladas</text>
        <text x="450" y="270" font-family="sans-serif" font-size="9" fill="#c3c1b5">Chapa Aço Galv.</text>

        <!-- Misturador Vertical -->
        <rect x="610" y="240" width="110" height="150" fill="none" stroke="#d9a05b" stroke-width="3"/>
        <polygon points="610,390 665,450 720,390" fill="none" stroke="#d9a05b" stroke-width="3"/>
        <text x="622" y="310" font-family="'Space Grotesk', sans-serif" font-size="13" fill="#fcfbf7" font-weight="bold">MISTURADOR</text>
        <text x="635" y="328" font-family="'Space Grotesk', sans-serif" font-size="13" fill="#fcfbf7" font-weight="bold">VERTICAL</text>
        <text x="630" y="355" font-family="'JetBrains Mono', monospace" font-size="10" fill="#d9a05b">500kg - 5 CV</text>
        
        <!-- Solo & Nota de local -->
        <line x1="50" y1="500" x2="750" y2="500" stroke="#ebd0af" stroke-width="4"/>
        <text x="60" y="530" font-family="sans-serif" font-size="12" fill="#c3c1b5">ÁREA TOTAL PLANTA: ~450m² disponível</text>
        <text x="60" y="550" font-family="sans-serif" font-size="12" fill="#c3c1b5">REGIONALIZAÇÃO: Proteção especial contra Maresia costeira salina ativa | Nísia Floresta, RN</text>
        <text x="620" y="530" font-family="'JetBrains Mono', monospace" font-size="12" fill="#d9a05b">ESQUEMA TÉCNICO</text>
        <text x="625" y="550" font-family="sans-serif" font-size="10" fill="#fcfbf7">Simulação Gráfica Ativa</text>
      </svg>`;

      const base64Bytes = Buffer.from(mockSvg).toString("base64");
      const imageUrl = `data:image/svg+xml;base64,${base64Bytes}`;

      res.json({ imageUrl });
      return;
    }

    const sizeMapping: any = {
      "512px": "512px",
      "1K": "1K",
      "2K": "2K",
      "4K": "4K",
    };
    const mappedSize = sizeMapping[resolution] || "1K";
    const mappedAspect = aspectRatio || "1:1";

    const enhancedPrompt = `${prompt}. Crie um esboço esquemático técnico em 3D, limpo e profissional, semelhante a um desenho arquitetônico de engenharia de layout agrícola para uma fábrica de ração concentrada de fazenda na pecuária brasileira. Use linhas nítidas, cores elegantes, indicação de moega de carregamento, moinho moedor, silo metálico cilíndrico de armazenagem e misturador vertical mecânico em linha industrial de alta precisão. Tudo rotulado e bem delineado, transmitindo inteligência logística e clareza estrutural com fundo elegante e limpo de fazenda.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: mappedAspect,
          imageSize: mappedSize,
        },
      },
    });

    let imageUrl = "";
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Str = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64Str}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("No image data returned from image generation model.");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Error generating AI image blueprint:", error);
    res.status(500).json({ error: error.message || "Erro de timeout ou autorização na geração de imagens com Gemini-3.1-flash-image." });
  }
});

// ===================== ACOMPANHAMENTO MENSAL =====================

const MONTHLY_LABELS: Record<string, string> = {
  aleitamento: "Bezerros(as) em Aleitamento (cria)",
  desmamados: "Bezerros(as) Desmamados(as)",
  recria: "Recria (Garrotes/Garrotas)",
  engordaTerminacao: "Engorda / Terminação",
  vacasCria: "Vacas de Cria (Matrizes)",
  reprodutores: "Reprodutores (Touros)",
  resguardoEnfermaria: "Resguardo / Enfermaria",
};

function computeMonthlyMetrics(m: MonthlyFormState) {
  const DIAS = 30;
  const cats = m.categorias || {};
  let plantelInicio = 0, plantelFim = 0, nascimentos = 0, mortes = 0, comprasTotal = 0, vendasTotal = 0;
  let gmdNum = 0, gmdDen = 0, msMesKg = 0;
  for (const k of Object.keys(cats)) {
    const c = cats[k];
    const fim = c.inicio + c.nascimentos - c.mortes + c.compras - c.vendas + c.transferencias;
    plantelInicio += c.inicio;
    plantelFim += fim;
    nascimentos += c.nascimentos;
    mortes += c.mortes;
    comprasTotal += c.compras;
    vendasTotal += c.vendas;
    if (c.pesoMedioAtual > 0 && c.pesoMedioAnterior > 0) {
      const gmd = (c.pesoMedioAtual - c.pesoMedioAnterior) / DIAS;
      const w = Math.max(fim, 0);
      gmdNum += gmd * w;
      gmdDen += w;
    }
    if (fim > 0 && c.pesoMedioAtual > 0) msMesKg += fim * c.pesoMedioAtual * 0.023 * DIAS;
  }
  const gmdMedioPonderado = gmdDen > 0 ? gmdNum / gmdDen : 0;
  const taxaMortalidadePct = plantelInicio > 0 ? (mortes / plantelInicio) * 100 : 0;
  const consumoSuplementoTonMes = m.suplementoQtdTonMes || 0;
  const consumoVolumosoTonMes = m.volumosoQtdTonMes || 0;
  const msMesTon = msMesKg / 1000;
  const consumoPastoEstimadoTonMes = Math.max(0, msMesTon - consumoVolumosoTonMes * 0.30 - consumoSuplementoTonMes * 0.88);
  const custoOperacionalFixo = (m.custoMaoDeObra || 0) + (m.custoSanidade || 0) + (m.custoInsumos || 0) + (m.custoOutros || 0);
  const custoTotal = custoOperacionalFixo + (m.volumosoCustoMes || 0) + (m.suplementoCustoMes || 0) + (m.vendasCustoComercializacao || 0) + (m.comprasValorTotal || 0);
  const receitaVendas = m.vendasValorTotal || 0;
  const custoAquisicao = m.comprasValorTotal || 0;
  const resultadoMes = receitaVendas - (custoOperacionalFixo + (m.volumosoCustoMes || 0) + (m.suplementoCustoMes || 0) + (m.vendasCustoComercializacao || 0));
  return {
    plantelInicio,
    plantelFim,
    nascimentos,
    mortes,
    taxaMortalidadePct: parseFloat(taxaMortalidadePct.toFixed(2)),
    comprasTotal,
    vendasTotal,
    gmdMedioPonderado: parseFloat(gmdMedioPonderado.toFixed(3)),
    consumoSuplementoTonMes: parseFloat(consumoSuplementoTonMes.toFixed(2)),
    consumoVolumosoTonMes: parseFloat(consumoVolumosoTonMes.toFixed(2)),
    consumoPastoEstimadoTonMes: parseFloat(consumoPastoEstimadoTonMes.toFixed(2)),
    custoOperacionalFixo: Math.round(custoOperacionalFixo),
    custoTotal: Math.round(custoTotal),
    receitaVendas: Math.round(receitaVendas),
    custoAquisicao: Math.round(custoAquisicao),
    resultadoMes: Math.round(resultadoMes),
  };
}

// ESPELHO mensal — reprodução fiel e determinística (sem IA)
function buildMonthlyMirror(m: MonthlyFormState, mx: any): string {
  const L: string[] = [];
  const line = (label: string, val: any) => L.push(`   • ${label}: ${(val === undefined || val === null || val === "") ? "—" : val}`);
  L.push("================ ESPELHO DO ACOMPANHAMENTO MENSAL (cópia fiel das respostas) ================\n");
  L.push("1) IDENTIFICAÇÃO");
  line("Mês de referência", m.mesReferencia);
  line("Data de preenchimento", m.dataPreenchimento);
  line("Responsável", `${m.responsavelNome || "—"}${m.responsavelCargo ? " (" + m.responsavelCargo + ")" : ""}`);

  L.push("\n2) DINÂMICA DO PLANTEL (por categoria)");
  Object.keys(MONTHLY_LABELS).forEach((k) => {
    const c = (m.categorias || {})[k];
    if (!c) return;
    const fim = c.inicio + c.nascimentos - c.mortes + c.compras - c.vendas + c.transferencias;
    line(MONTHLY_LABELS[k], `Início ${c.inicio} | Nasc ${c.nascimentos} | Mortes ${c.mortes} | Compras ${c.compras} | Vendas ${c.vendas} | Transf ${c.transferencias} | Fim ${fim} | PV ${c.pesoMedioAnterior}→${c.pesoMedioAtual} kg`);
  });
  line("TOTAL plantel", `Início ${mx.plantelInicio} → Fim ${mx.plantelFim} | Nascimentos ${mx.nascimentos} | Mortes ${mx.mortes} (mortalidade ${mx.taxaMortalidadePct}%)`);

  L.push("\n3) SANIDADE");
  line("Doenças ocorridas", m.doencasOcorridas);
  line("Nº de animais doentes", m.numAnimaisDoentes);
  line("Acidentes", m.acidentes);
  line("Mortes e causas", m.mortesCausas);
  line("Vacinações/vermifugações", m.vacinacoesVermifugacoes);
  line("Prevenção sazonal", m.prevencaoSazonal);

  L.push("\n4) PASTO E CLIMA");
  line("Condição do pasto", m.condicaoPasto);
  line("Altura média do pasto (cm)", m.alturaPastoCm);
  line("Método de manejo de pasto", m.metodoManejoPasto);
  line("Controle de entrada/saída", m.controleEntradaSaida);
  line("Piquetes em uso / descanso", `${m.piquetesUso} / ${m.piquetesDescanso}`);
  line("Pluviometria do mês (mm)", m.pluviometriaMm);
  line("Pragas/invasoras", m.pragasInvasoras);
  line("Correção/adubação", m.correcaoAdubacao);

  L.push("\n5) DIETA E SUPLEMENTAÇÃO");
  line("Volumoso (tipo)", m.volumosoTipo);
  line("Volumoso (ton/mês | R$/mês)", `${m.volumosoQtdTonMes} ton | R$ ${m.volumosoCustoMes}`);
  line("Suplemento/ração (tipo)", m.suplementoTipo);
  line("Suplemento/ração (ton/mês | R$/mês)", `${m.suplementoQtdTonMes} ton | R$ ${m.suplementoCustoMes}`);
  line("Mudanças na dieta", m.mudancasDieta);

  L.push("\n6) COMERCIAL E CUSTOS");
  line("Compras", `${m.comprasNum} cab. | PV médio ${m.comprasPesoMedio} kg | R$ ${m.comprasValorTotal}`);
  line("Vendas", `${m.vendasNum} cab. | ${m.vendasArrobasTotal} @ | R$ ${m.vendasValorTotal} | custo comerc. R$ ${m.vendasCustoComercializacao}`);
  line("Custos do mês", `Mão de obra R$ ${m.custoMaoDeObra} | Sanidade R$ ${m.custoSanidade} | Insumos R$ ${m.custoInsumos} | Outros R$ ${m.custoOutros}`);

  L.push("\n7) OBSERVAÇÕES E GARGALOS");
  line("Relato do responsável", m.observacoesGargalos);

  L.push("\n================ INDICADORES APURADOS (cálculo automático) ================");
  line("GMD médio ponderado do plantel", `${mx.gmdMedioPonderado} kg/dia`);
  line("Consumo de suplemento/ração", `${mx.consumoSuplementoTonMes} ton/mês`);
  line("Consumo de volumoso", `${mx.consumoVolumosoTonMes} ton/mês`);
  line("Consumo de pasto (estimado, MS)", `${mx.consumoPastoEstimadoTonMes} ton/mês`);
  line("Custo operacional fixo", `R$ ${mx.custoOperacionalFixo.toLocaleString("pt-BR")}`);
  line("Custo total do mês", `R$ ${mx.custoTotal.toLocaleString("pt-BR")}`);
  line("Receita de vendas", `R$ ${mx.receitaVendas.toLocaleString("pt-BR")}`);
  line("Custo de aquisição", `R$ ${mx.custoAquisicao.toLocaleString("pt-BR")}`);
  line("Resultado operacional do mês", `R$ ${mx.resultadoMes.toLocaleString("pt-BR")}`);
  return L.join("\n");
}

// REFERENCIAL TÉCNICO mensal — fontes brasileiras curadas e verificáveis (sem invenção)
function buildMonthlyReferencial(m: MonthlyFormState): string {
  const R: string[] = [];
  R.push("================ REFERENCIAL TÉCNICO ================");
  R.push("Fontes institucionais reais para fundamentar as recomendações deste relatório. Confirme a edição vigente no portal de cada instituição.\n");
  R.push("Fontes-base (sempre aplicáveis):");
  R.push("   • EMBRAPA Gado de Corte — manejo, nutrição e indicadores zootécnicos. Portal: embrapa.br/gado-de-corte");
  R.push("   • EMBRAPA Pecuária Sudeste — pastagens, suplementação e desempenho. Portal: embrapa.br/pecuaria-sudeste");
  R.push("   • Tabelas Brasileiras de Exigências Nutricionais — BR-CORTE (UFV) — exigências e formulação. Portal: brcorte.com.br");
  R.push("   • MAPA — normas oficiais de sanidade e produção animal. Portal: gov.br/agricultura");

  const cond: string[] = [];
  const cp = (m.condicaoPasto || "").toLowerCase();
  if (cp.includes("ruim") || cp.includes("crítico") || cp.includes("regular")) {
    cond.push("   • Manejo e recuperação de pastagens / oferta de forragem na seca — publicações da EMBRAPA sobre altura de manejo, lotação e pastagens degradadas. Busque 'manejo de pastagens' em embrapa.br.");
  }
  if ((m.doencasOcorridas && m.doencasOcorridas.trim()) || m.numAnimaisDoentes > 0) {
    cond.push("   • Sanidade do rebanho de corte — calendário sanitário, controle de ecto/endoparasitas e doenças prevalentes. EMBRAPA e Programa Nacional de Sanidade dos Herbívoros (MAPA). Portais: embrapa.br e gov.br/agricultura.");
  }
  if (m.vendasNum > 0 || m.comprasNum > 0) {
    cond.push("   • Indicadores econômicos e custos de produção da pecuária de corte — metodologia de custos e análise de resultado da EMBRAPA/CNA. Busque 'custos de produção pecuária de corte' em embrapa.br.");
  }
  if ((m.suplementoTipo || "").toLowerCase().includes("ureia")) {
    cond.push("   • Uso seguro de ureia (NNP) na suplementação — orientações da EMBRAPA sobre adaptação e dosagem segura. Busque 'ureia na alimentação de bovinos' em embrapa.br.");
  }
  cond.push("   • Pecuária no litoral/semiárido nordestino — EMBRAPA Semiárido para estratégias de alimentação na estação seca. Portal: embrapa.br/semiarido");

  R.push("\nFontes específicas para os pontos deste mês:");
  R.push(cond.join("\n"));
  R.push("\nObservação: todas as fontes acima são instituições e publicações reais e consolidadas. Nenhuma referência foi inventada.");
  return R.join("\n");
}

// ANÁLISE OFFLINE mensal — parecer técnico estruturado, determinístico (sem IA)
function buildMonthlyOfflineAnalysis(m: MonthlyFormState, mx: any): string {
  const A: string[] = [];
  const pastoCritico = (m.condicaoPasto || "").toLowerCase().match(/ruim|crítico|regular/) !== null;
  A.push("================ ANÁLISE TÉCNICA DO MÊS (PARECER) ================\n");
  A.push("⚠️ Parecer gerado em modo local (sem IA ao vivo). Baseado diretamente nos dados e indicadores apurados.\n");
  A.push("PARTE I — LEITURA DO MÊS\n");
  A.push(`• Plantel: passou de ${mx.plantelInicio} para ${mx.plantelFim} cabeças, com ${mx.nascimentos} nascimentos e ${mx.mortes} mortes (mortalidade de ${mx.taxaMortalidadePct}%). ${mx.taxaMortalidadePct > 2 ? "A mortalidade do mês está alta para padrões de corte (referência usual < 2%/ano no rebanho adulto) — investigar causas." : "Mortalidade dentro de patamar aceitável, manter vigilância."}`);
  A.push(`• Desempenho: GMD médio ponderado de ${mx.gmdMedioPonderado} kg/dia. ${mx.gmdMedioPonderado < 0.4 ? "Abaixo do desejável para fase de crescimento/engorda — checar oferta de pasto, dieta e sanidade." : "Desempenho coerente; acompanhar por categoria para refinar a dieta."}`);
  A.push(`• Pasto e clima: condição "${m.condicaoPasto || "não informada"}", pluviometria de ${m.pluviometriaMm} mm, manejo ${m.metodoManejoPasto || "não informado"}. ${pastoCritico ? "Sinal de alerta: planejar reforço de volumoso/suplemento e ajustar lotação para não comprometer o GMD." : "Oferta de forragem adequada ao período."}`);
  A.push(`• Sanidade: ${m.numAnimaisDoentes > 0 ? m.numAnimaisDoentes + " animal(is) doente(s) no mês (" + (m.doencasOcorridas || "ver relato") + "). Reforce o calendário sanitário e a prevenção sazonal." : "sem ocorrências relevantes informadas."}`);
  A.push(`• Alimentação: consumo de ${mx.consumoSuplementoTonMes} ton de suplemento/ração e ${mx.consumoVolumosoTonMes} ton de volumoso; consumo de pasto estimado em ${mx.consumoPastoEstimadoTonMes} ton de MS (estimativa a partir do plantel e dos pesos). Use esse número para planejar a próxima compra de insumos.`);

  A.push("\nPARTE II — RESULTADO ECONÔMICO E PARECER\n");
  A.push(`• Custo operacional fixo do mês: R$ ${mx.custoOperacionalFixo.toLocaleString("pt-BR")}. Custo total (com alimentação, comercialização e aquisições): R$ ${mx.custoTotal.toLocaleString("pt-BR")}.`);
  if (mx.vendasTotal > 0 || mx.receitaVendas > 0) {
    A.push(`• Mês com venda: receita de R$ ${mx.receitaVendas.toLocaleString("pt-BR")} contra custos operacionais e de alimentação, resultando em um resultado operacional de R$ ${mx.resultadoMes.toLocaleString("pt-BR")} no mês. ${mx.resultadoMes >= 0 ? "Resultado positivo — atividade superavitária no período." : "Resultado negativo no período — avaliar custo por arroba e momento de venda."}`);
  } else {
    A.push(`• Mês sem vendas: o resultado operacional aparece negativo (R$ ${mx.resultadoMes.toLocaleString("pt-BR")}) porque há custos sem receita — normal em meses de retenção/engorda; o retorno se realiza no mês da venda.`);
  }
  if (mx.custoAquisicao > 0) A.push(`• Aquisições do mês: R$ ${mx.custoAquisicao.toLocaleString("pt-BR")} (investimento em estoque de animais, não é despesa do período).`);
  A.push(`• Plano para o próximo mês: (1) ${pastoCritico ? "antecipar volumoso e ajustar lotação" : "manter monitoramento de altura/oferta do pasto"}; (2) acompanhar GMD por categoria e corrigir a dieta dos lotes abaixo da meta; (3) ${m.numAnimaisDoentes > 0 ? "reforçar sanidade e isolar casos em resguardo" : "manter o calendário sanitário preventivo"}; (4) consolidar custos por arroba produzida para a tomada de decisão de venda.`);
  return A.join("\n");
}

// ENDPOINT: gera o relatório mensal (espelho + análise + referencial)
app.post("/api/monthly", async (req, res) => {
  try {
    const m: MonthlyFormState = req.body;
    const metrics = computeMonthlyMetrics(m);
    const id = "mon-" + Math.random().toString(36).substr(2, 9);
    const ai = getGeminiClient();
    let analysis = "";

    if (ai) {
      try {
        const prompt = `Você é um Pós-Doutor em Zootecnia e Agronomia, especialista referência em manejo pecuário no litoral do Nordeste brasileiro (propriedade ~40 km ao sul de Natal-RN). Analise o ACOMPANHAMENTO MENSAL abaixo e produza APENAS a parte analítica do relatório.
NÃO repita os dados crus (um espelho fiel já é inserido automaticamente antes) e NÃO escreva bibliografia (há uma seção fixa de Referencial Técnico depois). NUNCA invente referências, normas ou dados.

INDICADORES DO MÊS: plantel ${metrics.plantelInicio}→${metrics.plantelFim} cab.; nascimentos ${metrics.nascimentos}; mortes ${metrics.mortes} (mortalidade ${metrics.taxaMortalidadePct}%); GMD médio ${metrics.gmdMedioPonderado} kg/dia; consumo suplemento ${metrics.consumoSuplementoTonMes} ton; volumoso ${metrics.consumoVolumosoTonMes} ton; pasto estimado ${metrics.consumoPastoEstimadoTonMes} ton MS; custo fixo R$ ${metrics.custoOperacionalFixo}; custo total R$ ${metrics.custoTotal}; receita R$ ${metrics.receitaVendas}; resultado do mês R$ ${metrics.resultadoMes}.
DADOS COMPLETOS: ${JSON.stringify(m)}

Estruture EXATAMENTE assim:
================ ANÁLISE TÉCNICA DO MÊS (PARECER) ================

PARTE I — LEITURA DO MÊS
Comente: dinâmica do plantel e mortalidade; desempenho (GMD) por fase; pasto/clima e pluviometria; sanidade; alimentação (consumo de pasto/volumoso/suplemento).

PARTE II — RESULTADO ECONÔMICO E PARECER
Custo fixo, custo total, e — havendo venda/compra — receita, custo e resultado da atividade no mês. Finalize com um plano de ação técnico e priorizado para o mês seguinte. Seja específico e fundamentado, sem inventar fontes.`;
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        analysis = response.text || buildMonthlyOfflineAnalysis(m, metrics);
      } catch (aiErr) {
        console.error("Gemini failed during monthly report:", aiErr);
        analysis = buildMonthlyOfflineAnalysis(m, metrics);
      }
    } else {
      analysis = buildMonthlyOfflineAnalysis(m, metrics);
    }

    const espelho = buildMonthlyMirror(m, metrics);
    const referencial = buildMonthlyReferencial(m);
    const diagnostic = `RELATÓRIO MENSAL DE MANEJO — FAZENDA BRASILEIRA AUGUSTA (PECUÁRIA)\nReferência: ${m.mesReferencia || "—"}\n\n${espelho}\n\n${analysis}\n\n${referencial}`;

    const report: MonthlyReport = { id, timestamp: new Date().toISOString(), formState: m, metrics, diagnostic };
    lastMonthlyReport = report;
    res.json(report);
  } catch (error: any) {
    console.error("Error creating monthly report:", error);
    res.status(500).json({ error: error.message || "Falha ao processar o acompanhamento mensal" });
  }
});

// ENDPOINT: último relatório mensal (para o Painel do Dono)
app.get("/api/monthly/last", (req, res) => {
  res.json(lastMonthlyReport);
});

// Serve frontend assets in production or mount dev server in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fazenda Brasileira Augusta Service] Iniciado com sucesso na porta ${PORT}`);
  });
}

startServer();

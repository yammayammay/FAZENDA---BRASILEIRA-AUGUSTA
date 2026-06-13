export interface HerdCategoryInfo {
  heads: number;
  weight: number;
  imsCoef: number; // e.g. 2.0 representing 2.0%
}

export interface ExtraCategoryInfo {
  name: string;
  heads: number;
  weight: number;
  imsCoef: number;
}

export interface EquipmentInfo {
  possui: boolean;
  status: string; // e.g. 'Excelente', 'Mapeado', 'Danificado', 'Inexistente'
  capacidade: string;
  obs: string;
}

export interface FormState {
  // Bloco 01 - Identificação
  nomeProdutor: string;
  contatoZap: string;
  email: string;
  cargo: string;
  cidade: string;
  obsPrevia: string;
  rotinaPratica: string;

  // Bloco 02 - Composição do Plantel
  herd: {
    bezerroLactente: HerdCategoryInfo;
    bezerroDesmamado: HerdCategoryInfo;
    novilha: HerdCategoryInfo;
    vacaSolteira: HerdCategoryInfo;
    vacaParida: HerdCategoryInfo;
    vacaGestanteSeca: HerdCategoryInfo;
    garroteRecria: HerdCategoryInfo;
    boiTerminacao: HerdCategoryInfo;
    touro: HerdCategoryInfo;
    [key: string]: HerdCategoryInfo; // indexer to dynamic categories
  };
  extraCatName: string;
  extraCatHeads: number;
  extraCatWeight: number;
  extraCatImsCoef: number;
  extraCategories?: ExtraCategoryInfo[]; // dynamic custom categories (Bloco 02)
  rotinaControle: string;

  // Bloco 03 - Desempenho e Ciclo
  bezerroDesmGmd: number;
  novilhaGmd: number;
  garroteGmd: number;
  boiGmd: number;
  vacaGmd: number;
  gmdMedido: string;
  pesoEntrada: number;
  pesoAlvo: number;
  rendimentoCarcaça: number;
  tempoAprov: number;
  racaPredominante: string;
  racas?: string[]; // multi-select de raças (Bloco 03)
  animaisVendidosAnual: number;
  rotinaDesempenho: string;

  // Bloco 04 - Precificação e Receita
  precoArroba: number;
  destinoPrincipal: string;
  destinoPrincipalOutro?: string; // especificação quando destino = "Outro" (Bloco 04)
  contrato: string;
  descontoMedio: number;
  freteMedio: number;
  outrosCustos: number;
  custoComercializacao?: number; // frete + comissões + taxas, R$/cabeça (Bloco 04)
  sazonalidade: string[]; // list of months e.g. ["Jan", "Fev"]
  metaReceitaAnual: number;
  rotinaComercial: string;

  // Bloco 05 - Dieta Atual
  areaTotalPastagem: number;
  especiePredominantePastagem: string;
  estadoMedioPastagem: string;
  producaoEstimadaPastagem: string;
  sistemaPastejo: string;
  metodoControlePastejo?: string; // método de controle de entrada/saída do pasto (Bloco 05A)
  correcaoSoloAdubacao?: string; // frequência de correção de solo/adubação (Bloco 05A)
  usoVinhaca?: string; // uso da vinhaça do alambique (Bloco 05A)
  custoVinhacaHa?: number; // custo da prática de vinhaça por hectare (Bloco 05A)
  pragasComuns?: string; // pragas mais comuns na região (Bloco 05A)
  tecnicasManejo?: string; // técnicas de manejo de pasto adotadas (Bloco 05A)
  capimTipo?: string; // especificação do tipo de capim como volumoso (Bloco 05B)
  numPiquetes: number;
  adubacaoPastagem: boolean;
  custoMensalPastagem: number;

  volumosos: string[]; // ["silagem_milho", "feno", etc]
  volumeMesVolumoso: number;
  custoVolumoso: number;
  dispBagacoVinhaca: string;
  vinhacaUtilizada: string;

  suplementos: string[];
  planejamentoSuplemento?: string; // info geral, gargalos e planejamento sobre suplemento/ração (Bloco 05C) // ["sal_proteico", "ração_comercial", etc]
  volumeSuplMes: number;
  custoSuplemento: number;
  fornecedorSuplemento: string;
  distanciaFornecedor: number;
  frequenciaFornecimento: string;
  rotinaAlimentacao: string;

  // Bloco 06 - Custo Total
  custoNaoAlimentacao: number;
  maoDeObraDireta: number;
  sanidade: number;
  manutencaoEquip: number;
  custoExtra: number;
  descCustoExtra: string;
  rotinaCustos: string;

  // Bloco 07 - Infraestrutura Existente
  equipments: {
    balancaTronco: EquipmentInfo;
    forrageira: EquipmentInfo;
    misturador: EquipmentInfo;
    moinho: EquipmentInfo;
    trator: EquipmentInfo;
    deposito: EquipmentInfo;
    balancaPesagem: EquipmentInfo;
    bombaTransferencia: EquipmentInfo;
  };
  terrenoDisponivel: string;
  energiaTrifasica: string;
  distanciaCurral: number;
  rotinaInfra: string;

  // Bloco 08 - Perspectiva de Expansão
  metaSurgimento24: number;
  metaSurgimento36: number;
  confinamentoFuturo: string;
  categoriaPrioritaria: string;
  vocacaoPropriedade?: string; // vocação principal da propriedade (Bloco 08)
  papelFabricaRacao?: string; // papel de uma eventual fábrica de ração (Bloco 08)
  visaoProprietario?: string; // visão estratégica do proprietário (Bloco 08)
  visaoGerente?: string; // visão do gerente/manejo (Bloco 08)
  visaoOperacional?: string; // visão do vaqueiro/operação (Bloco 08)
  visaoAdministrativa?: string; // visão da secretária/administrativo-financeiro (Bloco 08)
  capexOrcamento: number;
  paybackMeta: string;
  restricaoProcesso: string;
  expectativasGerais: string;
  contextoReal?: string; // campo aberto final: contexto real, gargalos, observações (Bloco 08)
}

export interface Submission {
  id: string;
  timestamp: string;
  formState: FormState;
  keyMetrics: {
    totalHeads: number;
    totalBiomass: number; // kg PV
    totalMsDia: number; // kg MS
    totalMsMes: number; // kg MS
    totalMonthlyFeedCost: number; // R$
    costPerAnimalMonth: number; // R$
    suggestedMixerCapacityKg: number; // based on daily MS and mixing batch sizes
    suggestedSiloVolumeM3: number; // based on monthly volume
  };
  diagnostic: string; // generated text summary
  emailsSent: {
    to: string;
    subject: string;
    body: string;
    date: string;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  thinking?: string; // Shows Gemini chain-of-thought
}

// ===================== ACOMPANHAMENTO MENSAL =====================

// Movimentação e desempenho de uma categoria do plantel no mês
export interface MonthlyCategory {
  inicio: number;          // nº de cabeças no início do mês
  nascimentos: number;     // entradas por nascimento
  mortes: number;          // baixas por morte
  compras: number;         // entradas por aquisição
  vendas: number;          // saídas por venda
  transferencias: number;  // saldo de mudança de categoria: entradas(+) / saídas(-)
  pesoMedioAnterior: number; // kg (mês anterior) — base para o GMD
  pesoMedioAtual: number;    // kg (mês atual)
}

export interface MonthlyFormState {
  // 1. Identificação do registro
  mesReferencia: string;     // ex.: "Maio/2026"
  dataPreenchimento: string; // ex.: "2026-05-31"
  responsavelNome: string;
  responsavelCargo: string;

  // 2. Dinâmica do plantel (por categoria)
  categorias: Record<string, MonthlyCategory>;

  // 3. Sanidade
  doencasOcorridas: string;
  numAnimaisDoentes: number;
  acidentes: string;
  mortesCausas: string;
  vacinacoesVermifugacoes: string;
  prevencaoSazonal: string;

  // 4. Pasto e clima
  condicaoPasto: string;       // select
  alturaPastoCm: number;
  metodoManejoPasto: string;   // select (reaproveita sistema de pastejo)
  controleEntradaSaida: string;
  piquetesUso: number;
  piquetesDescanso: number;
  pluviometriaMm: number;
  pragasInvasoras: string;
  correcaoAdubacao: string;

  // 5. Dieta e suplementação
  volumosoTipo: string;
  volumosoQtdTonMes: number;
  volumosoCustoMes: number;
  suplementoTipo: string;
  suplementoQtdTonMes: number;
  suplementoCustoMes: number;
  mudancasDieta: string;

  // 6. Comercial e custos
  comprasNum: number;
  comprasPesoMedio: number;     // kg/cab
  comprasValorTotal: number;    // R$
  vendasNum: number;
  vendasArrobasTotal: number;   // @ vendidas no total
  vendasValorTotal: number;     // R$
  vendasCustoComercializacao: number; // R$ total (frete, comissões, taxas)
  custoMaoDeObra: number;       // R$/mês
  custoSanidade: number;        // R$/mês
  custoInsumos: number;         // R$/mês
  custoOutros: number;          // R$/mês

  // 7. Observações
  observacoesGargalos: string;
}

export interface MonthlyReport {
  id: string;
  timestamp: string;
  formState: MonthlyFormState;
  metrics: {
    plantelInicio: number;
    plantelFim: number;
    nascimentos: number;
    mortes: number;
    taxaMortalidadePct: number;
    comprasTotal: number;
    vendasTotal: number;
    gmdMedioPonderado: number;        // kg/dia
    consumoSuplementoTonMes: number;
    consumoVolumosoTonMes: number;
    consumoPastoEstimadoTonMes: number; // estimativa (MS)
    custoOperacionalFixo: number;     // R$
    custoTotal: number;               // R$
    receitaVendas: number;            // R$
    custoAquisicao: number;           // R$
    resultadoMes: number;             // R$ (receita - custos do mês)
  };
  diagnostic: string; // espelho + análise + referencial
}

export interface HerdCategoryInfo {
  heads: number;
  weight: number;
  imsCoef: number; // e.g. 2.0 representing 2.0%
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
  animaisVendidosAnual: number;
  rotinaDesempenho: string;

  // Bloco 04 - Precificação e Receita
  precoArroba: number;
  destinoPrincipal: string;
  contrato: string;
  descontoMedio: number;
  freteMedio: number;
  outrosCustos: number;
  sazonalidade: string[]; // list of months e.g. ["Jan", "Fev"]
  metaReceitaAnual: number;
  rotinaComercial: string;

  // Bloco 05 - Dieta Atual
  areaTotalPastagem: number;
  especiePredominantePastagem: string;
  estadoMedioPastagem: string;
  producaoEstimadaPastagem: string;
  sistemaPastejo: string;
  numPiquetes: number;
  adubacaoPastagem: boolean;
  custoMensalPastagem: number;

  volumosos: string[]; // ["silagem_milho", "feno", etc]
  volumeMesVolumoso: number;
  custoVolumoso: number;
  dispBagacoVinhaca: string;
  vinhacaUtilizada: string;

  suplementos: string[]; // ["sal_proteico", "ração_comercial", etc]
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
  capexOrcamento: number;
  paybackMeta: string;
  restricaoProcesso: string;
  expectativasGerais: string;
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

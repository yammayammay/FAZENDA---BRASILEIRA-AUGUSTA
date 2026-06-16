import React, { useState } from "react";
import {
  TrendingUp,
  FileText,
  Mail,
  Calendar,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  Database,
  Printer,
  ChevronDown,
  Percent,
  CheckCircle,
  Clock,
  HardDrive,
  Cloud,
  CloudOff,
  Trash2
} from "lucide-react";
import { Submission, MonthlyReport } from "../types.js";
import { categoryLabels } from "../data.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface StrategicDashboardProps {
  submissions: Submission[];
  onSelectSubmission: (sub: Submission) => void;
  selectedSubmission: Submission | null;
  downloadPDF: (sub: Submission) => void;
  lastMonthly: MonthlyReport | null;
  downloadMonthlyPDF: (r: MonthlyReport) => void;
  dbActive: boolean;
  diagBrowserSaved: boolean;
  monthlyBrowserSaved: boolean;
  onClearDiagnostic: () => void;
  onClearMonthly: () => void;
}

const COLORS = [
  "#2D5A27", "#3E7237", "#A67C52", "#C9A883",
  "#8FAC9E", "#5A7C52", "#768178", "#BDC6C1", "#C9A883"
];

export default function StrategicDashboard({
  submissions,
  onSelectSubmission,
  selectedSubmission,
  downloadPDF,
  lastMonthly,
  downloadMonthlyPDF,
  dbActive,
  diagBrowserSaved,
  monthlyBrowserSaved,
  onClearDiagnostic,
  onClearMonthly
}: StrategicDashboardProps) {
  const currentSub = selectedSubmission || submissions[0];
  const [activeTab, setActiveTab] = useState<"visuals" | "emails">("visuals");
  const [viewMode, setViewMode] = useState<"diagnostico" | "mensal">("diagnostico");

  const modeToggle = (
    <div className="flex bg-stone-100 border border-stone-200 p-1 rounded-lg w-full md:w-auto mb-2">
      <button
        onClick={() => setViewMode("diagnostico")}
        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewMode === "diagnostico" ? "bg-primary text-white shadow" : "text-stone-600 hover:bg-white"}`}
      >
        Diagnóstico Inicial
      </button>
      <button
        onClick={() => setViewMode("mensal")}
        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewMode === "mensal" ? "bg-primary text-white shadow" : "text-stone-600 hover:bg-white"}`}
      >
        Acompanhamento Mensal
      </button>
    </div>
  );

  // Selo "onde está salvo" + botão de limpar, com recado explicativo. Reutilizado nos dois modos.
  const storagePanel = (browserSaved: boolean, hasReport: boolean, onClear: () => void) => (
    <div className="bg-white border border-warm-border rounded-sm p-3 mb-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wide">Onde está salvo:</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${browserSaved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-400 border border-stone-200"}`}>
          <HardDrive className="w-3 h-3" /> {browserSaved ? "Salvo no navegador" : "Não salvo no navegador"}
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${dbActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-400 border border-stone-200"}`}>
          {dbActive ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />} {dbActive ? "Salvo no banco" : "Banco não configurado"}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={onClear}
          disabled={!hasReport}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-sm border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpar último registro
        </button>
        <span className="text-[9px] italic text-stone-400 text-right max-w-[260px] leading-snug">
          Use este botão apenas quando for solicitar/gerar um novo relatório (diagnóstico ou mensal). Ele apaga o último registro do navegador e do banco.
        </span>
      </div>
    </div>
  );

  if (viewMode === "mensal") {
    const r = lastMonthly;
    return (
      <div className="space-y-4">
        {modeToggle}
        {storagePanel(monthlyBrowserSaved, !!r, onClearMonthly)}
        {!r ? (
          <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 text-center text-sm text-stone-500">
            Nenhum acompanhamento mensal gerado nesta sessão. Preencha a aba "Acompanhamento Mensal" e clique em <strong>Gerar Relatório</strong> — o resumo do último mês aparecerá aqui.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-display font-bold text-stone-900 text-base">Resumo do Último Acompanhamento Mensal</h3>
                  <span className="text-[11px] text-stone-500 font-mono">Referência: {r.formState.mesReferencia || "—"} • Responsável: {r.formState.responsavelNome || "—"}</span>
                </div>
                <button onClick={() => downloadMonthlyPDF(r)} className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-2 rounded-sm hover:bg-primary/90">
                  <Printer className="w-3.5 h-3.5" /> Baixar PDF
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-stone-50 rounded p-3"><span className="text-[9px] text-stone-500 font-mono block">PLANTEL (FIM)</span><div className="text-xl font-bold text-primary">{r.metrics.plantelFim}</div></div>
                <div className="bg-stone-50 rounded p-3"><span className="text-[9px] text-stone-500 font-mono block">GMD MÉDIO</span><div className="text-xl font-bold text-primary">{r.metrics.gmdMedioPonderado} <span className="text-xs">kg/d</span></div></div>
                <div className="bg-stone-50 rounded p-3"><span className="text-[9px] text-stone-500 font-mono block">CUSTO TOTAL</span><div className="text-lg font-bold text-primary">R$ {r.metrics.custoTotal.toLocaleString("pt-BR")}</div></div>
                <div className="bg-stone-50 rounded p-3"><span className="text-[9px] text-stone-500 font-mono block">RESULTADO DO MÊS</span><div className={`text-lg font-bold ${r.metrics.resultadoMes >= 0 ? "text-primary" : "text-red-600"}`}>R$ {r.metrics.resultadoMes.toLocaleString("pt-BR")}</div></div>
              </div>
            </div>
            <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-5 shadow-sm">
              <h4 className="text-xs font-mono font-semibold text-primary mb-2">RELATÓRIO COMPLETO (espelho + diagnóstico + referencial)</h4>
              <div className="whitespace-pre-line font-serif leading-relaxed text-xs bg-warm-quote/45 p-4 rounded-sm border border-warm-border max-h-[420px] overflow-y-auto">
                {r.diagnostic}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentSub) {
    return (
      <div className="space-y-4">
        {modeToggle}
        {storagePanel(diagBrowserSaved, false, onClearDiagnostic)}
        <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 text-center text-sm text-stone-500">
          Nenhum diagnóstico inicial cadastrado nesta sessão. Preencha a aba "Diagnóstico Inicial" e envie o questionário.
        </div>
      </div>
    );
  }

  const state = currentSub.formState;
  const metrics = currentSub.keyMetrics;

  // Prepare chart data for herd composition biomass
  const biomassChartData = Object.keys(state.herd)
    .map((key) => {
      const value = state.herd[key];
      const weight = value?.heads > 0 ? value.heads * value.weight : 0;
      return {
        name: categoryLabels[key] || key,
        Cabeças: value?.heads || 0,
        "Biomassa (kg PV)": weight,
        "Ingestão MS (kg/dia)": Math.round(value?.heads * value.weight * (value.imsCoef / 100))
      };
    })
    .filter((v) => v.Cabeças > 0);

  // Prepare growth forecast chart
  const growthChartData = [
    { name: "Atual", "Rebanho (Cabeças)": metrics.totalHeads },
    { name: "Meta 24 Meses", "Rebanho (Cabeças)": state.metaSurgimento24 || metrics.totalHeads * 1.2 },
    { name: "Meta 36 Meses", "Rebanho (Cabeças)": state.metaSurgimento36 || metrics.totalHeads * 1.5 }
  ];

  return (
    <div className="space-y-6">
      {modeToggle}
      {storagePanel(diagBrowserSaved, !!currentSub, onClearDiagnostic)}
      {/* Executive Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-primary text-white rounded-sm p-4 shadow-md border-b-4 border-accent">
          <span className="text-[10px] text-stone-200 font-mono block mb-1">TOTAL DE CABEÇAS</span>
          <div className="text-3xl font-bold font-serif text-accent-light">{metrics.totalHeads}</div>
          <span className="text-[10px] text-stone-200">Cabeças no plantel FBA</span>
        </div>
        <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-4 shadow-sm">
          <span className="text-[10px] text-stone-500 font-mono block mb-1">BIOMASSA ATIVA</span>
          <div className="text-2xl font-bold font-serif text-primary">
            {metrics.totalBiomass.toLocaleString("pt-BR")} <span className="text-xs text-stone-500 font-normal">kg PV</span>
          </div>
          <span className="text-[10px] text-stone-500">Peso vivo aproximado</span>
        </div>
        <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-4 shadow-sm">
          <span className="text-[10px] text-stone-500 font-mono block mb-1">DEMANDA MATÉRIA SECA</span>
          <div className="text-2xl font-bold font-serif text-primary">
            {metrics.totalMsDia.toLocaleString("pt-BR")} <span className="text-xs text-stone-500 font-normal">kg/dia</span>
          </div>
          <span className="text-[10px] text-stone-500">~{Math.round(metrics.totalMsMes).toLocaleString("pt-BR")} kg/mês</span>
        </div>
        <div className="bg-white border-y border-r border-warm-border border-l-4 border-accent rounded-sm p-4 shadow-sm">
          <span className="text-[10px] text-stone-500 font-mono block mb-1">CUSTO ALIMENTAÇÃO MÊS</span>
          <div className="text-2xl font-bold font-serif text-primary">
            R$ {metrics.totalMonthlyFeedCost.toLocaleString("pt-BR")}
          </div>
          <span className="text-[10px] text-stone-500">R$ {metrics.costPerAnimalMonth}/Animal/Mês</span>
        </div>
      </div>

      {/* Main Analysis and Graph Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Detail Diagnostics Panel */}
        <div className="lg:col-span-2 bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-warm-border pb-3">
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-lg">
                Laudo Estratégico & Engenharia de Fábrica
              </h3>
              <p className="text-[10px] text-stone-500 font-mono">
                Por: Consultor Técnico FBA • ID: {currentSub.id} ({new Date(currentSub.timestamp).toLocaleDateString()})
              </p>
            </div>
            <button
              onClick={() => downloadPDF(currentSub)}
              className="bg-primary hover:bg-primary-light text-white text-xs px-3.5 py-2 rounded-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-primary/10 cursor-pointer font-bold uppercase tracking-wider"
            >
              <Printer className="w-4 h-4 text-accent-light" />
              <span>Imprimir PDF Completo</span>
            </button>
          </div>

          {/* Diagnosis Text */}
          <div className="prose max-w-none text-xs text-stone-700 leading-relaxed space-y-4 max-h-[380px] overflow-y-auto pr-2" id="diagnostico-laudo-corpo">
            <div className="whitespace-pre-line font-serif leading-relaxed text-sm bg-warm-quote/45 p-4 rounded-sm border border-warm-border">
              {currentSub.diagnostic}
            </div>
          </div>

          {/* Suggestions and capacities */}
          <div className="grid grid-cols-2 gap-4 bg-warm-quote border border-warm-border rounded-sm p-4">
            <div>
              <span className="text-[10px] text-stone-500 font-mono font-bold uppercase tracking-wider block mb-1">MISTURADOR SELECIONADO</span>
              <div className="text-sm font-bold text-primary font-serif">
                Modelo Vertical - {metrics.suggestedMixerCapacityKg} kg Batch
              </div>
              <p className="text-[10px] text-stone-600 mt-0.5 leading-normal">
                Capacidade ideal para dosar formulado seco com motores elétricos de {metrics.suggestedMixerCapacityKg < 500 ? "3 CV" : "5 CV"}.
              </p>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 font-mono font-bold uppercase tracking-wider block mb-1">SILOS DE ARMAZENAGEM</span>
              <div className="text-sm font-bold text-primary font-serif">
                Silo Cilíndrico de {metrics.suggestedSiloVolumeM3} m³
              </div>
              <p className="text-[10px] text-stone-600 mt-0.5 leading-normal">
                Garante guarda rotativa de grãos minerais estáveis, protegidos da maresia local de Nísia Floresta, RN.
              </p>
            </div>
          </div>
        </div>

        {/* Charts Side column */}
        <div className="bg-white border-y border-r border-warm-border border-l-4 border-accent rounded-sm p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex border-b border-warm-border pb-2 mb-3 justify-between items-center">
              <h4 className="font-serif font-bold text-stone-900 text-xs">Mapeamento Vetorial e Metas</h4>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveTab("visuals")}
                  className={`text-[10px] px-2.5 py-1 rounded-sm cursor-pointer transition-all ${activeTab === "visuals" ? "bg-primary font-bold text-white shadow-sm" : "text-stone-500 hover:bg-stone-100"}`}
                >
                  Gráficos
                </button>
                <button
                  onClick={() => setActiveTab("emails")}
                  className={`text-[10px] px-2.5 py-1 rounded-sm cursor-pointer transition-all ${activeTab === "emails" ? "bg-primary font-bold text-white shadow-sm" : "text-stone-500 hover:bg-stone-100"}`}
                >
                  Outbox Emails
                </button>
              </div>
            </div>

            {activeTab === "visuals" ? (
              <div className="space-y-4">
                {/* Recharts Biomassa */}
                <div>
                  <span className="text-[10px] text-stone-500 font-mono block mb-1">Carga de Biomassa por Categoria (kg PV)</span>
                  <div className="h-[180px] w-full">
                    {biomassChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={biomassChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D1" />
                          <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                          <YAxis tick={{ fontSize: 8 }} />
                          <Tooltip wrapperStyle={{ fontSize: "10px" }} />
                          <Bar dataKey="Biomassa (kg PV)" fill="#2D5A27" radius={[0, 0, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-stone-400 font-serif italic">Nenhum animal preenchido.</div>
                    )}
                  </div>
                </div>

                {/* Recharts Metas de Crescimento */}
                <div>
                  <span className="text-[10px] text-stone-500 font-mono block mb-1">Previsão e Planejamento de Rebanho</span>
                  <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={growthChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8E2D1" />
                        <XAxis type="number" tick={{ fontSize: 8 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} width={60} />
                        <Tooltip wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="Rebanho (Cabeças)" fill="#A67C52" radius={[0, 0, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              /* Outbox Emails */
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {currentSub.emailsSent.map((email, i) => (
                  <div key={i} className="bg-warm-quote/50 rounded-sm p-3 border border-warm-border space-y-1.5 text-xs text-stone-700 shadow-sm">
                    <div className="flex justify-between items-center text-[9px] text-stone-400 font-mono border-b border-warm-border pb-1">
                      <span className="flex items-center gap-1 font-bold text-accent">
                        <Clock className="w-3 h-3 text-accent" />
                        NOTIFICAÇÃO ENVIADA (SIM)
                      </span>
                      <span>{new Date(email.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div>
                      <span className="font-semibold text-stone-600">Para:</span> <span className="font-mono text-[10px] text-stone-800">{email.to}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-600">Assunto:</span> <span className="font-semibold text-primary">{email.subject}</span>
                    </div>
                    <div className="bg-white p-2 rounded-sm text-[10px] font-mono text-stone-600 max-h-[80px] overflow-y-auto border border-warm-border leading-normal">
                      {email.body}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-semibold">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Status: Enviado com Sucesso, Laudo PDF Incorporado.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Submissions Table - owner strategic decisions */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-warm-border animate-fadeIn">
          <Database className="w-4 h-4 text-primary" />
          <div>
            <h4 className="font-serif font-bold text-stone-900 text-base">Controle de Submissões e Lançamentos Existentes</h4>
            <span className="text-[10px] text-stone-500">Histórico de diagnósticos da Fazenda Brasileira Augusta</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-stone-600">
            <thead className="text-[10px] text-stone-500 uppercase bg-stone-50 font-mono border-b border-warm-border">
              <tr>
                <th className="px-3 py-2.5">Produtor / Cargo</th>
                <th className="px-3 py-2.5 text-center">Plantel</th>
                <th className="px-3 py-2.5">Demanda MS/Mês</th>
                <th className="px-3 py-2.5">CAPEX Pretendido</th>
                <th className="px-3 py-2.5">GMD Bois</th>
                <th className="px-3 py-2.5 text-right w-[180px]">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {submissions.map((sub) => {
                const isSelected = sub.id === currentSub.id;
                return (
                  <tr
                    key={sub.id}
                    className={`hover:bg-stone-50 transition-colors cursor-pointer ${isSelected ? "bg-warm-quote font-medium" : ""}`}
                    onClick={() => onSelectSubmission(sub)}
                  >
                    <td className="px-3 py-3">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5 font-serif">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        {sub.formState.nomeProdutor}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">{sub.formState.cargo} • {sub.formState.contatoZap}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-primary font-mono">
                      {sub.keyMetrics.totalHeads}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {Math.round(sub.keyMetrics.totalMsMes).toLocaleString("pt-BR")} kg
                    </td>
                    <td className="px-3 py-3 font-bold text-accent font-serif">
                      R$ {sub.formState.capexOrcamento.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-3 font-mono text-stone-500">
                      {sub.formState.boiGmd} kg/dia
                    </td>
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => onSelectSubmission(sub)}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-1 rounded-sm text-[10px] font-bold cursor-pointer"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => downloadPDF(sub)}
                          className="bg-primary text-white hover:bg-primary-light px-2.5 py-1 rounded-sm text-[10px] font-bold flex items-center gap-1 shadow shadow-primary/25 cursor-pointer"
                          title="Imprimir laudo"
                        >
                          <Printer className="w-3 h-3 text-accent-light" />
                          <span>Laudo PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

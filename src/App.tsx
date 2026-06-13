import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import {
  Sparkles,
  ClipboardList,
  BarChart3,
  Mail,
  Download,
  AlertTriangle,
  Building,
  Info,
  Layers,
  Clock,
  Printer
} from "lucide-react";
import { FormState, Submission } from "./types.js";
import { emptyFormState } from "./data.js";
import FormBlocks from "./components/FormBlocks.jsx";
import StrategicDashboard from "./components/StrategicDashboard.jsx";
import ChatAssistant from "./components/ChatAssistant.jsx";

export default function App() {
  const [activeView, setActiveView] = useState<"form" | "dashboard">("form");
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load submissions from the backend on mount
  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/submissions");
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
        if (data.length > 0) {
          setSelectedSubmission(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load historical database submissions:", e);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com o servidor.");
      }

      const newSub: Submission = await response.json();
      
      // Update local storage state
      setSubmissions((prev) => [newSub, ...prev]);
      setSelectedSubmission(newSub);
      
      // Fire client side PDF generation & download immediately!
      generateAndDownloadPDF(newSub);

      showToast("Questionário Enviado! Laudo Inteligente e Alertas SMTP ativados com sucesso.");
      
      // Switch view to executive strategic dashboard
      setActiveView("dashboard");
    } catch (err: any) {
      showToast(`Atenção: ${err.message || 'Falha ao processar.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Client side elegant jsPDF summary sheet generator
  const generateAndDownloadPDF = (sub: Submission) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const state = sub.formState;
      const metrics = sub.keyMetrics;

      // Theme Colors
      const greenPrimary = "#1e3d2f";
      const goldAccent = "#d9a05b";

      // PAGE 1: HEADER & IDENTIFICATION
      doc.setFillColor(30, 61, 47); // deep green
      doc.rect(0, 0, 210, 38, "F");

      doc.setTextColor(252, 251, 247); // cream
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("FAZENDA BRASILEIRA AUGUSTA", 15, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(217, 160, 91); // gold
      doc.text("LAUDO TÉCNICO DE DIMENSIONAMENTO & DIAGNÓSTICO ESTRATÉGICO", 15, 23);
      doc.setTextColor(200, 200, 200);
      doc.text(`Nísia Floresta, RN  |  Gerado em ${new Date(sub.timestamp).toLocaleDateString("pt-BR")}`, 15, 28);

      // Label Info Box
      doc.setFillColor(247, 246, 240); // very soft warm
      doc.rect(15, 45, 180, 42, "F");
      doc.setDrawColor(210, 210, 200);
      doc.rect(15, 45, 180, 42, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 61, 47);
      doc.text("1. IDENTIFICAÇÃO DO PRODUTOR E PROPRIEDADE", 20, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Nome do Respondente: ${state.nomeProdutor}`, 20, 60);
      doc.text(`Função/Cargo: ${state.cargo || "Não especificado"}`, 20, 66);
      doc.text(`Contato WhatsApp: ${state.contatoZap}`, 20, 72);
      doc.text(`E-mail Registrado: ${state.email}`, 20, 78);
      doc.text(`Unidade Geográfica: ${state.cidade || "Nísia Floresta, RN"}`, 110, 60);
      doc.text(`Energia Elétrica Trifásica: ${state.energiaTrifasica === "Sim" ? "Sim (Ativa)" : "Não"}`, 110, 66);
      doc.text(`Distância Ideal até Curral: ${state.distanciaCurral} metros`, 110, 72);

      // Section 2: Key metrics
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 61, 47);
      doc.text("2. RESUMO DO PLANTEL E BALANÇO DE MATÉRIA SECA (IMS)", 15, 96);

      // Draw Key Metric Box Metrics
      doc.setFillColor(30, 61, 47);
      doc.rect(15, 102, 55, 22, "F");
      doc.setTextColor(252, 251, 247);
      doc.setFontSize(8);
      doc.text("TOTAL DE CABEÇAS", 18, 107);
      doc.setFontSize(14);
      doc.text(`${metrics.totalHeads} Animais`, 18, 116);

      doc.setFillColor(247, 246, 240);
      doc.rect(75, 102, 55, 22, "F");
      doc.rect(75, 102, 55, 22, "S");
      doc.setTextColor(30, 61, 47);
      doc.setFontSize(8);
      doc.text("BIOMASSA TOTAL", 78, 107);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${metrics.totalBiomass.toLocaleString("pt-BR")} kg PV`, 78, 116);

      doc.rect(135, 102, 60, 22, "F");
      doc.rect(135, 102, 60, 22, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("DEMANDA MS MENSAL", 138, 107);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${Math.round(metrics.totalMsMes).toLocaleString("pt-BR")} kg/Mês`, 138, 116);

      // Draw table header of herds
      doc.setFillColor(230, 230, 225);
      doc.rect(15, 131, 180, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 61, 47);
      doc.text("Categoria Bovino", 18, 135.5);
      doc.text("Nº Cabeças", 75, 135.5);
      doc.text("PV Médio (kg)", 110, 135.5);
      doc.text("IMS Coef. (%)", 145, 135.5);
      doc.text("Est. MS/Dia (kg)", 175, 135.5);

      let yPos = 143;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);

      // Append standard categories to PDF
      const stdCats = [
        { name: "Bezerro(a) Lactente", stateKey: "bezerroLactente" },
        { name: "Bezerro(a) Desmamado(a)", stateKey: "bezerroDesmamado" },
        { name: "Novilha (8 a 24 m)", stateKey: "novilha" },
        { name: "Vaca Solteira / Vazia", stateKey: "vacaSolteira" },
        { name: "Vaca Parida / Lactante", stateKey: "vacaParida" },
        { name: "Vaca Gestante (Seca)", stateKey: "vacaGestanteSeca" },
        { name: "Garrote/Garrota", stateKey: "garroteRecria" },
        { name: "Animal em Terminação", stateKey: "boiTerminacao" },
        { name: "Touro", stateKey: "touro" },
      ];

      stdCats.forEach((cat) => {
        const item = state.herd[cat.stateKey];
        if (item && item.heads > 0) {
          doc.text(cat.name, 18, yPos);
          doc.text(`${item.heads}`, 75, yPos);
          doc.text(`${item.weight}`, 110, yPos);
          doc.text(`${item.imsCoef}%`, 145, yPos);
          const computedMs = item.heads * item.weight * (item.imsCoef / 100);
          doc.text(`${computedMs.toFixed(1)}`, 175, yPos);
          yPos += 6;
        }
      });

      // Dynamic custom categories (Bloco 02)
      (state.extraCategories || []).forEach((cat) => {
        if (cat && cat.heads > 0 && yPos < 200) {
          doc.text(`${cat.name || "Categoria adicional"}`, 18, yPos);
          doc.text(`${cat.heads}`, 75, yPos);
          doc.text(`${cat.weight}`, 110, yPos);
          doc.text(`${cat.imsCoef}%`, 145, yPos);
          const computedMs = cat.heads * cat.weight * (cat.imsCoef / 100);
          doc.text(`${computedMs.toFixed(1)}`, 175, yPos);
          yPos += 6;
        }
      });

      // Section: Proposed Factory Recommendations
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 61, 47);
      doc.text("3. ENGENHARIA DE PROJETO DA FÁBRICA DE RAÇÃO", 15, 205);

      // Recommendations box
      doc.setFillColor(247, 246, 240);
      doc.rect(15, 210, 180, 36, "F");
      doc.rect(15, 210, 180, 36, "S");

      doc.setFontSize(9);
      doc.setTextColor(30, 61, 47);
      doc.text("CAPACIDADE DO MISTURADOR RECOMENDADA:", 18, 216);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Misturador Vertical de ${metrics.suggestedMixerCapacityKg} kg batch.`, 18, 221);
      doc.text("Adequado para homogeneizar núcleos minerais finos, grãos de milho moído e soja de forma contínua com motores trifásicos.", 18, 225);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 61, 47);
      doc.text("MEDIDAS DE SEGURANÇA CONTRA MARESIA (NÍSIA FLORESTA - RN):", 18, 233);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text("Equipamento com proteção química antiferrugem epóxi ou partes de contato com insumos em Aço Inox 304.", 18, 238);
      doc.text("Armadilhamento elevado a 50cm das paredes de alvenaria contra aflatoxinas unidas a maresia costeira ativa do oceano.", 18, 242);

      // Financial payback
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 61, 47);
      doc.text("4. ORÇAMENTO & ANÁLISE DE PAYBACK PROJECT", 15, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`CAPEX Disponível Declarado: R$ ${state.capexOrcamento.toLocaleString("pt-BR")}  |  Payback Meta: ${state.paybackMeta}`, 15, 261);
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text("* Detalhes adicionais e plano de compras modular de equipamentos constam no Laudo Completo na folha subsequente.", 15, 265);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Fazenda Brasileira Augusta  |  Litoral Sul de Natal, Rio Grande do Norte - RN", 15, 285);
      doc.text("Página 1", 185, 285);

      // PAGE 2+: FULL LAUDO (espelho + análise por bloco + análise geral + referencial técnico)
      doc.addPage();

      const drawLaudoHeader = () => {
        doc.setFillColor(30, 61, 47);
        doc.rect(0, 0, 210, 15, "F");
        doc.setTextColor(252, 251, 247);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("FAZENDA BRASILEIRA AUGUSTA  |  LAUDO TÉCNICO INTEGRADO (PECUÁRIA)", 15, 10);
      };
      drawLaudoHeader();

      doc.setTextColor(30, 61, 47);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("5. LAUDO COMPLETO: ESPELHO, ANÁLISE E REFERENCIAL TÉCNICO", 15, 26);

      // Paginate the diagnostic text block (espelho + análise + referencial)
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);

      const laudoLines = doc.splitTextToSize(sub.diagnostic || "", 180);
      const lineHeight = 4.2;
      const topMargin = 33;
      const bottomLimit = 280;
      let y = topMargin;
      let pageNum = 2;

      laudoLines.forEach((ln: string) => {
        if (y > bottomLimit) {
          // footer of current page
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("Fazenda Brasileira Augusta  |  Litoral Sul de Natal - RN", 15, 288);
          doc.text(`Página ${pageNum}`, 185, 288);
          // new page
          doc.addPage();
          pageNum += 1;
          drawLaudoHeader();
          doc.setFont("courier", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(40, 40, 40);
          y = topMargin;
        }
        doc.text(ln, 15, y);
        y += lineHeight;
      });

      // final footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Para dúvidas técnicas, utilize o Assistente IA - Consultor Fazenda Brasileira Augusta no painel.", 15, 288);
      doc.text(`Página ${pageNum}`, 185, 288);

      // Save PDF to browser download trigger
      doc.save(`FBA_Relatorio_Dimensionamento_${state.nomeProdutor.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error("PDF generator failed:", e);
    }
  };

  // Re-run standard in-memory metrics calculation client side to display reactively
  const calculateCurrentLiveMetrics = () => {
    let heads = 0;
    let biomass = 0;
    let msDia = 0;

    Object.keys(formState.herd).forEach((key) => {
      const item = formState.herd[key];
      if (item && item.heads > 0) {
        heads += Number(item.heads);
        biomass += item.heads * item.weight;
        msDia += item.heads * item.weight * (item.imsCoef / 100);
      }
    });

    // Categorias adicionais personalizadas (dinâmicas)
    (formState.extraCategories || []).forEach((cat) => {
      if (cat && cat.heads > 0) {
        heads += Number(cat.heads);
        biomass += cat.heads * cat.weight;
        msDia += cat.heads * cat.weight * (cat.imsCoef / 100);
      }
    });

    const msMes = msDia * 30;

    return {
      heads,
      biomass,
      msDia: parseFloat(msDia.toFixed(1)),
      msMes: parseFloat(msMes.toFixed(1)),
    };
  };

  const liveMetrics = calculateCurrentLiveMetrics();

  return (
    <div className="min-h-screen bg-cream text-stone-800 font-sans selection:bg-accent selection:text-white pb-14" id="applet-fba-root">
      
      {/* Visual Header */}
      <header className="bg-primary border-b-4 border-accent text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-5 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-sm flex items-center justify-center font-serif font-bold text-primary text-xl shadow-inner select-none">
              BA
            </div>
            <div className="space-y-0.5">
              <h1 className="font-serif font-bold text-lg md:text-xl leading-none text-white tracking-wide uppercase">
                FAZENDA BRASILEIRA AUGUSTA
              </h1>
              <p className="text-[10px] text-stone-100/80 font-mono tracking-widest uppercase">
                Pecuária
              </p>
            </div>
          </div>

          <div className="flex bg-primary-light/80 border border-white/10 p-1 rounded-sm shadow-inner">
            <button
              onClick={() => setActiveView("form")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                activeView === "form"
                  ? "bg-accent text-white shadow-md"
                  : "text-stone-200 hover:text-white hover:bg-white/5"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Questionário Lançar</span>
            </button>
            <button
              onClick={() => {
                setActiveView("dashboard");
                if (submissions.length > 0 && !selectedSubmission) {
                  setSelectedSubmission(submissions[0]);
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                activeView === "dashboard"
                  ? "bg-accent text-white shadow-md"
                  : "text-stone-200 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Painel do Dono</span>
              {submissions.length > 0 && (
                <span className="bg-white text-primary font-bold px-1.5 py-0.5 rounded-sm text-[9px] font-mono shadow-sm ml-1">
                  {submissions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Reactive Visual Banner of Livestock totals under the header */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary p-4 rounded-sm shadow-sm grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <div>
            <span className="text-[10px] text-stone-500 font-mono uppercase font-bold tracking-wider block">REBANHO EM CADASTRO</span>
            <div className="text-2xl font-bold text-primary font-serif flex items-baseline gap-1 mt-1">
              {liveMetrics.heads}
              <span className="text-xs text-stone-500 font-sans font-normal">cabeças</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 font-mono uppercase font-bold tracking-wider block">BIOMASSA ATUAL</span>
            <div className="text-2xl font-bold text-primary font-serif flex items-baseline gap-1 mt-1">
              {liveMetrics.biomass.toLocaleString("pt-BR")}
              <span className="text-xs text-stone-500 font-sans font-normal">kg PV</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 font-mono uppercase font-bold tracking-wider block">MATÉRIA SECA/DIA</span>
            <div className="text-2xl font-bold text-primary font-serif flex items-baseline gap-1 mt-1">
              {liveMetrics.msDia.toLocaleString("pt-BR")}
              <span className="text-xs text-stone-500 font-sans font-normal">kg MS/dia</span>
            </div>
          </div>
          <div className="bg-warm-quote/60 px-3 py-1.5 rounded-sm border border-warm-border">
            <span className="text-[10px] text-stone-500 font-mono uppercase font-bold tracking-wider block">MATÉRIA SECA/MÊS</span>
            <div className="text-2xl font-bold text-accent font-serif flex items-baseline gap-1 mt-1">
              {Math.round(liveMetrics.msMes).toLocaleString("pt-BR")}
              <span className="text-xs text-stone-500 font-sans font-normal">kg MS/mês</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary border-y border-r border-warm-border border-l-4 border-accent text-white p-4 rounded-sm shadow-xl flex items-center gap-2 max-w-sm animate-slideUp font-serif text-xs">
          <Sparkles className="w-4 h-4 text-accent shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {activeView === "form" ? (
          /* Form tab layout: split layout - Form left / AI Assistants right */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-7">
              <FormBlocks
                formState={formState}
                onChange={setFormState}
                onSubmit={handleFormSubmit}
                submitting={submitting}
              />
            </div>

            <div className="lg:col-span-5 space-y-6">              {/* Chat consultation assist */}
              <ChatAssistant formState={formState} />
            </div>

          </div>
        ) : (
          /* Executive dashboard view tab */
          <StrategicDashboard
            submissions={submissions}
            selectedSubmission={selectedSubmission}
            onSelectSubmission={setSelectedSubmission}
            downloadPDF={generateAndDownloadPDF}
          />
        )}

      </main>

    </div>
  );
}

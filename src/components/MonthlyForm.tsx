import React from "react";
import {
  CalendarClock,
  Activity,
  HeartPulse,
  Sprout,
  Utensils,
  DollarSign,
  ClipboardList,
  FileDown,
} from "lucide-react";
import { MonthlyFormState, MonthlyCategory } from "../types.js";
import {
  monthlyCategoryLabels,
  condicaoPastoOptions,
  sistemaPastejoOptions,
  metodoControlePastejoOptions,
} from "../data.js";

interface MonthlyFormProps {
  monthlyState: MonthlyFormState;
  onChange: (s: MonthlyFormState) => void;
  onGenerate: () => void;
  generating: boolean;
}

export default function MonthlyForm({ monthlyState, onChange, onGenerate, generating }: MonthlyFormProps) {
  const set = (field: keyof MonthlyFormState, val: any) => onChange({ ...monthlyState, [field]: val });

  const setCat = (key: string, field: keyof MonthlyCategory, val: number) => {
    const cats = { ...monthlyState.categorias };
    cats[key] = { ...cats[key], [field]: val };
    onChange({ ...monthlyState, categorias: cats });
  };

  const catFim = (c: MonthlyCategory) =>
    c.inicio + c.nascimentos - c.mortes + c.compras - c.vendas + c.transferencias;

  const numCell = (key: string, field: keyof MonthlyCategory, c: MonthlyCategory) => (
    <input
      type="number"
      value={(c[field] as number)}
      onChange={(e) => setCat(key, field, Number(e.target.value))}
      className="w-full text-[11px] p-1.5 rounded border border-stone-300 text-center font-mono"
    />
  );

  const Section: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }> = ({ icon, title, subtitle, children }) => (
    <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
        <div className="p-1 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <div>
          <h3 className="font-display font-semibold text-stone-900 text-sm">{title}</h3>
          {subtitle && <span className="text-[10px] text-stone-500 font-mono">{subtitle}</span>}
        </div>
      </div>
      {children}
    </div>
  );

  const text = (field: keyof MonthlyFormState, label: string, placeholder = "", rows = 0) => (
    <div>
      <label className="block text-[11px] text-stone-600 font-medium mb-1">{label}</label>
      {rows > 0 ? (
        <textarea
          rows={rows}
          value={monthlyState[field] as string}
          onChange={(e) => set(field, e.target.value)}
          className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={monthlyState[field] as string}
          onChange={(e) => set(field, e.target.value)}
          className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder={placeholder}
        />
      )}
    </div>
  );

  const num = (field: keyof MonthlyFormState, label: string) => (
    <div>
      <label className="block text-[11px] text-stone-600 font-medium mb-1">{label}</label>
      <input
        type="number"
        value={monthlyState[field] as number}
        onChange={(e) => set(field, Number(e.target.value))}
        className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-sm p-4">
        <h2 className="font-display font-bold text-primary text-base">Acompanhamento Mensal de Manejo</h2>
        <p className="text-[11px] text-stone-600 mt-1">
          Preenchido pelo responsável pela operação ao final de cada mês. Ao clicar em <strong>Gerar Relatório</strong>, são baixados automaticamente dois arquivos: <strong>PDF</strong> (para a equipe tabelar e montar o histórico) e <strong>.md</strong> (para análise posterior em uma IA). O relatório traz o espelho fiel do preenchido, o diagnóstico fundamentado e o Referencial Técnico.
        </p>
      </div>

      {/* 1. Identificação */}
      <Section icon={<CalendarClock className="w-5 h-5 text-primary" />} title="1. Identificação do Registro" subtitle="Período e responsável pelo preenchimento">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {text("mesReferencia", "Mês de referência *", "Ex: Maio/2026")}
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Data de preenchimento *</label>
            <input type="date" value={monthlyState.dataPreenchimento} onChange={(e) => set("dataPreenchimento", e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-stone-300" />
          </div>
          {text("responsavelNome", "Responsável *", "Nome de quem preenche")}
          {text("responsavelCargo", "Cargo/Função", "Ex: Gerente de Manejo")}
        </div>
      </Section>

      {/* 2. Dinâmica do plantel */}
      <Section icon={<ClipboardList className="w-5 h-5 text-primary" />} title="2. Dinâmica do Plantel (por categoria)" subtitle="Movimentação do mês — o 'Fim' é calculado automaticamente">
        <div className="overflow-x-auto">
          <div className="min-w-[760px] space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[9px] font-mono text-stone-500 px-1">
              <div className="col-span-3">Categoria</div>
              <div className="text-center">Início</div>
              <div className="text-center">Nasc.</div>
              <div className="text-center">Mortes</div>
              <div className="text-center">Compras</div>
              <div className="text-center">Vendas</div>
              <div className="text-center">Transf.</div>
              <div className="text-center">PV ant.</div>
              <div className="text-center">PV atual</div>
              <div className="text-center">Fim</div>
            </div>
            {Object.keys(monthlyCategoryLabels).map((key) => {
              const c = monthlyState.categorias[key];
              if (!c) return null;
              return (
                <div key={key} className="grid grid-cols-12 gap-2 items-center bg-stone-50/60 rounded-lg p-1.5">
                  <div className="col-span-3 text-[10px] text-stone-700 font-medium pl-1">{monthlyCategoryLabels[key]}</div>
                  {numCell(key, "inicio", c)}
                  {numCell(key, "nascimentos", c)}
                  {numCell(key, "mortes", c)}
                  {numCell(key, "compras", c)}
                  {numCell(key, "vendas", c)}
                  {numCell(key, "transferencias", c)}
                  {numCell(key, "pesoMedioAnterior", c)}
                  {numCell(key, "pesoMedioAtual", c)}
                  <div className="text-center text-[11px] font-mono font-bold text-primary">{catFim(c)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[9px] text-stone-400">Transf.: saldo de mudança de categoria — entradas (+) e saídas (−). PV: peso vivo médio (kg); o peso anterior alimenta o cálculo do GMD do mês.</p>
      </Section>

      {/* 3. Sanidade */}
      <Section icon={<HeartPulse className="w-5 h-5 text-primary" />} title="3. Sanidade" subtitle="Ocorrências e prevenção do mês">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text("doencasOcorridas", "Doenças ocorridas", "Ex: bicheira, tristeza parasitária… ou 'sem ocorrências'")}
          {num("numAnimaisDoentes", "Nº de animais doentes")}
          {text("acidentes", "Acidentes", "Ex: corte em cerca… ou 'nenhum'")}
          {text("mortesCausas", "Mortes e causas", "Liste as mortes do mês e a causa de cada")}
          {text("vacinacoesVermifugacoes", "Vacinações / vermifugações")}
          {text("prevencaoSazonal", "Prevenção sazonal aplicada", "Ex: controle de carrapato/mosca no início das chuvas")}
        </div>
      </Section>

      {/* 4. Pasto e clima */}
      <Section icon={<Sprout className="w-5 h-5 text-primary" />} title="4. Pasto e Clima" subtitle="Condição da pastagem, manejo e pluviometria">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Condição do pasto *</label>
            <select value={monthlyState.condicaoPasto} onChange={(e) => set("condicaoPasto", e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white">
              <option value="">Selecione...</option>
              {condicaoPastoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {num("alturaPastoCm", "Altura média do pasto (cm)")}
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Método de manejo de pasto</label>
            <select value={monthlyState.metodoManejoPasto} onChange={(e) => set("metodoManejoPasto", e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white">
              <option value="">Selecione...</option>
              {sistemaPastejoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Controle de entrada/saída</label>
            <select value={monthlyState.controleEntradaSaida} onChange={(e) => set("controleEntradaSaida", e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white">
              <option value="">Selecione...</option>
              {metodoControlePastejoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {num("piquetesUso", "Piquetes em uso")}
          {num("piquetesDescanso", "Piquetes em descanso")}
          {num("pluviometriaMm", "Pluviometria do mês (mm)")}
          {text("pragasInvasoras", "Pragas / plantas invasoras", "Ex: cigarrinha… ou 'sem ocorrências'")}
          {text("correcaoAdubacao", "Correção de solo / adubação", "Ex: adubação de cobertura em 12 ha… ou 'não realizada'")}
        </div>
      </Section>

      {/* 5. Dieta e suplementação */}
      <Section icon={<Utensils className="w-5 h-5 text-primary" />} title="5. Dieta e Suplementação" subtitle="Volumoso e suplemento/ração fornecidos no mês">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {text("volumosoTipo", "Volumoso (tipo)", "Ex: silagem de milho, cana picada")}
          {num("volumosoQtdTonMes", "Volumoso (ton/mês)")}
          {num("volumosoCustoMes", "Volumoso (R$/mês)")}
          {text("suplementoTipo", "Suplemento/ração (tipo)", "Ex: proteinado + milho moído")}
          {num("suplementoQtdTonMes", "Suplemento/ração (ton/mês)")}
          {num("suplementoCustoMes", "Suplemento/ração (R$/mês)")}
        </div>
        <div className="mt-3">{text("mudancasDieta", "Mudanças na dieta neste mês", "Ex: aumento de concentrado para o lote de terminação", 2)}</div>
      </Section>

      {/* 6. Comercial e custos */}
      <Section icon={<DollarSign className="w-5 h-5 text-primary" />} title="6. Movimentação Comercial e Custos" subtitle="Compras, vendas e custos do mês">
        <div className="bg-stone-50/60 p-3 rounded-lg space-y-3">
          <span className="text-[10px] font-mono font-semibold text-stone-600">COMPRAS (deixe 0 se não houve)</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {num("comprasNum", "Nº de animais comprados")}
            {num("comprasPesoMedio", "PV médio comprado (kg/cab)")}
            {num("comprasValorTotal", "Valor total das compras (R$)")}
          </div>
        </div>
        <div className="bg-stone-50/60 p-3 rounded-lg space-y-3">
          <span className="text-[10px] font-mono font-semibold text-stone-600">VENDAS (deixe 0 se não houve)</span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {num("vendasNum", "Nº de animais vendidos")}
            {num("vendasArrobasTotal", "Total de arrobas (@)")}
            {num("vendasValorTotal", "Valor total das vendas (R$)")}
            {num("vendasCustoComercializacao", "Custo de comercialização (R$)")}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {num("custoMaoDeObra", "Mão de obra (R$/mês)")}
          {num("custoSanidade", "Sanidade (R$/mês)")}
          {num("custoInsumos", "Insumos (R$/mês)")}
          {num("custoOutros", "Outros custos (R$/mês)")}
        </div>
      </Section>

      {/* 7. Observações */}
      <Section icon={<Activity className="w-5 h-5 text-primary" />} title="7. Observações e Gargalos do Mês" subtitle="Relato livre do responsável pela operação">
        {text("observacoesGargalos", "Contexto, intercorrências e prioridades", "Relate o que ajudou ou atrapalhou a operação neste mês e as prioridades para o próximo.", 4)}
      </Section>

      {/* Gerar relatório */}
      <div className="sticky bottom-4 z-10">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white font-bold uppercase tracking-wider text-sm py-4 rounded-sm shadow-lg hover:bg-accent/90 transition-all disabled:opacity-60"
        >
          <FileDown className="w-5 h-5" />
          {generating ? "Gerando relatório..." : "Gerar Relatório (baixa PDF + .md)"}
        </button>
      </div>
    </div>
  );
}

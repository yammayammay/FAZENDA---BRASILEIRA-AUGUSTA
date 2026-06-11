import React from "react";
import {
  FileText,
  Scale,
  TrendingUp,
  DollarSign,
  Coffee,
  PiggyBank,
  Wrench,
  Compass,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { FormState, HerdCategoryInfo } from "../types.js";
import { categoryLabels } from "../data.js";

interface FormBlocksProps {
  formState: FormState;
  onChange: (state: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export default function FormBlocks({
  formState,
  onChange,
  onSubmit,
  submitting,
}: FormBlocksProps) {

  // Handle nested state edits for Block 2: Composição do Plantel
  const handleHerdCategoryChange = (catKey: string, field: "heads" | "weight" | "imsCoef", val: number) => {
    const updatedState = { ...formState };
    updatedState.herd[catKey] = {
      ...updatedState.herd[catKey],
      [field]: val
    };
    onChange(updatedState);
  };

  // Handle nested state edits for Block 7: Infraestrutura Existente
  const handleEquipmentChange = (equipKey: string, field: "possui" | "status" | "capacidade" | "obs", val: any) => {
    const updatedState = { ...formState };
    if (updatedState.equipments[equipKey]) {
      updatedState.equipments[equipKey] = {
        ...updatedState.equipments[equipKey],
        [field]: val
      };
      onChange(updatedState);
    }
  };

  // Switch month selections
  const toggleSazonalidade = (month: string) => {
    const updatedState = { ...formState };
    if (updatedState.sazonalidade.includes(month)) {
      updatedState.sazonalidade = updatedState.sazonalidade.filter((m) => m !== month);
    } else {
      updatedState.sazonalidade = [...updatedState.sazonalidade, month];
    }
    onChange(updatedState);
  };

  // Switch forage selections
  const toggleVolumosos = (v: string) => {
    const updatedState = { ...formState };
    if (updatedState.volumosos.includes(v)) {
      updatedState.volumosos = updatedState.volumosos.filter((item) => item !== v);
    } else {
      updatedState.volumosos = [...updatedState.volumosos, v];
    }
    onChange(updatedState);
  };

  // Switch supplement selections
  const toggleSuplementos = (s: string) => {
    const updatedState = { ...formState };
    if (updatedState.suplementos.includes(s)) {
      updatedState.suplementos = updatedState.suplementos.filter((item) => item !== s);
    } else {
      updatedState.suplementos = [...updatedState.suplementos, s];
    }
    onChange(updatedState);
  };

  const handleSimpleFieldChange = (field: keyof FormState, val: any) => {
    onChange({
      ...formState,
      [field]: val
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8" id="pecuaria-bovinos-formulario-fba">
      
      {/* Bloco 01 - Identificação e Data de Referência */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4" id="form-bloco-01">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="p-1 green-accent bg-primary/10 rounded-lg text-primary">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 01: Identificação e Referência</h3>
            <span className="text-[10px] text-stone-500 font-mono">Dados cadastrais do gestor e do rebanho</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Nome Completo do Produtor / Respondente *</label>
            <input
              type="text"
              required
              value={formState.nomeProdutor}
              onChange={(e) => handleSimpleFieldChange("nomeProdutor", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Rodrigo de Augusta"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Contato WhatsApp / Telefone *</label>
            <input
              type="text"
              required
              value={formState.contatoZap}
              onChange={(e) => handleSimpleFieldChange("contatoZap", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="(84) 99999-0000"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">E-mail para Receber o Laudo PDF *</label>
            <input
              type="email"
              required
              value={formState.email}
              onChange={(e) => handleSimpleFieldChange("email", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="seuemail@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Cargo / Função na Propriedade</label>
            <input
              type="text"
              value={formState.cargo}
              onChange={(e) => handleSimpleFieldChange("cargo", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Gerente / Zootecnista / Proprietário"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Como as coisas funcionam na prática no dia a dia? *</label>
          <textarea
            required
            rows={2}
            value={formState.rotinaPratica}
            onChange={(e) => handleSimpleFieldChange("rotinaPratica", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none placeholder-stone-400"
            placeholder="Ex: Mistura artesanal na beira do cocho..."
          />
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Observações Iniciais</label>
          <input
            type="text"
            value={formState.obsPrevia}
            onChange={(e) => handleSimpleFieldChange("obsPrevia", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Ex: Estamos em transição para confinamento próprio"
          />
        </div>
      </div>

      {/* Bloco 02 - Composição do Plantel por Categoria */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4" id="form-bloco-02">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary/10 rounded-lg text-primary">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 02: Composição do Plantel por Categoria</h3>
              <span className="text-[10px] text-stone-500 font-mono">Defina as cabeças, peso vivo médio e IMS</span>
            </div>
          </div>
          <div className="hidden sm:flex text-[10px] bg-cream border border-stone-200 text-stone-600 p-2 rounded-lg font-mono items-center gap-1">
            <Info className="w-3 h-3 text-accent" />
            <span>Fórmula IMS: Cabeças × PV × Coef (%)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-stone-600">
            <thead className="text-[10px] text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-mono">
              <tr>
                <th className="px-3 py-2">Categoria Bovino</th>
                <th className="px-3 py-2 w-[120px]">Nº Cabeças</th>
                <th className="px-3 py-2 w-[120px]">PV Médio (kg)</th>
                <th className="px-3 py-2 w-[110px]">Coef. IMS (%)</th>
                <th className="px-3 py-2 text-right">Consumo Est. (kg MS/dia)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {Object.keys(formState.herd).map((catKey) => {
                const item = formState.herd[catKey];
                const estImsDia = item.heads * item.weight * (item.imsCoef / 100);
                return (
                  <tr key={catKey}>
                    <td className="px-3 py-2.5 font-medium text-stone-900">{categoryLabels[catKey]}</td>
                    <td className="px-3 py-1 bg-stone-50/50">
                      <input
                        type="number"
                        min="0"
                        value={item.heads}
                        onChange={(e) => handleHerdCategoryChange(catKey, "heads", Number(e.target.value))}
                        className="w-full text-[11px] p-1.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-primary text-center font-semibold text-primary font-mono"
                      />
                    </td>
                    <td className="px-3 py-1">
                      <input
                        type="number"
                        min="0"
                        value={item.weight}
                        onChange={(e) => handleHerdCategoryChange(catKey, "weight", Number(e.target.value))}
                        className="w-full text-[11px] p-1.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-primary text-center font-mono"
                      />
                    </td>
                    <td className="px-3 py-1 bg-stone-50/50">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.imsCoef}
                        onChange={(e) => handleHerdCategoryChange(catKey, "imsCoef", Number(e.target.value))}
                        className="w-full text-[11px] p-1.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-primary text-center font-mono"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-700">
                      {estImsDia.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic add-on categories if needed */}
        <div className="pt-3 border-t border-stone-100 bg-stone-50/50 p-4 rounded-xl space-y-3">
          <span className="text-[11px] font-semibold text-stone-700 font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-accent" />
            CATEGORIA ADICIONAL PERSONALIZADA (OPCIONAL)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[9px] text-stone-500 font-mono mb-1">Nome Categ.</label>
              <input
                type="text"
                value={formState.extraCatName}
                onChange={(e) => handleSimpleFieldChange("extraCatName", e.target.value)}
                className="w-full text-[11px] p-2 bg-white rounded border border-stone-300"
                placeholder="Ex: Vacas de Descarte"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-500 font-mono mb-1">Heads</label>
              <input
                type="number"
                value={formState.extraCatHeads}
                onChange={(e) => handleSimpleFieldChange("extraCatHeads", Number(e.target.value))}
                className="w-full text-[11px] p-2 bg-white rounded border border-stone-300 text-center font-mono"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-500 font-mono mb-1">PV Médio (kg)</label>
              <input
                type="number"
                value={formState.extraCatWeight}
                onChange={(e) => handleSimpleFieldChange("extraCatWeight", Number(e.target.value))}
                className="w-full text-[11px] p-2 bg-white rounded border border-stone-300 text-center font-mono"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-500 font-mono mb-1">Coef. IMS %</label>
              <input
                type="number"
                step="0.1"
                value={formState.extraCatImsCoef}
                onChange={(e) => handleSimpleFieldChange("extraCatImsCoef", Number(e.target.value))}
                className="w-full text-[11px] p-2 bg-white rounded border border-stone-300 text-center font-mono"
                placeholder="2.0"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Como o plantel é controlado na prática hoje? *</label>
          <textarea
            required
            rows={2}
            value={formState.rotinaControle}
            onChange={(e) => handleSimpleFieldChange("rotinaControle", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Ex: Controle mensal manuscrito em folha ou planilha Excel..."
          />
        </div>
      </div>

      {/* Bloco 03 - Desempenho Produtivo, GMD e Ciclo */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4" id="form-bloco-03">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="p-1 bg-primary/10 rounded-lg text-primary">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 03: Desempenho Produtivo - GMD e Ciclo de Produção</h3>
            <span className="text-[10px] text-stone-500 font-mono font-normal">Ganhos médios de peso e ciclo de abate</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50/50 p-4 rounded-xl border border-stone-100">
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-stone-700 font-mono block">GMD Real Esperado por Categoria (KG/Dia)</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-stone-500 font-mono">Bezerros desmamados *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formState.bezerroDesmGmd}
                  onChange={(e) => handleSimpleFieldChange("bezerroDesmGmd", Number(e.target.value))}
                  className="w-full p-2 bg-white rounded border border-stone-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500 font-mono">Novilhas (8-24m) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formState.novilhaGmd}
                  onChange={(e) => handleSimpleFieldChange("novilhaGmd", Number(e.target.value))}
                  className="w-full p-2 bg-white rounded border border-stone-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500 font-mono">Garrotes recria *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formState.garroteGmd}
                  onChange={(e) => handleSimpleFieldChange("garroteGmd", Number(e.target.value))}
                  className="w-full p-2 bg-white rounded border border-stone-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500 font-mono">Bois terminação *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formState.boiGmd}
                  onChange={(e) => handleSimpleFieldChange("boiGmd", Number(e.target.value))}
                  className="w-full p-2 bg-white rounded border border-stone-300 font-mono text-center"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-stone-700 font-mono block">Origem de GMD & Pesagens</span>
            <div>
              <label className="block text-[10px] text-stone-500 font-mono mb-1.5">Os GMDs acima foram medidos? *</label>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gmdMedido"
                    value="sim"
                    checked={formState.gmdMedido === "sim"}
                    onChange={() => handleSimpleFieldChange("gmdMedido", "sim")}
                    className="accent-primary"
                  />
                  <span>Sim, via pesagens sequenciais eletrônicas</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gmdMedido"
                    value="estimativa"
                    checked={formState.gmdMedido === "estimativa"}
                    onChange={() => handleSimpleFieldChange("gmdMedido", "estimativa")}
                    className="accent-primary"
                  />
                  <span>Apenas estimativa visual do vaqueiro/gerente</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gmdMedido"
                    value="nao_tem"
                    checked={formState.gmdMedido === "nao_tem"}
                    onChange={() => handleSimpleFieldChange("gmdMedido", "nao_tem")}
                    className="accent-primary"
                  />
                  <span>Não temos esse dado preciso</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Ciclo de Produção e Venda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-stone-100 pt-3">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Peso entrada terminação (kg) *</label>
            <input
              type="number"
              required
              value={formState.pesoEntrada}
              onChange={(e) => handleSimpleFieldChange("pesoEntrada", Number(e.target.value))}
              className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Peso alvo abate (kg) *</label>
            <input
              type="number"
              required
              value={formState.pesoAlvo}
              onChange={(e) => handleSimpleFieldChange("pesoAlvo", Number(e.target.value))}
              className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Rendimento Carcaça (%) *</label>
            <input
              type="number"
              step="0.1"
              required
              value={formState.rendimentoCarcaça}
              onChange={(e) => handleSimpleFieldChange("rendimentoCarcaça", Number(e.target.value))}
              className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Dias na terminação (média) *</label>
            <input
              type="number"
              required
              value={formState.tempoAprov}
              onChange={(e) => handleSimpleFieldChange("tempoAprov", Number(e.target.value))}
              className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Raça preponderante *</label>
            <input
              type="text"
              required
              value={formState.racaPredominante}
              onChange={(e) => handleSimpleFieldChange("racaPredominante", e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-stone-300"
              placeholder="Ex: Nelore, Brangus, Angus"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Nº animais vendidos (últimos 12m) *</label>
            <input
              type="number"
              required
              value={formState.animaisVendidosAnual}
              onChange={(e) => handleSimpleFieldChange("animaisVendidosAnual", Number(e.target.value))}
              className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Como o desempenho de peso é acompanhado hoje? *</label>
          <textarea
            required
            rows={2}
            value={formState.rotinaDesempenho}
            onChange={(e) => handleSimpleFieldChange("rotinaDesempenho", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Ex: Pesagem somente quando entra no confinamento ou quando vai para abate..."
          />
        </div>
      </div>

      {/* Bloco 04 - Precificação e Receitas */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4" id="form-bloco-04">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="p-1 bg-primary/10 rounded-lg text-primary">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 04: Precificação e Recebimento de Valores</h3>
            <span className="text-[10px] text-stone-500 font-mono">Retornos de boi gordo e comercialização</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Preço arroba (@) vendido (R$) *</label>
            <input
              type="number"
              required
              value={formState.precoArroba}
              onChange={(e) => handleSimpleFieldChange("precoArroba", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Destino Principal da Venda *</label>
            <input
              type="text"
              required
              value={formState.destinoPrincipal}
              onChange={(e) => handleSimpleFieldChange("destinoPrincipal", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
              placeholder="Ex: Frigorífico local"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Existe Contrato Regular?</label>
            <input
              type="text"
              value={formState.contrato}
              onChange={(e) => handleSimpleFieldChange("contrato", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
              placeholder="Ex: Apenas mercado spot"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Meta Receita Bruta Anual (R$)</label>
            <input
              type="number"
              value={formState.metaReceitaAnual}
              onChange={(e) => handleSimpleFieldChange("metaReceitaAnual", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center font-bold text-emerald-600"
            />
          </div>
        </div>

        {/* Months checkbox */}
        <div className="bg-stone-50 p-4 rounded-xl space-y-2">
          <span className="text-[11px] font-semibold text-stone-700 block font-mono">Sazonalidade de Vendas (Marque os meses com maior concentração de embarque):</span>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center">
            {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m) => {
              const checked = formState.sazonalidade.includes(m);
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => toggleSazonalidade(m)}
                  className={`p-1.5 text-[11px] rounded transition-all font-mono border ${
                    checked
                      ? "bg-primary text-cream border-primary font-bold shadow-sm"
                      : "bg-white text-stone-600 border-stone-300 hover:bg-stone-100"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Como a venda e recebimentos funcionam na prática? *</label>
          <textarea
            required
            rows={2}
            value={formState.rotinaComercial}
            onChange={(e) => handleSimpleFieldChange("rotinaComercial", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Ex: Ligamos para boiadeiros, negociamos com base no preço do jornal/frigorífico..."
          />
        </div>
      </div>

      {/* Bloco 05 - Dieta Atual, Fontes e Volumes */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-6" id="form-bloco-05">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="p-1 bg-primary/10 rounded-lg text-primary">
            <Coffee className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 05: Dieta Atual - Fontes Nutricionais e Volumes</h3>
            <span className="text-[10px] text-stone-500 font-mono">Pastagem, volumosos complementares e suplementos concentrados</span>
          </div>
        </div>

        {/* Pasto sub-section */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-primary font-mono bg-cream p-1.5 px-3 rounded-lg border-l-4 border-accent">A. PASTAGEM DISPONÍVEL</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">Área Total em Pastagem (Hectares) *</label>
              <input
                type="number"
                required
                value={formState.areaTotalPastagem}
                onChange={(e) => handleSimpleFieldChange("areaTotalPastagem", Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">Capim predominante *</label>
              <input
                type="text"
                required
                value={formState.especiePredominantePastagem}
                onChange={(e) => handleSimpleFieldChange("especiePredominantePastagem", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-stone-300"
                placeholder="Ex: Mombaça, Brachiaria"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">Estado de Degradação *</label>
              <input
                type="text"
                required
                value={formState.estadoMedioPastagem}
                onChange={(e) => handleSimpleFieldChange("estadoMedioPastagem", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-stone-300"
                placeholder="Ex: Moderadamente degradado"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">Custo Mensal Pastagem (R$)</label>
              <input
                type="number"
                value={formState.custoMensalPastagem}
                onChange={(e) => handleSimpleFieldChange("custoMensalPastagem", Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
              />
            </div>
          </div>
        </div>

        {/* Volumoso B */}
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <h4 className="text-xs font-semibold text-primary font-mono bg-cream p-1.5 px-3 rounded-lg border-l-4 border-accent">B. VOLUMOSO COMPLEMENTAR</h4>
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-stone-600 block">Selecione os volumosos complementares utilizados:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { key: "silagem_milho", label: "Silagem de Milho" },
                { key: "silagem_sorgo", label: "Silagem de Sorgo" },
                { key: "feno", label: "Feno Comercial" },
                { key: "cana_picada", label: "Cana-de-açúcar Picada" },
                { key: "bagaco_cana", label: "Bagaço de cana" },
                { key: "palma_adensada", label: "Palma Forrageira" },
              ].map((item) => {
                const checked = formState.volumosos.includes(item.key);
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => toggleVolumosos(item.key)}
                    className={`p-2 rounded-lg transition-all border text-left ${
                      checked
                        ? "bg-primary/5 text-primary border-primary font-semibold"
                        : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Volume Consumido/Mês (Toneladas Verde)</label>
                <input
                  type="number"
                  value={formState.volumeMesVolumoso}
                  onChange={(e) => handleSimpleFieldChange("volumeMesVolumoso", Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Custo Médio Volumoso (R$/mês)</label>
                <input
                  type="number"
                  value={formState.custoVolumoso}
                  onChange={(e) => handleSimpleFieldChange("custoVolumoso", Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Disponibilidade residual da usinas vizinhas?</label>
                <input
                  type="text"
                  value={formState.dispBagacoVinhaca}
                  onChange={(e) => handleSimpleFieldChange("dispBagacoVinhaca", e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300"
                  placeholder="Ex: Sim, bagaço de usinas locais"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Suplementacao C */}
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <h4 className="text-xs font-semibold text-primary font-mono bg-cream p-1.5 px-3 rounded-lg border-l-4 border-accent">C. SUPLEMENTAÇÃO PROTEICO/ENERGÉTICO REQUERIDO</h4>
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-stone-600 block">Insira os concentrados/componentes utilizados na mistura:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { key: "sal_proteico", label: "Sal Proteico" },
                { key: "ureia_pecuaria", label: "Ureia Pecuária" },
                { key: "farelo_soja", label: "Farelo de Soja" },
                { key: "milho_moido", label: "Milho Moído (Fubá)" },
                { key: "algodao", label: "Caroço de Algodão" },
                { key: "polpa_citrica", label: "Polpa Cítrica" },
                { key: "ração_comercial", label: "Ração Ensacada Comercial" },
                { key: "sal_mineral", label: "Sal Mineral Nobre" },
              ].map((item) => {
                const checked = formState.suplementos.includes(item.key);
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => toggleSuplementos(item.key)}
                    className={`p-2 rounded-lg transition-all border text-left ${
                      checked
                        ? "bg-primary/5 text-primary border-primary font-semibold"
                        : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Volume Concentrados/Mês (Toneladas)</label>
                <input
                  type="number"
                  value={formState.volumeSuplMes}
                  onChange={(e) => handleSimpleFieldChange("volumeSuplMes", Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Custo Concentrados (R$/Mês)</label>
                <input
                  type="number"
                  value={formState.custoSuplemento}
                  onChange={(e) => handleSimpleFieldChange("custoSuplemento", Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Fornecedor de Referência</label>
                <input
                  type="text"
                  value={formState.fornecedorSuplemento}
                  onChange={(e) => handleSimpleFieldChange("fornecedorSuplemento", e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
                  placeholder="Ex: Distribuidor local de grãos"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Frequência Fornecimento</label>
                <input
                  type="text"
                  value={formState.frequenciaFornecimento}
                  onChange={(e) => handleSimpleFieldChange("frequenciaFornecimento", e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
                  placeholder="Ex: Mensal / Quinzenal"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Como a alimentação do gado funciona de fato na prática? *</label>
          <textarea
            required
            rows={2}
            value={formState.rotinaAlimentacao}
            onChange={(e) => handleSimpleFieldChange("rotinaAlimentacao", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Ex: Vaqueiros colocam de manhã e de tarde nos cochos de madeira dos piquetes..."
          />
        </div>
      </div>

      {/* Bloco 06 - Custos Totais Não Alimentares */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4" id="form-bloco-06">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="p-1 bg-primary/10 rounded-lg text-primary">
            <PiggyBank className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 06: Custo Operacional e Custos Fixos</h3>
            <span className="text-[10px] text-stone-500 font-mono">Despesas operacionais diretas e indiretas</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Mão de obra direta total FBA (R$/mês) *</label>
            <input
              type="number"
              required
              value={formState.maoDeObraDireta}
              onChange={(e) => handleSimpleFieldChange("maoDeObraDireta", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Sanidade & Medicamentos (R$/mês) *</label>
            <input
              type="number"
              required
              value={formState.sanidade}
              onChange={(e) => handleSimpleFieldChange("sanidade", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Manutenção de Máquinas (R$/mês) *</label>
            <input
              type="number"
              required
              value={formState.manutencaoEquip}
              onChange={(e) => handleSimpleFieldChange("manutencaoEquip", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Custo Alocado Outros (R$/mês)</label>
            <input
              type="number"
              value={formState.custoExtra}
              onChange={(e) => handleSimpleFieldChange("custoExtra", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Descreva o custo alocado adicional</label>
          <input
            type="text"
            value={formState.descCustoExtra}
            onChange={(e) => handleSimpleFieldChange("descCustoExtra", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
            placeholder="Ex: Combustível sob demanda para trator, energia dos galpões"
          />
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Como o controle contábil é acompanhado hoje? *</label>
          <textarea
            required
            rows={2}
            value={formState.rotinaCustos}
            onChange={(e) => handleSimpleFieldChange("rotinaCustos", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Ex: Escritório contábil externo recebe as notas a cada 6 meses..."
          />
        </div>
      </div>

      {/* Chunk limit protection: split into sub-blocks if needed. No problem, let's include Block 7 and Block 8 cleanly. */}

      {/* Bloco 07 - Infraestrutura Existente */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4" id="form-bloco-07">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="p-1 bg-primary/10 rounded-lg text-primary">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 07: Infraestrutura Existente da Fábrica</h3>
            <span className="text-[10px] text-stone-500 font-mono">Maquinários de pecuária ativos na propriedade</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-stone-600">
            <thead className="text-[10px] text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-mono">
              <tr>
                <th className="px-3 py-2">Maquinário Coletivo</th>
                <th className="px-3 py-2 w-[110px]">Possui?</th>
                <th className="px-3 py-2 w-[140px]">Estado Ativo</th>
                <th className="px-3 py-2">Capacidade Nominal / Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {[
                { key: "balancaTronco", label: "Balança de Tronco (Controle Peso)" },
                { key: "forrageira", label: "Forrageira / Picadeira" },
                { key: "misturador", label: "Misturador de Ração Concentrada" },
                { key: "moinho", label: "Moinho Triturador (Milho/Fubá)" },
                { key: "trator", label: "Trator Operacional" },
                { key: "deposito", label: "Depósito / Galpão de Insumos" },
              ].map((item) => {
                const eq = formState.equipments[item.key as keyof typeof formState.equipments];
                return (
                  <tr key={item.key}>
                    <td className="px-3 py-2 font-medium text-stone-900">{item.label}</td>
                    <td className="px-3 py-1 text-center">
                      <select
                        value={eq.possui ? "true" : "false"}
                        onChange={(e) => handleEquipmentChange(item.key, "possui", e.target.value === "true")}
                        className="p-1 rounded bg-white border border-stone-300 font-mono text-[10px]"
                      >
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    </td>
                    <td className="px-3 py-1">
                      <select
                        value={eq.status}
                        onChange={(e) => handleEquipmentChange(item.key, "status", e.target.value)}
                        className="p-1 rounded bg-white border border-stone-300 text-[10px] w-full"
                      >
                        <option value="Excelente">Excelente</option>
                        <option value="Mapeado">Mapeado (Usado)</option>
                        <option value="Danificado">Danificado</option>
                        <option value="Inexistente">Inexistente</option>
                      </select>
                    </td>
                    <td className="px-3 py-1 font-mono">
                      <input
                        type="text"
                        value={eq.obs}
                        onChange={(e) => handleEquipmentChange(item.key, "obs", e.target.value)}
                        className="w-full text-[11px] p-1.5 rounded border border-stone-300"
                        placeholder="Capacidade ou observação..."
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-stone-100">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Há Terreno Próprio Livre para Ampliar?</label>
            <select
              value={formState.terrenoDisponivel}
              onChange={(e) => handleSimpleFieldChange("terrenoDisponivel", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white"
            >
              <option value="Sim - Há galpão e terreno plano">Sim - Há galpão e terreno plano</option>
              <option value="Apenas terreno sem cobertura">Apenas terreno sem cobertura</option>
              <option value="Não temos área disponível próximo ao curral">Não temos área disponível próximo ao curral</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Rede de Energia Trifásica no Local?</label>
            <select
              value={formState.energiaTrifasica}
              onChange={(e) => handleSimpleFieldChange("energiaTrifasica", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white font-mono"
            >
              <option value="Sim">Sim (380V / 220V Trifásico)</option>
              <option value="Não">Não (Apenas Monofásico)</option>
              <option value="Não sei">Não sei</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Distância da Fábrica até o Curral (m)</label>
            <input
              type="number"
              value={formState.distanciaCurral}
              onChange={(e) => handleSimpleFieldChange("distanciaCurral", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-600 font-medium mb-1">Como a infraestrutura é mantida hoje? *</label>
          <textarea
            required
            rows={2}
            value={formState.rotinaInfra}
            onChange={(e) => handleSimpleFieldChange("rotinaInfra", e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder="Ex: Manutenção puramente corretiva, quebrou parou tudo..."
          />
        </div>
      </div>

      {/* Bloco 08 - Perspectiva de Expansão e Metas */}
      <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-6 shadow-sm space-y-4" id="form-bloco-08">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="p-1 bg-primary/10 rounded-lg text-primary">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Bloco 08: Perspectivas de Expansão e Metas</h3>
            <span className="text-[10px] text-stone-500 font-mono">Delineamento de rebanho e payback de investimentos</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Crescimento 24 meses (cabeças)</label>
            <input
              type="number"
              value={formState.metaSurgimento24}
              onChange={(e) => handleSimpleFieldChange("metaSurgimento24", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Crescimento 36 meses (cabeças)</label>
            <input
              type="number"
              value={formState.metaSurgimento36}
              onChange={(e) => handleSimpleFieldChange("metaSurgimento36", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">CAPEX Disponível Fábrica (R$) *</label>
            <input
              type="number"
              required
              value={formState.capexOrcamento}
              onChange={(e) => handleSimpleFieldChange("capexOrcamento", Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 font-mono text-center text-primary font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Payback Desejado *</label>
            <input
              type="text"
              required
              value={formState.paybackMeta}
              onChange={(e) => handleSimpleFieldChange("paybackMeta", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
              placeholder="Ex: 12-18 meses"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Quais os gargalos e restrições operacionais hoje na lida? *</label>
            <textarea
              required
              rows={2}
              value={formState.restricaoProcesso}
              onChange={(e) => handleSimpleFieldChange("restricaoProcesso", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Ex: Peões com dificuldades de pesar e monitorar na lida diária..."
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-600 font-medium mb-1">Expectativas Gerais para o Futuro e Conclusão *</label>
            <textarea
              required
              rows={2}
              value={formState.expectativasGerais}
              onChange={(e) => handleSimpleFieldChange("expectativasGerais", e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Ex: Queremos cortar o fornecedor de ração ensacada comercial"
            />
          </div>
        </div>
      </div>

      {/* SUBMISSION BLOCK */}
      <div className="bg-warm-quote/60 border-2 border-dashed border-accent/40 rounded-sm p-6 text-center space-y-4 shadow-sm">
        <div className="flex justify-center">
          <Sparkles className="w-8 h-8 text-accent animate-pulse" />
        </div>
        <div className="max-w-md mx-auto">
          <h4 className="font-serif font-bold text-stone-900 text-base">Pronto para Consolidar e Analisar?</h4>
          <p className="text-xs text-stone-600 mt-1">
            Ao submeter, o sistema criará o laudo técnico estratégico via <code className="bg-white px-1 py-0.5 rounded-sm border border-warm-border text-primary font-mono text-[10px]">gemini-3.5-flash</code> em tempo real, enviará alertas de emails simulados e gerará o laudo PDF estruturado para download.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-72 bg-primary hover:bg-primary-light text-white font-bold py-3 px-6 rounded-sm text-xs transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mx-auto disabled:bg-stone-300 cursor-pointer uppercase tracking-wider"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
              <span>Consolidando Engenharia...</span>
            </>
          ) : (
            <>
              <span>Submeter & Receber Laudo PDF</span>
              <ArrowRight className="w-4 h-4 text-accent-light" />
            </>
          )}
        </button>
      </div>

    </form>
  );
}

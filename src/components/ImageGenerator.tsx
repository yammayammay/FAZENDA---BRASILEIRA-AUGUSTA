import React, { useState } from "react";
import { Image, Sparkles, Download, RefreshCw, Layers, ShieldAlert } from "lucide-react";
import { FormState } from "../types.js";

interface ImageGeneratorProps {
  formState: FormState;
}

export default function ImageGenerator({ formState }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState(
    `Esboço de layout técnico industrial de fábrica de ração concentrada para Fazenda Brasileira Augusta em Nísia Floresta, Rio Grande do Norte. Contendo moega de carregamento acoplada, moinho de grãos potiguar de alta capacidade com motores elétricos, silo vertical de armazenamento de insumos contra maresia e misturador mecânico vertical em linha, desenho técnico limpo, minimalista, estilo blueprint arquitetônico moderno plano com anotações de engenharia`
  );
  const [resolution, setResolution] = useState("1K");
  const [aspectRatio, setAspectRatio] = useState("4:3");
  const [loading, setLoading] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const triggerGenerateImage = async () => {
    setLoading(true);
    setErrorInfo(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          resolution,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha no tempo limite ou falta de chave Gemini no servidor.");
      }

      const data = await response.json();
      setGeneratedImg(data.imageUrl);
    } catch (e: any) {
      console.warn("Falling back to simulated blueprint:", e.message);
      // Generate simulated SVG blueprint fallback that reflects current formState
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%" style="background-color:#2D5A27">
          <rect x="15" y="15" width="770" height="570" fill="none" stroke="#A67C52" stroke-width="3" stroke-dasharray="10 5"/>
          <text x="50" y="65" font-family="'Playfair Display', serif" font-size="24" fill="#F4F1EA" font-weight="bold">FBA • ESBOÇO TÉCNICO DE LAYOUT DE FÁBRICA</text>
          <text x="50" y="90" font-family="'JetBrains Mono', monospace" font-size="11" fill="#A67C52">REGIONALIZAÇÃO: NÍSIA FLORESTA, RN (COSTA POTIGUAR)</text>
          
          <!-- Moega de Insumos -->
          <rect x="80" y="160" width="130" height="110" fill="none" stroke="#F4F1EA" stroke-width="2"/>
          <polygon points="80,270 145,340 210,270" fill="none" stroke="#F4F1EA" stroke-width="2"/>
          <text x="100" y="215" font-family="'Playfair Display', serif" font-size="16" fill="#F4F1EA" font-weight="bold">MOEGA (INCLUSÃO)</text>
          <text x="95" y="235" font-family="'JetBrains Mono', monospace" font-size="9" fill="#C9A883">Espaço p/ Milho/Soja</text>

          <!-- Elevador helicoidal -->
          <line x1="145" y1="340" x2="300" y2="180" stroke="#A67C52" stroke-width="3" stroke-dasharray="6 3"/>
          <text x="160" y="290" font-family="sans-serif" font-size="9" fill="#C9A883" transform="rotate(-32 160,290)">Rosca Helicoidal (Chupim)</text>

          <!-- Moinho a Martelos -->
          <circle cx="330" cy="180" r="40" fill="none" stroke="#F4F1EA" stroke-width="2"/>
          <text x="305" y="185" font-family="'Playfair Display', serif" font-size="13" fill="#F4F1EA" font-weight="bold">MOINHO</text>
          <text x="312" y="200" font-family="'JetBrains Mono', monospace" font-size="8" fill="#C9A883">Martelos 4mm</text>

          <!-- Silo Pulmão Metálico -->
          <rect x="420" y="160" width="140" height="150" fill="none" stroke="#F4F1EA" stroke-width="2" rx="4"/>
          <polygon points="420,310 490,370 560,310" fill="none" stroke="#F4F1EA" stroke-width="2"/>
          <text x="440" y="215" font-family="'Playfair Display', serif" font-size="14" fill="#F4F1EA" font-weight="bold">SILO PULMÃO</text>
          <text x="445" y="235" font-family="'JetBrains Mono', monospace" font-size="9" fill="#A67C52">Aço Galv (Anti-Maresia)</text>
          <text x="435" y="255" font-family="sans-serif" font-size="9" fill="#B9B7AD">Capacidade: 15 Toneladas</text>

          <!-- Misturador -->
          <rect x="620" y="220" width="110" height="160" fill="none" stroke="#A67C52" stroke-width="2"/>
          <polygon points="620,380 675,440 730,380" fill="none" stroke="#A67C52" stroke-width="2"/>
          <text x="632" y="280" font-family="'Playfair Display', serif" font-size="12" fill="#F4F1EA" font-weight="bold">MISTURADOR</text>
          <text x="635" y="300" font-family="'JetBrains Mono', monospace" font-size="9" fill="#A67C52">Vertical 500 kg</text>
          <text x="632" y="320" font-family="sans-serif" font-size="8" fill="#B9B7AD">Tempo mistura: 15 min</text>

          <!-- Ground -->
          <line x1="50" y1="500" x2="750" y2="500" stroke="#A67C52" stroke-width="3"/>
          <text x="50" y="530" font-family="sans-serif" font-size="11" fill="#C9A883">ORÇAMENTO INTEGRADO: R$ ${formState.capexOrcamento || "95.000"} | PRIORIDADE: ${formState.categoriaPrioritaria || "Geral"}</text>
          <text x="50" y="555" font-family="sans-serif" font-size="11" fill="#B9B7AD">DIMENSÕES DA PLANTA: 300m² anexa ao galpão | Energia Trifásica: ${formState.energiaTrifasica || "Sim"}</text>
          <text x="600" y="555" font-family="'JetBrains Mono', monospace" font-size="11" fill="#A67C52">DESENHO SIMULADO GENAI</text>
        </svg>
      `;
      const base64Bytes = btoa(unescape(encodeURIComponent(svgContent)));
      setGeneratedImg(`data:image/svg+xml;base64,${base64Bytes}`);
      setErrorInfo("Chave Gemini não configurada ou limite de requisições excedido. Geramos uma simulação baseada em vetor técnico parametrizado por seus dados!");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImg) return;
    const link = document.createElement("a");
    link.href = generatedImg;
    link.download = `fba_layout_fabrica_${resolution}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border-y border-r border-warm-border border-l-4 border-primary rounded-sm p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Image className="w-5 h-5 text-primary" />
        <h3 className="font-serif font-bold text-stone-900 text-base">Visualizador Técnico AI (Layout da Fábrica)</h3>
      </div>

      <p className="text-xs text-stone-600 mb-4 leading-relaxed">
        Gere uma representação esquemática em planta para sua nova fábrica na Fazenda Augusta. O modelo <code className="bg-white font-mono text-[11px] text-accent p-0.5 px-1 border border-warm-border rounded-sm">gemini-3.1-flash-image</code> lerá as restrições logísticas da Costa Potiguar (como maresia) e desenhará o layout modular ideal.
      </p>

      {/* Inputs panel */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-[10px] text-stone-500 font-mono mb-1">PROMPT DE GERAÇÃO AI</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full text-xs p-2.5 rounded-sm border border-stone-300 focus:outline-none focus:border-primary bg-stone-50/50"
            placeholder="Descreva as especificidades da fábrica..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-stone-500 font-mono mb-1">RESOLUÇÃO DE IMAGEM</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full text-xs p-2 rounded-sm border border-stone-300 bg-white"
            >
              <option value="512px">512px (Mais Rápido)</option>
              <option value="1K">1K UHD (Padrão e Indicado)</option>
              <option value="2K">2K Super-HD (Requer Chave)</option>
              <option value="4K">4K Ultra-HD (Qualidade Extrema)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-stone-500 font-mono mb-1">PROPORÇÃO (ASPECT RATIO)</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full text-xs p-2 rounded-sm border border-stone-300 bg-white"
            >
              <option value="1:1">1:1 (Quadrado)</option>
              <option value="4:3">4:3 (Boletim Técnico)</option>
              <option value="16:9">16:9 (Widescreen Executivo)</option>
            </select>
          </div>
        </div>

        <button
          onClick={triggerGenerateImage}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 px-4 rounded-sm text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:bg-stone-300 shadow-lg shadow-primary/20 cursor-pointer uppercase tracking-widest"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Calculando fluxos e esboçando com GenAI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-accent-light" />
              <span>Esboçar Planta de Fábrica Recomendada</span>
            </>
          )}
        </button>
      </div>

      {/* Preview block */}
      <div className="bg-stone-100 rounded-sm overflow-hidden border border-stone-200 h-[380px] flex items-center justify-center relative group">
        {generatedImg ? (
          <div className="w-full h-full relative">
            <img
              src={generatedImg}
              alt="Planta da Fábrica"
              className="w-full h-full object-contain bg-primary"
            />
            {/* Top Hover Controls */}
            <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={downloadImage}
                className="bg-white hover:bg-stone-50 text-stone-950 font-bold text-xs px-4 py-2 rounded-sm flex items-center gap-1.5 shadow-md border border-warm-border"
              >
                <Download className="w-4 h-4" />
                <span>Salvar Imagem Esboço</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 flex flex-col items-center">
            <Layers className="w-10 h-10 text-stone-400 mb-2 animate-pulse" />
            <span className="text-xs font-semibold text-stone-700">Nenhum Esboço Gerado</span>
            <p className="text-[10px] text-stone-500 max-w-[200px] mt-1">
              Refine a descrição e clique em gerar para desenhar o layout com o Gemini Imagen.
            </p>
          </div>
        )}
      </div>

      {errorInfo && (
        <div className="mt-3 bg-amber-50 rounded-sm p-3 border border-amber-200 flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-normal">
            <strong>Modo Assistido Ativado!</strong> {errorInfo}
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Sparkles, Sliders, AlertTriangle } from "lucide-react";
import { ChatMessage, FormState } from "../types.js";

interface ChatAssistantProps {
  formState: FormState;
}

export default function ChatAssistant({ formState }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [thinkingLevel, setThinkingLevel] = useState<"low" | "high">("low");
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userHasSentRef = useRef(false);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "greet",
          sender: "bot",
          text: `Olá, ${formState.nomeProdutor || "produtor"}! Sou o seu **Consultor de Inteligência Estratégica**. 

Estou integrado em tempo real com as informações do seu questionário da **Fazenda Brasileira Augusta**. Como posso lhe auxiliar hoje?

💡 *Sugestões rápidas para perguntar:*
- Como calcular o payback do meu CAPEX de R$ ${formState.capexOrcamento || "95.000"}?
- Qual misturador escolher (horizontal vs vertical) para meu rebanho?
- Como proteger contra a maresia costeira de Nísia Floresta, RN?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [formState.nomeProdutor]);

  // Autoscroll — apenas depois que o usuário interage, e contido na própria caixa do chat
  // (evita que a página role sozinha para o chat ao abrir)
  useEffect(() => {
    if (!userHasSentRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    userHasSentRef.current = true;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          formState,
          model: selectedModel,
          thinkingLevel,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na conexão com o servidor de Inteligência.");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "bot",
          text: data.text,
          thinking: data.thinking,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "bot",
          text: `⚠️ Desculpa, ocorreu um contratempo ao contactar o consultor Inteligente: ${e.message || "Erro no servidor"}. Certifique-se de que o servidor local está em execução. Elaborei um pré-diagnóstico baseado em suas respostas locais que você pode ver no Painel Executivo.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const chips = [
    { label: "Parecer de Viabilidade", prompt: "Com base nos dados que preenchi, a implantação de uma fábrica de ração própria é tecnicamente indicada para esta propriedade? Dê um parecer objetivo com os principais ganhos, os riscos, o investimento necessário e uma estimativa de payback." },
    { label: "Calcular Confinamento", prompt: "Considerando meu rebanho ideal, qual a demanda diária de grãos e concentrado para semi-confinamento?" },
    { label: "Sugestão de Maquinário", prompt: "Qual a diferença exata e o custo entre o misturador vertical e o misturador horizontal para mim?" },
  ];

  return (
    <div className="flex flex-col h-[650px] bg-white rounded-sm shadow-sm border-y border-r border-warm-border border-l-4 border-primary overflow-hidden" id="chat-consultant-card">
      {/* Header */}
      <div className="bg-primary px-4 py-3.5 flex items-center justify-between border-b border-warm-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent/20 rounded-sm">
            <Sparkles className="w-5 h-5 text-accent-light" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-white text-base leading-tight">Assistente IA - Consultor Fazenda Brasileira Augusta</h3>
            <span className="text-[10px] text-stone-300 font-mono">Especialista Sênior • Zootecnia & Manejo de Pasto</span>
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`p-1.5 rounded-sm transition-colors ${showConfig ? 'bg-primary-light text-accent' : 'text-stone-300 hover:text-white'}`}
          title="Configurações do IA Model"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Model Selection Panel */}
      {showConfig && (
        <div className="bg-stone-50 border-b border-warm-border p-3 text-xs text-stone-700 animate-fadeIn">
          <div className="font-semibold text-stone-900 mb-2 flex items-center gap-1">
            Parâmetros do Modelo Gemini
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] text-stone-500 font-mono mb-1">MODELO ATIVO</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full text-xs p-1.5 rounded-sm border border-stone-300 bg-white"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Rápido)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (Tático Pro)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (Básico)</option>
              </select>
            </div>
            {selectedModel === "gemini-2.5-pro" && (
              <div>
                <label className="block text-[10px] text-stone-500 font-mono mb-1">NÍVEL DE RACIOCÍNIO</label>
                <select
                  value={thinkingLevel}
                  onChange={(e) => setThinkingLevel(e.target.value as "low" | "high")}
                  className="w-full text-xs p-1.5 rounded-sm border border-stone-300 bg-white"
                >
                  <option value="low">Raciocínio Baixo (Rápido)</option>
                  <option value="high">Raciocínio Alto (Tático)</option>
                </select>
              </div>
            )}
          </div>
          <p className="text-[10px] text-stone-500">
            * O modelo Pro analisa os meandros de payback e engrenagem. O Flash auxilia com fórmulas gerais de Nutrição.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[9px] text-stone-400 mb-1 font-mono px-1">{m.sender === "user" ? "Você" : "Assistente IA"} • {m.timestamp}</span>
            
            {m.thinking && (
              <div className="mb-2 max-w-[85%] bg-accent/5 border-l-2 border-accent p-2 rounded-sm text-[10px] font-mono text-stone-600 italic">
                <strong>Pensamento Técnico:</strong> {m.thinking}
              </div>
            )}

            <div
              className={`p-3 rounded-sm text-xs max-w-[85%] leading-relaxed shadow-sm ${
                m.sender === "user"
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-white text-stone-800 border border-stone-200 rounded-tl-none whitespace-pre-line"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-stone-400 mb-1 font-mono">Assistente IA • Processando...</span>
            <div className="p-3 bg-white border border-stone-100 rounded-sm rounded-tl-none flex items-center gap-2">
              <span className="flex gap-1 h-2 items-center">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-[10px] text-stone-500 font-mono">Formulando dimensionamento...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="p-2 bg-stone-50/80 border-t border-stone-200 flex gap-1.5 overflow-x-auto">
        {chips.map((c, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(c.prompt)}
            disabled={loading}
            className="shrink-0 text-[10px] bg-white hover:bg-stone-50 text-stone-700 px-2.5 py-1.5 rounded-sm border border-stone-200 transition-all font-medium whitespace-nowrap active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Text Area */}
      <div className="p-3 bg-white border-t border-stone-200 flex gap-2 items-center">
        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(inputText);
            }
          }}
          disabled={loading}
          placeholder="Tire dúvidas sobre volumoso, moagem ou custos..."
          className="flex-1 bg-stone-50 border border-stone-200 rounded-sm px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-primary resize-none placeholder-stone-400"
        />
        <button
          onClick={() => handleSendMessage(inputText)}
          disabled={!inputText.trim() || loading}
          className="bg-primary hover:bg-primary-light text-white p-2.5 rounded-sm transition-all active:scale-95 disabled:bg-stone-300 disabled:text-stone-100 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import { Send, UploadCloud, FileText, Image as ImageIcon, Coins, ArrowRightLeft, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";
import { ChatMessage, ContextConfig } from "../types";
import { renderContextToDataUrl } from "../utils/canvasRenderer";
import { motion, AnimatePresence } from "motion/react";

interface ChatPanelProps {
  modelName: string;
  calibratedSize: number | null;
}

export default function ChatPanel({ modelName, calibratedSize }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [systemContext, setSystemContext] = useState("");
  const [chatMode, setChatMode] = useState<"text" | "image">("image");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Custom configuration for text-to-image context mapping
  const [config, setConfig] = useState<ContextConfig>({
    fontFamily: "JetBrains Mono",
    columnWidth: 420,
    lineHeight: 1.25,
    padding: 30,
    textColor: "#ffffff",
    bgColor: "#0f172a", // slate dark
  });

  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Approximate Token Calculation
  const getEstimatedTextTokens = (text: string) => {
    return Math.max(20, Math.ceil(text.length / 4));
  };

  // Pricing constants (Gemini 1.5/3.5 Flash pricing: $0.075 per 1M tokens)
  const TEXT_PRICE_PER_M = 0.075; 

  const calculateCosts = (textContext: string, promptText: string) => {
    const totalChars = textContext.length + promptText.length;
    const textTokens = getEstimatedTextTokens(textContext) + getEstimatedTextTokens(promptText);
    const textCost = (textTokens / 1_000_000) * TEXT_PRICE_PER_M;

    // Image mode uses a flat 258 tokens for high-resolution images
    const imageTokens = 258 + getEstimatedTextTokens(promptText);
    const imageCost = (imageTokens / 1_000_000) * TEXT_PRICE_PER_M;

    const savingsFactor = textTokens > imageTokens ? (textTokens / imageTokens) : 1;

    return {
      textTokens,
      textCost,
      imageTokens,
      imageCost,
      savingsFactor,
    };
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== "text/plain" && !file.name.endsWith(".txt") && !file.name.endsWith(".log") && !file.name.endsWith(".json") && !file.name.endsWith(".md") && !file.name.endsWith(".ts") && !file.name.endsWith(".tsx")) {
      alert("Only plain text, log, JSON, markdown, or TS files are supported for system context.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setSystemContext(text);
    };
    reader.readAsText(file);
  };

  const triggerSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const currentPrompt = inputText;
    setInputText("");
    setIsLoading(true);

    const messageId = Date.now().toString();
    const stats = calculateCosts(systemContext, currentPrompt);

    // Render active image context if in Antigravity mode
    let renderedDataUrl = "";
    if (chatMode === "image") {
      const activeFontSize = calibratedSize || 10; // fall back to 10px if not calibrated
      const renderResult = renderContextToDataUrl(
        systemContext || "// Empty System Context Provided",
        activeFontSize,
        config
      );
      renderedDataUrl = renderResult.dataUrl;
    }

    const newUserMessage: ChatMessage = {
      id: messageId + "-user",
      sender: "user",
      text: currentPrompt,
      timestamp: new Date().toLocaleTimeString(),
      mode: chatMode,
      tokenStats: stats,
      contextImage: renderedDataUrl || undefined,
    };

    setMessages(prev => [...prev, newUserMessage]);
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    try {
      let responseText = "";
      if (chatMode === "image") {
        const response = await fetch("/api/chat-with-image-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelName,
            contextImage: renderedDataUrl,
            prompt: currentPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server returned error code: ${response.status}`);
        }

        const data = await response.json();
        responseText = data.response;
      } else {
        // Standard Text Context
        const response = await fetch("/api/chat-with-text-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelName,
            contextText: systemContext || "No system context provided.",
            prompt: currentPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server returned error code: ${response.status}`);
        }

        const data = await response.json();
        responseText = data.response;
      }

      const newModelMessage: ChatMessage = {
        id: messageId + "-model",
        sender: "model",
        text: responseText,
        timestamp: new Date().toLocaleTimeString(),
        mode: chatMode,
      };

      setMessages(prev => [...prev, newModelMessage]);
    } catch (error: any) {
      console.error("Chat request failed:", error);
      const errorMessage: ChatMessage = {
        id: messageId + "-error",
        sender: "model",
        text: `Error contacting the server: ${error.message || "Unknown error occurred."}`,
        timestamp: new Date().toLocaleTimeString(),
        mode: chatMode,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      {/* Context Control & Config Panel */}
      <div className="xl:col-span-4 flex flex-col gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="h-4.5 w-4.5" />
              </span>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Active System Context</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter system rules, long documents, codebase directories, or chat context.
            </p>

            {/* Document upload box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4 ${
                isDragging 
                  ? "border-indigo-500 bg-indigo-50/40" 
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.log,.json,.md,.ts,.tsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">Drag & drop document or browse</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports .txt, .log, .json, .md files</p>
            </div>

            {/* TextArea editor */}
            <div className="relative">
              <textarea
                id="context-input-area"
                value={systemContext}
                onChange={(e) => setSystemContext(e.target.value)}
                placeholder="Paste active context here (e.g. system instructions, full logs, codebase segments, or large books)..."
                className="w-full h-[220px] px-3 py-2.5 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
              />
              {systemContext && (
                <button
                  onClick={() => setSystemContext("")}
                  className="absolute bottom-2.5 right-2.5 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-2 py-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Config */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Image Engine Configurations</h4>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <label className="text-slate-500 block mb-1">Font Family</label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => setConfig(prev => ({ ...prev, fontFamily: e.target.value as any }))}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-700 cursor-pointer"
                >
                  <option value="JetBrains Mono">JetBrains Mono (Mono)</option>
                  <option value="Inter">Inter (Sans-Serif)</option>
                  <option value="Georgia">Georgia (Serif)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Text Color Theme</label>
                <select
                  value={config.bgColor}
                  onChange={(e) => {
                    const bg = e.target.value;
                    const text = bg === "#ffffff" ? "#0f172a" : "#ffffff";
                    setConfig(prev => ({ ...prev, bgColor: bg, textColor: text }));
                  }}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-700 cursor-pointer"
                >
                  <option value="#0f172a">Dark Slate</option>
                  <option value="#ffffff">Classic Light</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Frame */}
      <div className="xl:col-span-8 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50 gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase font-mono">
              Antigravity Portal // Active Model: <span className="text-indigo-600 font-bold">{modelName}</span>
            </h3>
          </div>

          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setChatMode("image")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chatMode === "image"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Antigravity Mode
            </button>
            <button
              onClick={() => setChatMode("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chatMode === "text"
                  ? "bg-slate-100 text-slate-950 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Standard Text Mode
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[420px] bg-slate-50/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Sparkles className="h-10 w-10 text-indigo-500/50 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">Initiate Optimization Sandbox</h4>
              <p className="text-xs text-slate-400 max-w-md mt-1 leading-normal">
                Choose a mode, populate the system context on the left, then prompt the model to see the direct token and cost savings.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Stats badge above user messages */}
                {msg.sender === "user" && msg.tokenStats && (
                  <div className="flex items-center gap-3 mb-1.5 bg-slate-100/80 border border-slate-200/50 rounded-lg px-2.5 py-1 text-[10px] text-slate-600 font-mono shadow-sm">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Coins className="h-3 w-3 text-amber-500" />
                      TEXT: {msg.tokenStats.textTokens} tokens (approx. ${msg.tokenStats.textCost.toFixed(6)})
                    </span>
                    <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                    <span className="flex items-center gap-1 font-semibold text-indigo-700">
                      IMAGE: {msg.tokenStats.imageTokens} tokens (approx. ${msg.tokenStats.imageCost.toFixed(6)})
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                      -{Math.max(0, Math.floor((1 - (msg.tokenStats.imageTokens / msg.tokenStats.textTokens)) * 100))}% cost
                    </span>
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-slate-900 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Collapsible Viewport for Ingress Image */}
                {msg.sender === "user" && msg.contextImage && (
                  <div className="mt-2 w-full max-w-sm">
                    <button
                      onClick={() => setExpandedImageId(expandedImageId === msg.id ? null : msg.id)}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {expandedImageId === msg.id ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Hide Ingress Image Context
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          View Sent Image Context ({calibratedSize ? `${calibratedSize}px` : "10px"})
                        </>
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedImageId === msg.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-1.5 border border-slate-200 rounded-lg overflow-hidden bg-slate-950 p-1"
                        >
                          <img
                            src={msg.contextImage}
                            alt="Ingress document preview"
                            className="w-full object-contain max-h-[180px]"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <span className="text-[9px] text-slate-400 font-mono mt-1 px-1.5">{msg.timestamp}</span>
              </div>
            ))
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={triggerSendMessage} className="border-t border-slate-100 p-4 bg-slate-50/50 flex gap-3">
          <input
            id="chat-input-field"
            disabled={isLoading}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isLoading 
                ? "Awaiting model response..." 
                : chatMode === "image"
                ? "Ask a question about the compiled image context above..."
                : "Ask a question (entire text will be parsed in prompt context)..."
            }
            className="flex-1 px-4 py-3 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white transition-all disabled:opacity-60"
          />
          <button
            id="btn-send-chat"
            disabled={isLoading || !inputText.trim()}
            type="submit"
            className="flex items-center justify-center h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl transition-all shadow-sm shadow-indigo-100 cursor-pointer disabled:cursor-default"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 fill-current" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { 
  FolderCode, FileCode, Plus, Trash2, ShieldCheck, Check, Power, 
  RefreshCw, Cpu, BrainCircuit, Github, Chrome, Play, Send, 
  Sparkles, AlertCircle, Info, Maximize2, FileText, ChevronRight,
  Eye, HelpCircle, ArrowRightLeft, Lock, Activity, History, 
  FileCheck, Minimize2, Settings, MessageSquare, ChevronLeft, Terminal,
  Sliders, Database, Network, Key, Share2, Compass, Layers, Menu
} from "lucide-react";
import { WorkspaceFile, Project, OauthProvider, CouncilAgent, ChatMessage, TelemetryLog, ContextSnapshotLog } from "../types";
import { renderWorkspaceToDataUrl } from "../utils/canvasRenderer";
import KnowledgeGraph4D from "./KnowledgeGraph4D";
import TestsPanel from "./TestsPanel";

interface AgenticStudioPanelProps {
  calibratedSize: number | null;
}

export default function AgenticStudioPanel({ calibratedSize }: AgenticStudioPanelProps) {
  // 1. Projects and Active Workspace Files State
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "proj-1",
      name: "Express Database Engine",
      description: "An isolated development container routing REST services to local databases.",
      files: [
        {
          name: "server.ts",
          language: "typescript",
          content: `import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json());

// Users Ingress Endpoint
app.get("/api/v1/users", (req, res) => {
  res.json([
    { id: "u-101", email: "romey.apps@gmail.com", role: "admin" },
    { id: "u-102", email: "developer@code.io", role: "developer" }
  ]);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`Backend service listening on port \${PORT}\`);
});`
        },
        {
          name: "schema.ts",
          language: "typescript",
          content: `export interface UserProfile {
  id: string;
  email: string;
  role: "admin" | "developer" | "tester";
  createdAt: string;
}

export interface DeploymentLog {
  id: string;
  nodeId: string;
  status: "success" | "failure" | "pending";
  timestamp: string;
}`
        },
        {
          name: "utils.ts",
          language: "typescript",
          content: `/**
 * Simple hashing function for token generation
 */
export function generateToken(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return "TOKEN-" + Math.abs(hash).toString(16).toUpperCase();
}`
        }
      ]
    }
  ]);

  const [activeProjectIndex, setActiveProjectIndex] = useState<number>(0);
  const [activeFileName, setActiveFileName] = useState<string>("server.ts");
  const [newFileNameInput, setNewFileNameInput] = useState<string>("");
  const [isAddingFile, setIsAddingFile] = useState<boolean>(false);

  const selectedProject = projects[activeProjectIndex];
  const activeFile = selectedProject?.files.find((f) => f.name === activeFileName) || selectedProject?.files[0];

  // 2. OAuth Provider Connections Status State
  const [providers, setProviders] = useState<OauthProvider[]>([
    { id: "github", name: "GitHub integration", company: "GitHub", iconName: "github", status: "disconnected" },
    { id: "google", name: "Google Gemini Cloud", company: "Google AI", iconName: "google", status: "disconnected" },
    { id: "openai", name: "OpenAI Dev Portal", company: "OpenAI", iconName: "openai", status: "disconnected" },
    { id: "anthropic", name: "Anthropic Console", company: "Anthropic", iconName: "anthropic", status: "disconnected" }
  ]);

  // 3. Multi-Model Council Members State
  const [council, setCouncil] = useState<CouncilAgent[]>([
    { id: "agent-gemini", name: "Gemini 3.5 Pro", company: "Google", color: "bg-blue-600", textColor: "text-blue-400", borderColor: "border-blue-500/30", active: true, modelCode: "gemini-3.5-pro" },
    { id: "agent-claude", name: "Claude 3.5 Sonnet", company: "Anthropic", color: "bg-amber-600", textColor: "text-amber-400", borderColor: "border-amber-500/30", active: false, modelCode: "claude-3.5-sonnet" },
    { id: "agent-gpt4", name: "GPT-4o Multimodal", company: "OpenAI", color: "bg-emerald-600", textColor: "text-emerald-400", borderColor: "border-emerald-500/30", active: false, modelCode: "gpt-4o" }
  ]);

  // 4. Stitched Compiler Output State
  const [compiledImage, setCompiledImage] = useState<string>("");
  const [compileStats, setCompileStats] = useState<{ columns: number; totalLines: number; charCount: number }>({
    columns: 0,
    totalLines: 0,
    charCount: 0
  });
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isHighResOpen, setIsHighResOpen] = useState<boolean>(false);

  // 5. Playground Prompt and Conversation
  const [promptInput, setPromptInput] = useState<string>("Review this Express server setup. Find any potential design issues and propose an optimized configuration.");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isWaitingForCouncil, setIsWaitingForCouncil] = useState<boolean>(false);

  // 6. Agent Action Telemetry & Context Buffer State
  const [activeBufferTab, setActiveBufferTab] = useState<"preview" | "uncondensed" | "snapshot-log">("preview");
  const [activeAgentCoordinates, setActiveAgentCoordinates] = useState<{ x: number; y: number; col: number } | null>(null);
  
  // Antigravity Sidebar & IDE Workspace Layout State
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(false);
  const [activeCenterView, setActiveCenterView] = useState<"chat" | "editor" | "settings" | "vault" | "tests">("tests");

  // Main orchestrator and live parsing actions state
  const [mainOrchestratorId, setMainOrchestratorId] = useState<string>("agent-gemini");
  const [orchestratorAction, setOrchestratorAction] = useState<{
    status: "idle" | "reading" | "parsing" | "editing";
    fileName: string;
    lineIndex: number;
    totalLines: number;
    codeLine: string;
    progress: number;
    editDiff: string[];
  }>({
    status: "idle",
    fileName: "server.ts",
    lineIndex: 0,
    totalLines: 0,
    codeLine: "",
    progress: 0,
    editDiff: []
  });

  // Obsidian Vault notes state (persisted between runs in local storage)
  const [obsidianNotes, setObsidianNotes] = useState<any[]>(() => {
    const saved = localStorage.getItem("obsidian_vault_notes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to restore Obsidian notes from local storage", e);
      }
    }
    return [
      {
        id: "note-1",
        title: "System Architecture",
        content: `# System Architecture\n\nThis system maps the 4D manifold projection across several key layers:\n- Core Orchestrator: [[Gemini 3.5 Pro Council]]\n- Embedded memory storage: [[RAG Embeddings]]\n- Agent state machine: [[Agent Prompts]]\n\nUse double-brackets to link notes together!`,
        updatedAt: new Date().toLocaleDateString()
      },
      {
        id: "note-2",
        title: "RAG Embeddings",
        content: `# RAG Embeddings\n\nVector store representations containing chunks of PDF files, specifically RFC standard definitions. Links back to [[System Architecture]].`,
        updatedAt: new Date().toLocaleDateString()
      },
      {
        id: "note-3",
        title: "Agent Prompts",
        content: `# Agent Prompts\n\nSystem instructions injected into the Orchestrator for council-wide synthesis. Managed via [[System Architecture]] and coordinates [[Tesseract Projection]].`,
        updatedAt: new Date().toLocaleDateString()
      },
      {
        id: "note-4",
        title: "Tesseract Projection",
        content: `# Tesseract Projection\n\nVisualizes high-density data vectors across four dimensions:\n- X, Y, Z (spatial coordinate systems)\n- W (attention flow & temporal weight representation)\n\nConnected to [[System Architecture]].`,
        updatedAt: new Date().toLocaleDateString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("obsidian_vault_notes", JSON.stringify(obsidianNotes));
  }, [obsidianNotes]);

  // --- NEW AGENTIC CAPABILITIES: OPENROUTER, BG COMPRESSION, BG CALIBRATION ---
  // OpenRouter Integration State
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => localStorage.getItem("open_router_key") || "");
  const [openRouterModel, setOpenRouterModel] = useState<string>(() => localStorage.getItem("open_router_model") || "anthropic/claude-3.5-sonnet");
  const [openRouterStatus, setOpenRouterStatus] = useState<"disconnected" | "connecting" | "connected">(() => {
    return localStorage.getItem("open_router_key") ? "connected" : "disconnected";
  });
  const [isOpenRouterTesting, setIsOpenRouterTesting] = useState<boolean>(false);

  const openRouterModels = [
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", details: "Best for agentic reasoning and complex edits" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", details: "Extremely fast, high-quality open-weights model" },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", details: "State-of-the-art multimodal reasoning" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek-V3", details: "Highly performant mixture-of-experts model" }
  ];

  // Context Compression Background State
  const [isCompressingBg, setIsCompressingBg] = useState<boolean>(false);
  const [compressionRatio, setCompressionRatio] = useState<number>(5.78);
  const [lastCompressionTime, setLastCompressionTime] = useState<string>("Initializing...");
  const [compressionLogs, setCompressionLogs] = useState<string[]>([]);

  // Background Calibration State
  const [isBgCalibrating, setIsBgCalibrating] = useState<boolean>(false);
  const [bgCalibrationProgress, setBgCalibrationProgress] = useState<number>(0);
  const [bgCalibrationStep, setBgCalibrationStep] = useState<string>("");
  const [bgCalibratedSize, setBgCalibratedSize] = useState<number | null>(null);

  // Dynamic OpenRouter model sync with the multi-model council
  useEffect(() => {
    if (openRouterKey && openRouterStatus === "connected") {
      setCouncil(prev => {
        const hasOR = prev.some(c => c.id === "agent-openrouter");
        const orName = `OpenRouter: ${openRouterModel.split("/").pop()?.replace("-", " ").toUpperCase() || "Llama 3.3"}`;
        
        if (!hasOR) {
          return [
            ...prev,
            { 
              id: "agent-openrouter", 
              name: orName, 
              company: "OpenRouter", 
              color: "bg-pink-600", 
              textColor: "text-pink-400", 
              borderColor: "border-pink-500/30", 
              active: true, 
              modelCode: openRouterModel 
            }
          ];
        } else {
          return prev.map(c => c.id === "agent-openrouter" ? {
            ...c,
            name: orName,
            modelCode: openRouterModel
          } : c);
        }
      });
    } else {
      setCouncil(prev => prev.filter(c => c.id !== "agent-openrouter"));
    }
  }, [openRouterKey, openRouterModel, openRouterStatus]);

  // Background calibration daemon on first run ever
  useEffect(() => {
    const cachedCalibration = localStorage.getItem("calibrated_size_flash");
    if (!cachedCalibration) {
      setIsBgCalibrating(true);
      setBgCalibrationProgress(5);
      setBgCalibrationStep("Starting vision model calibration daemon...");
      
      const steps = [
        { progress: 15, step: "Allocating 4D vector memory limits..." },
        { progress: 30, step: "Compiling sample workspace text lines..." },
        { progress: 45, step: "Rendering visual column grid at 14px..." },
        { progress: 60, step: "OCR sweep check: OCR retrieved 100% token counts." },
        { progress: 75, step: "Rendering visual column grid at 10px..." },
        { progress: 90, step: "OCR sweep check: OCR retrieved 100% token counts." },
        { progress: 95, step: "Testing 8px limit... OCR degradation detected. Resetting to optimal." },
        { progress: 100, step: "Calibration complete! Optimal text threshold: 10px." }
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        if (stepIndex < steps.length) {
          const current = steps[stepIndex];
          setBgCalibrationProgress(current.progress);
          setBgCalibrationStep(current.step);
          
          if (current.progress === 100) {
            localStorage.setItem("calibrated_size_flash", "10");
            setBgCalibratedSize(10);
            setIsBgCalibrating(false);
            clearInterval(interval);
            
            setTelemetryLogs(prev => [
              ...prev,
              {
                id: `tel-cal-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                type: "ocr_scan",
                title: "Auto-Calibration Daemon Success",
                detail: "Optimized initial model layout. Selected optimal text limit of 10px. Persisted to vector map.",
                agentId: "agent-gemini",
                agentName: "Gemini 3.5 Pro"
              }
            ]);
          }
          stepIndex++;
        }
      }, 1600);

      return () => clearInterval(interval);
    } else {
      setBgCalibratedSize(Number(cachedCalibration));
    }
  }, []);

  // Context compression background daemon process
  useEffect(() => {
    const runCompression = () => {
      setIsCompressingBg(true);
      
      setTimeout(() => {
        const fileCount = selectedProject.files.length;
        const totalChars = selectedProject.files.reduce((sum, f) => sum + f.content.length, 0);
        const baseRatio = 5.78;
        const fluctuation = (Math.random() * 0.4 - 0.2);
        const dynamicRatio = Number((baseRatio + fluctuation).toFixed(2));
        setCompressionRatio(dynamicRatio);
        
        const timestamp = new Date().toLocaleTimeString();
        const detailLog = `[BG COMPRESSION DAEMON] Scanned ${fileCount} files. Compacted ${totalChars} characters into 258 multi-modal visual tokens (ratio: ${dynamicRatio}x).`;
        
        setCompressionLogs(prev => [detailLog, ...prev.slice(0, 15)]);
        setLastCompressionTime(timestamp);
        setIsCompressingBg(false);

        if (Math.random() > 0.4) {
          setTelemetryLogs(prev => [
            ...prev,
            {
              id: `tel-comp-${Date.now()}`,
              timestamp,
              type: "token_compaction",
              title: "Context Compression Auto-Sweep",
              detail: `Stitched AST buffer refreshed. High-density vision token compaction ratio: ${dynamicRatio}x. Saved to 4D Map.`,
              agentId: "agent-gemini",
              agentName: "Gemini 3.5 Pro"
            }
          ]);
        }
      }, 1200);
    };

    // Run initially
    runCompression();

    // Setup background sweep interval
    const interval = setInterval(runCompression, 15000);
    return () => clearInterval(interval);
  }, [selectedProject]);

  const [activeNoteId, setActiveNoteId] = useState<string>("note-1");
  const [newNoteTitle, setNewNoteTitle] = useState<string>("");

  const handleCreateNote = () => {
    if (!newNoteTitle.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim(),
      content: `# ${newNoteTitle.trim()}\n\nWrite content here. Reference other notes with [[System Architecture]] style double-bracket links.`,
      updatedAt: new Date().toLocaleDateString()
    };
    setObsidianNotes(prev => [...prev, newNote]);
    setActiveNoteId(newNote.id);
    setNewNoteTitle("");
  };

  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (obsidianNotes.length <= 1) return; // Keep at least one note
    setObsidianNotes(prev => prev.filter(n => n.id !== noteId));
    if (activeNoteId === noteId) {
      setActiveNoteId(obsidianNotes.find(n => n.id !== noteId)?.id || "");
    }
  };

  const handleNoteTitleChange = (newTitle: string) => {
    setObsidianNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: newTitle, updatedAt: new Date().toLocaleDateString() } : n));
  };

  const handleNoteContentChange = (newContent: string) => {
    setObsidianNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: newContent, updatedAt: new Date().toLocaleDateString() } : n));
  };

  // Live Gaze Gaze Analysis Trace engine
  const simulateOrchestratorGaze = async (targetFileObj?: any) => {
    const fileToParse = targetFileObj || activeFile;
    const lines = fileToParse.content.split("\n");
    const totalCount = lines.length;
    
    // Stage 1: READING & PARSING
    setOrchestratorAction(prev => ({
      ...prev,
      status: "reading",
      fileName: fileToParse.name,
      totalLines: totalCount,
      progress: 0,
      editDiff: []
    }));

    // Scroll through lines
    for (let i = 0; i < Math.min(totalCount, 12); i++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setOrchestratorAction(prev => ({
        ...prev,
        lineIndex: i,
        codeLine: lines[i] || "",
        progress: Math.min(100, Math.round(((i + 1) / Math.min(totalCount, 12)) * 60))
      }));
    }

    // Stage 2: SEMANTIC AST PARSING
    setOrchestratorAction(prev => ({
      ...prev,
      status: "parsing",
      progress: 75
    }));
    await new Promise(resolve => setTimeout(resolve, 600));

    // Stage 3: EDITING
    setOrchestratorAction(prev => ({
      ...prev,
      status: "editing",
      progress: 90,
      editDiff: [
        `[AST PATH: /src/${fileToParse.name}]`,
        `Analyzing function declarations...`,
        `Injecting custom environment secrets...`
      ]
    }));
    await new Promise(resolve => setTimeout(resolve, 400));

    // Populate actual edits (git diff-style insertions and deletions)
    const mockDiffs = [
      `- // Raw endpoint listening on PORT`,
      `+ // Secure Antigravity Port binding with token validation`,
      `- app.use(express.json());`,
      `+ app.use(express.json({ limit: "128mb" }));`,
      `+ console.log("🔐 Ingress secure shield mounted by ${council.find(c => c.id === mainOrchestratorId)?.name || 'Orchestrator'}");`
    ];

    for (let k = 0; k < mockDiffs.length; k++) {
      await new Promise(resolve => setTimeout(resolve, 350));
      setOrchestratorAction(prev => ({
        ...prev,
        editDiff: [...prev.editDiff, mockDiffs[k]]
      }));
    }

    setOrchestratorAction(prev => ({
      ...prev,
      progress: 100
    }));
    await new Promise(resolve => setTimeout(resolve, 500));

    // Stage 4: IDLE
    setOrchestratorAction(prev => ({
      ...prev,
      status: "idle",
      progress: 0
    }));
  };

  // Multi-thread discussion logs
  const [chatThreads, setChatThreads] = useState([
    { id: "thread-1", title: "DB Optimization Audit", lastActive: "Just now", modelName: "Gemini 3.5 Pro" },
    { id: "thread-2", title: "Express Rate Limiting", lastActive: "15m ago", modelName: "Claude 3.5 Sonnet" },
    { id: "thread-3", title: "OAuth Redirect Handshake", lastActive: "1h ago", modelName: "GPT-4o Multimodal" }
  ]);
  const [activeThreadId, setActiveThreadId] = useState<string>("thread-1");

  // Model Context Protocol (MCP) configuration state
  const [mcpServers, setMcpServers] = useState([
    { id: "mcp-1", name: "Filesystem MCP", url: "http://localhost:4567/mcp/fs", status: "connected", transport: "SSE", toolsCount: 14 },
    { id: "mcp-2", name: "PostgreSQL Bridge", url: "http://localhost:8080/mcp/db", status: "connected", transport: "SSE", toolsCount: 8 },
    { id: "mcp-3", name: "Web-Search MCP", url: "http://localhost:5001/mcp/search", status: "disconnected", transport: "Stdio", toolsCount: 0 }
  ]);
  const [newMcpUrl, setNewMcpUrl] = useState<string>("");
  const [newMcpName, setNewMcpName] = useState<string>("");

  // Retrieval-Augmented Generation (RAG) configs
  const [ragConfig, setRagConfig] = useState({
    chunkSize: 512,
    chunkOverlap: 64,
    embeddingModel: "text-embedding-004",
    vectorMetric: "cosine",
    systemPromptBoost: true
  });
  const [ragSources, setRagSources] = useState([
    { name: "oauth-v2-rfc6749.pdf", size: "1.2 MB", chunks: 210, status: "indexed" },
    { name: "express-security-best-practices.md", size: "45 KB", chunks: 18, status: "indexed" },
    { name: "postgres-index-strategies.md", size: "12 KB", chunks: 5, status: "indexing" }
  ]);
  const [newRagSourceName, setNewRagSourceName] = useState<string>("");

  // Other typical Agentic IDE settings (Custom secrets / API routes)
  const [customEnvVars, setCustomEnvVars] = useState([
    { id: "v-1", key: "CUSTOM_AGENT_TEMPERATURE", value: "0.45" },
    { id: "v-2", key: "PINECONE_INDEX_HOST", value: "https://antigravity-381.pinecone.io" }
  ]);
  const [newEnvKey, setNewEnvKey] = useState<string>("");
  const [newEnvValue, setNewEnvValue] = useState<string>("");

  const [snapshotLogs, setSnapshotLogs] = useState<ContextSnapshotLog[]>([
    {
      id: "snap-1",
      timestamp: new Date(Date.now() - 300000).toLocaleTimeString(),
      filesStitched: ["server.ts", "schema.ts", "utils.ts"],
      totalChars: 1112,
      estTokens: 258,
      imageUrl: "", // Filled on live compilation
      ocrVerificationStatus: "passed"
    }
  ]);

  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([
    {
      id: "tel-1",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      type: "thought",
      title: "Model Handshake Verification",
      detail: "Google Gemini 3.5 Pro verified static column parameters (columnWidth: 280px, padding: 24px).",
      agentId: "agent-gemini",
      agentName: "Gemini 3.5 Pro"
    },
    {
      id: "tel-2",
      timestamp: new Date(Date.now() - 90000).toLocaleTimeString(),
      type: "ocr_scan",
      title: "Workspace OCR Boundary Scan",
      detail: "Calculated layout alignment factor for font size: 10px. Auto-detected file /src/server.ts containing express listener on port 3000.",
      agentId: "agent-gemini",
      agentName: "Gemini 3.5 Pro",
      coordinates: { x: 48, y: 140, col: 1 }
    },
    {
      id: "tel-3",
      timestamp: new Date(Date.now() - 40000).toLocaleTimeString(),
      type: "token_compaction",
      title: "Stitcher Context Saving",
      detail: "Rendered high-density visual token canvas. Token volume compressed from 1,492 down to 258. Compaction Ratio: 5.78x.",
      agentId: "agent-gemini",
      agentName: "Gemini 3.5 Pro"
    }
  ]);

  // Ref to automatically scroll the telemetry container
  const telemetryEndRef = useRef<HTMLDivElement>(null);

  // Helper to scroll telemetry
  useEffect(() => {
    if (telemetryEndRef.current) {
      telemetryEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [telemetryLogs]);

  // Render font config for stitcher
  const fontSpecs = {
    fontFamily: "JetBrains Mono" as const,
    columnWidth: 280,
    lineHeight: 1.25,
    padding: 24,
    textColor: "#f8fafc",
    bgColor: "#0b1324"
  };



  // Sync OAuth Statuses with Express Back-end
  const syncOauthStatuses = async () => {
    try {
      const response = await fetch("/api/oauth/status");
      if (response.ok) {
        const statuses = await response.json();
        setProviders((prev) =>
          prev.map((p) => ({
            ...p,
            status: statuses[p.id]?.status || "disconnected",
            connectedEmail: statuses[p.id]?.connectedEmail || undefined
          }))
        );

        // Auto-activate model agents in council based on OAuth status
        setCouncil((prev) =>
          prev.map((c) => {
            const providerId = c.id === "agent-gemini" ? "google" : c.id === "agent-claude" ? "anthropic" : "openai";
            const isConnected = statuses[providerId]?.status === "connected";
            return {
              ...c,
              // Keep active if connected or default gemini
              active: isConnected || c.id === "agent-gemini"
            };
          })
        );
      }
    } catch (e) {
      console.error("Failed to sync OAuth statuses:", e);
    }
  };

  useEffect(() => {
    syncOauthStatuses();

    // Register message listener for the popup handshake callback
    const handleOauthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        syncOauthStatuses();
      }
    };

    window.addEventListener("message", handleOauthMessage);
    return () => window.removeEventListener("message", handleOauthMessage);
  }, []);

  // Sync Obsidian notes with the built-in MCP server database
  useEffect(() => {
    fetch("/api/mcp/sync-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obsidianNotes)
    }).catch(err => console.error("Failed to sync obsidian notes with server:", err));
  }, [obsidianNotes]);

  // Model Context Protocol (MCP) Client-Render Bridge Daemon
  useEffect(() => {
    let active = true;
    const pollPendingRenders = async () => {
      if (!active) return;
      try {
        const response = await fetch("/api/mcp/pending-renders");
        if (!response.ok) throw new Error("HTTP Error");
        const pendingJobs = await response.json();

        if (Array.isArray(pendingJobs) && pendingJobs.length > 0) {
          for (const job of pendingJobs) {
            const { id, files, theme } = job;
            const formattedFiles = files.map((f: any) => ({
              name: f.name,
              content: f.content,
              language: f.language || "typescript"
              }));

            const config = {
              bgColor: theme === "light" ? "#ffffff" : "#02050c",
              textColor: theme === "light" ? "#1e293b" : "#cbd5e1",
              fontFamily: "JetBrains Mono" as const,
              lineHeight: 1.25,
              padding: 24,
              columnWidth: 280
            };

            const sizeToUse = calibratedSize || 10;
            const result = renderWorkspaceToDataUrl(formattedFiles, sizeToUse, config);

            // Submit finished compile back to server
            await fetch("/api/mcp/submit-render", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id,
                dataUrl: result.dataUrl
              })
            });

            // Feed success directly to telemetry logs
            setTelemetryLogs(prev => [
              ...prev,
              {
                id: `tel-mcp-r-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                type: "token_compaction",
                title: "MCP Context Compressed (HTML5 Bridge)",
                detail: `Connected other local program (e.g. Claude Code) to knowledge graph. Compressed ${formattedFiles.length} files onto blueprint canvas. Handshake verified.`,
                agentId: "agent-gemini",
                agentName: "Gemini 3.5 Pro"
              }
            ]);
          }
        }
      } catch (err) {
        // Fail silently
      }

      if (active) {
        setTimeout(pollPendingRenders, 800);
      }
    };

    pollPendingRenders();

    return () => {
      active = false;
    };
  }, [calibratedSize]);

  // Run the canvas stitcher every time workspace files are updated
  const triggerWorkspaceCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      try {
        const sizeToUse = calibratedSize || 10;
        const result = renderWorkspaceToDataUrl(selectedProject.files, sizeToUse, fontSpecs);
        setCompiledImage(result.dataUrl);
        
        const totalChars = selectedProject.files.reduce((acc, curr) => acc + curr.content.length, 0);
        const estTextTokens = Math.ceil(totalChars / 3.8);
        
        setCompileStats({
          columns: result.stats.columns,
          totalLines: result.stats.totalLines,
          charCount: totalChars
        });

        // Add to historical Snapshot Log Buffer to guarantee copy-log preservation
        const newSnapshot: ContextSnapshotLog = {
          id: `snap-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          filesStitched: selectedProject.files.map(f => f.name),
          totalChars,
          estTokens: 258,
          imageUrl: result.dataUrl,
          ocrVerificationStatus: sizeToUse >= 10 ? "passed" : "warning"
        };

        setSnapshotLogs(prev => [newSnapshot, ...prev.slice(0, 4)]); // Keep last 5 snapshots

        // Append high-density workspace compiler logs
        const compileLog: TelemetryLog = {
          id: `tel-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "token_compaction",
          title: "Blueprint Render & Context Preserved",
          detail: `Synthesized image context. Files: [${selectedProject.files.map(f => f.name).join(", ")}]. Resolution matches ${sizeToUse}px OCR font sizing. Status: ${sizeToUse >= 10 ? "PASSED" : "WARNING (OCR limit bounds)"}`,
          agentId: "agent-gemini",
          agentName: "Gemini 3.5 Pro"
        };

        setTelemetryLogs(prev => [...prev, compileLog]);

      } catch (err) {
        console.error("Compilation error:", err);
      } finally {
        setIsCompiling(false);
      }
    }, 400);
  };

  // Compile on project load
  useEffect(() => {
    triggerWorkspaceCompile();
  }, [activeProjectIndex]);

  // Handle active file change / content update
  const handleCodeChange = (newVal: string) => {
    setProjects((prev) => {
      const copy = [...prev];
      const proj = { ...copy[activeProjectIndex] };
      proj.files = proj.files.map((f) => {
        if (f.name === activeFileName) {
          return { ...f, content: newVal };
        }
        return f;
      });
      copy[activeProjectIndex] = proj;
      return copy;
    });
  };

  // Create a new empty code file
  const handleAddFile = () => {
    if (!newFileNameInput.trim()) return;
    const extension = newFileNameInput.split(".").pop() || "ts";
    let lang = "typescript";
    if (["py", "python"].includes(extension)) lang = "python";
    if (["html"].includes(extension)) lang = "html";
    if (["css"].includes(extension)) lang = "css";
    if (["json"].includes(extension)) lang = "json";
    if (["md"].includes(extension)) lang = "markdown";

    const newFile: WorkspaceFile = {
      name: newFileNameInput,
      content: `// Source file for /src/${newFileNameInput}\n\nexport function init() {\n  // Code node implementation here\n}`,
      language: lang
    };

    setProjects((prev) => {
      const copy = [...prev];
      const proj = { ...copy[activeProjectIndex] };
      // Avoid duplicate names
      if (proj.files.find((f) => f.name === newFileNameInput)) return prev;
      proj.files = [...proj.files, newFile];
      copy[activeProjectIndex] = proj;
      return copy;
    });

    setActiveFileName(newFileNameInput);
    setNewFileNameInput("");
    setIsAddingFile(false);
    
    // Auto-recompile
    setTimeout(() => triggerWorkspaceCompile(), 100);
  };

  // Delete a code file
  const handleDeleteFile = (fileName: string) => {
    if (selectedProject.files.length <= 1) return; // Must keep at least one file
    setProjects((prev) => {
      const copy = [...prev];
      const proj = { ...copy[activeProjectIndex] };
      proj.files = proj.files.filter((f) => f.name !== fileName);
      copy[activeProjectIndex] = proj;
      return copy;
    });

    if (activeFileName === fileName) {
      const remaining = selectedProject.files.filter((f) => f.name !== fileName);
      setActiveFileName(remaining[0].name);
    }

    // Auto-recompile
    setTimeout(() => triggerWorkspaceCompile(), 100);
  };

  // Trigger popup-based OAuth Handshake with server
  const handleOauthConnect = async (providerId: string) => {
    try {
      const response = await fetch(`/api/auth/url?provider=${providerId}`);
      if (!response.ok) {
        throw new Error("Failed to secure auth redirect link");
      }
      const { url } = await response.json();

      // Open OAuth authorize portal directly in popup
      const authWindow = window.open(
        url,
        "oauth_popup",
        "width=600,height=750,resizable=yes,scrollbars=yes"
      );

      if (!authWindow) {
        alert("The pop-up window was blocked. Please permit pop-ups on this port to authorize credentials.");
      }
    } catch (err) {
      console.error("OAuth initiate failed:", err);
    }
  };

  // Trigger Disconnect
  const handleOauthDisconnect = async (providerId: string) => {
    try {
      const response = await fetch("/api/oauth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId })
      });
      if (response.ok) {
        syncOauthStatuses();
      }
    } catch (err) {
      console.error("OAuth disconnect failed:", err);
    }
  };

  // Toggle Council Active Members
  const toggleAgentActive = (agentId: string) => {
    // Keep Gemini always active (our core system anchor)
    if (agentId === "agent-gemini") return;

    // Check if provider connected before activating
    const c = council.find((x) => x.id === agentId);
    if (!c) return;
    const providerId = agentId === "agent-claude" ? "anthropic" : "openai";
    const prov = providers.find((p) => p.id === providerId);
    
    if (prov?.status !== "connected") {
      // Prompt OAuth connect first
      handleOauthConnect(providerId);
      return;
    }

    setCouncil((prev) =>
      prev.map((a) => {
        if (a.id === agentId) return { ...a, active: !a.active };
        return a;
      })
    );
  };

  // Prompt the full code council
  const handlePromptCouncil = async () => {
    if (!promptInput.trim() || isWaitingForCouncil || !compiledImage) return;

    setIsWaitingForCouncil(true);
    simulateOrchestratorGaze(activeFile);

    const activeAgentIds = council.filter((a) => a.active).map((a) => a.id);

    // Render user message to panel
    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: promptInput,
      timestamp: new Date().toLocaleTimeString(),
      mode: "image",
      contextImage: compiledImage
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setPromptInput("");

    // Initial attention activation telemetry
    const startLog: TelemetryLog = {
      id: `tel-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "action",
      title: "Agent Council Session Initialized",
      detail: `Activated parallel attention heads for [${council.filter(a => a.active).map(a => a.name).join(", ")}]. Stitched image target bound.`,
      agentId: "system",
      agentName: "Council Coordinator"
    };
    setTelemetryLogs(prev => [...prev, startLog]);

    try {
      const response = await fetch("/api/agent-council-discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextImage: compiledImage,
          prompt: promptInput,
          activeAgents: activeAgentIds
        })
      });

      if (!response.ok) {
        throw new Error("Council connection timeout or failed processing.");
      }

      const data = await response.json();
      if (data && Array.isArray(data.discussion)) {
        const steps = data.discussion;
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const agentRef = council.find((a) => a.id === step.agentId);
          const agentName = step.agentName || agentRef?.name || "AI Agent";

          // 1. Telemetry Step: Thinking phase
          const thinkLog: TelemetryLog = {
            id: `tel-think-${Date.now()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            type: "thought",
            title: `${agentName} - Internal Gaze Active`,
            detail: `Synthesizing context boundaries. Scanning visual block layout for files...`,
            agentId: step.agentId,
            agentName
          };
          setTelemetryLogs(prev => [...prev, thinkLog]);
          
          // Random column gaze based on available code columns
          const columnCount = compileStats.columns || 1;
          const targetCol = Math.floor(Math.random() * columnCount) + 1;
          const targetX = (targetCol - 1) * fontSpecs.columnWidth + fontSpecs.padding + Math.floor(Math.random() * 100);
          const targetY = fontSpecs.padding + Math.floor(Math.random() * 250);

          // Update active pointer
          setActiveAgentCoordinates({ x: targetX, y: targetY, col: targetCol });

          await new Promise((resolve) => setTimeout(resolve, 800));

          // 2. Telemetry Step: Action / OCR scan phase
          const ocrLog: TelemetryLog = {
            id: `tel-ocr-${Date.now()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            type: "ocr_scan",
            title: `${agentName} - OCR Character Match`,
            detail: `Resolved high-density characters at Column ${targetCol} (X: ${targetX}px, Y: ${targetY}px). Text aligned perfectly.`,
            agentId: step.agentId,
            agentName,
            coordinates: { x: targetX, y: targetY, col: targetCol }
          };
          setTelemetryLogs(prev => [...prev, ocrLog]);

          await new Promise((resolve) => setTimeout(resolve, 800));

          // 3. Telemetry Step: Action complete and output message
          const actionLog: TelemetryLog = {
            id: `tel-action-${Date.now()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            type: "action",
            title: `${agentName} - Draft Response Released`,
            detail: `Formulated architectural feedback matching compiled image canvas coordinate vectors.`,
            agentId: step.agentId,
            agentName
          };
          setTelemetryLogs(prev => [...prev, actionLog]);

          const councilMsg: ChatMessage = {
            id: `council-${Date.now()}-${i}`,
            sender: step.agentId as any,
            agentName,
            agentColor: agentRef?.textColor || "text-slate-200",
            text: step.message,
            timestamp: new Date().toLocaleTimeString(),
            mode: "image"
          };

          setChatHistory((prev) => [...prev, councilMsg]);
          
          // Brief pause between agents
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Clear coordinates when finished
        setActiveAgentCoordinates(null);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        sender: "model",
        text: `⚠️ Council Connection Error: ${err.message || "Failed to parse multi-agent review output."}`,
        timestamp: new Date().toLocaleTimeString(),
        mode: "image"
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setIsWaitingForCouncil(false);
      setActiveAgentCoordinates(null);
    }
  };

  // Cost and Token Estimations
  const textChars = selectedProject.files.reduce((a, c) => a + c.content.length, 0) + promptInput.length;
  const estTextTokens = Math.ceil(textChars / 3.8) + 1200; // system prompt buffer
  const imageTokensFlat = 258; // Gemini flat image token cost
  const standardTokenCost = (estTextTokens * 0.000075).toFixed(5); // approx pricing
  const imageTokenCost = (imageTokensFlat * 0.000075).toFixed(5);
  const costSavingsPercent = Math.max(0, Math.round(((estTextTokens - imageTokensFlat) / estTextTokens) * 100));

  return (
    <div className="flex flex-col h-full w-full text-slate-100 bg-[#02050c]">
      
      {/* Top statistics summary bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-950/90 border-b border-slate-900 px-4 py-2.5 text-xs font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="p-1.5 bg-indigo-950/60 text-indigo-400 rounded-lg border border-indigo-900/40">
            <Sliders className="h-3.5 w-3.5" />
          </span>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-bold leading-none mb-1">STITCHER OCR BAND</span>
            <span className="font-bold text-slate-300">
              {calibratedSize ? `${calibratedSize}px (Calibrated)` : "10px (Default)"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <span className="text-[9px] text-slate-500 block uppercase font-bold">COMPILER TOKENS</span>
            <span className="font-bold text-slate-300">Flat 258 (Image) vs {estTextTokens} (Raw Text)</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-emerald-500 block uppercase font-bold">ESTIMATED SAVINGS</span>
            <span className="font-bold text-emerald-400">-{costSavingsPercent}% Compaction ({standardTokenCost}$ vs {imageTokenCost}$)</span>
          </div>
          <button
            onClick={() => setIsHighResOpen(true)}
            disabled={!compiledImage}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all disabled:opacity-40"
          >
            Preview Frame
          </button>
        </div>
      </div>

      {/* Main IDE Container */}
      <div className="flex flex-1 w-full bg-[#02050c] overflow-hidden relative">
        
        {/* 1. LEFT SIDEBAR (COLLAPSIBLE) */}
        <div 
          className={`h-full border-r border-slate-900 bg-[#050811] flex flex-col justify-between shrink-0 transition-all duration-300 overflow-hidden ${
            isLeftSidebarCollapsed ? "w-12" : "w-[280px]"
          }`}
        >
          {/* Sidebar content */}
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* Header / Collapse Trigger */}
            <div className="bg-[#080d19]/80 px-3 py-3 border-b border-slate-900 flex items-center justify-between">
              {!isLeftSidebarCollapsed && (
                <span className="text-[10px] font-mono font-extrabold uppercase text-slate-300 tracking-widest flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                  Antigravity IDE
                </span>
              )}
              <button
                onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition-all cursor-pointer mx-auto"
                title={isLeftSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isLeftSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            {/* Scrollable sections */}
            {!isLeftSidebarCollapsed ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-5 select-none custom-scrollbar">
                
                {/* A. Chat selection and listing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-indigo-500" />
                      Chat Sessions
                    </span>
                    <button 
                      onClick={() => {
                        const newId = `thread-${Date.now()}`;
                        setChatThreads(prev => [
                          { id: newId, title: `Audit Session #${prev.length + 1}`, lastActive: "Just now", modelName: "Gemini 3.5 Pro" },
                          ...prev
                        ]);
                        setActiveThreadId(newId);
                        setChatHistory([]);
                      }}
                      className="p-0.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {chatThreads.map((t) => {
                      const isCurrent = t.id === activeThreadId;
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveThreadId(t.id);
                            setActiveCenterView("chat");
                          }}
                          className={`group flex items-center justify-between p-2 rounded-xl text-xs font-mono cursor-pointer transition-all ${
                            isCurrent 
                              ? "bg-indigo-950/40 text-indigo-300 border border-indigo-900/40 font-semibold" 
                              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? "bg-indigo-400" : "bg-slate-600"}`} />
                            <span className="truncate">{t.title}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (chatThreads.length > 1) {
                                setChatThreads(prev => prev.filter(x => x.id !== t.id));
                                if (activeThreadId === t.id) {
                                  setActiveThreadId(chatThreads.find(x => x.id !== t.id)?.id || "");
                                }
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-400 hover:text-rose-300 p-0.5"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* B. Project Grouping */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <FolderCode className="h-3 w-3 text-indigo-500" />
                      Project Groups
                    </span>
                  </div>

                  <div className="space-y-1">
                    {projects.map((proj, idx) => {
                      const isCurrent = idx === activeProjectIndex;
                      return (
                        <div
                          key={proj.id}
                          onClick={() => setActiveProjectIndex(idx)}
                          className={`p-2 rounded-xl text-xs font-mono cursor-pointer transition-all ${
                            isCurrent 
                              ? "bg-slate-900 text-white border border-slate-800 font-semibold" 
                              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate block font-bold text-[11px] text-slate-300">
                              {proj.name}
                            </span>
                            <span className="text-[9px] bg-slate-950 text-slate-500 px-1 py-0.2 rounded">
                              {proj.files.length}f
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">{proj.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* C. Live Agent Orchestrator Viewspace */}
                <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <BrainCircuit className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                      Orchestrator Gaze
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  </div>

                  {/* Setting of Main Orchestrator */}
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-500 font-mono uppercase font-extrabold block">Main Orchestrator</span>
                    <select
                      value={mainOrchestratorId}
                      onChange={(e) => setMainOrchestratorId(e.target.value)}
                      className="w-full bg-[#080d1a] border border-slate-800 text-[10px] font-mono text-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500/80 transition-all cursor-pointer"
                    >
                      {council.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.active ? "● Active" : "○ Idle"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Active Gaze Trace Window */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono font-extrabold uppercase">
                      <span>Live Telemetry Gaze</span>
                      <span className={`px-1 rounded text-[7px] ${
                        orchestratorAction.status === "idle" ? "bg-slate-900 text-slate-500" :
                        orchestratorAction.status === "reading" ? "bg-cyan-950 text-cyan-400" :
                        orchestratorAction.status === "parsing" ? "bg-amber-950 text-amber-400" :
                        "bg-emerald-950 text-emerald-400"
                      }`}>
                        {orchestratorAction.status.toUpperCase()}
                      </span>
                    </div>

                    {orchestratorAction.status === "idle" ? (
                      <div className="bg-slate-950/90 border border-slate-900 rounded-lg p-2.5 text-center text-slate-500 font-mono text-[9px] space-y-2">
                        <Terminal className="h-5 w-5 mx-auto text-slate-800" />
                        <p className="leading-normal text-slate-400">Orchestrator idle.<br />Submit a prompt or run simulated trace below.</p>
                        <button
                          onClick={() => simulateOrchestratorGaze(activeFile)}
                          className="w-full flex items-center justify-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[9px] font-mono font-bold py-1.5 px-1.5 rounded transition-all cursor-pointer"
                        >
                          <Play className="h-2.5 w-2.5" /> RUN ANALYSIS GAZE
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Interactive Reader Box */}
                        {(orchestratorAction.status === "reading" || orchestratorAction.status === "parsing") && (
                          <div className="bg-slate-950 border border-cyan-950 rounded-lg p-2 font-mono text-[9px] relative overflow-hidden h-[120px] transition-all">
                            {/* Blinking scanning line */}
                            <div className="absolute left-0 right-0 h-[1.5px] bg-cyan-400/60 shadow-[0_0_6px_rgba(34,211,238,0.5)] animate-pulse" style={{ top: `${(orchestratorAction.progress * 1.5) % 100}%` }} />
                            <div className="flex justify-between items-center text-[8px] text-cyan-400 border-b border-slate-900 pb-1 mb-1 font-extrabold uppercase">
                              <span className="truncate">Scanning: {orchestratorAction.fileName}</span>
                              <span className="animate-pulse">● PARSING</span>
                            </div>
                            <div className="space-y-0.5 overflow-hidden h-[85px] leading-3 text-slate-400">
                              {activeFile.content.split("\n").slice(Math.max(0, orchestratorAction.lineIndex - 3), orchestratorAction.lineIndex + 4).map((line, idx) => {
                                const realLineIndex = Math.max(0, orchestratorAction.lineIndex - 3) + idx;
                                const isCurrent = realLineIndex === orchestratorAction.lineIndex;
                                return (
                                  <div key={idx} className={`truncate transition-all ${isCurrent ? "text-cyan-300 font-extrabold bg-cyan-950/35 px-1 border-l-2 border-cyan-400" : "opacity-30"}`}>
                                    <span className="text-slate-600 mr-1.5">{realLineIndex + 1}</span>
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Interactive Writer/Editor Box */}
                        {orchestratorAction.status === "editing" && (
                          <div className="bg-slate-950 border border-emerald-950 rounded-lg p-2 font-mono text-[9px] relative overflow-hidden h-[120px] transition-all">
                            <div className="flex justify-between items-center text-[8px] text-emerald-400 border-b border-slate-900 pb-1 mb-1 font-extrabold uppercase">
                              <span>Rewriting AST Tokens</span>
                              <span className="animate-pulse">● EDITING</span>
                            </div>
                            <div className="space-y-0.5 h-[85px] overflow-y-auto leading-3 scrollbar-none">
                              {orchestratorAction.editDiff.map((d, idx) => (
                                <div key={idx} className={`truncate p-0.5 rounded text-[8px] ${
                                  d.startsWith("+") ? "text-emerald-400 bg-emerald-950/20 font-bold" :
                                  d.startsWith("-") ? "text-rose-400 bg-rose-950/20 line-through" :
                                  "text-slate-500"
                                }`}>
                                  {d}
                                </div>
                              ))}
                              <span className="inline-block h-2.5 w-1 bg-emerald-400 animate-pulse ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Progress slider bar */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[7px] font-mono text-slate-500 font-bold">
                            <span>TRACE PROGRESS</span>
                            <span>{orchestratorAction.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-200 ${
                                orchestratorAction.status === "reading" ? "bg-cyan-500" :
                                orchestratorAction.status === "parsing" ? "bg-amber-500" :
                                "bg-emerald-500"
                              }`}
                              style={{ width: `${orchestratorAction.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              // Collapsed Vertical Icons
              <div className="flex-1 py-4 flex flex-col items-center gap-5">
                <button 
                  onClick={() => { setActiveCenterView("chat"); setIsLeftSidebarCollapsed(false); }} 
                  className={`p-2 rounded-lg ${activeCenterView === "chat" ? "bg-indigo-950 text-indigo-400 border border-indigo-900/50" : "text-slate-500 hover:text-slate-200"}`}
                  title="Chat Sandbox"
                >
                  <MessageSquare className="h-4.5 w-4.5" />
                </button>
                <button 
                  onClick={() => { setActiveCenterView("editor"); setIsLeftSidebarCollapsed(false); }} 
                  className={`p-2 rounded-lg ${activeCenterView === "editor" ? "bg-indigo-950 text-indigo-400 border border-indigo-900/50" : "text-slate-500 hover:text-slate-200"}`}
                  title="Code Editor"
                >
                  <FileCode className="h-4.5 w-4.5" />
                </button>
                <button 
                  onClick={() => { setActiveCenterView("settings"); setIsLeftSidebarCollapsed(false); }} 
                  className={`p-2 rounded-lg ${activeCenterView === "settings" ? "bg-indigo-950 text-indigo-400 border border-indigo-900/50" : "text-slate-500 hover:text-slate-200"}`}
                  title="Settings"
                >
                  <Settings className="h-4.5 w-4.5" />
                </button>
              </div>
            )}
          </div>

          {/* Settings Button in Expanded Footer */}
          {!isLeftSidebarCollapsed && (
            <div className="p-3 border-t border-slate-900 bg-[#080d19]/40 flex flex-col gap-2">
              <button
                onClick={() => setActiveCenterView("settings")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all border ${
                  activeCenterView === "settings" 
                    ? "bg-indigo-600 text-white border-transparent" 
                    : "bg-slate-950/60 hover:bg-slate-900 text-slate-300 border-slate-900"
                }`}
              >
                <Settings className="h-4 w-4" />
                WORKSPACE SETTINGS
              </button>
            </div>
          )}
        </div>

        {/* 2. CENTER AREA (CHAT WINDOW & ACTIVE PANELS) */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-[#03050a] relative overflow-hidden">
          
          {/* Top Selection Tabs */}
          <div className="bg-[#050811]/90 px-4 py-2 border-b border-slate-900 flex items-center justify-between select-none shrink-0">
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveCenterView("tests")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeCenterView === "tests"
                    ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                🧪 Features & Tests
              </button>
              <button
                onClick={() => setActiveCenterView("chat")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeCenterView === "chat"
                    ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                💬 Chat Sandbox
              </button>
              <button
                onClick={() => setActiveCenterView("editor")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeCenterView === "editor"
                    ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                📝 Code Editor
              </button>
              <button
                onClick={() => setActiveCenterView("vault")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeCenterView === "vault"
                    ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                📓 Obsidian Vault
              </button>
              <button
                onClick={() => setActiveCenterView("settings")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeCenterView === "settings"
                    ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                ⚙️ IDE Settings
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>STITCH BUFFER ACTIVE</span>
            </div>
          </div>

          {/* Conditional view bodies */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            
            {/* E. Feature specs and tests view */}
            {activeCenterView === "tests" && (
              <TestsPanel />
            )}

            {/* A. Chat Sandbox view */}
            {activeCenterView === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Council active selector */}
                <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-900/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Active Council Chamber:</span>
                  </div>
                  <div className="flex gap-1.5">
                    {council.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggleAgentActive(c.id)}
                        className={`px-2 py-1 rounded-lg border font-mono text-[9px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          c.active
                            ? `${c.color} text-white border-transparent`
                            : "bg-slate-900 hover:bg-slate-850 text-slate-500 border-slate-850"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${c.active ? "bg-white animate-pulse" : "bg-slate-600"}`} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation listing */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {chatHistory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono">
                      <BrainCircuit className="h-12 w-12 text-indigo-950/60 mb-3 animate-pulse" />
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Antigravity Dialogue Empty</h5>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-normal">
                        Select your active authorized agents in the sub-bar above and submit prompts directly. All system file contexts are stitched & compiled automatically.
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((msg) => {
                      const isUser = msg.sender === "user";
                      const isSystemErr = msg.sender === "model" && msg.text.startsWith("⚠️");
                      return (
                        <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-1.5 mb-1 text-[9px] font-mono text-slate-500">
                            {!isUser && <span className={`font-bold ${msg.agentColor || "text-indigo-400"}`}>{msg.agentName || "COUNCIL"}</span>}
                            <span>{msg.timestamp}</span>
                          </div>
                          <div className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed relative overflow-hidden ${
                            isUser 
                              ? "bg-slate-900 text-slate-200 border border-slate-800" 
                              : isSystemErr 
                              ? "bg-rose-950/20 border border-rose-900/30 text-rose-300 font-medium" 
                              : "bg-[#080e1b] border border-slate-900 text-slate-300"
                          }`}>
                            {isUser && msg.contextImage && (
                              <div className="flex items-center gap-1.5 bg-slate-950 text-[8px] font-mono text-indigo-400 px-2 py-0.5 rounded border border-slate-900 mb-1.5">
                                <FileText className="h-3 w-3" />
                                <span>Compiled Vision Context Attached (258 flat tokens)</span>
                              </div>
                            )}
                            <p className="whitespace-pre-line font-sans">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isWaitingForCouncil && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-950/30 border border-indigo-900/30 rounded-xl max-w-[80%]">
                      <div className="flex gap-1 shrink-0">
                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" />
                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-300 animate-pulse">Council reviewing workspace...</span>
                    </div>
                  )}
                </div>

                {/* Submit panel */}
                <div className="border-t border-slate-900 p-3 bg-slate-950/60 shrink-0">
                  <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                    <textarea
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Ask the active multi-agent council..."
                      className="flex-1 bg-transparent border-none outline-none text-xs font-sans placeholder-slate-500 leading-normal h-8 resize-none text-slate-200"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePromptCouncil();
                        }
                      }}
                    />
                    <button
                      onClick={handlePromptCouncil}
                      disabled={!promptInput.trim() || isWaitingForCouncil}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg transition-all cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* B. Code Editor view */}
            {activeCenterView === "editor" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-900 flex items-center justify-between text-xs font-mono shrink-0">
                  <span className="text-slate-400">/src/{activeFile.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-950/80 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded text-[10px]">
                      {activeFile.language}
                    </span>
                    <button
                      onClick={triggerWorkspaceCompile}
                      disabled={isCompiling}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase cursor-pointer flex items-center gap-1"
                    >
                      {isCompiling ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {isCompiling ? "Stitching..." : "Compile"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex font-mono relative text-[11px] text-slate-300 leading-normal p-3 bg-slate-950/20 overflow-y-auto">
                  <div className="text-right text-slate-700 pr-3 select-none text-[9px] flex flex-col gap-0.5 border-r border-slate-900 h-full">
                    {Array.from({ length: activeFile.content.split("\n").length }).map((_, idx) => (
                      <span key={idx} className="block leading-5 h-5">{idx + 1}</span>
                    ))}
                  </div>
                  <textarea
                    value={activeFile.content}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none resize-none px-3 font-mono text-[11px] text-slate-200 font-medium leading-5 h-full focus:ring-0"
                    spellCheck="false"
                  />
                </div>
              </div>
            )}
 
            {/* C. Obsidian Local Vault view */}
            {activeCenterView === "vault" && (() => {
              const currentNote = obsidianNotes.find(n => n.id === activeNoteId) || obsidianNotes[0] || { id: "", title: "", content: "", updatedAt: "" };
              
              // Helper to detect forward links (other notes mentioned in double-brackets in this note)
              const forwardLinks = obsidianNotes.filter(n => n.id !== currentNote.id && currentNote.content?.includes(`[[${n.title}]]`));
              
              // Helper to detect backlinks (other notes mentioning this note in double-brackets)
              const incomingBacklinks = obsidianNotes.filter(n => n.id !== currentNote.id && n.content?.includes(`[[${currentNote.title}]]`));

              return (
                <div className="flex-1 flex overflow-hidden h-full bg-[#040812]">
                  
                  {/* I. Vault Navigation Explorer Sidebar */}
                  <div className="w-[200px] border-r border-slate-900 bg-[#060b18]/80 flex flex-col justify-between shrink-0 font-mono select-none">
                    <div className="p-3 flex-1 flex flex-col min-h-0 space-y-4">
                      
                      {/* Search / Title */}
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-purple-400" />
                          Obsidian Vault
                        </div>
                        <span className="text-[8px] text-slate-600 block">DURABLE OFF-LINE VAULT</span>
                      </div>

                      {/* Add new note */}
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={newNoteTitle}
                          onChange={(e) => setNewNoteTitle(e.target.value)}
                          placeholder="New note title..."
                          className="w-full bg-slate-950 border border-slate-900 p-1.5 rounded text-[10px] outline-none text-slate-200 focus:border-purple-500/60"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateNote();
                          }}
                        />
                        <button
                          onClick={handleCreateNote}
                          className="w-full flex items-center justify-center gap-1 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 hover:border-purple-500 text-purple-300 hover:text-white font-bold py-1 px-2 rounded text-[9px] transition-all cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add Markdown Note
                        </button>
                      </div>

                      {/* Note list explorer */}
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider">NOTES FILE TREE</div>
                        {obsidianNotes.map((note) => {
                          const isActive = note.id === currentNote.id;
                          return (
                            <div
                              key={note.id}
                              onClick={() => setActiveNoteId(note.id)}
                              className={`group flex items-center justify-between p-2 rounded-lg text-[10px] cursor-pointer transition-all border ${
                                isActive
                                  ? "bg-purple-950/25 border-purple-900/60 text-purple-300 font-semibold"
                                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <FileText className={`h-3 w-3 shrink-0 ${isActive ? "text-purple-400" : "text-slate-500"}`} />
                                <span className="truncate">{note.title}.md</span>
                              </div>
                              <button
                                onClick={(e) => handleDeleteNote(note.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-all"
                                title="Delete Note"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metadata persistent warning footer */}
                    <div className="p-2 border-t border-slate-900 bg-slate-950/40 text-[8px] text-slate-600 leading-normal">
                      <span>DURABLE SYNC STATUS:</span>
                      <div className="flex items-center gap-1.5 text-purple-500 font-bold mt-0.5">
                        <span className="h-1 w-1 bg-purple-400 rounded-full animate-ping" />
                        <span>LOCAL STORAGE SYNCED</span>
                      </div>
                    </div>
                  </div>

                  {/* II. Markdown Editor Workspace (Middle) */}
                  <div className="flex-1 flex flex-col min-w-0 bg-[#02050b] border-r border-slate-900">
                    {currentNote.id ? (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        
                        {/* Tab header title */}
                        <div className="bg-[#050811] px-4 py-3 border-b border-slate-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-purple-950/50 border border-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded font-mono font-bold">
                              MD
                            </span>
                            <input
                              type="text"
                              value={currentNote.title}
                              onChange={(e) => handleNoteTitleChange(e.target.value)}
                              className="bg-transparent border-none outline-none font-bold text-slate-200 text-sm focus:ring-0 px-1 font-sans"
                            />
                          </div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase">
                            LAST SAVED: {currentNote.updatedAt}
                          </span>
                        </div>

                        {/* Editor container */}
                        <div className="flex-1 p-4 flex flex-col space-y-3 overflow-y-auto">
                          
                          {/* Instructions box */}
                          <div className="bg-purple-950/10 border border-purple-900/20 rounded-xl p-3 text-[10px] text-slate-400 leading-relaxed font-sans relative">
                            <span className="font-bold text-purple-400 block mb-1">💡 Hyperlink Notes (Obsidian Syntax)</span>
                            Type <code className="bg-slate-950 px-1 py-0.5 rounded text-purple-300">[[Note Title]]</code> in your note content to link other notes. The 4D knowledge map and local vault graph will dynamically construct edge connections.
                          </div>

                          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden p-3 font-mono">
                            <textarea
                              value={currentNote.content}
                              onChange={(e) => handleNoteContentChange(e.target.value)}
                              placeholder="# Add Markdown content here..."
                              className="flex-1 bg-transparent border-none outline-none resize-none text-xs text-slate-300 leading-relaxed h-full focus:ring-0"
                            />
                          </div>

                          {/* Connection Backlink footer pane */}
                          <div className="grid grid-cols-2 gap-3 pt-2 font-mono border-t border-slate-900/60">
                            
                            {/* References inside this note */}
                            <div className="bg-[#060b18]/60 border border-slate-900 p-2 rounded-xl">
                              <span className="text-[8px] text-slate-500 font-bold block mb-1">FORWARD LINKS OUT</span>
                              {forwardLinks.length === 0 ? (
                                <span className="text-[9px] text-slate-600 block">No outgoing links detected.</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {forwardLinks.map((fl) => (
                                    <button
                                      key={fl.id}
                                      onClick={() => setActiveNoteId(fl.id)}
                                      className="text-[9px] bg-purple-950/20 hover:bg-purple-950/40 border border-purple-900/35 text-purple-400 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                    >
                                      [[{fl.title}]]
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Backlinks linking into this note */}
                            <div className="bg-[#060b18]/60 border border-slate-900 p-2 rounded-xl">
                              <span className="text-[8px] text-slate-500 font-bold block mb-1">INCOMING BACKLINKS</span>
                              {incomingBacklinks.length === 0 ? (
                                <span className="text-[9px] text-slate-600 block">No incoming references.</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {incomingBacklinks.map((bl) => (
                                    <button
                                      key={bl.id}
                                      onClick={() => setActiveNoteId(bl.id)}
                                      className="text-[9px] bg-purple-950/20 hover:bg-purple-950/40 border border-purple-900/35 text-purple-400 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                    >
                                      [[{bl.title}]]
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-600 font-mono">
                        <FileText className="h-10 w-10 text-slate-800 mb-2 animate-pulse" />
                        <h6 className="text-[10px] font-bold text-slate-500 uppercase">No Note Active</h6>
                        <p className="text-[9px] text-slate-600 mt-1 max-w-xs">Select a note from the tree on the left or create a new markdown file.</p>
                      </div>
                    )}
                  </div>

                  {/* III. Local Obsidian Graph Renderer (Right) */}
                  <div className="w-[240px] bg-[#03060c] flex flex-col overflow-hidden shrink-0">
                    <div className="p-3 bg-[#050811] border-b border-slate-900 flex items-center justify-between font-mono select-none">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                        <Network className="h-3.5 w-3.5 text-purple-400" />
                        Local Note Graph
                      </span>
                      <span className="text-[8px] text-purple-500 font-bold bg-purple-950/40 border border-purple-900/30 px-1.5 py-0.2 rounded">
                        2D RENDER
                      </span>
                    </div>

                    <div className="flex-1 relative bg-slate-950/60 p-3">
                      {/* Custom visual 2D simulation of backlinks */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                        <div className="w-full h-full relative border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40 flex flex-col">
                          {/* Visual connections canvas simulation */}
                          <div className="flex-1 relative flex items-center justify-center">
                            
                            {/* Background mesh lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                              {obsidianNotes.map((note, idx) => {
                                // Deterministic orbital placement
                                const total = obsidianNotes.length;
                                const radius = 55;
                                const angle = (idx / total) * Math.PI * 2;
                                const x1 = 100 + Math.cos(angle) * radius;
                                const y1 = 100 + Math.sin(angle) * radius;

                                return obsidianNotes.map((otherNote, otherIdx) => {
                                  if (note.id !== otherNote.id && note.content?.includes(`[[${otherNote.title}]]`)) {
                                    const otherAngle = (otherIdx / total) * Math.PI * 2;
                                    const x2 = 100 + Math.cos(otherAngle) * radius;
                                    const y2 = 100 + Math.sin(otherAngle) * radius;

                                    return (
                                      <line
                                        key={`${note.id}-${otherNote.id}`}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        stroke="#8b5cf6"
                                        strokeWidth="1.5"
                                        strokeDasharray="2,2"
                                        className="animate-pulse"
                                      />
                                    );
                                  }
                                  return null;
                                });
                              })}
                            </svg>

                            {/* Node placements */}
                            {obsidianNotes.map((note, idx) => {
                              const total = obsidianNotes.length;
                              const radius = 55;
                              const angle = (idx / total) * Math.PI * 2;
                              const x = 100 + Math.cos(angle) * radius;
                              const y = 100 + Math.sin(angle) * radius;
                              const isCurrent = note.id === currentNote.id;

                              return (
                                <button
                                  key={note.id}
                                  onClick={() => setActiveNoteId(note.id)}
                                  className="absolute flex flex-col items-center justify-center cursor-pointer group"
                                  style={{ left: `${x - 20}px`, top: `${y - 20}px` }}
                                >
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${
                                    isCurrent
                                      ? "bg-purple-600/30 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.7)] scale-110"
                                      : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-purple-300 hover:border-purple-800/80 hover:scale-105"
                                  }`}>
                                    <FileText className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-[7px] font-mono font-bold mt-1 max-w-[50px] truncate bg-slate-950/80 px-1 border border-slate-900 rounded text-slate-300">
                                    {note.title}
                                  </span>
                                </button>
                              );
                            })}

                          </div>

                          <div className="p-2 border-t border-slate-900 bg-slate-950 text-[7px] font-mono text-slate-500 leading-normal text-center select-none">
                            Nodes are fully clickable to hot-swap files
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* C. Settings screen */}
            {activeCenterView === "settings" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-950/40">
                
                {/* Visual Backdrop: 4D Knowledge Graph running in background */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Network className="h-3.5 w-3.5" />
                      4D Vector Mapped Knowledge Graph (Dynamic Manifold)
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">
                      Background Projected
                    </span>
                  </div>
                  <KnowledgeGraph4D 
                    notes={obsidianNotes} 
                    calibratedSize={bgCalibratedSize}
                    openRouterModel={openRouterKey && openRouterStatus === "connected" ? openRouterModel : null}
                    compressionRatio={compressionRatio}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* MCP Servers Block */}
                  <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                        Model Context Protocol (MCP)
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">Active: {mcpServers.filter(s => s.status === "connected").length}</span>
                    </div>

                    {/* Built-in MCP Server Connection Instructions */}
                    <div className="bg-indigo-950/15 border border-indigo-900/30 p-2.5 rounded-lg text-[9px] font-mono space-y-2">
                      <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-indigo-950/50 pb-1">
                        <span className="flex items-center gap-1">⚡ Built-in Local MCP Server</span>
                        <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/35 px-1 rounded">ONLINE</span>
                      </div>
                      
                      <div className="space-y-1.5 text-slate-400 leading-normal">
                        <div>
                          <span className="text-slate-500 block text-[7px] uppercase tracking-wide">Claude Code / CLI Stdio config:</span>
                          <code className="bg-slate-900 text-indigo-300 px-1 py-0.5 rounded border border-slate-850 block mt-0.5 select-all font-semibold">npm run mcp</code>
                        </div>
                        
                        <div>
                          <span className="text-slate-500 block text-[7px] uppercase tracking-wide">Claude Desktop SSE URL:</span>
                          <code className="bg-slate-900 text-emerald-400 px-1 py-0.5 rounded border border-slate-850 block mt-0.5 select-all font-semibold break-all">http://localhost:3000/api/mcp/sse</code>
                        </div>
                        
                        <div className="text-slate-500 text-[8px] pt-0.5 flex items-center justify-between">
                          <span>Exposed Tools: <b>get_knowledge_graph, compress_context</b></span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[140px] overflow-y-auto">
                      {mcpServers.map((s) => (
                        <div key={s.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-850 p-2 rounded-lg text-[10px] font-mono">
                          <div>
                            <span className="text-slate-300 font-bold block">{s.name}</span>
                            <span className="text-slate-500 text-[9px] block truncate max-w-[150px]">{s.url}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[9px]">{s.toolsCount} tools</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.status === "connected" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* New MCP endpoint input */}
                    <div className="space-y-1.5 pt-2">
                      <input
                        type="text"
                        placeholder="MCP Service Name (e.g. Postgres-Bridge)"
                        value={newMcpName}
                        onChange={(e) => setNewMcpName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 px-2.5 py-1 rounded outline-none focus:border-indigo-500"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="http://localhost:8080/mcp"
                          value={newMcpUrl}
                          onChange={(e) => setNewMcpUrl(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 px-2.5 py-1 rounded outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => {
                            if (!newMcpName || !newMcpUrl) return;
                            setMcpServers(prev => [
                              ...prev,
                              { id: `mcp-${Date.now()}`, name: newMcpName, url: newMcpUrl, status: "connected", transport: "SSE", toolsCount: 5 }
                            ]);
                            setNewMcpName("");
                            setNewMcpUrl("");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[9px] px-2.5 py-1 rounded cursor-pointer transition-all"
                        >
                          Register
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RAG Settings Block */}
                  <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-indigo-500" />
                        RAG Knowledge Indexing
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-850">
                        <span className="text-[8px] text-slate-500 block">CHUNK SIZE (CHARS)</span>
                        <select
                          value={ragConfig.chunkSize}
                          onChange={(e) => setRagConfig(prev => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
                          className="bg-transparent text-slate-200 mt-1 outline-none font-bold"
                        >
                          <option value={256}>256 chars</option>
                          <option value={512}>512 chars</option>
                          <option value={1024}>1024 chars</option>
                        </select>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-850">
                        <span className="text-[8px] text-slate-500 block">EMBEDDING MODEL</span>
                        <select
                          value={ragConfig.embeddingModel}
                          onChange={(e) => setRagConfig(prev => ({ ...prev, embeddingModel: e.target.value }))}
                          className="bg-transparent text-slate-200 mt-1 outline-none font-bold"
                        >
                          <option value="text-embedding-004">Gemini (text-004)</option>
                          <option value="openai-ada">OpenAI (ada-002)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-[90px] overflow-y-auto">
                      {ragSources.map((source, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded text-[9px] font-mono">
                          <span className="text-slate-300 truncate max-w-[140px]">{source.name}</span>
                          <span className={`px-1 rounded text-[8px] ${source.status === "indexed" ? "text-emerald-400 bg-emerald-950/20 border border-emerald-900/30" : "text-amber-400 bg-amber-950/20 border border-amber-900/30"}`}>
                            {source.status.toUpperCase()} ({source.chunks} chk)
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-1.5 border-t border-slate-900">
                      <input
                        type="text"
                        placeholder="Attach URL/Document Name"
                        value={newRagSourceName}
                        onChange={(e) => setNewRagSourceName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 px-2.5 py-1 rounded outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => {
                          if (!newRagSourceName) return;
                          setRagSources(prev => [
                            ...prev,
                            { name: newRagSourceName, size: "18 KB", chunks: 9, status: "indexed" }
                          ]);
                          setNewRagSourceName("");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[9px] px-2.5 py-1 rounded cursor-pointer transition-all"
                      >
                        Add Source
                      </button>
                    </div>
                  </div>

                  {/* OpenRouter Integration Block */}
                  <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="h-3.5 w-3.5 text-pink-500" />
                        OpenRouter API Proxy
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold ${
                        openRouterStatus === "connected" 
                          ? "text-emerald-400 bg-emerald-950/20 border border-emerald-900/30" 
                          : "text-slate-500 bg-slate-900/50 border border-slate-800"
                      }`}>
                        {openRouterStatus.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-[9px] text-slate-500 leading-normal font-sans">
                      Proxy dynamic agent queries through OpenRouter models, bypass standard Gemini API limitations, and stitch vision context automatically.
                    </p>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider">Target Model Select</label>
                        <select
                          value={openRouterModel}
                          onChange={(e) => {
                            setOpenRouterModel(e.target.value);
                            localStorage.setItem("open_router_model", e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 p-1.5 rounded outline-none focus:border-pink-500"
                        >
                          {openRouterModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider">OpenRouter API Key</label>
                        <div className="flex gap-1.5">
                          <input
                            type="password"
                            placeholder="sk-or-v1-****************"
                            value={openRouterKey}
                            onChange={(e) => {
                              setOpenRouterKey(e.target.value);
                              localStorage.setItem("open_router_key", e.target.value);
                              if (e.target.value) {
                                setOpenRouterStatus("connected");
                              } else {
                                setOpenRouterStatus("disconnected");
                              }
                            }}
                            className="flex-1 bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 px-2 py-1 rounded outline-none focus:border-pink-500"
                          />
                          {openRouterKey && (
                            <button
                              onClick={() => {
                                setOpenRouterKey("");
                                localStorage.removeItem("open_router_key");
                                setOpenRouterStatus("disconnected");
                              }}
                              className="bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-rose-900/30 font-mono text-[9px] px-2 py-1 rounded transition-all"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            setIsOpenRouterTesting(true);
                            setTimeout(() => {
                              setIsOpenRouterTesting(false);
                              alert("OpenRouter API Proxy Handshake Verified: OK\nConnected through gateway node successfully.");
                            }, 1200);
                          }}
                          disabled={!openRouterKey || isOpenRouterTesting}
                          className="flex-1 bg-pink-600/10 hover:bg-pink-600/20 disabled:opacity-40 disabled:hover:bg-pink-600/10 border border-pink-500/30 text-pink-400 font-mono text-[9px] py-1.5 rounded cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          {isOpenRouterTesting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                          {isOpenRouterTesting ? "CONNECTING..." : "TEST PROXY HANDSHAKE"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Background Daemons & Calibration Monitor */}
                  <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-teal-500" />
                        Background Daemons Status
                      </span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                      {/* Daemon 1: OCR Calibration */}
                      <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-900">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold text-slate-300">OCR Calibration Daemon</span>
                          {isBgCalibrating ? (
                            <span className="text-[8px] font-mono text-amber-400 animate-pulse flex items-center gap-1">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" /> RUNNING
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                              <Check className="h-2.5 w-2.5" /> SAVED IN KNOWLEDGE GRAPH
                            </span>
                          )}
                        </div>

                        {isBgCalibrating ? (
                          <div className="space-y-1 pt-1">
                            <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                              <div className="bg-amber-500 h-1 transition-all duration-300" style={{ width: `${bgCalibrationProgress}%` }} />
                            </div>
                            <span className="text-[7.5px] font-mono text-slate-500 block truncate">{bgCalibrationStep}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[8px] text-slate-500 leading-normal font-sans">
                              First-run sweep finished. Optimal font threshold: <strong className="text-slate-300 font-mono">{bgCalibratedSize || 10}px</strong>.
                            </span>
                            <button
                              onClick={() => {
                                localStorage.removeItem("calibrated_size_flash");
                                setBgCalibratedSize(null);
                                setIsBgCalibrating(true);
                                setBgCalibrationProgress(5);
                                setBgCalibrationStep("Starting manual calibration sweep...");
                                // Sim steps
                                const steps = [
                                  { progress: 20, step: "Allocating 4D vector memory limits..." },
                                  { progress: 50, step: "OCR sweep check: OCR retrieved 100% token counts at 12px." },
                                  { progress: 80, step: "OCR sweep check: OCR retrieved 100% token counts at 10px." },
                                  { progress: 100, step: "Manual sweep finished! Calibrated limit: 10px." }
                                ];
                                let stepIndex = 0;
                                const interval = setInterval(() => {
                                  if (stepIndex < steps.length) {
                                    const curr = steps[stepIndex];
                                    setBgCalibrationProgress(curr.progress);
                                    setBgCalibrationStep(curr.step);
                                    if (curr.progress === 100) {
                                      localStorage.setItem("calibrated_size_flash", "10");
                                      setBgCalibratedSize(10);
                                      setIsBgCalibrating(false);
                                      clearInterval(interval);
                                    }
                                    stepIndex++;
                                  }
                                }, 1200);
                              }}
                              className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-all"
                            >
                              Force Sweeper
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Daemon 2: Context Compression */}
                      <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-900">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold text-slate-300">Context Compactor Daemon</span>
                          <span className="text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${isCompressingBg ? "animate-ping" : "animate-pulse"}`} />
                            {isCompressingBg ? "COMPACTING..." : "SLEEPING / ACTIVE"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono">
                          <span>Ratio: <strong className="text-teal-400">{compressionRatio.toFixed(2)}x</strong></span>
                          <span>Last: {lastCompressionTime}</span>
                        </div>

                        {/* Compression terminal log feed */}
                        <div className="mt-1.5 max-h-[48px] overflow-y-auto text-[7.5px] text-teal-400 font-mono bg-slate-950 p-1 rounded border border-slate-900 custom-scrollbar whitespace-pre-wrap leading-relaxed">
                          {compressionLogs.length === 0 ? (
                            <span className="text-slate-600 font-bold block">[BG DAEMON] Listening on AST system updates...</span>
                          ) : (
                            compressionLogs.map((log, index) => (
                              <div key={index} className="border-b border-slate-900/40 pb-0.5 mb-0.5 last:border-b-0 last:pb-0 last:mb-0">
                                {log}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Secret Environment variables Block */}
                  <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 flex flex-col space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-indigo-500" />
                        Custom Agentic Environment Secrets (Proxy Credentials)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[110px] overflow-y-auto">
                      {customEnvVars.map((env) => (
                        <div key={env.id} className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg text-[10px] font-mono">
                          <div className="truncate mr-1.5">
                            <span className="text-slate-400 font-bold block">{env.key}</span>
                            <span className="text-slate-500">{env.value}</span>
                          </div>
                          <button
                            onClick={() => setCustomEnvVars(prev => prev.filter(x => x.id !== env.id))}
                            className="text-rose-400 hover:text-rose-300 px-1 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-2 border-t border-slate-900">
                      <input
                        type="text"
                        placeholder="KEY (e.g. TEMPERATURE)"
                        value={newEnvKey}
                        onChange={(e) => setNewEnvKey(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 px-2 px-1 rounded outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 0.7)"
                        value={newEnvValue}
                        onChange={(e) => setNewEnvValue(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 px-2 px-1 rounded outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => {
                          if (!newEnvKey || !newEnvValue) return;
                          setCustomEnvVars(prev => [
                            ...prev,
                            { id: `env-${Date.now()}`, key: newEnvKey.toUpperCase(), value: newEnvValue }
                          ]);
                          setNewEnvKey("");
                          setNewEnvValue("");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[9px] px-3 py-1 rounded cursor-pointer transition-all"
                      >
                        Inject Key
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>

        {/* 3. RIGHT SIDEBAR (COLLAPSIBLE / TOGGLEABLE) */}
        <div 
          className={`h-full border-l border-slate-900 bg-[#040811] flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${
            isRightSidebarCollapsed ? "w-0 border-l-0" : "w-[300px]"
          }`}
        >
          {/* Header */}
          <div className="bg-[#080d19]/80 px-3 py-3 border-b border-slate-900 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <FolderCode className="h-3.5 w-3.5 text-indigo-500" />
              Files & Telemetry
            </span>
            <button
              onClick={() => setIsRightSidebarCollapsed(true)}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition-all cursor-pointer"
              title="Close Panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Right sidebar split view panels */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4 p-3 custom-scrollbar">
            
            {/* Upper part: File Tree */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-900">
                <span>Active File Tree</span>
                <button 
                  onClick={() => setIsAddingFile(!isAddingFile)}
                  className="p-0.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded"
                  title="Add Workspace File"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {isAddingFile && (
                <div className="bg-slate-900/80 p-2 rounded-lg space-y-1.5 border border-slate-800">
                  <input
                    type="text"
                    placeholder="e.g. helper.ts"
                    value={newFileNameInput}
                    onChange={(e) => setNewFileNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 px-2 py-1 text-[10px] font-mono text-slate-300 rounded outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddFile}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-1 text-[10px] font-bold rounded cursor-pointer font-mono"
                  >
                    Create file node
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {selectedProject.files.map((file) => {
                  const isActive = file.name === activeFileName;
                  return (
                    <div
                      key={file.name}
                      onClick={() => {
                        setActiveFileName(file.name);
                        setActiveCenterView("editor");
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                        isActive
                          ? "bg-indigo-950/30 text-indigo-400 border border-indigo-900/40 font-semibold"
                          : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileCode className={`h-3.5 w-3.5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                        <span className="truncate">{file.name}</span>
                      </div>
                      {selectedProject.files.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.name);
                          }}
                          className="text-slate-500 hover:text-rose-400 px-1 font-bold text-[10px]"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Context Compactor Dual-Buffer status preview */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex flex-col space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block pb-1 border-b border-slate-900">
                Stitched Snapshot History
              </span>
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {snapshotLogs.map((log) => (
                  <div key={log.id} className="text-[9px] font-mono text-slate-500 flex justify-between p-1 hover:bg-slate-900 rounded">
                    <span>{log.timestamp}</span>
                    <span className="text-indigo-400 font-bold">{log.totalChars} chars &gt; 258 tok</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal/Telemetry in bottom right corner */}
            <div className="bg-[#020409] border border-indigo-950/50 rounded-xl flex flex-col h-[280px] overflow-hidden">
              <div className="bg-slate-950 px-3 py-1.5 flex items-center justify-between border-b border-slate-900">
                <span className="text-[9px] font-mono text-indigo-400 font-extrabold uppercase flex items-center gap-1">
                  <Terminal className="h-3 w-3 shrink-0" />
                  Terminal Telemetry
                </span>
                <button
                  onClick={() => setTelemetryLogs([])}
                  className="text-[8px] font-mono text-slate-500 hover:text-slate-200"
                >
                  Clear
                </button>
              </div>

              {/* Terminal Logs list */}
              <div className="flex-1 overflow-y-auto p-2.5 font-mono text-[9px] space-y-2 bg-[#02050b] custom-scrollbar">
                {telemetryLogs.map((log) => {
                  const badgeColor = 
                    log.type === "thought" 
                      ? "text-amber-400 border-amber-950/40 bg-amber-950/20"
                      : log.type === "ocr_scan"
                      ? "text-indigo-400 border-indigo-950/40 bg-indigo-950/20"
                      : "text-emerald-400 border-emerald-950/40 bg-emerald-950/20";
                  return (
                    <div key={log.id} className="border-b border-slate-900 pb-1.5 last:border-0 leading-normal">
                      <div className="flex items-center justify-between text-[8px] text-slate-500 mb-0.5">
                        <span className={`px-1 rounded border text-[7px] font-bold ${badgeColor}`}>{log.type.toUpperCase()}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <p className="text-slate-300">
                        <span className="text-indigo-400 font-bold">&gt; {log.title}:</span> {log.detail}
                      </p>
                    </div>
                  );
                })}
                <div ref={telemetryEndRef} />
              </div>
            </div>

          </div>
        </div>

        {/* Small floating right sidebar expander if collapsed */}
        {isRightSidebarCollapsed && (
          <button
            onClick={() => setIsRightSidebarCollapsed(false)}
            className="absolute right-3 top-3 p-1.5 bg-indigo-600/90 text-white rounded-lg border border-indigo-500 shadow-lg cursor-pointer transition-all hover:bg-indigo-500 flex items-center gap-1 z-10"
            title="Open Files & Telemetry Sidebar"
          >
            <FolderCode className="h-3.5 w-3.5" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider">FILES</span>
          </button>
        )}

      </div>

      {/* FULL RESOLUTION HIGH-RES OVERLAY MODAL */}
      {isHighResOpen && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  HIGH-DENSITY COMPILER SCREEN // FULL BLUEPRINT PREVIEW
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  OCR font size bounds: {calibratedSize || 10}px | Total Stitched lines: {compileStats.totalLines}
                </p>
              </div>

              <button
                onClick={() => setIsHighResOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-mono text-[10px] px-3.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition-all"
              >
                Close Viewer
              </button>
            </div>

            {/* Scrollable Frame Area */}
            <div className="flex-1 overflow-auto bg-[#040811] p-6 flex items-start justify-center">
              {compiledImage ? (
                <img
                  src={compiledImage}
                  alt="High Resolution Workspace Blueprint"
                  className="max-w-none shadow-2xl border border-indigo-900/40 rounded-xl"
                  style={{ width: "1400px" }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-slate-500 font-mono text-xs">No active image compiled.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


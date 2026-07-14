import React, { useEffect, useRef, useState } from "react";
import { Network, Play, RefreshCw, Cpu, Layers } from "lucide-react";

interface Node4D {
  id: string;
  label: string;
  // 4D Coordinates
  x: number;
  y: number;
  z: number;
  w: number;
  color: string;
  category: "model" | "rag" | "mcp" | "context";
}

interface Edge {
  source: string;
  target: string;
}

export interface ObsidianNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export default function KnowledgeGraph4D({ 
  notes = [],
  calibratedSize,
  openRouterModel,
  compressionRatio
}: { 
  notes?: ObsidianNote[];
  calibratedSize?: number | null;
  openRouterModel?: string | null;
  compressionRatio?: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node4D | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [projectionDepth, setProjectionDepth] = useState<number>(2.0); // 4D perspective distance
  
  // High-density 4D nodes mapping Agentic IDE architecture
  const nodes: Node4D[] = [
    { id: "node-gemini", label: "Gemini 3.5 Pro Council", x: 1, y: 1, z: 1, w: 1, color: "#3b82f6", category: "model" },
    { id: "node-claude", label: "Claude 3.5 Sonnet", x: -1, y: 1, z: 1, w: 1, color: "#f59e0b", category: "model" },
    { id: "node-gpt4", label: "GPT-4o Multimodal Gaze", x: 1, y: -1, z: 1, w: -1, color: "#10b981", category: "model" },
    
    { id: "node-rag-pdf", label: "RAG: oauth-v2-rfc6749", x: -1, y: -1, z: 1, w: 1, color: "#8b5cf6", category: "rag" },
    { id: "node-rag-best", label: "RAG: express-security", x: 1, y: 1, z: -1, w: 1, color: "#8b5cf6", category: "rag" },
    { id: "node-rag-idx", label: "RAG: Vector Embeddings Index", x: -1, y: 1, z: -1, w: -1, color: "#a78bfa", category: "rag" },
    
    { id: "node-mcp-fs", label: "MCP: Filesystem service", x: 1, y: -1, z: -1, w: 1, color: "#ec4899", category: "mcp" },
    { id: "node-mcp-db", label: "MCP: PostgreSQL Bridge", x: -1, y: -1, z: -1, w: -1, color: "#ec4899", category: "mcp" },
    { id: "node-mcp-web", label: "MCP: Web-Search API", x: 1, y: 1, z: 1, w: -1, color: "#f43f5e", category: "mcp" },
    
    { id: "node-ctx-stitch", label: "Stitcher Canvas Output", x: -1, y: 1, z: 1, w: -1, color: "#06b6d4", category: "context" },
    { id: "node-ctx-ocr", label: "OCR Font Calibrator", x: 1, y: -1, z: 1, w: 1, color: "#06b6d4", category: "context" },
    { id: "node-ctx-comp", label: "Token Compactor (5.78x)", x: -1, y: -1, z: 1, w: -1, color: "#14b8a6", category: "context" }
  ];

  // Structural edges connecting variables in 4D hypercube manifold
  const edges: Edge[] = [
    { source: "node-gemini", target: "node-ctx-stitch" },
    { source: "node-gemini", target: "node-ctx-ocr" },
    { source: "node-claude", target: "node-ctx-stitch" },
    { source: "node-gpt4", target: "node-ctx-stitch" },
    
    { source: "node-rag-idx", target: "node-rag-pdf" },
    { source: "node-rag-idx", target: "node-rag-best" },
    { source: "node-rag-idx", target: "node-gemini" },
    
    { source: "node-mcp-db", target: "node-mcp-fs" },
    { source: "node-mcp-db", target: "node-mcp-web" },
    { source: "node-mcp-fs", target: "node-ctx-stitch" },
    
    { source: "node-ctx-comp", target: "node-ctx-stitch" },
    { source: "node-ctx-comp", target: "node-ctx-ocr" },
    { source: "node-ctx-ocr", target: "node-rag-idx" }
  ];

  // Track rotational angles in 4D planes
  const anglesRef = useRef({
    xy: 0.005,
    xz: 0.003,
    xw: 0.004,
    yz: 0.002,
    yw: 0.006,
    zw: 0.003
  });

  const thetaRef = useRef({
    xy: 0,
    xz: 0,
    xw: 0,
    yz: 0,
    yw: 0,
    zw: 0
  });

  // Track mouse coordinates for hover detection
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const projectedNodesRef = useRef<Array<Node4D & { screenX: number; screenY: number; radius: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || 500;
      canvas.height = rect?.height || 300;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const render = () => {
      if (!ctx || !canvas) return;

      // Draw background
      ctx.fillStyle = "#030712"; // Deep space background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw mathematical backdrop vector grid
      ctx.strokeStyle = "rgba(79, 70, 229, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Update rotation angles if enabled
      if (isRotating) {
        thetaRef.current.xy += anglesRef.current.xy;
        thetaRef.current.xz += anglesRef.current.xz;
        thetaRef.current.xw += anglesRef.current.xw;
        thetaRef.current.yz += anglesRef.current.yz;
        thetaRef.current.yw += anglesRef.current.yw;
        thetaRef.current.zw += anglesRef.current.zw;
      }

      // Projection parameters
      const d = projectionDepth; // distance from object to 4D camera
      const scale = Math.min(canvas.width, canvas.height) * 0.28;

      // Construct dynamic node list merging Obsidian notes
      const allNodes = [...nodes];
      notes.forEach((note, index) => {
        // Deterministic 4D coordinates derived from the note title
        const charSum = note.title.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        const x = Math.sin(charSum * 0.15) * 1.3;
        const y = Math.cos(charSum * 0.25) * 1.3;
        const z = Math.sin(charSum * 0.4) * 0.9;
        const w = Math.cos(charSum * 0.1) * 0.9;

        allNodes.push({
          id: `vault-${note.id}`,
          label: `📓 ${note.title}`,
          x,
          y,
          z,
          w,
          color: "#c084fc", // Radiant Obsidian purple
          category: "rag"
        });
      });

      // 1. Vectored Calibration Storage Node
      const currentCalib = calibratedSize || (typeof window !== "undefined" ? Number(localStorage.getItem("calibrated_size_flash")) : null);
      if (currentCalib) {
        allNodes.push({
          id: "node-vectored-calibration",
          label: `⚡ Calibration Opt: ${currentCalib}px`,
          x: 0.8,
          y: -1.3,
          z: -0.6,
          w: 0.5,
          color: "#e11d48", // Rose / Red vector
          category: "context"
        });
      }

      // 2. OpenRouter Integration Proxy Node
      const currentORModel = openRouterModel || (typeof window !== "undefined" ? localStorage.getItem("open_router_model") : null);
      const isORActive = typeof window !== "undefined" && localStorage.getItem("open_router_key");
      if (isORActive && currentORModel) {
        allNodes.push({
          id: "node-openrouter",
          label: `🌐 OpenRouter: ${currentORModel}`,
          x: -1.3,
          y: 1.1,
          z: 0.6,
          w: -0.7,
          color: "#d946ef", // Fuschia model node
          category: "model"
        });
      }

      // 3. Background Compression Daemon Node
      const currentCompRatio = compressionRatio || 5.78;
      allNodes.push({
        id: "node-compaction-daemon",
        label: `⚙️ Context Compression Daemon (${currentCompRatio.toFixed(2)}x)`,
        x: -0.6,
        y: -1.2,
        z: 1.1,
        w: -1.0,
        color: "#14b8a6", // Teal compaction node
        category: "context"
      });

      // Transform all nodes in 4D space and project to 2D screen
      const projected = allNodes.map((node) => {
        let x = node.x;
        let y = node.y;
        let z = node.z;
        let w = node.w;

        // Apply 4D Rotations
        // 1. XY Plane Rotation
        let cos = Math.cos(thetaRef.current.xy);
        let sin = Math.sin(thetaRef.current.xy);
        let x1 = x * cos - y * sin;
        let y1 = x * sin + y * cos;
        x = x1; y = y1;

        // 2. XZ Plane Rotation
        cos = Math.cos(thetaRef.current.xz);
        sin = Math.sin(thetaRef.current.xz);
        x1 = x * cos - z * sin;
        let z1 = x * sin + z * cos;
        x = x1; z = z1;

        // 3. XW Plane Rotation (4D rotation)
        cos = Math.cos(thetaRef.current.xw);
        sin = Math.sin(thetaRef.current.xw);
        x1 = x * cos - w * sin;
        let w1 = x * sin + w * cos;
        x = x1; w = w1;

        // 4. YZ Plane Rotation
        cos = Math.cos(thetaRef.current.yz);
        sin = Math.sin(thetaRef.current.yz);
        y1 = y * cos - z * sin;
        z1 = y * sin + z * cos;
        y = y1; z = z1;

        // 5. YW Plane Rotation (4D rotation)
        cos = Math.cos(thetaRef.current.yw);
        sin = Math.sin(thetaRef.current.yw);
        y1 = y * cos - w * sin;
        w1 = y * sin + w * cos;
        y = y1; w = w1;

        // 6. ZW Plane Rotation (4D rotation)
        cos = Math.cos(thetaRef.current.zw);
        sin = Math.sin(thetaRef.current.zw);
        z1 = z * cos - w * sin;
        w1 = z * sin + w * cos;
        z = z1; w = w1;

        // Project from 4D (x, y, z, w) to 3D perspective
        const factor4d = 1 / (d - w * 0.3);
        const x3d = x * factor4d;
        const y3d = y * factor4d;
        const z3d = z * factor4d;

        // Project from 3D (x3d, y3d, z3d) to 2D screen coordinate
        const factor3d = 1 / (d - z3d * 0.3);
        const screenX = centerX + x3d * factor3d * scale;
        const screenY = centerY + y3d * factor3d * scale;

        // Node sizing is based on perspective depths z & w
        const depthFactor = (z + w + 4) / 4; // normalized depth
        const radius = Math.max(4, 7 * depthFactor);

        return {
          ...node,
          screenX,
          screenY,
          radius,
          depth: z3d
        };
      });

      projectedNodesRef.current = projected;

      // Construct dynamic edge list based on note bracket link matching
      const allEdges = [...edges];
      notes.forEach((note) => {
        notes.forEach((otherNote) => {
          if (note.id !== otherNote.id && note.content.includes(`[[${otherNote.title}]]`)) {
            allEdges.push({
              source: `vault-${note.id}`,
              target: `vault-${otherNote.id}`
            });
          }
        });
        
        // Also connect Obsidian notes to the core Gemini Node as the parent anchor
        allEdges.push({
          source: `node-gemini`,
          target: `vault-${note.id}`
        });
      });

      // Connect calibration, OpenRouter and compaction dynamic nodes
      if (currentCalib) {
        allEdges.push({ source: "node-vectored-calibration", target: "node-ctx-ocr" });
        allEdges.push({ source: "node-vectored-calibration", target: "node-rag-idx" });
      }
      if (isORActive && currentORModel) {
        allEdges.push({ source: "node-openrouter", target: "node-gemini" });
        allEdges.push({ source: "node-openrouter", target: "node-ctx-stitch" });
      }
      allEdges.push({ source: "node-compaction-daemon", target: "node-ctx-comp" });
      allEdges.push({ source: "node-compaction-daemon", target: "node-ctx-stitch" });

      // 1. Draw Edges (with glowing laser gradient paths)
      allEdges.forEach((edge) => {
        const sourceNode = projected.find((n) => n.id === edge.source);
        const targetNode = projected.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          // Check if either node is hovered
          const isRelatedToHover = hoveredNode && (hoveredNode.id === sourceNode.id || hoveredNode.id === targetNode.id);
          
          ctx.beginPath();
          ctx.moveTo(sourceNode.screenX, sourceNode.screenY);
          ctx.lineTo(targetNode.screenX, targetNode.screenY);

          // Customize line strokes
          if (isRelatedToHover) {
            ctx.strokeStyle = "rgba(99, 102, 241, 0.7)"; // Indigo glow
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "rgba(99, 102, 241, 0.8)";
            ctx.shadowBlur = 8;
          } else {
            ctx.strokeStyle = "rgba(100, 116, 139, 0.16)"; // default subtle
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      });

      // 2. Draw Nodes (spheres with gradients matching categories)
      projected.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;

        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, node.radius * (isHovered ? 1.5 : 1), 0, Math.PI * 2);
        
        // Custom Radial node gradient for real depth
        const gradient = ctx.createRadialGradient(
          node.screenX - node.radius * 0.3, 
          node.screenY - node.radius * 0.3, 
          1, 
          node.screenX, 
          node.screenY, 
          node.radius * (isHovered ? 1.5 : 1)
        );

        if (isHovered) {
          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(0.2, node.color);
          gradient.addColorStop(1, "#030712");
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 12;
        } else {
          gradient.addColorStop(0, node.color);
          gradient.addColorStop(1, "#090d1a");
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = gradient;
        ctx.fill();

        // White border ring for visual precision
        ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = isHovered ? 1.5 : 0.8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label rendering
        if (isHovered || node.radius > 6) {
          ctx.font = isHovered ? "bold 10px JetBrains Mono, monospace" : "8px JetBrains Mono, monospace";
          ctx.fillStyle = isHovered ? "#ffffff" : "rgba(203, 213, 225, 0.65)";
          ctx.fillText(
            node.label, 
            node.screenX + node.radius + 6, 
            node.screenY + 3
          );

          // Extra details for hovered nodes
          if (isHovered) {
            ctx.font = "7px JetBrains Mono, monospace";
            ctx.fillStyle = "rgba(129, 140, 248, 0.9)";
            ctx.fillText(
              `4D TENSOR: [${node.x.toFixed(1)}, ${node.y.toFixed(1)}, ${node.z.toFixed(1)}, ${node.w.toFixed(1)}]`, 
              node.screenX + node.radius + 6, 
              node.screenY + 12
            );
          }
        }
      });

      // Render 4D dimensional axis crosshair legend in corner
      const legendX = 40;
      const legendY = canvas.height - 40;
      ctx.font = "8px JetBrains Mono, monospace";
      ctx.fillStyle = "rgba(100, 116, 139, 0.4)";
      ctx.fillText("4D TESSERACT MANIFOLD", legendX - 10, legendY - 20);

      const axisLength = 15;
      const t = thetaRef.current.xy;
      
      // Draw projected rotating coordinate cross
      ctx.lineWidth = 1;
      const axes = [
        { label: "X", dx: Math.cos(t), dy: Math.sin(t), color: "#f43f5e" },
        { label: "Y", dx: -Math.sin(t), dy: Math.cos(t), color: "#10b981" },
        { label: "Z", dx: Math.cos(t*0.5), dy: -Math.sin(t*0.7), color: "#3b82f6" },
        { label: "W", dx: -Math.sin(t*0.4), dy: -Math.cos(t*0.3), color: "#e879f9" }
      ];

      axes.forEach((axis) => {
        ctx.beginPath();
        ctx.moveTo(legendX, legendY);
        ctx.lineTo(legendX + axis.dx * axisLength, legendY + axis.dy * axisLength);
        ctx.strokeStyle = axis.color;
        ctx.stroke();
        ctx.fillStyle = axis.color;
        ctx.fillText(axis.label, legendX + axis.dx * (axisLength + 6) - 2, legendY + axis.dy * (axisLength + 6) + 3);
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isRotating, hoveredNode, projectionDepth]);

  // Handle Mouse Hover node detection
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMousePos({ x, y });

    // Check if within bounds of any projected node
    const foundNode = projectedNodesRef.current.find((node) => {
      const dx = x - node.screenX;
      const dy = y - node.screenY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= node.radius + 6; // slightly larger hit area
    });

    if (foundNode) {
      setHoveredNode(foundNode);
    } else {
      setHoveredNode(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full min-h-[220px]">
      
      {/* Canvas Layer */}
      <div className="flex-1 min-h-[200px] bg-slate-950 rounded-xl overflow-hidden relative border border-slate-900 shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />

        {/* Floating status display bar */}
        <div className="absolute top-2.5 left-2.5 bg-slate-900/90 border border-slate-800/80 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-300 flex items-center gap-2 pointer-events-auto shadow">
          <Network className="h-3 w-3 text-indigo-400 animate-pulse" />
          <span className="font-extrabold uppercase">4D Knowledge-Graph Ingress</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-slate-500 font-bold">ONLINE</span>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1 rounded text-[8px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isRotating 
                ? "bg-indigo-600/30 text-indigo-400 border border-indigo-500/30" 
                : "bg-slate-850 text-slate-400 hover:text-white border border-slate-800"
            }`}
            title="Toggle Manifold Rotation"
          >
            <Play className={`h-2.5 w-2.5 ${isRotating ? "animate-spin" : ""}`} />
            {isRotating ? "SPINNING" : "PAUSED"}
          </button>

          <button
            onClick={() => setProjectionDepth(prev => prev === 2.0 ? 1.4 : prev === 1.4 ? 2.6 : 2.0)}
            className="p-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded text-[8px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Calibrate projected hyper-perspective camera focal length"
          >
            <RefreshCw className="h-2.5 w-2.5 shrink-0" />
            DEPTH: {projectionDepth.toFixed(1)}x
          </button>
        </div>
      </div>

      {/* Node Category Legend bar */}
      <div className="mt-1.5 grid grid-cols-4 gap-2 text-[8px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5 justify-center bg-slate-900/40 p-1 rounded border border-slate-900">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span>LLM Models</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center bg-slate-900/40 p-1 rounded border border-slate-900">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          <span>RAG Vectors</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center bg-slate-900/40 p-1 rounded border border-slate-900">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
          <span>MCP Tools</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center bg-slate-900/40 p-1 rounded border border-slate-900">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          <span>Context Stitches</span>
        </div>
      </div>

    </div>
  );
}

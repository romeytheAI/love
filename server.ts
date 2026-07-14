import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { renderWorkspaceToSvgDataUrl } from "./src/utils/svgRenderer";

dotenv.config();

// --- MCP & Knowledge Graph State ---
let serverSideObsidianNotes: any[] = [
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

const pendingRenders = new Map<string, { files: any[]; theme: string; resolve: (dataUrl: string) => void }>();
const activeMcpRenders: any[] = [];

// --- Central MCP Request Handler (JSON-RPC 2.0) ---
async function handleMcpRequest(request: any, sendResponse: (res: any) => void) {
  const { jsonrpc, id, method, params } = request;
  if (jsonrpc !== "2.0") return;

  switch (method) {
    case "initialize": {
      sendResponse({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: "antigravity-mcp",
            version: "1.0.0"
          }
        }
      });
      break;
    }

    case "tools/list": {
      sendResponse({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "compress_context",
              description: "Compress raw text files or source files into a highly dense visual blueprint SVG/PNG image, reducing thousands of text tokens down to a single visual token block (258 flat tokens) for Gemini or Claude vision models.",
              inputSchema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "File path/name (e.g. server.ts)" },
                        content: { type: "string", description: "Raw content of the file." }
                      },
                      required: ["name", "content"]
                    },
                    description: "Array of files to stitch and render as a blueprint image."
                  },
                  theme: {
                    type: "string",
                    enum: ["dark", "light"],
                    default: "dark",
                    description: "Color theme for the rendered blueprint image."
                  }
                },
                required: ["files"]
              }
            },
            {
              name: "get_knowledge_graph",
              description: "Retrieve the complete multi-dimensional knowledge graph of the workspace, including static architectural nodes, dynamic obsidian notes, and all wiki-link edges.",
              inputSchema: {
                type: "object",
                properties: {}
              }
            }
          ]
        }
      });
      break;
    }

    case "tools/call": {
      const { name, arguments: args } = params || {};
      if (name === "get_knowledge_graph") {
        const staticNodes = [
          { id: "node-gemini", label: "Gemini 3.5 Pro Council", category: "model" },
          { id: "node-claude", label: "Claude 3.5 Sonnet", category: "model" },
          { id: "node-gpt4", label: "GPT-4o Multimodal Gaze", category: "model" },
          { id: "node-rag-pdf", label: "RAG: oauth-v2-rfc6749", category: "rag" },
          { id: "node-rag-best", label: "RAG: express-security", category: "rag" },
          { id: "node-mcp-fs", label: "MCP: Filesystem service", category: "mcp" },
          { id: "node-mcp-db", label: "MCP: PostgreSQL Bridge", category: "mcp" },
          { id: "node-ctx-stitch", label: "Stitcher Canvas Output", category: "context" },
          { id: "node-ctx-comp", label: "Token Compactor (5.78x)", category: "context" }
        ];

        const staticEdges = [
          { source: "node-gemini", target: "node-ctx-stitch" },
          { source: "node-claude", target: "node-ctx-stitch" },
          { source: "node-gpt4", target: "node-ctx-stitch" },
          { source: "node-mcp-fs", target: "node-ctx-stitch" },
          { source: "node-ctx-comp", target: "node-ctx-stitch" }
        ];

        // Combine static nodes and real obsidian notes
        const graphNodes = [
          ...staticNodes.map(n => ({ id: n.id, label: n.label, type: n.category })),
          ...serverSideObsidianNotes.map(n => ({ id: `note-${n.id}`, label: n.title, type: "obsidian-note", content: n.content }))
        ];

        const graphLinks = [...staticEdges];
        serverSideObsidianNotes.forEach(note => {
          serverSideObsidianNotes.forEach(otherNote => {
            if (note.id !== otherNote.id && note.content?.includes(`[[${otherNote.title}]]`)) {
              graphLinks.push({
                source: `note-${note.id}`,
                target: `note-${otherNote.id}`
              });
            }
          });
        });

        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  description: "Antigravity Workspace multi-dimensional semantic knowledge graph.",
                  nodes: graphNodes,
                  links: graphLinks
                }, null, 2)
              }
            ]
          }
        });
      } else if (name === "compress_context") {
        const { files, theme = "dark" } = args || {};
        if (!files || !Array.isArray(files)) {
          sendResponse({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid arguments: 'files' is required and must be an array."
            }
          });
          return;
        }

        const renderId = Math.random().toString(36).substring(2, 11);
        
        // Push job to active bridge
        pendingRenders.set(renderId, {
          files,
          theme,
          resolve: (dataUrl: string) => {
            const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            const mimeType = match ? match[1] : "image/png";
            const base64Data = match ? match[2] : dataUrl;

            sendResponse({
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: `Successfully compressed context! Stitched ${files.length} files. Saved to ${mimeType} visual blueprint. Token cost reduced to flat 258 visual tokens.\nBase64 Data URI: ${dataUrl}`
                  },
                  {
                    type: "image",
                    data: base64Data,
                    mimeType: mimeType
                  }
                ]
              }
            });
          }
        });

        activeMcpRenders.push({ id: renderId, files, theme });

        // Fallback: If no browser client resolves this within 400ms, compile server-side vector SVG instantly
        setTimeout(() => {
          const job = pendingRenders.get(renderId);
          if (job) {
            const index = activeMcpRenders.findIndex(r => r.id === renderId);
            if (index !== -1) activeMcpRenders.splice(index, 1);
            pendingRenders.delete(renderId);

            try {
              const result = renderWorkspaceToSvgDataUrl(files, theme);
              const match = result.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
              const mimeType = match ? match[1] : "image/svg+xml";
              const base64Data = match ? match[2] : result.dataUrl;

              sendResponse({
                jsonrpc: "2.0",
                id,
                result: {
                  content: [
                    {
                      type: "text",
                      text: `Successfully compressed context! (Server-side SVG Fallback) Stitched ${files.length} files. Visual blueprint rendered as highly-sharp vector SVG. Token cost reduced to flat 258 tokens.\nBase64 Data URI: ${result.dataUrl}`
                    },
                    {
                      type: "image",
                      data: base64Data,
                      mimeType: mimeType
                    }
                  ]
                }
              });
            } catch (err: any) {
              sendResponse({
                jsonrpc: "2.0",
                id,
                error: {
                  code: -32603,
                  message: `Fallback compression failed: ${err.message}`
                }
              });
            }
          }
        }, 400);
      } else {
        sendResponse({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Tool not found: ${name}`
          }
        });
      }
      break;
    }

    default: {
      sendResponse({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      });
      break;
    }
  }
}

// --- CLI Stdio MCP Server Execution Mode ---
function startStdioMcp() {
  process.stdin.setEncoding("utf8");
  let buffer = "";
  
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    let lineEnd;
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (line) {
        try {
          const request = JSON.parse(line);
          handleMcpRequest(request, (response) => {
            process.stdout.write(JSON.stringify(response) + "\n");
          });
        } catch (e) {
          process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" }
          }) + "\n");
        }
      }
    }
  });

  process.on("SIGINT", () => process.exit(0));
}

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 context images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Check if Gemini API is configured
  app.get("/api/config-status", (req, res) => {
    const isConfigured = !!process.env.GEMINI_API_KEY;
    res.json({ configured: isConfigured });
  });

  // --- Express MCP Server Endpoints ---
  
  // Real-time SSE Clients list
  const sseClients = new Set<{ sessionId: string; res: express.Response }>();

  // Sync Obsidian notes from browser to server
  app.post("/api/mcp/sync-notes", (req, res) => {
    if (Array.isArray(req.body)) {
      serverSideObsidianNotes = req.body;
    }
    res.json({ success: true, count: serverSideObsidianNotes.length });
  });

  // Get current active Obsidian notes list
  app.get("/api/mcp/sync-notes", (req, res) => {
    res.json(serverSideObsidianNotes);
  });

  // Client-Render Worker Bridge: Browser polls for high-DPI canvas render requests
  app.get("/api/mcp/pending-renders", (req, res) => {
    res.json(activeMcpRenders);
  });

  // Client-Render Worker Bridge: Browser posts the finished base64 data-url
  app.post("/api/mcp/submit-render", (req, res) => {
    const { id, dataUrl } = req.body;
    if (!id || !dataUrl) {
      res.status(400).json({ error: "Missing id or dataUrl" });
      return;
    }
    const job = pendingRenders.get(id);
    if (job) {
      job.resolve(dataUrl);
      pendingRenders.delete(id);
      
      const idx = activeMcpRenders.findIndex(r => r.id === id);
      if (idx !== -1) activeMcpRenders.splice(idx, 1);
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Job expired, completed, or not found" });
    }
  });

  // SSE Transport connection endpoint
  app.get("/api/mcp/sse", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const sessionId = Math.random().toString(36).substring(2, 15);
    
    // Write out standard MCP SSE transport handshake
    res.write(`event: endpoint\ndata: /api/mcp/messages?sessionId=${sessionId}\n\n`);

    const client = { sessionId, res };
    sseClients.add(client);

    req.on("close", () => {
      sseClients.delete(client);
    });
  });

  // SSE Transport client message post endpoint
  app.post("/api/mcp/messages", (req, res) => {
    const sessionId = req.query.sessionId as string;
    const request = req.body;

    const client = Array.from(sseClients).find(c => c.sessionId === sessionId);

    handleMcpRequest(request, (response) => {
      if (client) {
        client.res.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
      } else {
        // Fallback: respond directly to HTTP request if no active SSE session matches
        res.json(response);
        return;
      }
    });

    if (res.headersSent) return;
    res.status(202).end();
  });

  // Calibration Endpoint: test single step
  app.post("/api/calibrate-step", async (req, res) => {
    try {
      const { modelName, image, needle } = req.body;

      if (!modelName || !image || !needle) {
        res.status(400).json({ error: "Missing required fields: modelName, image, needle" });
        return;
      }

      // Extract raw base64 data and mimeType
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: "Invalid image format" });
        return;
      }
      const mimeType = match[1];
      const base64Data = match[2];

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this image carefully. It is a high-density text render. Locate the line starting with "NEEDLE = " or containing the random code. Extract the alphanumeric code and return ONLY the code (e.g. "HEX-7F2A" or "CODE-91Z"). Respond with nothing else. No explanation, no prefix, no additional words. If you absolutely cannot read it or it is too small, respond with "FAILED".`,
          },
        ],
        config: {
          temperature: 0.1,
          topP: 0.1,
        }
      });

      const extractedText = response.text ? response.text.trim() : "";
      
      // Determine match
      const passed = extractedText.toUpperCase().includes(needle.toUpperCase()) || 
                     needle.toUpperCase().includes(extractedText.toUpperCase()) && extractedText.length >= 3;

      res.json({
        rawResponse: extractedText,
        passed: passed && extractedText !== "FAILED" && extractedText !== "",
      });
    } catch (error: any) {
      console.error("Error in /api/calibrate-step:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Chat with Image Context (Antigravity Mode)
  app.post("/api/chat-with-image-context", async (req, res) => {
    try {
      const { modelName, contextImage, prompt } = req.body;

      if (!modelName || !contextImage || !prompt) {
        res.status(400).json({ error: "Missing required fields: modelName, contextImage, prompt" });
        return;
      }

      const match = contextImage.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: "Invalid image format" });
        return;
      }
      const mimeType = match[1];
      const base64Data = match[2];

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `You are an advanced AI assistant utilizing the "Antigravity Mode" visual context engine.
The attached image contains the entire compiled chat history, system files, or reference documents, rendered in high density to optimize context tokens.

TASK:
First, read and transcribe the relevant parts of the text displayed in the image.
Second, answer the following user query based strictly on the context rendered inside the image:

"${prompt}"

Structure your response clearly and professionally.`,
          },
        ],
      });

      res.json({
        response: response.text || "No response generated.",
        imageTokenCost: 258, // Standard flat cost for Gemini multimodal
      });
    } catch (error: any) {
      console.error("Error in /api/chat-with-image-context:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Chat with Text Context (Normal Mode for token & cost comparison)
  app.post("/api/chat-with-text-context", async (req, res) => {
    try {
      const { modelName, contextText, prompt } = req.body;

      if (!modelName || !contextText || !prompt) {
        res.status(400).json({ error: "Missing required fields: modelName, contextText, prompt" });
        return;
      }

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            text: `--- CONTEXT SYSTEM FILES AND CHAT HISTORY ---
${contextText}
--- END OF CONTEXT ---

Based on the context above, answer this user query:
"${prompt}"`,
          },
        ],
      });

      // Rough token estimation: ~4 characters per token
      const inputTokens = Math.ceil(contextText.length / 4) + Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil((response.text || "").length / 4);

      res.json({
        response: response.text || "No response generated.",
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      });
    } catch (error: any) {
      console.error("Error in /api/chat-with-text-context:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // --- OAuth & Multi-Agent Studio Integration ---

  // Active OAuth connections stored in memory
  const oauthSessions: Record<string, { status: "connected" | "disconnected"; connectedEmail: string }> = {
    github: { status: "disconnected", connectedEmail: "" },
    google: { status: "disconnected", connectedEmail: "" },
    openai: { status: "disconnected", connectedEmail: "" },
    anthropic: { status: "disconnected", connectedEmail: "" },
  };

  // Get active OAuth connection states
  app.get("/api/oauth/status", (req, res) => {
    res.json(oauthSessions);
  });

  // Disconnect provider
  app.post("/api/oauth/disconnect", (req, res) => {
    const { provider } = req.body;
    if (provider && oauthSessions[provider]) {
      oauthSessions[provider] = { status: "disconnected", connectedEmail: "" };
    }
    res.json({ success: true, status: oauthSessions });
  });

  // Construct OAuth url redirects
  app.get("/api/auth/url", (req, res) => {
    const { provider } = req.query;
    if (!provider || typeof provider !== "string") {
      res.status(400).json({ error: "Missing or invalid provider parameter" });
      return;
    }

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/callback`;

    // Direct redirection URL for popup handler to authorization panel
    const authUrl = `${appUrl}/auth-sim?provider=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ url: authUrl });
  });

  // Auth callback route
  app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
    const { provider, email } = req.query;
    
    if (provider && typeof provider === "string" && oauthSessions[provider]) {
      oauthSessions[provider] = {
        status: "connected",
        connectedEmail: (email as string) || `developer@${provider}.io`,
      };
    }

    // Return popup window closing logic
    res.send(`
      <!doctype html>
      <html>
        <head>
          <title>OAuth Connection Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #0f172a;
              color: #f8fafc;
              text-align: center;
            }
            .card {
              background: #1e293b;
              padding: 2.5rem;
              border-radius: 1.25rem;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
              border: 1px solid #334155;
              max-width: 400px;
              width: 90%;
            }
            .icon {
              width: 48px;
              height: 48px;
              background: #312e81;
              color: #a5b4fc;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              margin: 0 auto 1.5rem auto;
              font-weight: bold;
              border: 2px solid #4f46e5;
            }
            h1 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em; }
            p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
            .spinner {
              border: 3px solid #334155;
              border-top: 3px solid #38bdf8;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              animation: spin 1s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h1>Handshake Successful!</h1>
            <p>Access authorized for developer node. Redirecting credentials safely back to your Antigravity Workspace...</p>
            <div class="spinner"></div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: "OAUTH_AUTH_SUCCESS", 
                  providerId: "${provider}" 
                }, "*");
                setTimeout(() => {
                  window.close();
                }, 1500);
              } else {
                window.location.href = "/";
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // Multi-Model Council Discussion
  app.post("/api/agent-council-discuss", async (req, res) => {
    try {
      const { contextImage, prompt, activeAgents } = req.body;

      if (!contextImage || !prompt || !activeAgents || !Array.isArray(activeAgents)) {
        res.status(400).json({ error: "Missing required parameters: contextImage, prompt, activeAgents" });
        return;
      }

      const match = contextImage.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: "Invalid image format" });
        return;
      }
      const mimeType = match[1];
      const base64Data = match[2];

      const ai = getGeminiClient();

      // We will prompt Gemini (the native multi-modal client) to generate a structured multi-agent panel debate,
      // simulating feedback from the active agents (e.g., Anthropic Claude, OpenAI GPT-4, Google Gemini) 
      // based strictly on their real characteristics and what they read in the compiled Antigravity image context.
      const agentNamesAndTraits = {
        "agent-gemini": "Google Gemini 3.5 Pro: High-context visual expert, specializing in vision inputs, multimodal performance analysis, complex nested structures, and codebase token efficiency.",
        "agent-claude": "Anthropic Claude 3.5 Sonnet: Precise coder focusing on modular clean architecture, comprehensive type-safety, and deep algorithmic debugging.",
        "agent-gpt4": "OpenAI GPT-4o: Pragmatic, rapid-delivery builder focusing on developer experience, developer utility APIs, production configurations, and Express server boilerplate.",
      };

      const selectedAgentsDesc = activeAgents
        .map(id => `- ${agentNamesAndTraits[id as keyof typeof agentNamesAndTraits] || id}`)
        .join("\n");

      const systemPrompt = `You are hosting a Multi-Model Agentic Code Discussion Panel within the "Antigravity Dev Studio".
The attached image contains the compiled project workspace (source files, folder paths, headers, layout details) rendered as a single high-density image context.

Your task is to review the code workspace displayed in the image and resolve the following developer query:
"${prompt}"

Hold a discussion among the following authorized AI agent participants:
${selectedAgentsDesc}

Please format your response strictly as a JSON object containing a "discussion" list. Each item in the list represents a contribution from one of the active models debating the code. Follow this exact JSON schema:
{
  "discussion": [
    {
      "agentId": "agent-gemini" | "agent-claude" | "agent-gpt4",
      "agentName": "Gemini 3.5 Pro" | "Claude 3.5 Sonnet" | "GPT-4o",
      "message": "Write the specific feedback from this agent here. Speak in that specific model's characteristic persona and design philosophy, referencing what is shown in the workspace image."
    }
  ]
}

Ensure the agents interact with each other (e.g. Claude agreeing with Gemini's layout but suggesting a cleaner typescript type; GPT-4o proposing an optimized Express route config, etc.).
Return ONLY valid JSON. No markdown backticks except standard JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: systemPrompt,
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      const responseText = response.text ? response.text.trim() : "{}";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        console.warn("Failed to parse JSON response directly. Cleaning string...", responseText);
        // Clean markdown code blocks if any got leaked
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        parsedData = JSON.parse(cleanJson);
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Error in /api/agent-council-discuss:", error);
      res.status(500).json({ error: error.message || "Failed to generate multi-agent discussion" });
    }
  });

  // --- Serve Frontend ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.argv.includes("--mcp") || process.argv.includes("mcp")) {
  startStdioMcp();
} else {
  startServer();
}

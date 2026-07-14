export const SAMPLE_SYSTEM_CONTEXT = `========================================================================
SYSTEM PROMPT + TOOL DOCS // TOKENS OPTIMIZED VIA ANTIGRAVITY ENGINE
========================================================================
This document compiles active system parameters and technical tool documentations.
By rendering these system prompts directly to images, we achieve massive token efficiency.
Each tool is configured as an interface, allowing multi-agent routing.

[MODULE] CLOUD_EXECUTION_ENGINE_V2
Provides sandboxed runtime. Operates on Port 3000 exclusively.
Any external traffic is routed via the Nginx reverse proxy layer.
HMR is disabled in development by setting DISABLE_HMR=true.

[TOOL_DECLARATION] read_url_content
- Url: Target webpage URL
- Description: Fetches text from public pages and converts HTML to Markdown.
- Constraints: No JavaScript execution, no authentication required.

[TOOL_DECLARATION] rpc_action
- ServiceName: Name of the cloud database or middleware integration service
- MethodName: Method execution endpoint (e.g. ProvisionFirebase)
- Arguments: Key-value JSON parameters

[GUIDELINES] DATABASE RESOLUTION
- For NoSQL requirements or rapid persistence, use Firebase Firestore.
- For structured SQL or relational constraints, provision Cloud SQL PostgreSQL.
- Always check config files and initialize SDK clients lazily to prevent module-load startup crashes.

[ANALYSIS] TOKENS BILLING STRUCTURE
LLMs usually charge flat rates for images depending on resolution:
- Low-res mode (512x512 grid): 85 tokens flat.
- High-res mode (1024x1024 grid): 258 tokens flat.
In contrast, text-based system prompts easily consume 10,000 to 25,000 tokens per message, creating massive compound costs during long, multi-turn chat sessions. By baking the static system prompt and logs into a 1400x900 document image, we establish a permanent 258-token context anchor!

[SYSTEM_TELEMETRY]
STATUS: ONLINE
PORT_INGRESS: 3000
PROTOCOL: HTTPS_SECURE
MEMORY_POOL: 1024MB_ALLOCATED
VIRTUAL_CORE: 2_THREAD_EACH_MODEL
ENCODING_DECODE_LATENCY: 12ms

[RECOVERY_PLAN]
If compilation fails, verify standard import paths.
TypeScript supports Native type stripping.
Do not use legacy dependencies or mock API keys.
Always output fully formed responsive layouts with elegant typography.
`;

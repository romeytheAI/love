import { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight, UserCheck, Lock, Terminal, Github, Chrome, BrainCircuit, Cpu } from "lucide-react";

export default function OauthSimPage() {
  const [provider, setProvider] = useState<string>("github");
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [email, setEmail] = useState<string>("developer@code.io");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("provider") || "github";
    const r = params.get("redirect_uri") || "";
    setProvider(p);
    setRedirectUri(r);
    
    // Default mock emails based on provider
    if (p === "github") setEmail("github-dev@git.com");
    else if (p === "google") setEmail("romey.apps@gmail.com");
    else if (p === "openai") setEmail("researcher@openai.com");
    else if (p === "anthropic") setEmail("architect@anthropic.com");
  }, []);

  const handleAuthorize = () => {
    // Redirect to the server-side callback with simulated credentials
    const targetUrl = `/auth/callback?provider=${provider}&email=${encodeURIComponent(email)}`;
    window.location.href = targetUrl;
  };

  const getProviderDetails = () => {
    switch (provider) {
      case "github":
        return {
          name: "GitHub Developer OAuth",
          icon: <Github className="h-10 w-10 text-slate-100" />,
          color: "bg-slate-900 border-slate-700",
          scopes: ["read:user", "repo:status", "write:repo_hook", "read:org"],
          desc: "Connect your repository nodes to sync full folder structures and compile multi-file active trees directly into compressed Vision Context frames.",
        };
      case "google":
        return {
          name: "Google Cloud Platform Console",
          icon: <Chrome className="h-10 w-10 text-blue-500" />,
          color: "bg-slate-900 border-blue-900",
          scopes: ["userinfo.email", "cloud-platform", "gemini.models.execute"],
          desc: "Authorize server-side Gemini 3.5 Pro multimodal processing channels and retrieve cloud database logs from sandbox containers.",
        };
      case "openai":
        return {
          name: "OpenAI Developer Platform",
          icon: <BrainCircuit className="h-10 w-10 text-emerald-500" />,
          color: "bg-slate-900 border-emerald-900",
          scopes: ["chat.completions.execute", "models.read", "assistants.write"],
          desc: "Link your developer credentials to feed the Antigravity High-Density Vision blueprint directly into GPT-4o multimodal channels.",
        };
      case "anthropic":
        return {
          name: "Anthropic Console Handshake",
          icon: <Cpu className="h-10 w-10 text-amber-600" />,
          color: "bg-slate-900 border-amber-900",
          scopes: ["claude.messages.create", "tokens.estimate", "vision.ocr.read"],
          desc: "Authorize the Claude 3.5 Sonnet engine to join the Agentic Code Council, allowing real-time layout and algorithmic reviews from vision inputs.",
        };
      default:
        return {
          name: "Multimodal AI Developer Port",
          icon: <Terminal className="h-10 w-10 text-indigo-400" />,
          color: "bg-slate-900 border-indigo-900",
          scopes: ["agent.execute", "session.handshake"],
          desc: "Exchange authorization tokens to bridge developer contexts.",
        };
    }
  };

  const details = getProviderDetails();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white font-sans">
      <div className={`max-w-md w-full border ${details.color} rounded-2xl bg-slate-900/80 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden`}>
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-grid-slate-800/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.05))]" />

        {/* Handshake Visualizer */}
        <div className="flex items-center justify-center gap-6 mb-6 mt-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
            <Terminal className="h-6 w-6" />
          </div>
          <ArrowRight className="h-5 w-5 text-slate-500 animate-pulse" />
          <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
            {details.icon}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6 relative z-10">
          <h2 className="text-sm font-semibold tracking-widest text-indigo-400 uppercase font-mono">Secure Authorization</h2>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight mt-1">
            Authorize Antigravity Studio
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            The workspace application is requesting delegated credentials to connect to your developer dashboard.
          </p>
        </div>

        {/* Provider Specs Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-6 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-[11px] font-mono text-slate-300 font-bold uppercase">{details.name}</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal mb-3">{details.desc}</p>
          
          <div className="border-t border-slate-800/80 pt-3">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Requested Permission Scopes:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {details.scopes.map((scope) => (
                <span key={scope} className="text-[10px] font-mono bg-slate-800 border border-slate-700/80 text-slate-300 px-2 py-0.5 rounded">
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Profile identity input */}
        <div className="mb-6 relative z-10">
          <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Authorize Identity Profile Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500 transition-all"
            />
            <UserCheck className="absolute top-2.5 right-3 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Disclaimer / Trust badges */}
        <div className="flex items-start gap-2.5 bg-indigo-950/30 border border-indigo-900/30 p-3 rounded-xl mb-6 relative z-10">
          <Lock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-indigo-300 leading-normal">
            Your secrets never leave the container environment. Handshakes are managed inside cloud-secure isolated ports (`3000`) and exchanged directly with your local workspace page.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 relative z-10">
          <button
            onClick={() => window.close()}
            className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/50 text-xs font-semibold text-slate-400 transition-all cursor-pointer"
          >
            Deny Access
          </button>
          <button
            onClick={handleAuthorize}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            Grant Access
          </button>
        </div>
      </div>
    </div>
  );
}

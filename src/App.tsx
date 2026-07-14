import { useState, useEffect } from "react";
import AgenticStudioPanel from "./components/AgenticStudioPanel";
import OauthSimPage from "./components/OauthSimPage";

export default function App() {
  if (typeof window !== "undefined" && window.location.pathname === "/auth-sim") {
    return <OauthSimPage />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#02050c] text-slate-100 font-sans select-none">
      <AgenticStudioPanel calibratedSize={10} />
    </div>
  );
}

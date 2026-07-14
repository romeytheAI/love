import { useState, useRef } from "react";
import { Play, RotateCcw, CheckCircle2, XCircle, Loader2, Award, FileImage, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";
import { ModelCalibrationState, CalibrationStep, ContextConfig } from "../types";
import { renderContextToDataUrl } from "../utils/canvasRenderer";
import { SAMPLE_SYSTEM_CONTEXT } from "../utils/sampleContext";
import { motion, AnimatePresence } from "motion/react";

interface CalibrationPanelProps {
  onCalibrationComplete: (modelName: string, optimalSize: number) => void;
  calibratedSizes: Record<string, number | null>;
}

const AVAILABLE_MODELS = [
  { name: "gemini-3.5-flash", displayName: "Gemini 3.5 Flash (Default)" },
  { name: "gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash Lite" },
];

const FONT_SIZES_TO_TEST = [18, 14, 12, 10, 8, 6, 4];

export default function CalibrationPanel({ onCalibrationComplete, calibratedSizes }: CalibrationPanelProps) {
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [calibrationState, setCalibrationState] = useState<ModelCalibrationState>({
    modelName: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    status: "idle",
    currentFontSize: 18,
    optimalFontSize: null,
    steps: [],
  });

  const [activeTestImage, setActiveTestImage] = useState<string | null>(null);
  const [activeNeedle, setActiveNeedle] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to generate unique needle codes
  const generateNeedleCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing O/0, I/1
    let result = "HEX-";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += "-";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const startCalibration = async () => {
    // If already running, ignore or abort
    if (calibrationState.status === "running") return;

    abortControllerRef.current = new AbortController();

    const displayName = AVAILABLE_MODELS.find(m => m.name === selectedModel)?.displayName || selectedModel;

    setCalibrationState({
      modelName: selectedModel,
      displayName,
      status: "running",
      currentFontSize: FONT_SIZES_TO_TEST[0],
      optimalFontSize: null,
      steps: [],
    });

    const config: ContextConfig = {
      fontFamily: "JetBrains Mono",
      columnWidth: 420,
      lineHeight: 1.25,
      padding: 30,
      textColor: "#ffffff",
      bgColor: "#0f172a", // Technical Slate Dark
    };

    let lastOptimalSize: number | null = null;
    const completedSteps: CalibrationStep[] = [];

    try {
      for (const fontSize of FONT_SIZES_TO_TEST) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        // 1. Generate needle
        const needle = generateNeedleCode();
        setActiveNeedle(needle);

        // Update active rendering parameters
        setCalibrationState(prev => ({
          ...prev,
          currentFontSize: fontSize,
        }));

        // 2. Render canvas at this size
        const renderResult = renderContextToDataUrl(
          SAMPLE_SYSTEM_CONTEXT,
          fontSize,
          config,
          needle
        );

        setActiveTestImage(renderResult.dataUrl);

        // Short timeout for visual feedback of text layout shrinking
        await new Promise(resolve => setTimeout(resolve, 800));

        // 3. Post to backend
        const response = await fetch("/api/calibrate-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelName: selectedModel,
            image: renderResult.dataUrl,
            needle: needle,
          }),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`Server returned error status: ${response.status}`);
        }

        const data = await response.json();

        // 4. Record step results
        const newStep: CalibrationStep = {
          fontSize,
          needle,
          expectedResponse: needle,
          actualResponse: data.rawResponse || "[FAILED/EMPTY]",
          passed: !!data.passed,
          imageBase64: renderResult.dataUrl,
          timestamp: new Date().toLocaleTimeString(),
        };

        completedSteps.push(newStep);

        // Update optimal size if passed
        if (newStep.passed) {
          lastOptimalSize = fontSize;
        }

        setCalibrationState(prev => ({
          ...prev,
          steps: [...completedSteps],
          optimalFontSize: lastOptimalSize,
        }));
      }

      // Finish calibration
      setCalibrationState(prev => {
        const finalStatus = lastOptimalSize !== null ? "completed" : "failed";
        return {
          ...prev,
          status: finalStatus,
          optimalFontSize: lastOptimalSize,
        };
      });

      if (lastOptimalSize !== null) {
        onCalibrationComplete(selectedModel, lastOptimalSize);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Calibration failed:", err);
      setCalibrationState(prev => ({
        ...prev,
        status: "failed",
        error: err.message || "Network / processing error during calibration.",
      }));
    } finally {
      setActiveTestImage(null);
      setActiveNeedle(null);
    }
  };

  const cancelCalibration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCalibrationState(prev => ({
      ...prev,
      status: "idle",
    }));
    setActiveTestImage(null);
    setActiveNeedle(null);
  };

  return (
    <div id="calibration-section" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Vision OCR Calibration Engine</h2>
          </div>
          <p className="text-xs text-slate-500">
            Determine the exact text size threshold where models retain 100% OCR reading accuracy.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <select
            id="model-selector"
            disabled={calibrationState.status === "running"}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.name} value={m.name}>{m.displayName}</option>
            ))}
          </select>

          {calibrationState.status === "running" ? (
            <button
              id="btn-cancel-calibration"
              onClick={cancelCalibration}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancel
            </button>
          ) : (
            <button
              id="btn-start-calibration"
              onClick={startCalibration}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Calibrate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step-by-Step logs */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calibration Sequence Logs</h3>
            
            {calibrationState.steps.length === 0 && calibrationState.status === "idle" && (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl p-8 bg-slate-50/50">
                <HelpCircle className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-600 font-medium text-center">No calibration run found.</p>
                <p className="text-[10px] text-slate-400 text-center max-w-xs mt-1">
                  Run the calibration tool to measure accuracy thresholds for {selectedModel === "gemini-3.5-flash" ? "Gemini 3.5 Flash" : "Gemini 3.1 Flash Lite"}.
                </p>
              </div>
            )}

            {calibrationState.status === "running" && calibrationState.steps.length === 0 && (
              <div className="flex flex-col items-center justify-center border border-slate-100 bg-indigo-50/20 rounded-xl p-8">
                <Loader2 className="h-7 w-7 text-indigo-600 animate-spin mb-3" />
                <p className="text-xs font-semibold text-indigo-950">Initializing Calibration Run...</p>
                <p className="text-[10px] text-indigo-500 text-center max-w-xs mt-1 animate-pulse">
                  Rendering background system texts and injecting random needle verify tokens.
                </p>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {calibrationState.steps.map((step, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex items-start justify-between p-3 border rounded-xl text-xs transition-all ${
                    step.passed
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-950"
                      : "bg-rose-50/50 border-rose-100 text-rose-950"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`p-1 rounded-lg shrink-0 mt-0.5 ${
                      step.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}>
                      {step.passed ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{step.fontSize}px text size</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                          Needle: {step.needle}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-slate-600">
                        Model responded: &quot;<span className="font-bold text-slate-800">{step.actualResponse}</span>&quot;
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-400 mt-0.5">
                    {step.passed ? "PASSED" : "FAILED"}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Results readout */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Optimal Text Size
                </span>
                <div className="flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-indigo-600 shrink-0" />
                  <span className="text-base font-bold text-slate-900">
                    {calibrationState.optimalFontSize ? `${calibrationState.optimalFontSize}px` : "Not Calibrated"}
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Calibration Status
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                  calibrationState.status === "completed" 
                    ? "bg-emerald-100 text-emerald-800" 
                    : calibrationState.status === "running"
                    ? "bg-amber-100 text-amber-800 animate-pulse"
                    : calibrationState.status === "failed"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {calibrationState.status.toUpperCase()}
                </span>
              </div>
            </div>

            {calibrationState.error && (
              <div className="mt-3 flex items-start gap-1.5 p-2.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-[11px] font-medium leading-normal">
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{calibrationState.error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Display & Ingress Viewport */}
        <div className="lg:col-span-5 flex flex-col border border-slate-100 rounded-xl overflow-hidden bg-slate-950 text-white min-h-[300px]">
          <div className="flex items-center justify-between bg-slate-900 px-3 py-2 border-b border-slate-800">
            <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <FileImage className="h-3.5 w-3.5 text-indigo-400" />
              LIVE INGRESS VIEWPORT // CALIBRATING
            </span>
            {calibrationState.status === "running" && (
              <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-radial from-slate-900 to-slate-950">
            <AnimatePresence mode="wait">
              {activeTestImage ? (
                <motion.div
                  key={activeTestImage}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.05, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center w-full max-w-full"
                >
                  <div className="relative w-full max-h-[220px] rounded border border-slate-800 overflow-hidden bg-slate-950 group">
                    <img
                      src={activeTestImage}
                      alt="Calibration step preview"
                      className="w-full object-contain pointer-events-none filter brightness-95"
                    />
                    <div className="absolute inset-0 bg-indigo-500/5 mix-blend-color-dodge" />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/90 text-[9px] font-mono border border-slate-800 text-indigo-300">
                      Current Target: {calibrationState.currentFontSize}px
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-[10px] font-mono text-slate-400 leading-tight">
                      Generating verification frame. Code: <span className="font-bold text-slate-200">{activeNeedle}</span>
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center p-6 text-slate-500 max-w-[250px]">
                  <p className="text-xs font-medium text-slate-400">Calibration Viewport Idle</p>
                  <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                    When running, you will see a real-time visual preview of the text shrinking frame-by-frame.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

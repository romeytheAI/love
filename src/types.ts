export interface CalibrationStep {
  fontSize: number;
  needle: string;
  expectedResponse: string;
  actualResponse: string;
  passed: boolean;
  imageBase64: string;
  timestamp: string;
}

export interface ModelCalibrationState {
  modelName: string;
  displayName: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentFontSize: number;
  optimalFontSize: number | null;
  steps: CalibrationStep[];
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'model' | 'agent-gemini' | 'agent-claude' | 'agent-gpt4';
  text: string;
  timestamp: string;
  mode: 'text' | 'image';
  agentName?: string;
  agentColor?: string;
  tokenStats?: {
    textTokens: number;
    textCost: number;
    imageTokens: number;
    imageCost: number;
    savingsFactor: number;
  };
  contextImage?: string; // Base64 context image that was sent (if in image mode)
}

export interface ContextConfig {
  fontFamily: 'Inter' | 'JetBrains Mono' | 'Georgia';
  columnWidth: number; // in pixels
  lineHeight: number; // multiplier e.g. 1.2
  padding: number; // in pixels
  textColor: string;
  bgColor: string;
}

export interface WorkspaceFile {
  name: string;
  content: string;
  language: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  files: WorkspaceFile[];
}

export interface OauthProvider {
  id: string;
  name: string;
  company: string;
  iconName: string;
  status: 'connected' | 'disconnected';
  scope?: string;
  connectedEmail?: string;
}

export interface CouncilAgent {
  id: string;
  name: string;
  company: string;
  color: string;
  textColor: string;
  borderColor: string;
  active: boolean;
  modelCode: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  type: 'thought' | 'action' | 'ocr_scan' | 'token_compaction';
  title: string;
  detail: string;
  agentId: string;
  agentName: string;
  coordinates?: { x: number; y: number; col: number };
}

export interface ContextSnapshotLog {
  id: string;
  timestamp: string;
  filesStitched: string[];
  totalChars: number;
  estTokens: number;
  imageUrl: string;
  ocrVerificationStatus: 'passed' | 'warning' | 'pending';
}


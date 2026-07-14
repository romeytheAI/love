import { ContextConfig } from "../types";

/**
 * Utility to wrap text into lines based on a max width using canvas measureText.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(currentLine.trim());
      currentLine = words[n] + " ";
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  return lines;
}

/**
 * Renders context text into a dense, multi-column technical image document.
 */
export function renderContextToDataUrl(
  text: string,
  fontSize: number,
  config: ContextConfig,
  needleCode?: string
): { dataUrl: string; width: number; height: number; stats: { columns: number; totalLines: number } } {
  // Setup virtual canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context.");
  }

  // Set standard scale for high-DPI text rendering (supersampling)
  const scale = 1.5;
  
  // High-density page canvas sizing
  const canvasWidth = 1400;
  const canvasHeight = 900;
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  ctx.scale(scale, scale);

  // Apply clean background (e.g. subtle technical blueprint slate or developer parchment)
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw blueprint-style subtle background grid lines
  ctx.strokeStyle = config.bgColor === "#ffffff" ? "#f3f4f6" : "#1e293b";
  ctx.lineWidth = 0.5;
  const gridSpacing = 20;
  for (let x = 0; x < canvasWidth; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y < canvasHeight; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Header rail boundaries
  const headerHeight = 50;
  const footerHeight = 35;
  const usableWidth = canvasWidth - config.padding * 2;
  const usableHeight = canvasHeight - headerHeight - footerHeight - config.padding;

  // Render top metadata rail
  ctx.fillStyle = config.bgColor === "#ffffff" ? "#f8fafc" : "#0f172a";
  ctx.fillRect(0, 0, canvasWidth, headerHeight);

  // Bottom footer rail
  ctx.fillRect(0, canvasHeight - footerHeight, canvasWidth, footerHeight);

  // Draw lines separating rails
  ctx.strokeStyle = config.bgColor === "#ffffff" ? "#e2e8f0" : "#334155";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(canvasWidth, headerHeight);
  ctx.moveTo(0, canvasHeight - footerHeight);
  ctx.lineTo(canvasWidth, canvasHeight - footerHeight);
  ctx.stroke();

  // Draw technical target crosshairs in corners
  ctx.strokeStyle = config.bgColor === "#ffffff" ? "#94a3b8" : "#475569";
  ctx.lineWidth = 1;
  const drawTarget = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
  };
  drawTarget(20, headerHeight / 2);
  drawTarget(canvasWidth - 20, headerHeight / 2);

  // Header Title and telemetry labels
  ctx.fillStyle = config.textColor;
  ctx.font = `bold 13px "JetBrains Mono", monospace`;
  ctx.fillText("ANTIGRAVITY SYSTEM PORTAL // SYSTEM PROMPT & CONTEXT COMPILER", 45, 24);

  ctx.fillStyle = config.bgColor === "#ffffff" ? "#64748b" : "#94a3b8";
  ctx.font = `9px "JetBrains Mono", monospace`;
  const timestampStr = new Date().toISOString();
  ctx.fillText(`TELEMETRY: ACTIVE | RENDER_SCALE: ${scale}x | TIME: ${timestampStr}`, 45, 38);

  ctx.textAlign = "right";
  ctx.fillText(`FONT: ${fontSize}px ${config.fontFamily} | LINE_HEIGHT: ${config.lineHeight}x`, canvasWidth - 45, 24);
  ctx.fillText(`ENCODING: COMPRESSED IMAGE BUFFER (ANTIGRAVITY PROTOCOL)`, canvasWidth - 45, 38);
  ctx.textAlign = "left";

  // Flow text across columns
  const colGap = 24;
  const colWidth = config.columnWidth;
  const numCols = Math.floor((usableWidth + colGap) / (colWidth + colGap)) || 1;

  // Prepare text content: insert needle code randomly if provided
  let fullText = text;
  if (needleCode) {
    const insertionIndex = Math.floor(text.length * 0.4);
    fullText = 
      text.slice(0, insertionIndex) + 
      `\n\n======================================================\n` +
      `[CRITICAL SYSTEM KEY FOUND] NEEDLE = ${needleCode}\n` +
      `======================================================\n\n` +
      text.slice(insertionIndex);
  }

  // Split content into clean paragraphs/blocks
  const paragraphs = fullText.split("\n");
  
  // Set fonts for text rendering
  ctx.fillStyle = config.textColor;
  ctx.font = `${fontSize}px "${config.fontFamily}", sans-serif`;
  ctx.textBaseline = "top";

  const wrappedLines: string[] = [];
  paragraphs.forEach((p) => {
    if (p.trim() === "") {
      wrappedLines.push(""); // blank line
    } else {
      const wrapped = wrapText(ctx, p, colWidth);
      wrappedLines.push(...wrapped);
    }
  });

  // Flow lines into available columns
  const colLinesLimit = Math.floor(usableHeight / (fontSize * config.lineHeight));
  const maxAvailableLines = numCols * colLinesLimit;

  // Render columns
  let currentColumn = 0;
  let currentY = headerHeight + config.padding;

  for (let i = 0; i < Math.min(wrappedLines.length, maxAvailableLines); i++) {
    const line = wrappedLines[i];
    const colX = config.padding + currentColumn * (colWidth + colGap);

    // Draw Column Guides/Rules
    if (currentColumn > 0 && currentY === headerHeight + config.padding) {
      ctx.strokeStyle = config.bgColor === "#ffffff" ? "#f1f5f9" : "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX - colGap / 2, headerHeight + 10);
      ctx.lineTo(colX - colGap / 2, canvasHeight - footerHeight - 10);
      ctx.stroke();
    }

    if (line !== "") {
      ctx.fillText(line, colX, currentY);
    }

    currentY += fontSize * config.lineHeight;

    // Check if column is full
    if (currentY + fontSize * config.lineHeight > canvasHeight - footerHeight - config.padding) {
      currentColumn++;
      currentY = headerHeight + config.padding;
    }

    if (currentColumn >= numCols) {
      break; // Canvas canvas limits reached
    }
  }

  // Footer text info
  ctx.fillStyle = config.bgColor === "#ffffff" ? "#475569" : "#94a3b8";
  ctx.font = `10px "JetBrains Mono", monospace`;
  ctx.fillText("STATUS: CRYPTO_VERIFIED_SECURE // BYPASSING STANDARD LLM TEXT TOKENS", 20, canvasHeight - 15);
  ctx.textAlign = "right";
  ctx.fillText(`TOTAL SOURCE LINES COMPILED: ${wrappedLines.length} | COLUMNS: ${numCols}`, canvasWidth - 20, canvasHeight - 15);
  ctx.textAlign = "left";

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvasWidth,
    height: canvasHeight,
    stats: {
      columns: numCols,
      totalLines: wrappedLines.length,
    },
  };
}

/**
 * Compiles a full project directory (array of WorkspaceFiles) into a high-density
 * blueprint document ready for multi-modal AI council review.
 */
export function renderWorkspaceToDataUrl(
  files: Array<{ name: string; content: string; language: string }>,
  fontSize: number,
  config: ContextConfig
): { dataUrl: string; width: number; height: number; stats: { columns: number; totalLines: number } } {
  // Setup virtual canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context.");
  }

  const scale = 1.5;
  const canvasWidth = 1400;
  const canvasHeight = 950;
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  ctx.scale(scale, scale);

  // Background Slate
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Grid system
  ctx.strokeStyle = config.bgColor === "#ffffff" ? "#f1f5f9" : "#131d31";
  ctx.lineWidth = 0.5;
  const gridSpacing = 20;
  for (let x = 0; x < canvasWidth; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y < canvasHeight; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Layout limits
  const headerHeight = 55;
  const footerHeight = 40;
  const usableWidth = canvasWidth - config.padding * 2;
  const usableHeight = canvasHeight - headerHeight - footerHeight - config.padding;

  // Header and Footer blocks
  ctx.fillStyle = config.bgColor === "#ffffff" ? "#f8fafc" : "#090d16";
  ctx.fillRect(0, 0, canvasWidth, headerHeight);
  ctx.fillRect(0, canvasHeight - footerHeight, canvasWidth, footerHeight);

  // Divider lines
  ctx.strokeStyle = config.bgColor === "#ffffff" ? "#cbd5e1" : "#1e293b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(canvasWidth, headerHeight);
  ctx.moveTo(0, canvasHeight - footerHeight);
  ctx.lineTo(canvasWidth, canvasHeight - footerHeight);
  ctx.stroke();

  // Technical corners
  const drawTarget = (cx: number, cy: number) => {
    ctx.strokeStyle = config.bgColor === "#ffffff" ? "#94a3b8" : "#3b82f6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
  };
  drawTarget(18, headerHeight / 2);
  drawTarget(canvasWidth - 18, headerHeight / 2);

  // Header Title
  ctx.fillStyle = config.textColor;
  ctx.font = `bold 13px "JetBrains Mono", monospace`;
  ctx.fillText("ANTIGRAVITY SYSTEM PORTAL // REPOSITORY BLUEPRINT STITCHER", 40, 24);

  ctx.fillStyle = config.bgColor === "#ffffff" ? "#64748b" : "#60a5fa";
  ctx.font = `9px "JetBrains Mono", monospace`;
  ctx.fillText(`DEPLOYED_PORT: 3000 | COGNITIVE INGRESS: ACTIVE | REFRESH_RATE: STATIC_SNAPSHOT`, 40, 38);

  ctx.textAlign = "right";
  ctx.fillStyle = config.textColor;
  ctx.font = `9px "JetBrains Mono", monospace`;
  ctx.fillText(`STITCHED_FILES: ${files.length} | CHAR_COUNT: ${files.reduce((a, c) => a + c.content.length, 0)}`, canvasWidth - 40, 24);
  ctx.fillText(`ANTIGRAVITY CONTEXT COMPILER V1.2 // SECURE HANDSHAKE MODE`, canvasWidth - 40, 38);
  ctx.textAlign = "left";

  // Build the stitched text block
  let stitchedText = "";
  files.forEach((file) => {
    stitchedText += `\n/* ========================================================================\n`;
    stitchedText += `   FILE_PATH: /src/${file.name}\n`;
    stitchedText += `   LANGUAGE:  ${file.language.toUpperCase()}\n`;
    stitchedText += `   ======================================================================== */\n\n`;
    stitchedText += file.content;
    stitchedText += `\n\n`;
  });

  const paragraphs = stitchedText.split("\n");
  ctx.fillStyle = config.textColor;
  ctx.font = `${fontSize}px "${config.fontFamily}", monospace`;
  ctx.textBaseline = "top";

  const colGap = 24;
  const colWidth = config.columnWidth;
  const numCols = Math.floor((usableWidth + colGap) / (colWidth + colGap)) || 1;

  const wrappedLines: string[] = [];
  paragraphs.forEach((p) => {
    if (p.trim() === "") {
      wrappedLines.push("");
    } else {
      const wrapped = wrapText(ctx, p, colWidth);
      wrappedLines.push(...wrapped);
    }
  });

  const colLinesLimit = Math.floor(usableHeight / (fontSize * config.lineHeight));
  const maxAvailableLines = numCols * colLinesLimit;

  let currentColumn = 0;
  let currentY = headerHeight + config.padding;

  for (let i = 0; i < Math.min(wrappedLines.length, maxAvailableLines); i++) {
    const line = wrappedLines[i];
    const colX = config.padding + currentColumn * (colWidth + colGap);

    // Grid Column Separators
    if (currentColumn > 0 && currentY === headerHeight + config.padding) {
      ctx.strokeStyle = config.bgColor === "#ffffff" ? "#cbd5e1" : "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX - colGap / 2, headerHeight + 10);
      ctx.lineTo(colX - colGap / 2, canvasHeight - footerHeight - 10);
      ctx.stroke();
    }

    // Highlighting for file separator lines
    if (line.includes("========================================================================") || line.includes("FILE_PATH:")) {
      ctx.fillStyle = config.bgColor === "#ffffff" ? "#2563eb" : "#3b82f6";
      ctx.font = `bold ${fontSize}px "${config.fontFamily}", monospace`;
    } else {
      ctx.fillStyle = config.textColor;
      ctx.font = `${fontSize}px "${config.fontFamily}", monospace`;
    }

    if (line !== "") {
      ctx.fillText(line, colX, currentY);
    }

    currentY += fontSize * config.lineHeight;

    if (currentY + fontSize * config.lineHeight > canvasHeight - footerHeight - config.padding) {
      currentColumn++;
      currentY = headerHeight + config.padding;
    }

    if (currentColumn >= numCols) {
      break;
    }
  }

  // Footer Status
  ctx.textAlign = "left";
  ctx.fillStyle = config.bgColor === "#ffffff" ? "#475569" : "#94a3b8";
  ctx.font = `10px "JetBrains Mono", monospace`;
  ctx.fillText("SECURITY: COMPASS_LOCK_ESTABLISHED // INTEGRATED REPOSITORY COMPILE NODE", 20, canvasHeight - 20);
  
  ctx.textAlign = "right";
  ctx.fillText(`TOTAL LINES STITCHED: ${wrappedLines.length} | WIDTH: ${canvasWidth}px | DISPLAY: ${fontSize}px font`, canvasWidth - 20, canvasHeight - 20);
  ctx.textAlign = "left";

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvasWidth,
    height: canvasHeight,
    stats: {
      columns: numCols,
      totalLines: wrappedLines.length,
    },
  };
}


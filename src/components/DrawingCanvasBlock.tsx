import React, { useEffect, useRef, useState } from 'react';
import {
  Brush,
  Eraser,
  Highlighter,
  Trash2,
  Download,
  Check,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { DrawingBlockData } from '../types';

interface DrawingCanvasBlockProps {
  drawing: DrawingBlockData;
  onUpdate: (updated: DrawingBlockData) => void;
  onDelete: (id: string) => void;
}

const PEN_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#38bdf8', // Sky
  '#f8fafc', // White
  '#1e293b', // Slate dark
];

export const DrawingCanvasBlock: React.FC<DrawingCanvasBlockProps> = ({
  drawing,
  onUpdate,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState('#6366f1');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [title, setTitle] = useState(drawing.title || 'Sketch Canvas');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const historyRef = useRef<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (drawing.dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = drawing.dataUrl;
    } else {
      // Subtle grid background on blank canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onUpdate({
      ...drawing,
      title,
      dataUrl,
    });
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1200);
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    historyRef.current.push(canvas.toDataURL('image/png'));
    if (historyRef.current.length > 15) {
      historyRef.current.shift();
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    const prevUrl = historyRef.current.pop()!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      saveSnapshot();
    };
    img.src = prevUrl;
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    pushHistory();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = strokeWidth * 5;
    } else if (tool === 'highlighter') {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 4;
    } else {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.closePath();
      if (ctx) ctx.globalAlpha = 1;
    }
    setIsDrawing(false);
    saveSnapshot();
  };

  const clearCanvas = () => {
    pushHistory();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveSnapshot();
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${title || 'sketch'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="my-4 rounded-xl border border-slate-700/70 bg-slate-900/90 overflow-hidden shadow-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              onUpdate({ ...drawing, title: e.target.value });
            }}
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
            placeholder="Sketch Title..."
          />
          {savedIndicator && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Tools */}
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
              tool === 'pen'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
            }`}
            title="Pen"
          >
            <Brush className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTool('highlighter')}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
              tool === 'highlighter'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
              tool === 'eraser'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
            }`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Colors */}
          <div className="flex items-center gap-1">
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('pen');
                }}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  color === c && tool !== 'eraser'
                    ? 'scale-125 border-white ring-2 ring-indigo-500/50'
                    : 'border-slate-600 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
                title={`Color ${c}`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Stroke Width */}
          <input
            type="range"
            min={1}
            max={12}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16 accent-indigo-500 cursor-pointer"
            title={`Stroke size: ${strokeWidth}px`}
          />

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handleUndo}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
            title="Undo stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:bg-slate-700/60"
            title="Clear canvas"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={downloadPng}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
            title="Download Sketch PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(drawing.id)}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20"
            title="Remove Sketch Block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative bg-slate-950">
        <canvas
          ref={canvasRef}
          width={920}
          height={340}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-[280px] cursor-crosshair block"
        />
      </div>
    </div>
  );
};

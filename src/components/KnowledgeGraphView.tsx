import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw, Columns, ExternalLink, Sparkles } from 'lucide-react';
import { NoteItem, ProjectItem, TagMeta } from '../types';

interface KnowledgeGraphViewProps {
  notes: NoteItem[];
  projects: ProjectItem[];
  tags: TagMeta[];
  activeNoteId: string;
  onSelectNote: (noteId: string, openInSplit?: boolean) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'tag';
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  projectId?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  kind: 'wikilink' | 'tag';
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  notes,
  projects,
  tags,
  activeNoteId,
  onSelectNote,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showTagsOnGraph, setShowTagsOnGraph] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  const activeNotes = useMemo(
    () =>
      notes.filter(
        (n) =>
          !n.trashed && (filterProjectId === 'all' || n.projectId === filterProjectId)
      ),
    [notes, filterProjectId]
  );

  // Build graph nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const edgeList: GraphEdge[] = [];
    const centerX = 480;
    const centerY = 300;

    activeNotes.forEach((n, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, activeNotes.length);
      const proj = projects.find((p) => p.id === n.projectId);
      nodeList.push({
        id: n.id,
        label: n.title || 'Untitled',
        type: 'note',
        color: proj?.color || '#6366f1',
        x: centerX + Math.cos(angle) * 180 + (idx % 2 === 0 ? 20 : -20),
        y: centerY + Math.sin(angle) * 140,
        vx: 0,
        vy: 0,
        radius: n.id === activeNoteId ? 14 : 11,
        projectId: n.projectId,
      });
    });

    // Wiki-link edges between notes
    activeNotes.forEach((sourceNote) => {
      const matches = Array.from(sourceNote.content.matchAll(/\[\[([^\][\n]+)\]\]/g));
      matches.forEach((m) => {
        const targetTitle = m[1].trim().toLowerCase();
        const targetNote = activeNotes.find((n) => n.title.toLowerCase() === targetTitle);
        if (targetNote && targetNote.id !== sourceNote.id) {
          edgeList.push({
            source: sourceNote.id,
            target: targetNote.id,
            kind: 'wikilink',
          });
        }
      });
    });

    // Tag nodes & edges
    if (showTagsOnGraph) {
      const usedTags = new Set<string>();
      activeNotes.forEach((n) => n.tags.forEach((t) => usedTags.add(t)));
      Array.from(usedTags).forEach((tName, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, usedTags.size);
        const tagMeta = tags.find((t) => t.name === tName);
        const tagId = `tag:${tName}`;
        nodeList.push({
          id: tagId,
          label: `#${tName}`,
          type: 'tag',
          color: tagMeta?.color || '#ec4899',
          x: centerX + Math.cos(angle) * 260,
          y: centerY + Math.sin(angle) * 210,
          vx: 0,
          vy: 0,
          radius: 7,
        });

        activeNotes.forEach((n) => {
          if (n.tags.includes(tName)) {
            edgeList.push({
              source: n.id,
              target: tagId,
              kind: 'tag',
            });
          }
        });
      });
    }

    return { nodes: nodeList, edges: edgeList };
  }, [activeNotes, projects, tags, showTagsOnGraph, activeNoteId]);

  // Run lightweight force-directed relaxation and render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let ticks = 0;

    const stepSimulation = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (ticks < 140) {
        ticks++;
        // Repulsion between nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = Math.max(120, dx * dx + dy * dy);
            const force = 3200 / distSq;
            const fx = (dx / Math.sqrt(distSq)) * force;
            const fy = (dy / Math.sqrt(distSq)) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }

        // Spring attraction along edges
        edges.forEach((edge) => {
          const s = nodes.find((n) => n.id === edge.source);
          const t = nodes.find((n) => n.id === edge.target);
          if (!s || !t) return;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const targetDist = edge.kind === 'wikilink' ? 145 : 175;
          const spring = (dist - targetDist) * 0.018;
          const fx = (dx / dist) * spring;
          const fy = (dy / dist) * spring;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        });

        // Center gravity & velocity damping
        nodes.forEach((n) => {
          n.vx += (width / 2 - n.x) * 0.004;
          n.vy += (height / 2 - n.y) * 0.004;
          n.vx *= 0.82;
          n.vy *= 0.82;
          n.x = Math.max(60, Math.min(width - 60, n.x + n.vx));
          n.y = Math.max(50, Math.min(height - 50, n.y + n.vy));
        });
      }

      // Draw frame
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // Draw edges
      edges.forEach((edge) => {
        const s = nodes.find((n) => n.id === edge.source);
        const t = nodes.find((n) => n.id === edge.target);
        if (!s || !t) return;
        const isHighlighted =
          hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        if (edge.kind === 'wikilink') {
          ctx.strokeStyle = isHighlighted ? '#818cf8' : 'rgba(99, 102, 241, 0.42)';
          ctx.lineWidth = isHighlighted ? 2.4 : 1.6;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = isHighlighted ? '#f472b6' : 'rgba(148, 163, 184, 0.22)';
          ctx.lineWidth = 1.1;
          ctx.setLineDash([4, 4]);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Draw nodes
      nodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const isActive = node.id === activeNoteId;

        // Glow ring for active or hovered node
        if (isHovered || isActive) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = `${node.color}33`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeStyle = isActive ? '#ffffff' : '#0f172a';
        ctx.stroke();

        // Node label
        ctx.font =
          node.type === 'note'
            ? '600 12px Inter, -apple-system, sans-serif'
            : '500 11px JetBrains Mono, monospace';
        ctx.fillStyle = node.type === 'note' ? '#f1f5f9' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 15);
      });

      ctx.restore();
      animFrame = requestAnimationFrame(stepSimulation);
    };

    animFrame = requestAnimationFrame(stepSimulation);
    return () => cancelAnimationFrame(animFrame);
  }, [nodes, edges, hoveredNode, zoom, activeNoteId]);

  const getNodeAtCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const x = (rawX - cx) / zoom + cx;
    const y = (rawY - cy) / zoom + cy;

    return (
      nodes.find((n) => Math.hypot(n.x - x, n.y - y) <= n.radius + 8) || null
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interactive Knowledge Graph</h2>
            <p className="text-xs text-slate-400">
              Visualizing {activeNotes.length} notes and {edges.length} bi-directional{' '}
              <code className="text-indigo-400">[[Wiki-Links]]</code> &amp;{' '}
              <code className="text-pink-400">#tags</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowTagsOnGraph((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              showTagsOnGraph
                ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {showTagsOnGraph ? 'Showing #Tags' : 'Show #Tags'}
          </button>

          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
              className="p-1.5 text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs text-slate-300 font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
              className="p-1.5 text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1.5 text-slate-300 hover:text-white"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={980}
          height={600}
          onMouseMove={(e) => setHoveredNode(getNodeAtCoords(e))}
          onClick={(e) => {
            const hit = getNodeAtCoords(e);
            if (hit && hit.type === 'note') {
              onSelectNote(hit.id, e.shiftKey);
            }
          }}
          className="w-full h-full cursor-pointer"
        />

        {/* Legend & Hover Inspector Card */}
        <div className="absolute bottom-4 left-4 rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 text-xs shadow-xl backdrop-blur-md max-w-xs">
          <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Graph Controls
          </div>
          <ul className="space-y-1 text-slate-400 text-[11px]">
            <li>• Click any <strong className="text-slate-200">Note Node</strong> to open it</li>
            <li>• <kbd className="px-1 py-0.5 bg-slate-800 rounded">Shift + Click</kbd> to open in Split-Pane</li>
            <li>• Solid lines = <code className="text-indigo-400">[[Wiki-Links]]</code></li>
            <li>• Dashed lines = Shared <code className="text-pink-400">#tags</code></li>
          </ul>
        </div>

        {hoveredNode && hoveredNode.type === 'note' && (
          <div className="absolute top-4 right-4 rounded-xl bg-slate-900/95 border border-indigo-500/40 p-4 shadow-2xl w-72 backdrop-blur-md">
            <div className="text-xs font-bold text-white mb-1">{hoveredNode.label}</div>
            <p className="text-[11px] text-slate-400 line-clamp-3 mb-3">
              {notes.find((n) => n.id === hoveredNode.id)?.content.slice(0, 140)}...
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => onSelectNote(hoveredNode.id, false)}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open Note
              </button>
              <button
                type="button"
                onClick={() => onSelectNote(hoveredNode.id, true)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
              >
                <Columns className="w-3 h-3" />
                Split
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

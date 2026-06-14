import { useEffect, useRef } from "react";

const CANVAS_HEIGHT = 440;
const SPRING_LENGTH = 130;
const DAMPING = 0.85;
const BG = "#f2f0eb";

const NODES_DATA = [
  { id: 0, label: "going all in", desc: "tires. apps. vaults. 20 years. the through-line.", size: 18, color: "#d85a30" },
  { id: 1, label: "brand strategy", desc: "20 years figuring out what things actually are", size: 13, color: "#1a1a1a" },
  { id: 2, label: "pattern recognition", desc: "the brain finds the connection whether you want it to or not", size: 13, color: "#1a1a1a" },
  { id: 3, label: "creative direction", desc: "vision-setting before anyone starts making anything", size: 12, color: "#1a1a1a" },
  { id: 4, label: "systems & process", desc: "how things break and how to fix them for good", size: 12, color: "#1a1a1a" },
  { id: 5, label: "design engineering", desc: "the place where design decisions meet real code", size: 12, color: "#1a1a1a" },
  { id: 6, label: "app development", desc: "built a ranch inventory app + a wyoming road conditions app", size: 12, color: "#1a1a1a" },
  { id: 7, label: "micro-interactions", desc: "how things feel when you touch them matters enormously", size: 11, color: "#1a1a1a" },
  { id: 8, label: "website design", desc: "redesigns, systems, the whole thing from scratch", size: 11, color: "#1a1a1a" },
  { id: 9, label: "print & digital", desc: "anything you can think of. healthcare to home services.", size: 10, color: "#1a1a1a" },
  { id: 10, label: "3,000 tires", desc: "not a metaphor. an actual earthship attempt.", size: 14, color: "#d85a30" },
  { id: 11, label: "off-grid dream", desc: "the dream is not dead. it is in queue.", size: 12, color: "#2a6040" },
  { id: 12, label: "environment & land", desc: "the land is the whole point", size: 12, color: "#2a6040" },
  { id: 13, label: "recovering maximalist", desc: "it's not hoarding if your shit is cool", size: 12, color: "#1a1a1a" },
  { id: 14, label: "conspiracy vault", desc: "classified. ask me in person.", size: 12, color: "#7060c0" },
  { id: 15, label: "obsidian vaults", desc: "two brains in markdown. one is normal.", size: 11, color: "#7060c0" },
  { id: 16, label: "rocks & minerals", desc: "the earth keeps receipts", size: 10, color: "#888" },
  { id: 17, label: "hyperfocus", desc: "mode A: rebuild society. mode B: what was I doing?", size: 11, color: "#1a1a1a" },
] as const;

const RAW_EDGES: [number, number][] = [
  [0, 1], [0, 6], [0, 10], [0, 11], [0, 13], [0, 14], [0, 17],
  [1, 2], [1, 3], [1, 4], [1, 9],
  [2, 4], [2, 7], [2, 15], [2, 17],
  [3, 1], [3, 5], [3, 8],
  [4, 5], [4, 6], [4, 8],
  [5, 7], [5, 8],
  [6, 4], [6, 7],
  [7, 5], [7, 8],
  [8, 9],
  [10, 11], [10, 12], [10, 13],
  [11, 12], [11, 16],
  [12, 16],
  [13, 16], [13, 14],
  [14, 15], [14, 2],
  [15, 2], [15, 17],
  [17, 2],
];

function dedupeEdges(edges: [number, number][]) {
  const seen = new Set<string>();
  return edges.filter(([a, b]) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const EDGES = dedupeEdges(RAW_EDGES);

type SimNode = {
  id: number;
  label: string;
  desc: string;
  size: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ix: number;
  iy: number;
};

function createInitialNodes(width: number, height: number): SimNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const spread = Math.min(width, height) * 0.34;

  return NODES_DATA.map((node, i) => {
    let x = cx;
    let y = cy;
    if (i > 0) {
      const angle = ((i - 1) / (NODES_DATA.length - 1)) * Math.PI * 2;
      x = cx + Math.cos(angle) * spread;
      y = cy + Math.sin(angle) * spread;
    }
    return { ...node, x, y, vx: 0, vy: 0, ix: x, iy: y };
  });
}

function getNeighbors(id: number): Set<number> {
  const neighbors = new Set<number>();
  for (const [a, b] of EDGES) {
    if (a === id) neighbors.add(b);
    if (b === id) neighbors.add(a);
  }
  return neighbors;
}

function hitTest(nodes: SimNode[], mx: number, my: number, hoveredId: number | null): number | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const radius = node.size * (node.id === hoveredId ? 1.25 : 1);
    const dx = mx - node.x;
    const dy = my - node.y;
    if (dx * dx + dy * dy <= radius * radius) return node.id;
  }
  return null;
}

export function ThinkingInWebs() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = container.clientWidth;
    let height = CANVAS_HEIGHT;
    let nodes = createInitialNodes(width, height);
    let hoveredId: number | null = null;
    let draggedId: number | null = null;
    let rafId = 0;
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = container.clientWidth;
      height = CANVAS_HEIGHT;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const reset = () => {
      nodes = createInitialNodes(width, height);
      hoveredId = null;
      draggedId = null;
      if (tooltip) tooltip.style.opacity = "0";
      canvas.style.cursor = "grab";
    };

    const getPointerPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const updateTooltip = (node: SimNode | null) => {
      if (!tooltip) return;
      if (!node || draggedId !== null) {
        tooltip.style.opacity = "0";
        return;
      }
      tooltip.textContent = node.desc;
      tooltip.style.left = `${node.x}px`;
      tooltip.style.top = `${node.y - node.size - 36}px`;
      tooltip.style.opacity = "1";
    };

    const stepPhysics = () => {
      const cx = width / 2;
      const cy = height / 2;
      const repulsion = 4200;
      const springK = 0.012;
      const centerK = 0.018;

      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === draggedId) continue;

        let fx = 0;
        let fy = 0;

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy || 0.01;
          const dist = Math.sqrt(distSq);
          const force = repulsion / distSq;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        for (const [a, b] of EDGES) {
          let other: SimNode | undefined;
          if (a === nodes[i].id) other = nodes[b];
          else if (b === nodes[i].id) other = nodes[a];
          if (!other || other.id === draggedId) continue;

          const dx = other.x - nodes[i].x;
          const dy = other.y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const displacement = dist - SPRING_LENGTH;
          const force = springK * displacement;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        if (nodes[i].id === 0) {
          fx += (cx - nodes[i].x) * centerK;
          fy += (cy - nodes[i].y) * centerK;
        }

        nodes[i].vx = (nodes[i].vx + fx) * DAMPING;
        nodes[i].vy = (nodes[i].vy + fy) * DAMPING;
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;

        const pad = nodes[i].size + 24;
        nodes[i].x = Math.max(pad, Math.min(width - pad, nodes[i].x));
        nodes[i].y = Math.max(pad, Math.min(height - pad - 18, nodes[i].y));
      }
    };

    const draw = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);

      const activeHover = hoveredId !== null && draggedId === null;
      const neighbors = activeHover ? getNeighbors(hoveredId) : new Set<number>();
      const highlightedNodes = activeHover
        ? new Set<number>([hoveredId, ...neighbors])
        : new Set<number>();

      const edgeHighlighted = (a: number, b: number) =>
        activeHover && (a === hoveredId || b === hoveredId);

      for (const [a, b] of EDGES) {
        const na = nodes[a];
        const nb = nodes[b];
        const highlighted = edgeHighlighted(a, b);

        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        if (highlighted) {
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = "rgba(0,0,0,0.08)";
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = activeHover ? 0.15 : 1;
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      for (const node of nodes) {
        const isHovered = node.id === hoveredId && draggedId === null;
        const isConnected = activeHover && highlightedNodes.has(node.id);
        const faded = activeHover && !isConnected;
        const drawSize = node.size * (isHovered ? 1.25 : 1);

        ctx.globalAlpha = faded ? 0.15 : 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, drawSize, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, drawSize + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        const labelBold = isHovered || isConnected;
        ctx.font = labelBold
          ? "bold 10px Helvetica, Arial, sans-serif"
          : "10px Helvetica, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelAlpha = faded ? 0.15 : labelBold ? 1 : 0.6;
        ctx.fillStyle = `rgba(26,26,26,${labelAlpha})`;
        ctx.fillText(node.label, node.x, node.y + drawSize + 6);
      }

      ctx.globalAlpha = 1;
    };

    const loop = () => {
      stepPhysics();
      draw();
      rafId = requestAnimationFrame(loop);
    };

    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = getPointerPos(e);
      const hit = hitTest(nodes, x, y, hoveredId);
      if (hit === null) return;
      draggedId = hit;
      hoveredId = hit;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      const node = nodes[hit]!;
      node.vx = 0;
      node.vy = 0;
      updateTooltip(node);
    };

    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = getPointerPos(e);

      if (draggedId !== null) {
        const node = nodes[draggedId]!;
        const pad = node.size + 24;
        node.x = Math.max(pad, Math.min(width - pad, x));
        node.y = Math.max(pad, Math.min(height - pad - 18, y));
        node.vx = 0;
        node.vy = 0;
        updateTooltip(node);
        return;
      }

      const hit = hitTest(nodes, x, y, hoveredId);
      hoveredId = hit;
      canvas.style.cursor = hit !== null ? "grab" : "default";
      updateTooltip(hit !== null ? nodes[hit]! : null);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (draggedId !== null) {
        canvas.releasePointerCapture(e.pointerId);
        draggedId = null;
        canvas.style.cursor = hoveredId !== null ? "grab" : "default";
      }
    };

    const onPointerLeave = () => {
      if (draggedId === null) {
        hoveredId = null;
        updateTooltip(null);
        canvas.style.cursor = "grab";
      }
    };

    const onResetClick = () => reset();

    resize();
    reset();
    canvas.style.cursor = "grab";
    rafId = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      reset();
    });
    ro.observe(container);

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const resetBtn = container.querySelector<HTMLButtonElement>("[data-reset-graph]");
    resetBtn?.addEventListener("click", onResetClick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      resetBtn?.removeEventListener("click", onResetClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: CANVAS_HEIGHT }}>
      <canvas ref={canvasRef} className="block w-full rounded-2xl border-2 border-primary" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 max-w-[220px] -translate-x-1/2 rounded-lg border border-primary/15 bg-surface px-3 py-2 text-[11px] leading-snug text-primary/80 shadow-sm opacity-0 transition-opacity duration-150"
      />
      <button
        type="button"
        data-reset-graph
        data-cursor="hover"
        className="absolute right-4 top-4 rounded-full border-2 border-primary bg-surface px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest kinetic-border-sm transition-colors hover:bg-primary hover:text-surface"
      >
        Reset
      </button>
    </div>
  );
}

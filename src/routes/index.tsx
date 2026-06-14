import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { ThinkingInWebs } from "@/components/ThinkingInWebs";

export const Route = createFileRoute("/")({
  component: Index,
});

// ---------- Cursor follower ----------
function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<"default" | "hover">("default");
  useEffect(() => {
    const move = (e: globalThis.MouseEvent) => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`;
      }
    };
    const over = (e: globalThis.MouseEvent) => {
      const t = e.target as HTMLElement;
      setVariant(t.closest("[data-cursor='hover']") ? "hover" : "default");
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, []);
  return (
    <div
      ref={ref}
      className={`pointer-events-none fixed left-0 top-0 z-[100] hidden md:block transition-[width,height,background-color,border-color] duration-200 ease-out ${
        variant === "hover"
          ? "h-12 w-12 -ml-2 -mt-2 rounded-full border-2 border-accent bg-accent/10"
          : "h-8 w-8 rounded-full border-2 border-primary mix-blend-difference"
      }`}
      style={{ willChange: "transform" }}
    />
  );
}

// ---------- Magnetic button ----------
function MagneticButton({
  children,
  className = "",
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };
  return (
    <a
      ref={ref}
      href={href ?? "#"}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor="hover"
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </a>
  );
}

// ---------- Draggable hero objects ----------
const OBJECTS = [
  { file: "duck.png",       label: "glass duck",        width: 130, initRot: -8,  left: "62%", top: "5%"  },
  { file: "bear_trap.png",  label: "bear trap, 1800s",  width: 155, initRot: 12,  left: "44%", top: "6%"  },
  { file: "gem.png",        label: "amazonite",         width: 120, initRot: -5,  left: "68%", top: "46%" },
  { file: "headlight.png",  label: "vintage headlight", width: 125, initRot: 7,   left: "50%", top: "52%" },
  { file: "tires.png",      label: "×2 of 3,000",       width: 140, initRot: -3,  left: "72%", top: "65%" },
];

function DraggableObject({
  file, label, width, initRot, left, top, heroRef,
}: {
  file: string; label: string; width: number; initRot: number;
  left: string; top: string; heroRef: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({
    dragging: false,
    x: 0, y: 0,
    vx: 0, vy: 0,
    lastX: 0, lastY: 0,
    rafId: 0,
    initLeft: 0, initTop: 0,
    initSet: false,
  });
  const [held, setHeld] = useState(false);
  const [hovered, setHovered] = useState(false);

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.transform = `translate(0px,0px) rotate(${initRot}deg)`;
    }
  }, [initRot]);

  useEffect(() => {
    return () => { cancelAnimationFrame(state.current.rafId); };
  }, []);

  const applyTransform = (x: number, y: number, rot: number) => {
    if (ref.current) {
      ref.current.style.transform = `translate(${x}px,${y}px) rotate(${rot}deg)`;
    }
  };

  const ensureInit = () => {
    const s = state.current;
    if (s.initSet || !ref.current || !heroRef.current) return;
    const heroRect = heroRef.current.getBoundingClientRect();
    const elRect = ref.current.getBoundingClientRect();
    s.initLeft = elRect.left - heroRect.left;
    s.initTop = elRect.top - heroRect.top;
    s.initSet = true;
  };

  const startPhysics = () => {
    const s = state.current;
    const el = ref.current;
    const hero = heroRef.current;
    if (!el || !hero) return;

    const tick = () => {
      s.vx *= 0.9;
      s.vy *= 0.9;
      s.x += s.vx;
      s.y += s.vy;

      const heroW = hero.offsetWidth;
      const heroH = hero.offsetHeight;
      const elW = el.offsetWidth;
      const elH = el.offsetHeight;
      const curL = s.initLeft + s.x;
      const curT = s.initTop + s.y;
      const curR = curL + elW;
      const curB = curT + elH;

      if (curR > heroW) { s.x -= curR - heroW; s.vx = -Math.abs(s.vx) * 0.4; }
      else if (curL < 0) { s.x -= curL; s.vx = Math.abs(s.vx) * 0.4; }

      if (curB > heroH) { s.y -= curB - heroH; s.vy = -Math.abs(s.vy) * 0.4; }
      else if (curT < 0) { s.y -= curT; s.vy = Math.abs(s.vy) * 0.4; }

      const rot = initRot + Math.max(-20, Math.min(20, s.vx * 0.5));
      applyTransform(s.x, s.y, rot);

      if (Math.abs(s.vx) > 0.1 || Math.abs(s.vy) > 0.1) {
        s.rafId = requestAnimationFrame(tick);
      } else {
        s.vx = 0; s.vy = 0;
        applyTransform(s.x, s.y, initRot);
      }
    };

    s.rafId = requestAnimationFrame(tick);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    ensureInit();
    const s = state.current;
    cancelAnimationFrame(s.rafId);
    s.dragging = true;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.vx = 0; s.vy = 0;
    setHeld(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    const dy = e.clientY - s.lastY;
    s.vx = dx; s.vy = dy;
    s.x += dx; s.y += dy;
    s.lastX = e.clientX; s.lastY = e.clientY;
    applyTransform(s.x, s.y, initRot + dx * 0.3);
  };

  const onPointerUp = () => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    s.vx *= 4; s.vy *= 4;
    setHeld(false);
    startPhysics();
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute",
        left,
        top,
        width,
        cursor: held ? "grabbing" : "grab",
        zIndex: held ? 50 : 10,
        willChange: "transform",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <img
        src={`/images/objects/${file}`}
        alt={label}
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          filter: held
            ? "drop-shadow(0 8px 20px rgba(216,90,48,0.45))"
            : hovered
            ? "drop-shadow(0 4px 12px rgba(216,90,48,0.3))"
            : "none",
          transition: "filter 0.2s",
          pointerEvents: "none",
        }}
      />
      <div style={{ textAlign: "center", fontSize: 9, color: "#bbb", marginTop: 4, pointerEvents: "none" }}>
        {label}
      </div>
    </div>
  );
}

function DraggableObjects({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  return (
    <>
      {OBJECTS.map((obj) => (
        <DraggableObject key={obj.file} {...obj} heroRef={heroRef} />
      ))}
    </>
  );
}

// ---------- Spring toggle ----------
function SpringToggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      data-cursor="hover"
      className={`relative h-9 w-16 rounded-full border-2 border-primary transition-colors ${on ? "bg-accent" : "bg-surface"}`}
    >
      <span
        className={`absolute top-0.5 size-7 rounded-full bg-primary transition-all duration-500`}
        style={{
          left: on ? "calc(100% - 30px)" : "2px",
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </button>
  );
}

// ---------- Knob (drag to rotate) ----------
function Knob() {
  const [angle, setAngle] = useState(-135);
  const dragging = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const compute = (e: globalThis.PointerEvent | PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const a = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    setAngle(Math.max(-135, Math.min(135, a)));
  };
  useEffect(() => {
    const move = (e: globalThis.PointerEvent) => dragging.current && compute(e);
    const up = () => (dragging.current = false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);
  const pct = Math.round(((angle + 135) / 270) * 100);
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={ref}
        onPointerDown={(e) => {
          dragging.current = true;
          compute(e);
        }}
        data-cursor="hover"
        className="relative size-24 rounded-full bg-surface border-2 border-primary kinetic-border cursor-grab active:cursor-grabbing touch-none"
        style={{ transform: `rotate(${angle + 135}deg)` }}
      >
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-5 bg-accent rounded-full" />
      </div>
      <div className="font-mono text-[10px] tracking-widest">GAIN · {pct}%</div>
    </div>
  );
}

// ---------- Spotlight card ----------
function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={move}
      className={`group relative overflow-hidden bg-surface border-2 border-primary rounded-3xl kinetic-border ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(280px circle at var(--mx,50%) var(--my,50%), color-mix(in oklab, var(--color-accent) 25%, transparent), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

// ---------- Project card with hover reveal ----------
type Project = {
  title: string;
  subtitle: string;
  tags: string[];
  accent?: "default" | "orange";
};

function ProjectCard({ project }: { project: Project }) {
  const accentBtn = project.accent === "orange" ? "bg-orange-500" : "bg-accent";
  const accentTagHover = project.accent === "orange" ? "hover:bg-orange-500" : "hover:bg-primary";
  return (
    <div className="group" data-cursor="hover">
      <SpotlightCard>
        <div className="w-full aspect-[4/3] bg-[#111] relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
            <span className="text-white text-[13px]">{project.title}</span>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end bg-surface border-2 border-primary p-4 rounded-xl translate-y-24 group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <div>
            <h3 className="font-display text-lg tracking-tight">{project.title}</h3>
            <p className="text-xs text-primary/60">{project.subtitle}</p>
          </div>
          <div className={`size-10 ${accentBtn} rounded-lg flex items-center justify-center text-white font-bold transition-transform group-hover:rotate-[-45deg]`}>
            →
          </div>
        </div>
      </SpotlightCard>
      <div className="mt-6 flex gap-2 flex-wrap">
        {project.tags.map((t) => (
          <span
            key={t}
            className={`px-2 py-1 bg-surface border border-primary/15 rounded text-[10px] font-mono tracking-wider transition-colors ${accentTagHover} hover:text-surface`}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Page ----------
function Index() {
  const heroRef = useRef<HTMLElement>(null);
  return (
    <main className="relative min-h-screen bg-bg font-sans text-primary overflow-x-hidden">
      <CursorRing />
      <div className="fixed inset-0 grid-bg pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-6 z-50 flex justify-center px-4 animate-slide-up">
        <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-md px-6 py-3 rounded-full border-2 border-primary kinetic-border">
          <a href="#playground" className="text-sm font-medium hover:text-accent transition-colors" data-cursor="hover">playground</a>
          <div className="w-1 h-1 rounded-full bg-primary/20" />
          <a href="#work" className="text-sm font-medium hover:text-accent transition-colors" data-cursor="hover">work</a>
          <div className="w-1 h-1 rounded-full bg-primary/20" />
          <a href="#obsessions" className="text-sm font-medium hover:text-accent transition-colors" data-cursor="hover">obsessions</a>
          <div className="w-1 h-1 rounded-full bg-primary/20" />
          <a href="#v3.0" className="text-sm font-medium hover:text-accent transition-colors" data-cursor="hover">v3.0</a>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-20 pb-12 px-6 max-w-6xl mx-auto min-h-[520px]">
        <div className="flex flex-col gap-6 animate-slide-up pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 text-secondary rounded-md w-fit border border-secondary/20">
            <span className="size-2 bg-secondary rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Available — Q1 2026</span>
          </div>

          <h1 className="font-display text-7xl md:text-[10rem] leading-[0.88] tracking-tighter uppercase">
            IT'S NOT HOARDING
            <br />
            IF YOUR SHIT IS <span className="text-accent">COOL.</span>
          </h1>

          <div className="flex flex-wrap gap-8 md:gap-12 mt-6">
            {[
              { v: "~20", k: "YRS INDUSTRY" },
              { v: "3,000", k: "TIRES COLLECTED" },
              { v: "2", k: "OBSIDIAN VAULTS" },
            ].map((s) => (
              <div key={s.k}>
                <div className="font-display text-4xl md:text-5xl">{s.v}</div>
                <div className="text-[11px] font-mono uppercase tracking-widest opacity-50 mt-1">{s.k}</div>
              </div>
            ))}
          </div>

          <p className="max-w-md text-xl leading-relaxed text-primary/70 mt-8">
            Not just a designer. A strategic brain with 20 years of pattern recognition, two Obsidian vaults, and a very specific set of obsessions. Looking for one good problem.
          </p>
        </div>
        <DraggableObjects heroRef={heroRef} />
      </section>

      {/* Marquee */}
      <div className="relative border-y-2 border-primary bg-primary text-surface overflow-hidden py-4 my-12">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex items-center gap-8 px-4 font-display text-2xl uppercase tracking-tight">
              {[
                "Brand Strategy",
                "Creative Direction",
                "Marketing",
                "Design Engineering",
                "Rabbit Holes",
                "Earthships",
                "Pattern Recognition",
                "Micro-interactions",
                "3000 Tires",
                "Obsidian Vaults",
                "20 Years",
                "Recovering Maximalist",
              ].map((w) => (
                <span key={w} className="flex items-center gap-8">
                  {w}
                  <span className="size-2 bg-accent rounded-full" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Playground */}
      <section id="playground" className="px-6 py-20 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] opacity-50 mb-2">/01 — THE LAB</div>
            <h2 className="font-display text-5xl md:text-6xl uppercase tracking-tight">Open the toybox.</h2>
          </div>
          <div className="hidden md:block text-xs font-mono opacity-50 max-w-[20ch] text-right">
            Each tile is a live, working component. Touch everything.
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-2 aspect-[2/1] bg-surface border-2 border-primary rounded-3xl kinetic-border p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono tracking-widest opacity-50">01 / TOGGLE</span>
              <SpringToggle />
            </div>
            <div>
              <h3 className="font-display text-2xl uppercase">Spring Switch</h3>
              <p className="text-sm text-primary/60 mt-1">Cubic-bezier overshoot, no library.</p>
            </div>
          </div>

          <div className="aspect-square bg-surface border-2 border-primary rounded-3xl kinetic-border p-6 flex flex-col justify-between">
            <span className="text-[10px] font-mono tracking-widest opacity-50">02 / KNOB</span>
            <Knob />
          </div>

          <div className="aspect-square bg-accent text-surface border-2 border-primary rounded-3xl kinetic-border p-6 flex flex-col justify-between group cursor-pointer">
            <span className="text-[10px] font-mono tracking-widest opacity-70">03 / TILT</span>
            <div className="flex-1 grid place-items-center">
              <div className="size-16 bg-surface rounded-2xl transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-110 shadow-[0_8px_0_0_rgba(0,0,0,0.4)]" />
            </div>
            <div className="font-display text-lg uppercase leading-none">Hover me</div>
          </div>

          <div className="aspect-square bg-surface border-2 border-primary rounded-3xl kinetic-border p-6 flex flex-col justify-between overflow-hidden relative">
            <span className="text-[10px] font-mono tracking-widest opacity-50">04 / RIPPLE</span>
            <div className="absolute inset-0 grid place-items-center">
              <div className="size-8 rounded-full bg-secondary" />
              <div className="absolute size-8 rounded-full bg-secondary/40 animate-ping" />
              <div className="absolute size-8 rounded-full bg-secondary/20 animate-ping [animation-delay:0.4s]" />
            </div>
            <div className="font-display text-lg uppercase leading-none relative">Pulse</div>
          </div>

          <div className="col-span-2 aspect-[2/1] bg-primary text-surface border-2 border-primary rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group">
            <span className="text-[10px] font-mono tracking-widest opacity-50">05 / CURSOR FIELD</span>
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-6">
              {Array.from({ length: 72 }).map((_, i) => (
                <div key={i} className="border border-surface/5 hover:bg-accent transition-colors duration-150" />
              ))}
            </div>
            <div className="relative">
              <h3 className="font-display text-3xl uppercase">Cursor Field</h3>
              <p className="text-sm opacity-60 mt-1">Sweep across to paint the grid.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Thinking in webs */}
      <section id="obsessions" className="px-6 py-20 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] opacity-50 mb-2">// HOW THE BRAIN WORKS</div>
            <h2 className="font-display text-5xl md:text-6xl uppercase tracking-tight">Thinking in webs.</h2>
            <p className="mt-3 text-sm text-primary/60 max-w-[40ch]">
              Pull one thread. Watch what moves. Hover any node.
            </p>
          </div>
        </div>
        <ThinkingInWebs />
      </section>

      {/* Work */}
      <section id="work" className="px-6 py-20 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] opacity-50 mb-2">/02 — SELECTED OUTPUT</div>
            <h2 className="font-display text-5xl md:text-6xl uppercase tracking-tight">Selected work.</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ProjectCard
            project={{
              title: "BRAND STRATEGY",
              subtitle: "Strategy · Identity · Direction",
              tags: ["Strategy", "Identity", "Direction"],
            }}
          />
          <ProjectCard
            project={{
              title: "CAMPAIGN WORK",
              subtitle: "Marketing · Creative · Execution",
              tags: ["Marketing", "Creative", "Execution"],
            }}
          />
          <ProjectCard
            project={{
              title: "DIGITAL DESIGN",
              subtitle: "Web · UI · Interaction",
              tags: ["Web", "UI", "Interaction"],
            }}
          />
          <ProjectCard
            project={{
              title: "THE TIRE CHAPTER",
              subtitle: "Earthship · Off-grid · All in",
              tags: ["Earthship", "Off-grid", "All in"],
              accent: "orange",
            }}
          />
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-6 py-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-surface border-2 border-primary rounded-3xl kinetic-border p-10">
            <div className="text-[10px] font-mono tracking-[0.2em] opacity-50 mb-4">/03 — ABOUT</div>
            <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tight leading-[0.95] mb-6">
              Pull one thread.<br />Six others move.
            </h2>
            <p className="text-lg text-primary/70 leading-relaxed max-w-[55ch]">
              That's how my brain works — and honestly how my career works too. Brand strategy bleeds into systems thinking bleeds into app development bleeds into environmental design bleeds into an earthship made of 3,000 tires. I've spent 20 years going so deep into problems that the solutions surprise everyone, including me. The facets are many. They all connect. That's not chaos — that's how the good stuff gets made.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { k: "APPS BUILT FOR PEOPLE I LOVE", v: "2" },
              { k: "YEARS, ZERO HALF-ASSED PROJECTS", v: "20+" },
              { k: "CONSPIRACY VAULT (CLASSIFIED)", v: "1" },
            ].map((s) => (
              <div key={s.k} className="bg-surface border-2 border-primary rounded-2xl kinetic-border-sm p-5">
                <div className="font-display text-4xl">{s.v}</div>
                <div className="text-[11px] font-mono uppercase tracking-widest opacity-50 mt-1">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Footer */}
      <footer id="contact" className="border-t-2 border-primary bg-surface mt-20 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col gap-4">
              <div className="size-12 bg-accent rounded-xl mb-2 animate-float" />
              <h4 className="font-display text-3xl uppercase tracking-tight leading-none">If this reads like<br />your culture —</h4>
              <p className="text-sm text-primary/60">Looking for the right fit. Not just any fit.</p>
              <MagneticButton
                href="mailto:hello@handgwenade.com"
                className="mt-2 inline-flex items-center gap-3 bg-primary text-surface px-5 py-3 rounded-full font-medium text-sm w-fit"
              >
                <span className="size-2 bg-accent rounded-full" />
                hello@handgwenade.com
              </MagneticButton>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">Status</span>
              <div className="flex items-center gap-3 p-4 bg-bg border-2 border-primary rounded-xl kinetic-border-sm">
                <div className="relative size-3">
                  <div className="absolute inset-0 bg-accent rounded-full animate-ping" />
                  <div className="absolute inset-0 bg-accent rounded-full" />
                </div>
                <span className="text-sm font-medium">System: Operational</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-bg border-2 border-primary rounded-xl kinetic-border-sm mt-2">
                <div className="size-3 bg-secondary rounded-full" />
                <span className="text-sm font-medium">Currently: somewhere with good land</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-bg border-2 border-primary rounded-xl kinetic-border-sm mt-2">
                <div className="size-3 bg-primary rounded-full" />
                <span className="text-sm font-medium font-mono">LCL 14:32 CET</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">Socials</span>
              <div className="grid grid-cols-2 gap-2">
                {["GITHUB", "TWITTER", "READ.CV", "EMAIL"].map((s) => (
                  <a
                    key={s}
                    href="#"
                    data-cursor="hover"
                    className="p-3 border-2 border-primary rounded-xl text-center text-xs font-bold hover:bg-accent hover:text-surface transition-colors"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-primary/10 flex flex-wrap gap-4 justify-between items-center text-[10px] font-mono opacity-50">
            <span>v1.0.4 — STABLE</span>
            <span>NO COOKIES · NO TRACKING</span>
            <span>© 2026 ARLO VANCE</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

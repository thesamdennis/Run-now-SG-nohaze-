"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LatLng, Region, RegionVerdict } from "@/lib/verdict";

const LIGHT: Record<RegionVerdict["verdict"], { color: string; label: string }> = {
  GO: { color: "#22c55e", label: "GO" },
  GO_EASY: { color: "#f59e0b", label: "EASY" },
  SKIP: { color: "#ef4444", label: "SKIP" },
};

type Props = {
  regions: RegionVerdict[] | null;
  centres: Partial<Record<Region, LatLng>>;
  /** Shown if the device can't do 3D (no WebGL). */
  fallback: ReactNode;
  children?: ReactNode;
};

/** 3D voxel Singapore with floating, bouncing region badges on top. */
export default function VoxelMap({ regions, centres, fallback, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeRefs = useRef<Partial<Record<Region, HTMLAnchorElement | null>>>({});
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./scene")
      .then(({ createScene }) => {
        if (cancelled || !canvasRef.current) return;
        const s = createScene({
          canvas: canvasRef.current,
          regions,
          centres,
          animate: !reduceMotion,
          onBeacons: (pos) => {
            for (const [region, p] of Object.entries(pos)) {
              const el = badgeRefs.current[region as Region];
              if (el && p) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
            }
          },
        });
        dispose = s.dispose;
        setState("ready");
      })
      .catch((err) => {
        console.error("3D map unavailable", err);
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [regions, centres]);

  if (state === "failed")
    return (
      <div className="relative">
        {fallback}
        {children}
      </div>
    );

  return (
    <div className="vx-stage relative aspect-[16/10] w-full overflow-hidden lg:aspect-[16/9]">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
        role="img"
        aria-label="3D voxel map of Singapore showing air quality by region"
      />
      {state === "loading" && (
        <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-sky-900/70">Building Singapore…</div>
      )}

      {state === "ready" &&
        regions?.map((r, i) => {
          const light = LIGHT[r.verdict];
          return (
            <a
              key={r.region}
              ref={(el) => {
                badgeRefs.current[r.region] = el;
              }}
              href={`#routes-${r.region}`}
              aria-label={`${r.region}: PM2.5 ${r.pm25 ?? "unknown"}, ${light.label}. See routes`}
              className="absolute left-0 top-0 will-change-transform"
            >
              <span className="block -translate-x-1/2 -translate-y-full">
                <span className="vx-badge px-bounce flex items-center gap-1 py-0.5 pl-1 pr-1.5 sm:gap-2 sm:py-1.5 sm:pl-2 sm:pr-3" style={{ animationDelay: `${i * 0.22}s` }}>
                  <span className="vx-light h-2 w-2 sm:h-3.5 sm:w-3.5" style={{ background: light.color, color: light.color }} />
                  <span className="flex flex-col leading-none">
                    <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:block">{r.region}</span>
                    <span className="text-xs font-extrabold text-slate-900 sm:text-xl">{r.pm25 ?? "–"}</span>
                  </span>
                  <span className="hidden rounded-sm px-1.5 py-0.5 text-[10px] font-bold text-white sm:inline" style={{ background: light.color }}>
                    {light.label}
                  </span>
                </span>
              </span>
            </a>
          );
        })}
      {children}
    </div>
  );
}

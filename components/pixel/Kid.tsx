import { SPRITES, spriteRuns, spriteSize } from "./sprites";

export type KidMood = "run" | "easy" | "mask";

/** The pixel runner: happy and ready to go, or masked up wagging a finger at the haze. */
export default function Kid({ mood, className = "" }: { mood: KidMood; className?: string }) {
  const sprite = mood === "mask" ? SPRITES.kidMask : SPRITES.kidRun;
  const { w, h } = spriteSize(sprite);
  return (
    <div className={`relative ${className}`}>
      {mood === "mask" && <div className="px-kid-haze absolute -inset-3 rounded-full" aria-hidden />}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={`relative h-full w-full ${mood === "mask" ? "px-wag" : "px-run"}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={mood === "mask" ? "Runner wearing a mask, staying in" : "Happy runner ready to go"}
      >
        {spriteRuns(sprite).map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
        ))}
      </svg>
    </div>
  );
}

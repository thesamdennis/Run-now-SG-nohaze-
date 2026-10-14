"use client";

import { useEffect, useRef } from "react";
import type { KidMood } from "../pixel/Kid";
import { PALETTE, SPRITES } from "../pixel/sprites";

/** The voxel runner: a chunky 3D version of the pixel kid that sways and bobs. */
export default function VoxelKid({ mood, className = "" }: { mood: KidMood; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    Promise.all([import("three"), import("./models")]).then(([THREE, M]) => {
      const canvas = ref.current;
      if (cancelled || !canvas) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(-6, 10, 12);
      scene.add(key);

      const sprite = mood === "mask" ? SPRITES.kidMask : SPRITES.kidRun;
      const palette = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, parseInt(v.slice(1), 16)]));
      const vox = M.voxelizeSprite(sprite, palette, (ch, row) => (row <= 11 ? 2 : ch === "A" ? 2 : 1));
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), vox.length);
      const m = new THREE.Matrix4();
      const w = Math.max(...sprite.map((r) => r.length));
      vox.forEach(([x, y, z, col], i) => {
        mesh.setMatrixAt(i, m.makeTranslation(x - w / 2 + 0.5, y + 0.5, z));
        mesh.setColorAt(i, new THREE.Color(col));
      });
      const kid = new THREE.Group();
      kid.add(mesh);
      scene.add(kid);

      const camera = new THREE.PerspectiveCamera(30, 1, 1, 200);
      camera.position.set(0, 14, 62);
      camera.lookAt(0, 11, 0);

      const resize = () => {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (!cw || !ch) return;
        renderer.setSize(cw, ch, false);
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
      };
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let raf = 0;
      const loop = (t: number) => {
        const s = t / 1000;
        kid.rotation.y = -0.45 + Math.sin(s * 0.9) * 0.22;
        kid.position.y = mood === "mask" ? 0 : Math.abs(Math.sin(s * 4)) * 0.8;
        kid.rotation.z = mood === "mask" ? Math.sin(s * 3) * 0.04 : 0;
        renderer.render(scene, camera);
        if (!still) raf = requestAnimationFrame(loop);
      };
      resize();
      raf = requestAnimationFrame(loop);
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        geo.dispose();
        renderer.dispose();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mood]);

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={mood === "mask" ? "Runner wearing a mask, staying in" : "Happy runner ready to go"}
    />
  );
}

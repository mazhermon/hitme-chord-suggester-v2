---
name: animation-perf
description: Performance patterns and gotchas for high-count animated scenes — Three.js / R3F instancing, React state vs ref, audio engine pitfalls, GC discipline, long-run stability. Reach for this when building generative/particle/sim work that needs to stay smooth.
version: 0.1.0
user-invocable: false
---

# Animation perf — patterns that actually moved the needle

These are bottlenecks I've personally hit and fixed in this codebase
(LifeFigure: 150 dots on a torus knot, going 12fps → 60fps headless).
Read top-to-bottom before optimising; they're listed in rough order of
how often they bite.

## 1. One draw call per particle is the most common killer

Drei's `<Line>`, individual `<mesh>` per dot, etc. — each is a separate
draw call. Browsers happily do thousands per frame on a real GPU, but
each call also has CPU-side overhead (uniforms, state changes) that
piles up in the JS frame budget.

**Fix:** merge geometry where possible.
- Wireframe edges → one `<lineSegments>` over a single `BufferGeometry`
  with all segment endpoints, instead of N `<Line>` components.
- N moving spheres → one `<instancedMesh>` with `setMatrixAt(i, m)` and
  a custom per-instance attribute for colour.

**Concrete win:** 120 wireframe edges as `<Line>` components → one
`<lineSegments>`. Took LifeFigure from ~12fps to ~30fps on its own.

## 2. Three's `vertexColors` + `instanceColor` shader path is fragile

I spent over an hour fighting this. With `<instancedMesh>` +
`MeshBasicMaterial({ vertexColors: true })`, the per-instance colour
buffer (`instanceColor`) is supposed to flow into the shader via
`USE_INSTANCING_COLOR`. In practice, even with `material.needsUpdate =
true` after allocating `instanceColor`, the shader was rendering pure
black. R3F prop ordering, drei's `Instances`, manual InstancedMesh —
all failed in different ways.

**Fix that worked:** stop using `vertexColors`/`instanceColor` and
write a tiny `ShaderMaterial` with a custom attribute name (e.g.
`aDotColor`):

```ts
const dotMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    attribute vec3 aDotColor;
    varying vec3 vColor;
    void main() {
      vColor = aDotColor;
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() { gl_FragColor = vec4(vColor, 1.0); }
  `,
})

// In an effect, before the first frame:
mesh.geometry.setAttribute(
  'aDotColor',
  new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3)
    .setUsage(THREE.DynamicDrawUsage),
)
```

`instanceMatrix` is auto-injected for InstancedMesh by ShaderMaterial;
`aDotColor` you declare yourself, so there's no name collision when
Three flips `USE_INSTANCING_COLOR` on later. Bulletproof.

## 3. React state during render is for topology, not motion

A common shape is "useState the dots, render an Instance per dot".
Every collision setState → React reconciles N children → matrix re-
upload. At 150 dots with bursts of collisions, this is the bottleneck.

**Fix:** fixed-size pool of slots in the JSX (e.g. `Array.from({length:
MAX}).map(...)` — keys are slot indices, never change). Per-frame, walk
your sim state and write directly to the InstancedMesh:

```ts
mesh.setMatrixAt(slot, mat)
mesh.instanceMatrix.needsUpdate = true
mesh.count = liveCount   // GPU skips parked slots, no need to "park"
```

Topology changes (spawned/died) only affect a `liveCount` number; the
React tree never re-renders during steady-state.

## 4. `Array.splice(i, 1)` in a loop is O(n²)

Compaction-of-dead-items via:

```ts
for (let i = arr.length - 1; i >= 0; i--) {
  if (!arr[i].alive) arr.splice(i, 1)
}
```

is fine when very few die, but every interior splice shifts everything
after it. Cascade events (many die at once) drop you off a cliff.

**Fix:** single-pass write-pointer compaction.

```ts
let w = 0
for (let r = 0; r < arr.length; r++) {
  if (arr[r].alive) {
    if (w !== r) arr[w] = arr[r]
    w++
  }
}
arr.length = w
```

O(n) regardless. Same idea applies anywhere you "filter in place".

## 5. The hot loop must not allocate

Per-frame `new`, `new Map`, `[]`, fresh closures — every one is GC
pressure. Even small allocations add up at 60fps × hundreds of items.

**Patterns:**
- Pre-allocate scratch arrays at module scope: `const POSITIONS = new
  Float32Array(MAX * 3)`.
- For collision buckets: linked-list via `Int32Array(MAX)` indexed by
  item index (`BUCKET_NEXT[i]` = next item in same bucket, `-1` =
  end). Reusable across frames; "clear" is just overwriting heads.
- Walk the linked list directly — no intermediate `ids: number[]`
  array per bucket.
- Reuse THREE.Object3D / THREE.Color singletons at module scope
  (`TMP_OBJECT`, `TMP_COLOR`) instead of creating per call.

## 6. `Map.forEach` is fine; `Array.from(map.keys())` is not

`Map.forEach((v, k) => ...)` and `for (const v of map.values())` don't
allocate visible arrays — they iterate. `Array.from(map.keys())` does.
The cost shows up under load.

## 7. WebAudio: throttle and keep voices small

Each oscillator+gain node is cheap individually, but cascade events
spawn dozens per frame. The audio graph buffers everything scheduled,
which the OS audio thread mixes — at some point it pushes back.

**Patterns:**
- Throttle each event class with a min-gap (e.g. 28-60ms): track
  `last = performance.now()`, bail if gap too small.
- Cap oscillator count per event. I went from 7-voice arpeggios to
  3-voice arpeggios with no audible loss.
- Use `osc.start(t)` / `osc.stop(t)` so nodes self-clean after their
  schedule expires.
- Lazy-init the AudioContext and master gain on first user gesture
  (browsers require a gesture to start audio anyway).
- For "muted" variants of the component, swap in a `SilentAudio`
  subclass with no-op methods rather than gating every call site.

## 8. DPR cap on retina

`<Canvas dpr={[1, 2]}>` means up to 2x — that's 4x the fragments on
HiDPI. For atmospheric backgrounds where you don't need pixel-sharp,
`dpr={[1, 1.5]}` is invisible visually and cuts ~44% of fragment work.

## 9. Reduce geometry tessellation

`SphereGeometry(1, 12, 12)` = 288 triangles. Drop to `(1, 8, 8)` = 128.
At 150 instances, that's 24k vs 43k triangles — both trivial for GPU,
but vertex-shader cost scales linearly. Unless your sphere fills a lot
of screen, 8×8 is indistinguishable.

## 10. Long-run stability: telemetry > guessing

When the user says "it gets laggy after a while," don't add fixes
speculatively. Run a measurement loop:

```ts
async function profileWindows({ windows = 30, durationMs = 6000 }) {
  const out = []
  const wallStart = performance.now()
  for (let i = 0; i < windows; i++) {
    const start = performance.now()
    let frames = 0
    await new Promise<void>((res) => {
      const tick = () => {
        frames++
        if (performance.now() - start < durationMs)
          requestAnimationFrame(tick)
        else res()
      }
      requestAnimationFrame(tick)
    })
    out.push({
      t: ((performance.now() - wallStart) / 1000).toFixed(0),
      fps: (frames / ((performance.now() - start) / 1000)).toFixed(1),
      heap: (performance as any).memory
        ? ((performance as any).memory.usedJSHeapSize / 1048576).toFixed(1)
        : 'n/a',
    })
  }
  return out
}
```

Run for 3+ minutes. If FPS is flat and heap oscillates without
trending up, you don't have a leak — the user was probably running an
older build (or a tab with HMR-leaked state).

## 11. Headless Playwright benchmarks lie

Headless Chromium uses SwiftShader (software GL). Real GPUs are 5-30×
faster. If you need to compare, compare *deltas* (before/after the
change) not absolute numbers. 12fps → 60fps headless is a real win;
"60fps headless" doesn't tell you what the user's M1/RTX will do.

## 12. R3F priority ordering for `useFrame` consumers

If a parent's `useFrame` mutates `position`/`scale` on objects that a
child component (like drei's `Instances`) reads via `matrixWorld`, the
child can read STALE values because React's commit/render order
doesn't match useFrame priority. Either:
- Call `obj.updateMatrixWorld(true)` after mutation, or
- Set explicit priorities on `useFrame(fn, priority)` so the parent
  runs first, or
- Skip the child wrapper entirely and write the mesh state directly
  (this is what I ended up doing in LifeFigure).

## 13. The shape of the data matters as much as the algorithm

Edge-bucketed collision (Σ kₑ² where kₑ ≈ 1-3) beats N² for any non-
trivial item count. If items live on a discrete graph (edges,
voxels, grid cells), bucket by their cell id and only check pairs in
the same cell. Two-pointer walks over linked lists keep allocation at
zero.

## 14. Cascade containment

A simulation rule that spawns N children on each event can blow up:
N=7 spawn × 100 same-frame events = 700 new items immediately.
Cap (`SHATTER_PIECES = 4`), put a hard population ceiling
(`MAX_DOTS`), and prune by some priority (oldest small dots first)
when overflowing. The visual cost of "we capped" is much smaller than
the perf cost of "we let it explode."

## When to invoke

Use these patterns when:
- You're building a particle/sim/generative scene with > ~50 moving items.
- The user reports "smooth at first, gets laggy" — start with
  long-run telemetry (#10), then GC pressure (#5), then audio (#7).
- You see "it works at 30 dots, dies at 200" — almost certainly draw
  calls (#1) or React-state-per-item (#3).

When you fix something, capture the *delta* (before/after fps + heap)
in the commit message so future-you can tell if it actually helped.

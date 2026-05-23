# New Project Setup — Bootstrap Prompt

Open Claude Code in a **new, empty directory** on this same Mac, then paste the prompt
in the box below. It scaffolds a fresh Next.js 16 project matching this repo's stack and
brings over the project-local skills.

## Why this works

- **User-level plugins carry over automatically.** These are installed globally in `~/.claude/`
  and are available in any Claude session on this machine — nothing to reinstall:
  `superpowers`, `frontend-design`, `figma`, `playwright`, `supabase`, `skill-creator`,
  `ui-ux-pro-max`, `ralph-loop`, `firebase`.

- **Project-local skills must be copied** (they live inside this repo, not `~/.claude/`):
  - `.agents/skills/` → the 29 **impeccable** design skills (impeccable, the _-taste /
    _-ui design systems, animate, polish, audit, layout, critique, distill, bolder, quieter,
    shape, typeset, optimize, delight, colorize, clarify, adapt, brandkit, overdrive, …),
    surfaced via symlinks in `.claude/skills/`.
  - Two hand-written custom skills: **`animation-perf`** and **`splat-library`**.
  - `.impeccable.md` → design-context file (recreated fresh per project, not copied).

> If the new project won't be generative/3D, you can delete `animation-perf` and
> `splat-library` after copying. Re-run `/impeccable teach` for the new product rather than
> inheriting this portfolio's design context.

---

## The prompt — copy everything below this line

```
I'm bootstrapping a brand-new project in this (currently empty) directory. I want it to start
with the same stack and the same skill setup as my existing project at:

    /Users/mazhermon/Sites/mazhermondotcomv2

Do NOT build any product features yet — this task is ONLY scaffolding + tooling + skills.
After it's set up and verified green, stop and check in with me; we'll brainstorm the actual
product separately.

=== STEP 1: Bring over my project-local skills ===
My user-level plugins (superpowers, frontend-design, figma, playwright, supabase, skill-creator,
ui-ux-pro-max, ralph-loop, firebase) are installed globally and already available here — confirm
with the Skill tool list, don't reinstall them.

But these skills live INSIDE the source project and must be copied. Run:

    SRC=/Users/mazhermon/Sites/mazhermondotcomv2
    cp -R "$SRC/.agents" .agents              # 29 "impeccable" design skills
    mkdir -p .claude
    cp -R "$SRC/.claude/skills" .claude/skills # symlinks into .agents + 2 custom skills

Then verify: `ls -la .claude/skills` should show the impeccable design skills as symlinks that
resolve (impeccable, animate, polish, audit, layout, critique, distill, bolder, quieter, shape,
typeset, optimize, delight, colorize, clarify, adapt, brandkit, overdrive, and the *-taste /
*-ui design-system skills), PLUS two real custom-skill dirs: `animation-perf` and `splat-library`.
If any symlink is broken, re-copy preserving links (`cp -RP`). These are the design + creative
skills I rely on alongside superpowers.

=== STEP 2: Scaffold the Next.js stack (match the source exactly) ===
Stack: Next.js 16.2.2, React 19.2.4, TypeScript (strict), CSS Modules (NO Tailwind, NO PostCSS),
App Router, src/ directory, @/* path alias. Creative libs: GSAP (gsap + @gsap/react), and
Three.js (three + @react-three/fiber + @react-three/drei).

IMPORTANT — read AGENTS.md below first: this is a newer Next.js than your training data. Before
writing ANY Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.

Copy these config files VERBATIM from the source project (they're tuned and tested):
    - tsconfig.json          (strict, @/* -> ./src/*, vitest globals)
    - eslint.config.mjs      (flat config, eslint-config-next core-web-vitals + typescript)
    - vitest.config.ts       (jsdom, setupFiles ./src/__tests__/setup.ts, @ alias)
    - playwright.config.ts    (chromium/firefox/webkit, webServer = npm run dev on :3000)
    - next.config.ts
    - AGENTS.md              (the "This is NOT the Next.js you know" rule)
    - .gitignore
    - .husky/pre-commit

Create CLAUDE.md containing exactly:  @AGENTS.md
Create src/__tests__/setup.ts (copy from source — it imports jest-dom and mocks window.matchMedia).

package.json: name it after this new folder, keep these scripts and deps:
    scripts: dev="next dev", build="next build", start="next start", lint="eslint",
             test="vitest", test:run="vitest run", e2e="playwright test", e2e:ui="playwright test --ui",
             format="prettier --write .", format:check="prettier --check .", prepare="husky"
    dependencies: next@16.2.2, react@19.2.4, react-dom@19.2.4, gsap@^3.14.2, @gsap/react@^2.1.2,
             three@^0.184.0, @react-three/fiber@^9.6.1, @react-three/drei@^10.7.7
    devDependencies: typescript@^5, @types/node@^20, @types/react@^19, @types/react-dom@^19,
             @types/three@^0.184.1, eslint@^9, eslint-config-next@16.2.2, prettier@^3.8.1,
             husky@^9.1.7, vitest@^4.1.3, @vitejs/plugin-react@^6.0.1, jsdom@^29.0.2,
             @testing-library/react@^16.3.2, @testing-library/dom@^10.4.1,
             @testing-library/jest-dom@^6.9.1, @testing-library/user-event@^14.6.1
    (use latest compatible if a pinned version errors)

=== STEP 3: Install & verify ===
    git init
    npm install
    npx husky init    (then restore my .husky/pre-commit content)
Create a minimal src/app (layout.tsx + page.tsx) and one trivial passing Vitest test so the
toolchain is exercised. Then run and show me green output for: `npm run build`, `npm run test:run`,
`npm run lint`. Use the superpowers verification-before-completion discipline — evidence, not claims.

=== STEP 4: Fresh design context ===
This is a NEW product, so do not copy the old portfolio's design context. Run `/impeccable teach`
to capture THIS project's audience, brand personality, and aesthetic direction into a new
.impeccable.md. (You can read the source's .impeccable.md only as a format reference.)

=== When done ===
Summarize what was created, confirm the skills resolve, paste the green build/test/lint output,
and ask me what we're building so we can brainstorm it (use superpowers:brainstorming) before
writing feature code.
```

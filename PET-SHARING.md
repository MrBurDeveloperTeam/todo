# Todo shared cat

Todo and its pet-function dependency use version **0.12.2**.
The manifest and lockfile target GitHub tag `v0.12.2`, resolving to
`8a1993a66d60087829519c053ee7de0ed3475320`. The npm build approval matches
that release commit. No sibling-folder link is configured.
Canonical source is maintained in the separate `intern/pet-function` repository.

Shared: cat/pet interface, care and game runtime, AI chat presentation,
options/resources, and the shared mini-games.
`src/petExperience/MeowdokuLauncher.tsx` only supplies Todo's account and adapters.

Local: task-aware dialogue/queries in `src/components/CatMascot.jsx`,
business/data orchestration in `src/aiExperience/todoMolarAdapter.ts`,
and persistence in `src/petExperience/todoPetRepository.ts`.
The original account, geolocation and currency wiring remains local.
No database schema or live records were changed.

`scripts/prepare-pet.mjs` restores and verifies the installed release's resource
packs and prepares non-game images before every dev/build.
The shared Vite plugin serves games directly from the installed package in development
and emits identical package files to `dist/games` during builds.
The postbuild script splits oversized WASM and PCK files, verifies their bytes,
and patches Godot loaders to reconstruct them, including Kart Racing's shared
engine. All deployment assets must remain within 25 MiB.
No executable old copies remain in `public/games`.
The historical image URL folder `molar-experience` is not an old package dependency.

```
npm run build
node node_modules/typescript/bin/tsc --noEmit
npm run verify:pet
node --test tests/cloudflare-game-assets.node-test.mjs
```

Test authenticated task-aware dialogue, care/shop balances, all game rewards,
Meowdoku progress/check-in, and sign-out/account switching manually.
Game presentation follows the shared calculator baseline.
Updating shared source alone does not update deployed applications: release a new version/tag,
update the dependency and lockfile, then rebuild/redeploy Todo.
No paid import operation or new paid service was added.

Resource verification compares every emitted game file with the installed
release, reconstructs split WASM/PCK byte-for-byte, and checks deployment asset
sizes. Run it after the production build. The resource regression tests use
temporary local files and mocked fetch; no real database or AI calls are needed.
No database migration is required for this version update.
Commit the manifest, regenerated lockfile, resource scripts, documentation and
regression tests together. Generated dist and public/pet-function stay untracked.

TypeScript module resolution now uses Bundler to recognize package exports.
The full type check passes with the installed v0.12.2 dependency; the seven
errors documented during the original migration no longer reproduce.
The package lockfile is no longer ignored and should be committed with the dependency change.

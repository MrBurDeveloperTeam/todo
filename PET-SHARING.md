# Todo shared cat

Todo imports `@mrburdeveloperteam/pet-function` from GitHub tag `v0.9.10`.
Canonical source is maintained in the separate `intern/pet-function` repository.

Shared: cat/pet interface, care and game runtime, AI chat presentation,
options/resources, and Flappy Cat, Pac-Cat, Tetris and Meowdoku.
`src/petExperience/MeowdokuLauncher.tsx` only supplies Todo's account and adapters.

Local: task-aware dialogue/queries in `src/components/CatMascot.jsx`,
business/data orchestration in `src/aiExperience/todoMolarAdapter.ts`,
and persistence in `src/petExperience/todoPetRepository.ts`.
The original account, geolocation and currency wiring remains local.
No database schema or live records were changed.

`scripts/prepare-pet.mjs` prepares non-game images before every dev/build.
The shared Vite plugin serves games directly from the installed package in development
and emits identical package files to `dist/games` during builds.
No executable old copies remain in `public/games`.
The historical image URL folder `molar-experience` is not an old package dependency.

```
npm run build
node scripts/verify-pet.mjs
```

Test authenticated task-aware dialogue, care/shop balances, all game rewards,
Meowdoku progress/check-in, and sign-out/account switching manually.
Game presentation follows the shared calculator baseline.
Updating shared source alone does not update deployed applications: release a new version/tag,
update the dependency and lockfile, then rebuild/redeploy Todo.
No paid import operation or new paid service was added.

Validation: production build passed and all 82 output game files match the installed package.
TypeScript module resolution now uses Bundler to recognize package exports.
The full type check still reports seven errors in unchanged task-chat/Home definitions
(unknown task/list types, nullable Supabase client, and a missing Home prop declaration).
The package lockfile is no longer ignored and should be committed with the dependency change.

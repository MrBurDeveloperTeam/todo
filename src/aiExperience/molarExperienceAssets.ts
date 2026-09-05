// Stable, non-hashed To-Do Manager public URLs for
// @mrburdeveloperteam/molar-experience@0.6.1's file-backed static assets
// (Cat spritesheets, Molar logo, Virtual Pet sprites/beds/care images).
//
// Vite/production-build tooling cannot statically discover and copy the
// package's own internally-bundled asset references (opaque
// `./<name>-<hash>.<ext>` strings produced by the shared package's
// tsup/esbuild `file` loader), which causes 404s for these assets under a
// built host. 0.6.0+ adds optional override props
// (`spriteSheetUrls`/`logoUrl`/`assetUrls`) specifically so a host can
// supply its own stable, host-served copies instead. The bytes for every
// file below are copied verbatim (sha256-verified) from the installed
// 0.6.1 package into `public/molar-experience/**`.
//
// These are deterministic constants only — no runtime computation, and no
// package build-hash ever appears here or anywhere else in host source.
import type { SharedCatPetId } from '@mrburdeveloperteam/molar-experience/cat';

export const CAT_SPRITE_SHEET_URLS: Record<SharedCatPetId, string> = {
  mallow: '/molar-experience/pets/mallow-spritesheet.webp',
  silverbelt: '/molar-experience/pets/silverbelt-spritesheet.webp',
  fastrat: '/molar-experience/pets/fastrat-spritesheet.webp',
  gulu: '/molar-experience/pets/gulu-spritesheet.webp',
  munchkin: '/molar-experience/pets/munchkin-spritesheet.webp',
  mochi: '/molar-experience/pets/mochi-spritesheet.webp',
};

export const MOLAR_LOGO_URL = '/molar-experience/ai/ai_logo.png';

// `PetAssetUrls` is not currently nameable from the package's published
// `./pet` entrypoint (a known, separate declaration-bundling gap — see
// Content Studio's own equivalent audit) even though the `assetUrls` prop
// itself is fully functional. Left structurally typed rather than
// annotated with an imported name; TypeScript checks `SharedVirtualPet`'s
// prop by shape, not by this type's name, so this has no runtime or
// type-safety effect.
export const PET_ASSET_URLS = {
  spriteSheets: CAT_SPRITE_SHEET_URLS,
  beds: {
    grey: '/molar-experience/pet/grey_bed.png',
    red: '/molar-experience/pet/red_bed.png',
    purple: '/molar-experience/pet/purple_bed.png',
  },
  care: {
    poop: '/molar-experience/pet/poop.png',
    shower: '/molar-experience/pet/shower.png',
    soap: '/molar-experience/pet/soap.png',
  },
};

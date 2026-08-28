// Copies the pre-built brackets-viewer browser bundle (JS + CSS) out of
// node_modules and into `public/vendor/brackets-viewer/` so it can be served
// as a static asset and loaded with <Script>.
//
// Why: `brackets-viewer` ships only a webpack IIFE bundle that assigns
// `window.bracketsViewer` — its package "main" points at a file that doesn't
// exist, so it can't be imported as a module. Loading it as a plain browser
// script is the intended (and most reliable) usage.
//
// Runs on `postinstall`, and again at the start of `build`/`dev`, so the
// vendored copy always matches the installed package version.

import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

try {
  const distDir = join(process.cwd(), "node_modules", "brackets-viewer", "dist");
  const outDir = join(process.cwd(), "public", "vendor", "brackets-viewer");

  const files = ["brackets-viewer.min.js", "brackets-viewer.min.css"];

  if (existsSync(distDir)) {
    mkdirSync(outDir, { recursive: true });
    for (const file of files) {
      const srcFile = join(distDir, file);
      if (existsSync(srcFile)) {
        copyFileSync(srcFile, join(outDir, file));
      }
    }
    console.log(`✓ vendored brackets-viewer → ${outDir}`);
  }
} catch (err) {
  console.warn("⚠️ Could not vendor brackets-viewer:", err.message);
}

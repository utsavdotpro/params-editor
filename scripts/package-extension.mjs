import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.env.DIST_DIR || "dist");
const manifestPath = path.join(distDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error(`Production build is missing ${manifestPath}. Run pnpm run build:prod first.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (typeof manifest.version !== "string" || manifest.version.trim() === "") {
  console.error(`${manifestPath} has no version`);
  process.exit(1);
}

const sourceManifestPath = path.resolve("public/manifest.json");
const packagePath = path.resolve("package.json");
if (fs.existsSync(sourceManifestPath) && fs.existsSync(packagePath)) {
  const sourceVersion = JSON.parse(fs.readFileSync(sourceManifestPath, "utf8")).version;
  const packageVersion = JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
  if (manifest.version !== sourceVersion || manifest.version !== packageVersion) {
    console.error(
      `Refusing to zip because versions differ. dist=${manifest.version} source=${sourceVersion} package=${packageVersion}. Bump before the production build so the packed manifest matches.`,
    );
    process.exit(1);
  }
}

const outDir = path.resolve(process.env.ZIP_DIR || ".");
fs.mkdirSync(outDir, { recursive: true });
const zipName = `params-editor-${manifest.version}.zip`;
const zipPath = path.join(outDir, zipName);
if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

const python = `
import os, sys, zipfile
dist, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for root, dirs, files in os.walk(dist):
        dirs.sort()
        for name in sorted(files):
            full = os.path.join(root, name)
            arc = os.path.relpath(full, dist).replace(os.sep, "/")
            if arc.startswith("dist/") or arc.endswith(".map"):
                raise SystemExit(f"unexpected zip entry: {arc}")
            archive.write(full, arc)
    names = archive.namelist()
if "manifest.json" not in names:
    raise SystemExit("manifest.json is not at the zip root")
if any(name.startswith("dist/") or name.startswith("/") for name in names):
    raise SystemExit("zip entries must be relative to dist/, with manifest.json at the root")
print("\\n".join(names))
`;

const result = spawnSync("python3", ["-c", python, distDir, zipPath], { encoding: "utf8" });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "zip failed");
  process.exit(result.status || 1);
}

console.log(`Wrote ${zipPath}`);
console.log("Zip root entries:");
for (const line of result.stdout.split("\n")) {
  if (line.trim()) console.log(`  ${line}`);
}
console.log(`ZIP_PATH=${zipPath}`);

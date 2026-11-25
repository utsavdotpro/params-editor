import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("zip puts manifest.json at the archive root", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "params-zip-"));
  const dist = path.join(dir, "dist");
  fs.mkdirSync(path.join(dist, "icons"), { recursive: true });
  const manifest = {
    manifest_version: 3,
    name: "Params Editor",
    version: "1.2.2",
  };
  fs.writeFileSync(path.join(dist, "manifest.json"), `${JSON.stringify(manifest)}\n`);
  fs.writeFileSync(path.join(dist, "background.js"), "console.log('ok');\n");
  fs.writeFileSync(path.join(dist, "icons", "icon16.png"), "png");
  fs.mkdirSync(path.join(dir, "public"), { recursive: true });
  fs.writeFileSync(path.join(dir, "public", "manifest.json"), `${JSON.stringify(manifest)}\n`);
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify({ name: "params-editor", version: "1.2.2" })}\n`,
  );

  const result = spawnSync(process.execPath, [path.resolve("scripts/package-extension.mjs")], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, DIST_DIR: dist, ZIP_DIR: dir },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const zipPath = path.join(dir, "params-editor-1.2.2.zip");
  assert.equal(fs.existsSync(zipPath), true);
  const listing = spawnSync("python3", ["-c", "import sys,zipfile; print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))", zipPath], {
    encoding: "utf8",
  });
  const names = listing.stdout.trim().split("\n");
  assert.ok(names.includes("manifest.json"));
  assert.ok(names.includes("icons/icon16.png"));
  assert.equal(names.some((name) => name.startsWith("dist/")), false);
});

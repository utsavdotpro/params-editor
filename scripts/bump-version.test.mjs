import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import { bumpVersionFiles } from "./bump-version.mjs";

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "params-bump-"));
  const manifestPath = path.join(dir, "manifest.json");
  const packagePath = path.join(dir, "package.json");
  const manifest = {
    manifest_version: 3,
    name: "Params Editor",
    version: "1.2.2",
    description: "Edit URL query parameters",
  };
  const packageJson = {
    name: "params-editor",
    version: "1.2.2",
    scripts: { build: "webpack" },
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return { dir, manifestPath, packagePath };
}

test("bumps both files together and preserves other keys", () => {
  const { manifestPath, packagePath } = fixture();
  const result = bumpVersionFiles({ manifestPath, packagePath, bumpType: "patch" });
  assert.deepEqual(result, { previous: "1.2.2", next: "1.2.3", bumpType: "patch" });
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).version, "1.2.3");
  assert.equal(JSON.parse(fs.readFileSync(packagePath, "utf8")).scripts.build, "webpack");
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).name, "Params Editor");
});

test("refuses to bump when package.json and the manifest disagree", () => {
  const { manifestPath, packagePath } = fixture();
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  packageJson.version = "9.9.9";
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  assert.throws(() => bumpVersionFiles({ manifestPath, packagePath, bumpType: "patch" }), /differ/);
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).version, "1.2.2");
});

test("a lower VERSION_FLOOR does not decrease the current version", () => {
  const { manifestPath, packagePath } = fixture();
  const result = bumpVersionFiles({
    manifestPath,
    packagePath,
    bumpType: "patch",
    floor: "1.0.0",
  });
  assert.equal(result.next, "1.2.3");
});

test("VERSION_FLOOR raises a stale checkout before the patch bump", () => {
  const { manifestPath, packagePath } = fixture();
  const result = bumpVersionFiles({
    manifestPath,
    packagePath,
    bumpType: "patch",
    floor: "1.4.0",
  });
  assert.deepEqual(result, { previous: "1.4.0", next: "1.4.1", bumpType: "patch" });
  assert.equal(JSON.parse(fs.readFileSync(packagePath, "utf8")).version, "1.4.1");
});

test("CLI prints the bump and exits 0", () => {
  const { dir, manifestPath, packagePath } = fixture();
  const result = spawnSync(process.execPath, ["scripts/bump-version.mjs", "minor"], {
    cwd: path.resolve("."),
    env: { ...process.env, MANIFEST_PATH: manifestPath, PACKAGE_PATH: packagePath },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1\.2\.2 to 1\.3\.0/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).version, "1.3.0");
});

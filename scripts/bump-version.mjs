import fs from "node:fs";
import path from "node:path";

import { bumpSemver, compareVersions, setVersionInJsonText } from "./version-lib.mjs";

const manifestPath = process.env.MANIFEST_PATH || "public/manifest.json";
const packagePath = process.env.PACKAGE_PATH || "package.json";
const bumpType = process.argv[2] || "patch";

export function readJsonVersion(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(text);
  if (typeof parsed.version !== "string" || parsed.version.trim() === "") {
    throw new Error(`${filePath} must contain a string version`);
  }
  return { text, version: parsed.version };
}

export function bumpVersionFiles({
  manifestPath: manifestFile = manifestPath,
  packagePath: packageFile = packagePath,
  bumpType: type = bumpType,
  floor = process.env.VERSION_FLOOR || "",
} = {}) {
  let manifest = readJsonVersion(manifestFile);
  let packageJson = readJsonVersion(packageFile);

  if (manifest.version !== packageJson.version) {
    throw new Error(
      `Refusing to bump because versions differ. ${path.basename(manifestFile)} is ${manifest.version} and ${path.basename(packageFile)} is ${packageJson.version}. Make them match, then bump once.`,
    );
  }

  let baseline = manifest.version;
  if (floor && compareVersions(floor, baseline) > 0) {
    fs.writeFileSync(manifestFile, setVersionInJsonText(manifest.text, floor));
    fs.writeFileSync(packageFile, setVersionInJsonText(packageJson.text, floor));
    manifest = readJsonVersion(manifestFile);
    packageJson = readJsonVersion(packageFile);
    baseline = floor;
  }

  const nextVersion = bumpSemver(baseline, type);
  fs.writeFileSync(manifestFile, setVersionInJsonText(manifest.text, nextVersion));
  fs.writeFileSync(packageFile, setVersionInJsonText(packageJson.text, nextVersion));

  return { previous: baseline, next: nextVersion, bumpType: type };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (invokedDirectly) {
  try {
    const result = bumpVersionFiles();
    console.log(
      `Bumped ${result.bumpType} version from ${result.previous} to ${result.next} in ${manifestPath} and ${packagePath}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

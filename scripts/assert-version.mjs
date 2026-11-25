import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { assertStrictlyGreater, compareVersions } from "./version-lib.mjs";

const manifestPath = process.env.MANIFEST_PATH || "public/manifest.json";
const packagePath = process.env.PACKAGE_PATH || "package.json";

function readVersion(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (typeof parsed.version !== "string" || parsed.version.trim() === "") {
    throw new Error(`${filePath} must contain a string version`);
  }
  return parsed.version;
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} needs a value`);
  }
  return value;
}

export function versionsInSync(manifestVersion, packageVersion) {
  if (manifestVersion !== packageVersion) {
    throw new Error(
      `public/manifest.json version ${manifestVersion} and package.json version ${packageVersion} are out of sync.`,
    );
  }
}

function parentManifestVersion() {
  try {
    const text = execFileSync("git", ["show", "HEAD^:public/manifest.json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const parsed = JSON.parse(text);
    if (typeof parsed.version !== "string") {
      throw new Error("Parent manifest has no string version");
    }
    return parsed.version;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read public/manifest.json from the parent commit, so this tag does not prove the version increased. ${detail}`,
    );
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (invokedDirectly) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function runCli() {
  const manifestVersion = readVersion(manifestPath);
  const packageVersion = readVersion(packagePath);
  versionsInSync(manifestVersion, packageVersion);

  const previous = argValue("--previous");
  if (previous) {
    assertStrictlyGreater(manifestVersion, previous, "the pre-bump version");
  }

  const equals = argValue("--equals");
  if (equals) {
    const expected = equals.replace(/^v/, "");
    if (compareVersions(manifestVersion, expected) !== 0) {
      throw new Error(
        `Tag version ${expected} does not match manifest version ${manifestVersion}. Refusing to upload because the Chrome Web Store version would not match the git tag.`,
      );
    }
  }

  if (process.argv.includes("--greater-than-parent")) {
    const parentVersion = parentManifestVersion();
    assertStrictlyGreater(manifestVersion, parentVersion, "the parent commit version");
    console.log(`Version ${manifestVersion} is greater than parent ${parentVersion}`);
  } else if (previous) {
    console.log(`Version ${manifestVersion} is greater than ${previous}`);
  } else {
    console.log(`Versions in sync at ${manifestVersion}`);
  }
}

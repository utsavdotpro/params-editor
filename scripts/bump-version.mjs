import fs from "node:fs";

const manifestPath = "public/manifest.json";
const packagePath = "package.json";
const bumpType = process.argv[2] || "patch";
const validBumpTypes = new Set(["major", "minor", "patch"]);

if (!validBumpTypes.has(bumpType)) {
  throw new Error(`Version bump must be one of: ${[...validBumpTypes].join(", ")}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

if (!manifest.version || typeof manifest.version !== "string") {
  throw new Error(`${manifestPath} must contain a string version`);
}

const versionParts = manifest.version.split(".").map(Number);
if (
  versionParts.length !== 3 ||
  versionParts.some((part) => !Number.isInteger(part) || part < 0)
) {
  throw new Error(`${manifestPath} version must use major.minor.patch format`);
}

const [major, minor, patch] = versionParts;
const nextVersion =
  bumpType === "major"
    ? `${major + 1}.0.0`
    : bumpType === "minor"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

manifest.version = nextVersion;
packageJson.version = nextVersion;

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log(`Bumped version from ${major}.${minor}.${patch} to ${nextVersion}`);

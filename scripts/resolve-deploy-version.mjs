import { bumpVersionFiles, readJsonVersion } from "./bump-version.mjs";
import { readStoreStatus } from "./publish-cws.mjs";
import { crxVersionsFromStatus, nextDeployVersion } from "./version-lib.mjs";

const bumpType = process.env.BUMP || process.argv[2] || "patch";
const manifestPath = process.env.MANIFEST_PATH || "public/manifest.json";
const packagePath = process.env.PACKAGE_PATH || "package.json";

function fail(message) {
  console.error(message);
  process.exit(1);
}

const manifest = readJsonVersion(manifestPath);
const packageJson = readJsonVersion(packagePath);
if (manifest.version !== packageJson.version) {
  fail(
    `public/manifest.json is ${manifest.version} and package.json is ${packageJson.version}. Make them match before resolving a deploy version.`,
  );
}

let status;
try {
  status = await readStoreStatus();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`${message}\nNext version was not computed.`);
}

let plan;
try {
  plan = nextDeployVersion(manifest.version, crxVersionsFromStatus(status), bumpType);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Chrome Web Store returned a version this repo cannot bump. Refusing to guess.\n${message}`);
}

const written = bumpVersionFiles({
  manifestPath,
  packagePath,
  bumpType,
  floor: plan.store || "",
});

if (written.next !== plan.next) {
  fail(`Resolved ${plan.next} but wrote ${written.next}. Refusing to upload.`);
}

console.log(
  `Repo ${plan.repo}. Store ${plan.store ?? "none"}. Next ${plan.next} (${bumpType}). Written in the runner only. Not committed.`,
);

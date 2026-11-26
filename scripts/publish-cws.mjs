import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { assertStrictlyGreater, highestVersion } from "./version-lib.mjs";

const REQUIRED_SECRETS = ["CHROME_EXTENSION_ID", "CHROME_PUBLISHER_ID", "CHROME_SERVICE_ACCOUNT_JSON"];

const EXTENSION_ID = /^[a-p]{32}$/;
const PUBLISHER_ID = /^[A-Za-z0-9_-]{4,128}$/;
const STORE_SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

export function secretProblems(env = process.env) {
  const missing = REQUIRED_SECRETS.filter((name) => !String(env[name] ?? "").trim());
  const invalid = [];

  const extensionId = String(env.CHROME_EXTENSION_ID ?? "").trim();
  if (extensionId && !EXTENSION_ID.test(extensionId)) {
    invalid.push(
      `CHROME_EXTENSION_ID must be the 32-character Chrome extension id (letters a-p only). The current value has length ${extensionId.length}.`,
    );
  }

  const publisherId = String(env.CHROME_PUBLISHER_ID ?? "").trim();
  if (publisherId && !PUBLISHER_ID.test(publisherId)) {
    invalid.push(
      `CHROME_PUBLISHER_ID must be the publisher id from the Chrome Web Store dashboard (4-128 letters, numbers, "_" or "-"). The current value has length ${publisherId.length}.`,
    );
  }

  const serviceAccountRaw = String(env.CHROME_SERVICE_ACCOUNT_JSON ?? "");
  if (serviceAccountRaw.trim()) {
    const parsed = parseServiceAccount(serviceAccountRaw);
    if (parsed.error) invalid.push(parsed.error);
  }

  return { missing, invalid };
}

export function parseServiceAccount(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "CHROME_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the full service account key file." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "CHROME_SERVICE_ACCOUNT_JSON must be a JSON object." };
  }
  if (parsed.type !== "service_account") {
    return { error: 'CHROME_SERVICE_ACCOUNT_JSON must have "type": "service_account".' };
  }
  if (typeof parsed.client_email !== "string" || !parsed.client_email.includes("@")) {
    return { error: "CHROME_SERVICE_ACCOUNT_JSON is missing client_email." };
  }
  if (typeof parsed.private_key !== "string" || !parsed.private_key.includes("PRIVATE KEY")) {
    return { error: "CHROME_SERVICE_ACCOUNT_JSON is missing private_key." };
  }
  try {
    crypto.createPrivateKey(parsed.private_key);
  } catch {
    return { error: "CHROME_SERVICE_ACCOUNT_JSON has a private_key Node cannot load. Paste the full JSON key file." };
  }
  const tokenUri =
    typeof parsed.token_uri === "string" && parsed.token_uri.startsWith("https://")
      ? parsed.token_uri
      : DEFAULT_TOKEN_URI;
  return {
    account: {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      token_uri: tokenUri,
    },
  };
}

function base64url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString("base64url");
}

export function signServiceAccountJwt(account, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: STORE_SCOPE,
      aud: account.token_uri,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signingInput = `${header}.${payload}`;
  let signature;
  try {
    signature = crypto.createSign("RSA-SHA256").update(signingInput).end().sign(account.private_key);
  } catch {
    throw new Error("CHROME_SERVICE_ACCOUNT_JSON private_key could not sign the request.");
  }
  return `${signingInput}.${base64url(signature)}`;
}

export function formatSecretProblems({ missing, invalid }) {
  const lines = [];
  if (missing.length > 0) {
    lines.push("Missing GitHub Actions secrets required to deploy to the Chrome Web Store:");
    for (const name of missing) lines.push(`  - ${name}`);
    lines.push("Add them under Settings → Secrets and variables → Actions. See docs/ci-cd.md.");
  }
  if (invalid.length > 0) {
    lines.push("Chrome Web Store secrets are set, but they do not look usable:");
    for (const line of invalid) lines.push(`  - ${line}`);
  }
  return lines.join("\n");
}

export function versionsBlockingUpload(localVersion, status) {
  const channels = [
    ...(status?.publishedItemRevisionStatus?.distributionChannels ?? []),
    ...(status?.submittedItemRevisionStatus?.distributionChannels ?? []),
  ];
  const remote = highestVersion(channels.map((channel) => channel?.crxVersion));
  if (!remote) return null;
  try {
    assertStrictlyGreater(localVersion, remote, "the Chrome Web Store version");
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return { text: "", json: null, message: response.statusText };
  try {
    const json = JSON.parse(text);
    const message = json.error?.message || json.error_description || json.message || text;
    return { text, json, message };
  } catch {
    return { text, json: null, message: text.slice(0, 2000) };
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
  const body = await readBody(response);
  if (!response.ok) {
    const error = new Error(`${response.status} ${body.message}`);
    error.status = response.status;
    error.body = body.json;
    throw error;
  }
  return body.json ?? {};
}

function safeTokenError(message) {
  if (/PRIVATE KEY|BEGIN |client_email|private_key/i.test(message)) {
    return "Google rejected the service account token request.";
  }
  return message.slice(0, 500);
}

async function accessToken(env) {
  const parsed = parseServiceAccount(env.CHROME_SERVICE_ACCOUNT_JSON);
  if (parsed.error) fail(parsed.error);

  const assertion = signServiceAccountJwt(parsed.account);
  const payload = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  let response;
  try {
    response = await fetch(parsed.account.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    fail(`Could not reach the service account token endpoint. ${error instanceof Error ? error.message : error}`);
  }

  const body = await readBody(response);
  if (!response.ok || !body.json?.access_token) {
    fail(
      `Service account token exchange failed (${response.status}). Confirm the key still exists in IAM and that this service account email is added on the publisher in the developer dashboard.\n${safeTokenError(body.message)}`,
    );
  }
  return body.json.access_token;
}

function itemUrl(env, suffix) {
  const publisherId = env.CHROME_PUBLISHER_ID.trim();
  const extensionId = env.CHROME_EXTENSION_ID.trim();
  return `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${extensionId}${suffix}`;
}

function uploadUrl(env) {
  const publisherId = env.CHROME_PUBLISHER_ID.trim();
  const extensionId = env.CHROME_EXTENSION_ID.trim();
  return `https://chromewebstore.googleapis.com/upload/v2/publishers/${publisherId}/items/${extensionId}:upload`;
}

function finishedState(state) {
  return state === "SUCCEEDED";
}

function pendingState(state) {
  return state === "IN_PROGRESS" || state === "UPLOAD_IN_PROGRESS";
}

async function fetchStatus(token, env) {
  return requestJson(itemUrl(env, ":fetchStatus"), {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function readStoreStatus(env = process.env) {
  const problems = secretProblems(env);
  if (problems.missing.length > 0 || problems.invalid.length > 0) {
    const error = new Error(formatSecretProblems(problems));
    error.secretProblems = problems;
    throw error;
  }
  const token = await accessToken(env);
  try {
    return await fetchStatus(token, env);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read the Chrome Web Store item, so the next version was not computed. Refusing to guess.\n${message}`,
    );
  }
}

async function waitForUpload(token, env, initial) {
  if (finishedState(initial.uploadState) || initial.crxVersion) return initial;
  if (initial.uploadState === "FAILED") {
    fail(`Chrome Web Store upload failed: ${JSON.stringify(initial)}`);
  }
  if (initial.uploadState && !pendingState(initial.uploadState)) {
    fail(`Unexpected uploadState "${initial.uploadState}": ${JSON.stringify(initial)}`);
  }

  for (let attempt = 1; attempt <= 24; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await fetchStatus(token, env);
    console.log(`Upload poll ${attempt}: lastAsyncUploadState=${status.lastAsyncUploadState ?? "unset"}`);
    if (finishedState(status.lastAsyncUploadState)) return status;
    if (status.lastAsyncUploadState === "FAILED") {
      fail(`Chrome Web Store finished processing the upload with FAILED. ${JSON.stringify(status)}`);
    }
  }

  fail("Chrome Web Store upload stayed in progress for 2 minutes. Check the developer dashboard before retrying. Do not bump the version again until you know this upload was rejected.");
}

function explainStoreError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/version/i.test(message)) {
    return `Chrome Web Store rejected the package because the manifest version was not strictly increased.\n${message}`;
  }
  return message;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const target = process.env.PUBLISH_TARGET || "publish";
  if (target !== "publish" && target !== "upload-only") {
    fail(`PUBLISH_TARGET must be "publish" or "upload-only" (got "${target}").`);
  }

  const problems = secretProblems();
  if (problems.missing.length > 0 || problems.invalid.length > 0) {
    fail(formatSecretProblems(problems));
  }

  const zipPath = process.env.ZIP_PATH;
  if (!zipPath || !fs.existsSync(zipPath)) {
    fail(`ZIP_PATH must point at the extension zip. Current value: ${zipPath || "(empty)"}`);
  }

  const manifestVersion = process.env.EXTENSION_VERSION;
  if (!manifestVersion) {
    fail("EXTENSION_VERSION is empty. The workflow must pass the manifest version.");
  }

  console.log(`Chrome Web Store API v2`);
  console.log(`Extension ${process.env.CHROME_EXTENSION_ID.trim()} publisher ${process.env.CHROME_PUBLISHER_ID.trim()}`);
  console.log(`Package ${zipPath} version ${manifestVersion} target ${target}`);

  if (dryRun) {
    console.log("Dry run: secrets are present. Not uploading.");
    console.log("The deploy version was resolved from the store before this step.");
    console.log(`Would POST the zip to ${uploadUrl(process.env)}`);
    if (target === "publish") {
      console.log(`Would then POST :publish with publishType DEFAULT_PUBLISH (submit for review, then publish on approval).`);
    } else {
      console.log("Would stop after upload. upload-only does not call :publish, so the package is not submitted for review.");
    }
    return;
  }

  const token = await accessToken(process.env);

  let status;
  try {
    status = await fetchStatus(token, process.env);
  } catch (error) {
    fail(
      `Could not read the current store item before upload. Check CHROME_EXTENSION_ID, CHROME_PUBLISHER_ID, and that this service account is added on the publisher.\n${explainStoreError(error)}`,
    );
  }

  const blocked = versionsBlockingUpload(manifestVersion, status);
  if (blocked) fail(blocked);

  const zip = fs.readFileSync(zipPath);
  let uploaded;
  try {
    uploaded = await requestJson(uploadUrl(process.env), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: zip,
    });
  } catch (error) {
    fail(explainStoreError(error));
  }

  console.log(`Upload accepted: uploadState=${uploaded.uploadState ?? "unset"} crxVersion=${uploaded.crxVersion ?? "unset"}`);
  const settled = await waitForUpload(token, process.env, uploaded);
  const uploadedVersion = settled.crxVersion;
  if (uploadedVersion && uploadedVersion !== manifestVersion) {
    fail(
      `Uploaded package version ${uploadedVersion} does not match manifest version ${manifestVersion}. The zip was built from a different manifest than this release.`,
    );
  }

  if (target === "upload-only") {
    console.log("Upload finished. Skipped :publish because the target is upload-only.");
    console.log("The new package is on the item and has not been submitted for review. Check the developer dashboard, then run this workflow again with publish target \"publish\" only after you intend to submit a newer version, or publish this draft from the dashboard.");
    return;
  }

  try {
    const published = await requestJson(itemUrl(process.env, ":publish"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
    });
    console.log(`Publish submitted. state=${published.state ?? "unset"}`);
    console.log("DEFAULT_PUBLISH submits the item for review and publishes it to the existing audience after Google approves it. This does not skip review.");
  } catch (error) {
    fail(
      `Upload of ${manifestVersion} succeeded, but publish failed. That version is on the store. The next run reads it from the store and chooses a higher one.\n${explainStoreError(error)}`,
    );
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

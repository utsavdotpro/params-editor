import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  formatSecretProblems,
  parseServiceAccount,
  secretProblems,
  signServiceAccountJwt,
  versionsBlockingUpload,
} from "./publish-cws.mjs";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
const serviceAccount = {
  type: "service_account",
  project_id: "params-editor",
  client_email: "release@example.iam.gserviceaccount.com",
  private_key: privatePem,
  token_uri: "https://oauth2.googleapis.com/token",
};

const validEnv = {
  CHROME_EXTENSION_ID: "a".repeat(32),
  CHROME_PUBLISHER_ID: "publisher-1",
  CHROME_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount),
};

test("lists every missing secret and does not invent values", () => {
  const problems = secretProblems({});
  const text = formatSecretProblems(problems);
  assert.deepEqual(problems.missing, [
    "CHROME_EXTENSION_ID",
    "CHROME_PUBLISHER_ID",
    "CHROME_SERVICE_ACCOUNT_JSON",
  ]);
  for (const name of problems.missing) assert.match(text, new RegExp(name));
  assert.equal(problems.invalid.length, 0);
});

test("rejects a malformed extension id without echoing it", () => {
  const problems = secretProblems({ ...validEnv, CHROME_EXTENSION_ID: "not-an-id" });
  const text = formatSecretProblems(problems);
  assert.match(text, /CHROME_EXTENSION_ID/);
  assert.equal(text.includes("not-an-id"), false);
});

test("rejects a service account key that is not usable and does not echo it", () => {
  const raw = '{"type":"not_a_service_account","private_key":"super-secret-key-material"}';
  const problems = secretProblems({ ...validEnv, CHROME_SERVICE_ACCOUNT_JSON: raw });
  const text = formatSecretProblems(problems);
  assert.match(text, /CHROME_SERVICE_ACCOUNT_JSON/);
  assert.match(text, /service_account/);
  assert.equal(text.includes("super-secret-key-material"), false);
  assert.equal(text.includes("not_a_service_account"), false);
});

test("accepts a complete secret set", () => {
  const problems = secretProblems(validEnv);
  assert.deepEqual(problems, { missing: [], invalid: [] });
});

test("signs a service account JWT for the Chrome Web Store scope", () => {
  const account = parseServiceAccount(validEnv.CHROME_SERVICE_ACCOUNT_JSON).account;
  const jwt = signServiceAccountJwt(account, 1_700_000_000);
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  assert.equal(jwt.split(".").length, 3);
  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString());
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
  assert.equal(header.alg, "RS256");
  assert.equal(payload.iss, serviceAccount.client_email);
  assert.equal(payload.scope, "https://www.googleapis.com/auth/chromewebstore");
  assert.equal(payload.aud, serviceAccount.token_uri);
  assert.equal(payload.exp, payload.iat + 3600);
  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    Buffer.from(encodedSignature, "base64url"),
  );
  assert.equal(verified, true);
  assert.equal(jwt.includes(privatePem), false);
});

test("blocks an upload that does not increase the store version", () => {
  const status = {
    publishedItemRevisionStatus: { distributionChannels: [{ crxVersion: "1.2.2" }] },
    submittedItemRevisionStatus: { distributionChannels: [{ crxVersion: "1.2.4" }] },
  };
  assert.match(versionsBlockingUpload("1.2.4", status), /1\.2\.4/);
  assert.equal(versionsBlockingUpload("1.2.5", status), null);
  assert.equal(versionsBlockingUpload("1.2.3", {}), null);
});

test("dry run with no secrets exits with the secret list and does not need a zip", () => {
  const result = spawnSync(process.execPath, ["scripts/publish-cws.mjs", "--dry-run"], {
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CHROME_SERVICE_ACCOUNT_JSON/);
  assert.match(result.stderr, /CHROME_PUBLISHER_ID/);
  assert.match(result.stderr, /CHROME_EXTENSION_ID/);
  assert.equal(result.stderr.includes("ya29"), false);
});

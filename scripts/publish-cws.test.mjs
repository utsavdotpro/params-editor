import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { formatSecretProblems, secretProblems, versionsBlockingUpload } from "./publish-cws.mjs";

const validEnv = {
  CHROME_EXTENSION_ID: "a".repeat(32),
  CHROME_PUBLISHER_ID: "publisher-1",
  CHROME_CLIENT_ID: "client",
  CHROME_CLIENT_SECRET: "secret",
  CHROME_REFRESH_TOKEN: "refresh",
};

test("lists every missing secret and does not invent values", () => {
  const problems = secretProblems({});
  const text = formatSecretProblems(problems);
  for (const name of [
    "CHROME_EXTENSION_ID",
    "CHROME_PUBLISHER_ID",
    "CHROME_CLIENT_ID",
    "CHROME_CLIENT_SECRET",
    "CHROME_REFRESH_TOKEN",
  ]) {
    assert.match(text, new RegExp(name));
  }
  assert.equal(problems.invalid.length, 0);
});

test("rejects a malformed extension id without echoing it", () => {
  const problems = secretProblems({ ...validEnv, CHROME_EXTENSION_ID: "not-an-id" });
  const text = formatSecretProblems(problems);
  assert.match(text, /CHROME_EXTENSION_ID/);
  assert.equal(text.includes("not-an-id"), false);
});

test("accepts a complete secret set", () => {
  const problems = secretProblems(validEnv);
  assert.deepEqual(problems, { missing: [], invalid: [] });
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
  assert.match(result.stderr, /CHROME_REFRESH_TOKEN/);
  assert.match(result.stderr, /CHROME_PUBLISHER_ID/);
  assert.equal(result.stderr.includes("ya29"), false);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertStrictlyGreater,
  bumpSemver,
  compareVersions,
  highestVersion,
  setVersionInJsonText,
} from "./version-lib.mjs";

test("patch, minor, and major bumps", () => {
  assert.equal(bumpSemver("1.2.2", "patch"), "1.2.3");
  assert.equal(bumpSemver("1.2.2", "minor"), "1.3.0");
  assert.equal(bumpSemver("1.2.2", "major"), "2.0.0");
});

test("rejects unknown bump types and loose versions", () => {
  assert.throws(() => bumpSemver("1.2.2", "pre"), /patch/);
  assert.throws(() => bumpSemver("1.2", "patch"), /major\.minor\.patch/);
  assert.throws(() => bumpSemver("01.2.0", "patch"), /leading zeros/);
});

test("compares Chrome-style numeric versions", () => {
  assert.ok(compareVersions("1.2.3", "1.2.2") > 0);
  assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
  assert.equal(compareVersions("1.2.0", "1.2"), 0);
  assert.ok(compareVersions("1.2.2", "1.2.2") === 0);
});

test("requires a strictly greater store version", () => {
  assert.doesNotThrow(() => assertStrictlyGreater("1.2.3", "1.2.2"));
  assert.throws(() => assertStrictlyGreater("1.2.2", "1.2.2"), /strictly increase/);
  assert.throws(() => assertStrictlyGreater("1.2.2", "1.3.0"), /strictly increase/);
});

test("picks the highest remote version", () => {
  assert.equal(highestVersion(["1.2.2", "1.2.10", "1.3.0"]), "1.3.0");
  assert.equal(highestVersion([]), null);
});

test("updates only the version field and keeps surrounding JSON", () => {
  const original = '{\n  "name": "params-editor",\n  "version": "1.2.2",\n  "description": "keep me"\n}\n';
  const next = setVersionInJsonText(original, "1.2.3");
  assert.match(next, /"version": "1.2.3"/);
  assert.match(next, /"description": "keep me"/);
  assert.equal(next.includes("1.2.2"), false);
});

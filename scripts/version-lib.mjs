const VERSION_PART = /^(0|[1-9]\d*)$/;

export function parseVersion(version) {
  const raw = String(version ?? "").trim();
  const parts = raw.split(".");
  if (parts.length < 1 || parts.length > 4 || raw === "") {
    throw new Error(
      `Version "${version}" must be 1 to 4 dot-separated integers (Chrome Web Store format)`,
    );
  }

  const numbers = parts.map((part) => {
    if (!VERSION_PART.test(part)) {
      throw new Error(
        `Version "${version}" has an invalid segment "${part}". Use non-negative integers without leading zeros.`,
      );
    }
    const value = Number(part);
    if (value > 65536) {
      throw new Error(`Version "${version}" has a segment above 65536`);
    }
    return value;
  });

  while (numbers.length < 4) numbers.push(0);
  return numbers;
}

export function formatVersion(numbers) {
  return `${numbers[0]}.${numbers[1]}.${numbers[2]}`;
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 4; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function bumpSemver(version, bumpType) {
  const valid = new Set(["major", "minor", "patch"]);
  if (!valid.has(bumpType)) {
    throw new Error(`Version bump must be one of: ${[...valid].join(", ")}`);
  }

  const rawParts = String(version ?? "").split(".");
  if (rawParts.length !== 3) {
    throw new Error(
      `Refusing to bump "${version}". This repo stores versions as major.minor.patch (three integers).`,
    );
  }

  const [major, minor, patch] = parseVersion(version);
  if (bumpType === "major") return `${major + 1}.0.0`;
  if (bumpType === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function setVersionInJsonText(text, version) {
  const parsed = JSON.parse(text);
  if (typeof parsed.version !== "string") {
    throw new Error("JSON must contain a string version");
  }

  let replaced = 0;
  const next = text.replace(/"version"\s*:\s*"[^"]*"/, (match) => {
    replaced += 1;
    return replaced === 1 ? `"version": "${version}"` : match;
  });

  if (replaced < 1) {
    throw new Error("Could not find a version field to update");
  }

  const checked = JSON.parse(next);
  if (checked.version !== version) {
    throw new Error(`Version update did not stick (file now has ${checked.version})`);
  }
  return next;
}

export function highestVersion(versions) {
  const present = versions.filter((version) => typeof version === "string" && version.trim() !== "");
  if (present.length === 0) return null;
  return present.reduce((best, version) => (compareVersions(version, best) > 0 ? version : best));
}

export function assertStrictlyGreater(nextVersion, previousVersion, label = "previous version") {
  const delta = compareVersions(nextVersion, previousVersion);
  if (delta <= 0) {
    throw new Error(
      `Chrome Web Store versions must strictly increase. ${nextVersion} is not greater than ${label} ${previousVersion}.`,
    );
  }
}

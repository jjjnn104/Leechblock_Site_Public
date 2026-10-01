const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = readFileSync(join(__dirname, "..", "script.js"), "utf8");
const BIRTH_KEY = "leechblock_birth_iso";
const TIMESTAMP_KEY = "leechblock_birth_saved_at";
const BIRTH = "1990-06-15T12:30:00";
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-01T12:00:00Z");

// Execute the actual browser script, including bootstrap, with a fixed clock.
function loadPage(entries = {}, now = NOW) {
  const storage = new Map(Object.entries(entries));
  const elements = new Map();
  const writes = [];
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const context = vm.createContext({
    Date: FixedDate,
    document: {
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, {
            style: {},
            textContent: "",
            value: "",
            addEventListener() {},
            focus() {}
          });
        }
        return elements.get(id);
      }
    },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) {
        writes.push([key, String(value)]);
        storage.set(key, String(value));
      },
      removeItem(key) { storage.delete(key); }
    },
    setInterval() { return 1; },
    clearInterval() {}
  });
  vm.runInContext(source, context, { filename: "script.js" });
  return { storage, elements, writes, context };
}

test("bootstrap preserves a legacy birthdate and backfills only its timestamp", () => {
  const page = loadPage({ [BIRTH_KEY]: BIRTH });
  assert.equal(page.storage.get(BIRTH_KEY), BIRTH);
  assert.equal(page.storage.get(TIMESTAMP_KEY), String(NOW));
  assert.deepEqual(page.writes, [[TIMESTAMP_KEY, String(NOW)]]);
  assert.equal(page.elements.get("setup-overlay").style.display, "none");
  assert.notEqual(page.elements.get("life-percent").textContent, "--.--%");
});

test("reloads preserve the migration timestamp and expire at 30 days", () => {
  const migrated = loadPage({ [BIRTH_KEY]: BIRTH });
  const reloaded = loadPage(Object.fromEntries(migrated.storage), NOW + 30 * DAY - 1);
  assert.equal(reloaded.storage.get(BIRTH_KEY), BIRTH);
  assert.equal(reloaded.storage.get(TIMESTAMP_KEY), String(NOW));
  assert.deepEqual(reloaded.writes, []);

  const expired = loadPage(Object.fromEntries(reloaded.storage), NOW + 30 * DAY);
  assert.equal(expired.storage.has(BIRTH_KEY), false);
  assert.equal(expired.storage.has(TIMESTAMP_KEY), false);
  assert.equal(expired.elements.get("setup-overlay").style.display, "flex");
});

test("existing recent timestamps are preserved without refreshing retention", () => {
  const savedAt = String(NOW - 10 * DAY);
  const page = loadPage({ [BIRTH_KEY]: BIRTH, [TIMESTAMP_KEY]: savedAt });
  assert.equal(page.storage.get(BIRTH_KEY), BIRTH);
  assert.equal(page.storage.get(TIMESTAMP_KEY), savedAt);
  assert.deepEqual(page.writes, []);
});

test("existing expired entries clear both keys", () => {
  const page = loadPage({ [BIRTH_KEY]: BIRTH, [TIMESTAMP_KEY]: String(NOW - 31 * DAY) });
  assert.equal(page.storage.has(BIRTH_KEY), false);
  assert.equal(page.storage.has(TIMESTAMP_KEY), false);
  assert.deepEqual(page.writes, []);
});

test("malformed timestamps are rejected rather than migrated", () => {
  for (const timestamp of ["", " ", "not-a-timestamp", "NaN", "Infinity", "-Infinity"]) {
    const page = loadPage({ [BIRTH_KEY]: BIRTH, [TIMESTAMP_KEY]: timestamp });
    assert.equal(page.storage.has(BIRTH_KEY), false, timestamp);
    assert.equal(page.storage.has(TIMESTAMP_KEY), false, timestamp);
    assert.deepEqual(page.writes, []);
  }
});

test("empty storage and invalid legacy birthdates do not get a timestamp", () => {
  for (const entries of [{}, { [BIRTH_KEY]: "" }, { [BIRTH_KEY]: "not-a-date" }]) {
    const page = loadPage(entries);
    assert.equal(page.storage.has(TIMESTAMP_KEY), false);
    assert.deepEqual(page.writes, []);
    assert.equal(page.elements.get("setup-overlay").style.display, "flex");
  }
});

test("saving and clearing still manage the birthdate and timestamp together", () => {
  const page = loadPage();
  vm.runInContext(`saveBirthToStorage(${JSON.stringify(BIRTH)})`, page.context);
  assert.equal(page.storage.get(BIRTH_KEY), BIRTH);
  assert.equal(page.storage.get(TIMESTAMP_KEY), String(NOW));
  vm.runInContext("clearBirthFromStorage()", page.context);
  assert.equal(page.storage.has(BIRTH_KEY), false);
  assert.equal(page.storage.has(TIMESTAMP_KEY), false);
});

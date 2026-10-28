import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dirSource, httpSource, openSource } from "../lib/source.mjs";
import { programsUrl } from "../lib/replay.mjs";

function fixtureDir() {
  const dir = mkdtempSync(join(tmpdir(), "src-"));
  mkdirSync(join(dir, "2024"));
  writeFileSync(join(dir, "2024", "20240409.json"), JSON.stringify({ programs: [{ stadium_number: 1 }] }));
  writeFileSync(join(dir, "2024", "20240410.json"), "{not json");
  return dir;
}

test("dirSource reads <dir>/YYYY/YYYYMMDD.json", async () => {
  const load = dirSource(fixtureDir());
  assert.deepEqual(await load("2024-04-09"), { programs: [{ stadium_number: 1 }] });
});

test("dirSource rejects for a missing file", async () => {
  await assert.rejects(dirSource(fixtureDir())("2024-04-11"));
});

test("dirSource rejects for invalid JSON", async () => {
  await assert.rejects(dirSource(fixtureDir())("2024-04-10"));
});

test("httpSource fetches programsUrl and parses JSON", async () => {
  const calls = [];
  const fetchImpl = async (url) => (calls.push(url), { ok: true, json: async () => ({ programs: [] }) });
  assert.deepEqual(await httpSource(fetchImpl)("2024-04-09"), { programs: [] });
  assert.deepEqual(calls, [programsUrl("2024-04-09")]);
});

test("httpSource rejects with the status on a non-2xx response", async () => {
  const fetchImpl = async () => ({ ok: false, status: 404 });
  await assert.rejects(httpSource(fetchImpl)("2024-04-09"), /404/);
});

test("openSource picks a loader from the spec", async () => {
  const dir = fixtureDir();
  assert.deepEqual(await openSource(dir)("2024-04-09"), { programs: [{ stadium_number: 1 }] });
  assert.equal(typeof openSource("http"), "function");
});

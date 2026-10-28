import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const CLI = new URL("../scripts/build.mjs", import.meta.url).pathname;

function setup(days) {
  const src = mkdtempSync(join(tmpdir(), "cli-src-"));
  const out = mkdtempSync(join(tmpdir(), "cli-out-"));
  for (const d of days) {
    mkdirSync(join(src, d.slice(0, 4)), { recursive: true });
    writeFileSync(join(src, d.slice(0, 4), d.replaceAll("-", "") + ".json"), JSON.stringify({ programs: [{ stadium_number: 1, number: 1, title: "t", subtitle: "s" }] }));
  }
  return { src, out };
}
const run = (...args) => spawnSync("node", [CLI, ...args], { encoding: "utf8" });
const outFile = (out, d) => join(out, d.slice(0, 4), d.replaceAll("-", "") + ".json");

test("writes one compact JSON file per day", () => {
  const { src, out } = setup(["2024-04-09", "2024-04-10"]);
  const r = run("--source", src, "--from", "2024-04-09", "--to", "2024-04-10", "--out", out);
  assert.equal(r.status, 0, r.stderr);
  const text = readFileSync(outFile(out, "2024-04-09"), "utf8");
  assert.ok(text.endsWith("\n") && !text.slice(0, -1).includes("\n"));
  assert.equal(JSON.parse(text).stadiums["1"].races["1"].subtitle, "s");
  assert.ok(existsSync(outFile(out, "2024-04-10")));
});

test("a failing day exits 1, writes nothing for it, and the other days still run", () => {
  const { src, out } = setup(["2024-04-10"]);
  const r = run("--source", src, "--from", "2024-04-09", "--to", "2024-04-10", "--out", out);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /2024-04-09/);
  assert.ok(!existsSync(outFile(out, "2024-04-09")));
  assert.ok(existsSync(outFile(out, "2024-04-10")));
});

test("--missing-only leaves existing files untouched and does not read their source", () => {
  const { src, out } = setup([]);
  mkdirSync(join(out, "2024"), { recursive: true });
  writeFileSync(outFile(out, "2024-04-09"), "keep\n");
  const r = run("--source", src, "--from", "2024-04-09", "--to", "2024-04-09", "--out", out, "--missing-only");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(outFile(out, "2024-04-09"), "utf8"), "keep\n");
});

test("rejects a --from before 2020-01-01 and a --to after yesterday with exit 2", () => {
  const { src, out } = setup([]);
  assert.equal(run("--source", src, "--from", "2019-12-31", "--out", out).status, 2);
  assert.equal(run("--source", src, "--from", "2024-04-09", "--to", "2999-01-01", "--out", out).status, 2);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDay } from "../lib/build-day.mjs";
import { replayUrl } from "../lib/replay.mjs";

const D = "2024-04-09";
const prog = (stadium_number, number, extra = {}) => ({ stadium_number, number, title: `T${stadium_number}`, subtitle: `S${number}`, ...extra });

test("buildDay groups races by stadium and race number", () => {
  const day = buildDay(D, { programs: [prog(2, 1), prog(1, 2), prog(1, 1), prog(2, 2)] });
  assert.deepEqual(Object.keys(day.stadiums), ["1", "2"]);
  assert.equal(day.date, D);
  assert.equal(day.stadiums["1"].name, "桐生");
  assert.deepEqual(Object.keys(day.stadiums["1"].races), ["1", "2"]);
  assert.deepEqual(day.stadiums["1"].races["2"], { subtitle: "S2", replay_url: replayUrl(D, 1, 2) });
});

test("stadium title comes from the lowest-numbered race", () => {
  const day = buildDay(D, { programs: [prog(1, 2, { title: "second" }), prog(1, 1, { title: "first" })] });
  assert.equal(day.stadiums["1"].title, "first");
});

test("a day with no programs yields empty stadiums", () => {
  assert.deepEqual(buildDay(D, { programs: [] }), { date: D, stadiums: {} });
});

test("null or missing title and subtitle become empty strings", () => {
  const day = buildDay(D, { programs: [{ stadium_number: 1, number: 1, title: null }] });
  assert.equal(day.stadiums["1"].title, "");
  assert.equal(day.stadiums["1"].races["1"].subtitle, "");
});

test("rejects a missing programs array", () => {
  assert.throws(() => buildDay(D, {}), /programs/);
  assert.throws(() => buildDay(D, { programs: "x" }), /programs/);
});

test("rejects an unknown stadium_number", () => {
  assert.throws(() => buildDay(D, { programs: [prog(25, 1)] }), /stadium_number/);
});

test("rejects a duplicate stadium/race pair", () => {
  assert.throws(() => buildDay(D, { programs: [prog(1, 1), prog(1, 1)] }), /duplicate/);
});

test("rejects a race number outside 1-12", () => {
  assert.throws(() => buildDay(D, { programs: [prog(1, 13)] }), /number/);
  assert.throws(() => buildDay(D, { programs: [prog(1, 0)] }), /number/);
});

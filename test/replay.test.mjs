import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MIN_DATE, STADIUMS, replayUrl, programsUrl, programsPath } from "../lib/replay.mjs";

test("replayUrl builds the BOATCAST player URL", () => {
  assert.equal(
    replayUrl("2024-04-09", 1, 1),
    "https://front.player.boatrace-cdn.jp/player/vod?service=boatcast&stadium=01kiryu&raceType=race&raceDate=20240409&raceNumber=01&autoplay=0&bitrate=low",
  );
});

test("replayUrl returns null for invalid input", () => {
  assert.equal(replayUrl("2024-04-09", 0, 1), null);
  assert.equal(replayUrl("2024-04-09", 25, 1), null);
  assert.equal(replayUrl("2024-04-09", 1, 0), null);
  assert.equal(replayUrl("2024-04-09", 1, 13), null);
  assert.equal(replayUrl("2024-4-9", 1, 1), null);
});

test("programsUrl and programsPath point at the v3 data", () => {
  assert.equal(programsUrl("2024-04-09"), "https://boatraceopenapi.github.io/programs/v3/2024/20240409.json");
  assert.equal(programsPath("2024-04-09"), "2024/20240409.json");
});

test("lib/replay.mjs stays in sync with the pure block of index.html", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const block = html.split("// --- pure ---")[1].split("// --- /pure ---")[0];
  const page = new Function(block + "; return { STADIUMS, replayUrl, MIN_DATE };")();
  assert.deepStrictEqual(STADIUMS, page.STADIUMS);
  assert.equal(MIN_DATE, page.MIN_DATE);
  for (let s = 1; s <= 24; s++) {
    for (const r of [1, 12]) {
      assert.equal(replayUrl("2024-04-09", s, r), page.replayUrl("2024-04-09", s, r));
    }
  }
});

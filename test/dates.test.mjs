import { test } from "node:test";
import assert from "node:assert/strict";
import { yesterdayJst, eachDate } from "../lib/dates.mjs";

test("yesterdayJst uses the Asia/Tokyo calendar day", () => {
  assert.equal(yesterdayJst(new Date("2026-10-28T16:00:00Z")), "2026-10-28");
  assert.equal(yesterdayJst(new Date("2026-10-28T14:59:00Z")), "2026-10-27");
});

test("eachDate is inclusive, ascending and handles leap days", () => {
  assert.deepEqual(eachDate("2024-02-28", "2024-03-01"), ["2024-02-28", "2024-02-29", "2024-03-01"]);
});

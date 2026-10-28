#!/usr/bin/env node
// usage: node scripts/build.mjs --source <dir|http> --from <date> [--to <date>] [--out api/v1] [--missing-only]
import { parseArgs } from "node:util";
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { MIN_DATE, programsPath } from "../lib/replay.mjs";
import { buildDay } from "../lib/build-day.mjs";
import { openSource } from "../lib/source.mjs";
import { eachDate, yesterdayJst } from "../lib/dates.mjs";

function usage(message) {
  console.error(message);
  console.error("usage: node scripts/build.mjs --source <dir|http> --from <date> [--to <date>] [--out api/v1] [--missing-only]");
  process.exit(2);
}

let args;
try {
  args = parseArgs({
    options: {
      source: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      out: { type: "string", default: "api/v1" },
      "missing-only": { type: "boolean", default: false },
    },
  }).values;
} catch (e) {
  usage(e.message);
}

const yesterday = yesterdayJst();
const to = args.to ?? yesterday;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");
if (!args.source) usage("--source is required");
if (!isDate(args.from) || !isDate(to)) usage("--from and --to must be YYYY-MM-DD");
if (args.from < MIN_DATE) usage(`--from must be ${MIN_DATE} or later`);
if (to > yesterday) usage(`--to must be ${yesterday} (yesterday, JST) or earlier`);
if (args.from > to) usage("--from must not be after --to");

const load = openSource(args.source);
const exists = (p) => access(p).then(() => true, () => false);
let failed = 0;

for (const date of eachDate(args.from, to)) {
  const file = join(args.out, programsPath(date));
  if (args["missing-only"] && (await exists(file))) continue;
  try {
    const day = buildDay(date, await load(date));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(day) + "\n");
  } catch (e) {
    failed++;
    console.error(`${date}: ${e.message}`);
  }
}

if (failed) {
  console.error(`${failed} day(s) failed`);
  process.exit(1);
}

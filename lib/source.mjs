import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { programsPath, programsUrl } from "./replay.mjs";

// Each source is (date) => Promise<programs JSON>; it throws when the day cannot be read or parsed.
export function dirSource(dir) {
  return async (date) => JSON.parse(await readFile(join(dir, programsPath(date)), "utf8"));
}

export function httpSource(fetchImpl = globalThis.fetch) {
  return async (date) => {
    const res = await fetchImpl(programsUrl(date));
    if (!res.ok) throw new Error(`${date}: HTTP ${res.status}`);
    return res.json();
  };
}

// "http" -> programs published over HTTP, anything else -> a local docs/v3 directory
export function openSource(spec) {
  return spec === "http" ? httpSource() : dirSource(spec);
}

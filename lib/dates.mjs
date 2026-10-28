// "YYYY-MM-DD" of the day before `now` in Asia/Tokyo
export function yesterdayJst(now = new Date()) {
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// inclusive, ascending
export function eachDate(from, to) {
  const out = [];
  for (const d = new Date(from + "T00:00:00Z"); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

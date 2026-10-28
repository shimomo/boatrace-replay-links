import { STADIUMS, replayUrl } from "./replay.mjs";

// source: v3 programs JSON of one day -> { date, stadiums: { [no]: { name, title, races: { [no]: { subtitle, replay_url } } } } }
export function buildDay(date, source) {
  if (!source || !Array.isArray(source.programs)) throw new Error(`${date}: programs array is missing`);
  const stadiums = {};
  const programs = [...source.programs].sort((a, b) => a.stadium_number - b.stadium_number || a.number - b.number);
  for (const p of programs) {
    const s = STADIUMS[p.stadium_number];
    if (!s) throw new Error(`${date}: unknown stadium_number ${p.stadium_number}`);
    if (!Number.isInteger(p.number) || p.number < 1 || p.number > 12) {
      throw new Error(`${date}: invalid race number ${p.number} at stadium ${p.stadium_number}`);
    }
    const st = (stadiums[p.stadium_number] ??= { name: s[1], title: p.title ?? "", races: {} });
    if (st.races[p.number]) throw new Error(`${date}: duplicate race ${p.stadium_number}-${p.number}`);
    st.races[p.number] = { subtitle: p.subtitle ?? "", replay_url: replayUrl(date, p.stadium_number, p.number) };
  }
  return { date, stadiums };
}

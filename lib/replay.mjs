export const MIN_DATE = "2020-01-01";

export const STADIUMS = {
  1: ["01kiryu", "桐生"], 2: ["02toda", "戸田"], 3: ["03edogawa", "江戸川"],
  4: ["04heiwajima", "平和島"], 5: ["05tamagawa", "多摩川"], 6: ["06hamanako", "浜名湖"],
  7: ["07gamagori", "蒲郡"], 8: ["08tokoname", "常滑"], 9: ["09tsu", "津"],
  10: ["10mikuni", "三国"], 11: ["11biwako", "びわこ"], 12: ["12suminoe", "住之江"],
  13: ["13amagasaki", "尼崎"], 14: ["14naruto", "鳴門"], 15: ["15marugame", "丸亀"],
  16: ["16kojima", "児島"], 17: ["17miyajima", "宮島"], 18: ["18tokuyama", "徳山"],
  19: ["19shimonoseki", "下関"], 20: ["20wakamatsu", "若松"], 21: ["21ashiya", "芦屋"],
  22: ["22fukuoka", "福岡"], 23: ["23karatsu", "唐津"], 24: ["24omura", "大村"],
};

// date: "YYYY-MM-DD", stadium: 1-24, race: 1-12
export function replayUrl(date, stadium, race) {
  const s = STADIUMS[stadium];
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(race >= 1 && race <= 12)) return null;
  const params = new URLSearchParams({
    service: "boatcast",
    stadium: s[0],
    raceType: "race",
    raceDate: date.replaceAll("-", ""),
    raceNumber: String(race).padStart(2, "0"),
    autoplay: "0",
    bitrate: "low",
  });
  return "https://front.player.boatrace-cdn.jp/player/vod?" + params.toString();
}

export function programsUrl(date) {
  return "https://boatraceopenapi.github.io/programs/v3/" + date.slice(0, 4) + "/" +
    date.replaceAll("-", "") + ".json";
}

// "YYYY-MM-DD" -> "YYYY/YYYYMMDD.json"
export function programsPath(date) {
  return date.slice(0, 4) + "/" + date.replaceAll("-", "") + ".json";
}

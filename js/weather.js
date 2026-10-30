// Open-Meteo weather + air quality (no key). Offline/blocked → cached or simulated fallback, never throws.
const KEY = 'nickVisorWx', DEF = { lat: 41.88, lon: -87.63, name: 'CHICAGO' };
const CODES = { 0: 'CLEAR', 1: 'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST', 45: 'FOG', 48: 'RIME FOG', 51: 'DRIZZLE', 53: 'DRIZZLE', 55: 'DRIZZLE', 61: 'RAIN', 63: 'RAIN', 65: 'HEAVY RAIN', 71: 'SNOW', 73: 'SNOW', 75: 'HEAVY SNOW', 80: 'SHOWERS', 81: 'SHOWERS', 82: 'VIOLENT SHOWERS', 95: 'THUNDERSTORM', 96: 'THUNDERSTORM', 99: 'THUNDERSTORM' };
export function describe(w) { return CODES[w.code] || 'UNKNOWN'; }
export function toCity(w) {
  const c = w.code, rain = c >= 95 ? 0.9 : c >= 80 ? 0.6 : c >= 61 ? (c === 65 ? 0.9 : 0.5) : c >= 51 ? 0.25 : 0;
  return { code: c, isDay: w.isDay, rain, cloud: c === 0 ? 0.1 : c <= 2 ? 0.35 : 0.85, wind: w.wind, storm: c >= 95 ? 1 : 0, temp: w.temp };
}
function simulated() { const h = new Date().getHours(); return { temp: 16, wind: 12, code: 2, isDay: h >= 7 && h < 19 ? 1 : 0, aqi: 38, pm25: 8, uv: 2, place: DEF.name, src: 'SIMULATED', t: Date.now() }; }
export async function getWeather(coords, force) {
  let cached = null; try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!force && cached && Date.now() - cached.t < 30 * 60e3) return cached;
  if (!navigator.onLine) return cached ? { ...cached, src: 'CACHED' } : simulated();
  const lat = coords?.lat ?? DEF.lat, lon = coords?.lon ?? DEF.lon;
  try {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 6000);
    const [f, a] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,is_day,uv_index`, { signal: ac.signal }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5`, { signal: ac.signal }).then(r => r.ok ? r.json() : null).catch(() => null)
    ]); clearTimeout(to);
    const c = f.current, w = { temp: c.temperature_2m, wind: c.wind_speed_10m, code: c.weather_code, isDay: c.is_day, uv: c.uv_index ?? 0, aqi: a?.current?.us_aqi ?? null, pm25: a?.current?.pm2_5 ?? null,
      place: coords ? `${lat.toFixed(2)},${lon.toFixed(2)}` : DEF.name, src: 'OPEN-METEO LIVE', t: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(w)); return w;
  } catch (e) { return cached ? { ...cached, src: 'CACHED' } : simulated(); }
}
export function aqiLabel(a) { if (a == null) return ['N/A', '#9ab']; return a <= 50 ? ['GOOD', '#5dff9a'] : a <= 100 ? ['MODERATE', '#ffd84a'] : a <= 150 ? ['SENSITIVE', '#ff9a3a'] : a <= 200 ? ['UNHEALTHY', '#ff4a4a'] : ['HAZARDOUS', '#c04aff']; }

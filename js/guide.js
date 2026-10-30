// Fortress AI guide: original lines, spoken with speechSynthesis and shown as subtitles.
export const LINES = {
  boot: ['Welcome, my son. The crystal recognizes you.', 'Your eyes see more than any on this world. Use them wisely.'],
  fortress: ['This is the archive of a world that was. Ask, and it shall answer.', 'Every crystal here holds a memory of home.', 'Strength is not what you lift. It is what you protect.'],
  mode: { 1: 'Heat vision. Precision, not anger.', 2: 'You see through walls. Respect what lies behind them.', 7: 'Infrared. Every living thing glows with warmth.', 8: 'Ultraviolet. The hidden ink of the world revealed.',
    9: 'The electromagnetic spectrum. This world hums with invisible voices.', 10: 'Motion sight. Nothing moves without your notice.', 11: 'Time stretches for you. Use each heartbeat.', 12: 'Careful. Fragments of our home can still harm you.' },
  rank: (r) => `You have risen to ${r}. I am proud of you.`,
  rescue: ['Well done. The city breathes easier.', 'Another life protected.', 'They will never know your name tonight. That is enough.'],
  kryp: 'Kryptonite detected. Keep your distance.'
};
export function createGuide(subEl) {
  let enabled = true, voice = null, hideT;
  const pick = () => { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-GB/i.test(v.lang) && /Daniel|Arthur|Male/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang) && /Daniel|Fred|Alex|Aaron|Male/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)) || null; };
  const hasTTS = typeof speechSynthesis !== 'undefined';
  if (hasTTS) { pick(); speechSynthesis.addEventListener?.('voiceschanged', pick); }
  function say(text, opts = {}) {
    if (!enabled || !text) return; if (Array.isArray(text)) text = text[Math.floor(Math.random() * text.length)];
    subEl.innerHTML = ''; const who = document.createElement('b'); who.textContent = 'FORTRESS AI'; const p = document.createElement('span'); p.textContent = text; subEl.append(who, p);
    subEl.classList.add('on'); clearTimeout(hideT); hideT = setTimeout(() => subEl.classList.remove('on'), 1800 + text.length * 70);
    if (hasTTS && opts.voice !== false) try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.rate = 0.88; u.pitch = 0.62; u.volume = opts.vol ?? 0.9; speechSynthesis.speak(u); } catch (e) {}
  }
  return { say, set enabled(v) { enabled = v; if (!v && hasTTS) speechSynthesis.cancel(); }, get enabled() { return enabled; } };
}

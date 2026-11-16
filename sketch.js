'use strict';

const LS_KEY = 'pointGame.v1';

const CATEGORIES = [
  { id: 'small', emoji: '🧽', name: 'Small Chore', hint: 'tidy a little', pts: 1, group: 'CHORE', fill: '#8FD3AC', tint: '#E9F6EE', tintNight: '#D4F2DE', tintAqua: '#EAF6FF', text: '#FFFFFF', textAqua: '#0B3B6E', sz: 0.8 },
  { id: 'big', emoji: '🧹', name: 'Big Chore', hint: 'deep clean (bathroom!)', pts: 3, group: 'CHORE', fill: '#4E9B6F', tint: '#DDF0E5', tintNight: '#B5E3C8', tintAqua: '#CDE9FF', text: '#FFFFFF', textAqua: '#0B3B6E', sz: 0.9 },
  { id: 'light', emoji: '📄', name: 'Light Task', hint: 'tiny steps, one email', pts: 5, group: 'TASK', fill: '#F5D570', tint: '#FBF0D3', tintNight: '#FFEDB3', tintAqua: '#9CCBFF', text: '#8A6D1F', textAqua: '#0B3B6E', sz: 1.05 },
  { id: 'heavy', emoji: '📚', name: 'Heavy Task', hint: 'the big scary thing', pts: 30, group: 'TASK', fill: '#F0A05A', tint: '#FCEBDA', tintNight: '#FFD3AE', tintAqua: '#4F8FEA', text: '#FFFFFF', textAqua: '#FFFFFF', sz: 1.3 },
  { id: 'focus', emoji: '⏱️', name: 'Focus', hint: '1P per 5 minutes', pts: 0, per5: 1, group: 'FOCUS', fill: '#B4A0F0', tint: '#EEE9FB', tintNight: '#E1D6FA', tintAqua: '#C9D6FF', text: '#FFFFFF', textAqua: '#0B3B6E', sz: 1 }
];

function catTint(cat) {
  if (state.skin === 'aqua') return cat.tintAqua;
  return state.skin !== 'day' ? cat.tintNight : cat.tint;
}

const DAILY_GOAL = 30;
const COMBO_WINDOW_MS = 10 * 60 * 1000;
const NY_TZ = 'America/New_York';
const GOAL_ICONS = ['👗', '🎮', '🧸', '🍰', '☕', '✈️', '💎', '📚'];
const ICON_PICKER = [
  { em: '❤️', icons: ['❤️', '🩷', '🧡', '💛', '💚', '🩵', '💙', '💜', '🤍', '💖', '💝', '✨'] },
  { em: '😊', icons: ['😊', '😍', '🥰', '😎', '🥳', '🤩', '😴', '🤗', '😇', '🫶', '💪', '🙌'] },
  { em: '🐶', icons: ['🐶', '🐱', '🐰', '🐻', '🐼', '🐧', '🐥', '🦊', '🐸', '🐳', '🦄', '🐹'] },
  { em: '🍰', icons: ['🍰', '🍜', '🍣', '🍕', '🧋', '🍩', '🍓', '🍫', '🍦', '🥐', '🍔', '🍪'] },
  { em: '👗', icons: ['👗', '👟', '👜', '🧥', '👒', '💍', '🕶️', '💄', '👠', '🎀', '🧣', '👑'] },
  { em: '🎮', icons: ['🎮', '🎨', '🎸', '🎬', '📚', '🧩', '🎟️', '🎤', '🎲', '🏀', '🎳', '🎧'] },
  { em: '✈️', icons: ['✈️', '🏖️', '🗼', '🚆', '🏕️', '🎡', '🗺️', '🧳', '🚗', '🚲', '🏝️', '🌋'] },
  { em: '🌷', icons: ['🌷', '🌸', '🌻', '🌈', '🌙', '⭐', '🍀', '🌊', '❄️', '🔥', '🌵', '🍁'] },
  { em: '💻', icons: ['💻', '📱', '⌚', '📷', '🖥️', '⌨️', '🔋', '🖊️', '💡', '🎮', '🕹️', '📦'] }
];
const TIERS = [
  { min: 1, cls: 't1' },
  { min: 10, cls: 't2', em: '🌱' },
  { min: 20, cls: 't3', em: '🌸' },
  { min: 40, cls: 't4', em: '👑' }
];

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toInt(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) { return n.toLocaleString('en-US'); }

function nyDayKey(ts) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: NY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts);
}

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY_TZ, month: 'short', day: 'numeric' });
const wdFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY_TZ, weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY_TZ, hour: 'numeric', minute: '2-digit', hour12: true });

function dailyEarned() {
  const today = nyDayKey(Date.now());
  return state.history.reduce((s, e) => (e.type === 'earn' && !e.bonus && nyDayKey(e.ts) === today ? s + e.points : s), 0);
}

function streakDays() {
  const days = new Set(state.history.filter(e => e.type === 'earn').map(e => nyDayKey(e.ts)));
  let streak = 0;
  let d = Date.now();
  if (!days.has(nyDayKey(d))) d -= 86400000;
  while (days.has(nyDayKey(d))) {
    streak++;
    d -= 86400000;
  }
  return streak;
}

function currentCombo() {
  const h = state.history;
  if (!h.length) return 0;
  let combo = 0;
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].type !== 'earn') break;
    if (i === h.length - 1) {
      combo = 1;
      continue;
    }
    if (h[i + 1].ts - h[i].ts <= COMBO_WINDOW_MS) combo++;
    else break;
  }
  return combo;
}

let state = loadState();
saveState();

function loadState() {
  try {
    let raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pointGame') && k !== LS_KEY) {
          try {
            const s = migrate(JSON.parse(localStorage.getItem(k)));
            if (s && s.history && s.history.length) {
              raw = localStorage.getItem(k);
              break;
            }
          } catch (err) {}
        }
      }
    }
    if (raw) {
      const s = migrate(JSON.parse(raw));
      if (s) return s;
    }
  } catch (e) {}
  return seedState();
}

function seedState() {
  return {
    v: 4,
    sound: true,
    skin: 'day',
    dailyParty: null,
    tutorialDone: false,
    goal: null,
    collected: [],
    gaveUp: [],
    brain: [],
    history: []
  };
}

function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  if (!Array.isArray(s.history)) s.history = [];
  s.history = s.history.filter(e => e && typeof e.points === 'number' && !!e.name && (e.type === 'earn' || e.type === 'spend'));
  if (typeof s.goal === 'string') {
    s.goal = { icon: '👗', name: s.goal, pts: toInt(s.goalPts) };
  } else if (s.goal && typeof s.goal === 'object' && typeof s.goal.pts === 'number' && !!s.goal.name) {
    s.goal = { icon: s.goal.icon || '⭐', name: String(s.goal.name), pts: toInt(s.goal.pts) };
  } else {
    s.goal = null;
  }
  s.collected = Array.isArray(s.collected)
    ? s.collected.filter(c => c && typeof c.pts === 'number' && !!c.name).map(c => ({ icon: c.icon || '⭐', name: String(c.name), pts: toInt(c.pts), spentAt: c.spentAt || Date.now() }))
    : [];
  s.gaveUp = Array.isArray(s.gaveUp)
    ? s.gaveUp.filter(c => c && typeof c.pts === 'number' && !!c.name).map(c => ({ icon: c.icon || '⭐', name: String(c.name), pts: toInt(c.pts), gaveUpAt: c.gaveUpAt || Date.now() }))
    : [];
  s.brain = Array.isArray(s.brain)
    ? s.brain.filter(t => t && !!t.text).map(t => ({
        id: t.id || makeId(),
        text: String(t.text).slice(0, 60),
        catId: CATEGORIES.some(c => c.id === t.catId) ? t.catId : 'light',
        slot: (t.slot === 0 || t.slot === 1 || t.slot === 2) ? t.slot : null
      }))
    : [];
  delete s.goalPts;
  delete s.actions;
  if (typeof s.sound !== 'boolean') s.sound = true;
  if (s.skin !== 'day' && s.skin !== 'night' && s.skin !== 'aqua') s.skin = 'day';
  if (typeof s.dailyParty !== 'string') s.dailyParty = null;
  if (typeof s.tutorialDone !== 'boolean') s.tutorialDone = false;
  s.v = 4;
  return s;
}

function saveState() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
}

function spendable() {
  return state.history.reduce((sum, e) => sum + (e.type === 'earn' ? e.points : -e.points), 0);
}

let PAL = {};
let dotsG = null;
let fireflies = [];
let sea = null;
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

function makePalette() {
  if (state.skin !== 'day') {
    PAL = {
      bg: '#2E3463',
      dot: 'rgba(255,240,180,0.18)',
      blob: ['rgba(159,217,185,0.07)', 'rgba(245,213,112,0.07)', 'rgba(139,200,232,0.07)', 'rgba(242,156,143,0.07)'],
      sub: '#B9B4D6',
      line: '#474E8A',
      numFill: '#F3E9D2',
      numOutline: '#3A4078',
      accent: '#9FD9B9',
      track: '#262B55',
      fillA: '#9FD9B9',
      fillB: '#5FA97C',
      pill: '#262B55',
      mascot: '#FFC4CC',
      coins: ['#F5D570', '#7BC5A1', '#8BC8E8', '#F29C8F', '#C9B6E4'],
      floatFill: '#F3E9D2',
      floatOutline: '#3A4078',
      comboFill: '#F29C8F'
    };
    if (state.skin === 'aqua') {
      PAL.bg = '#CFF3FF';
      PAL.line = 'rgba(255,255,255,.8)';
      PAL.numFill = '#FFFFFF';
      PAL.numOutline = '#1565C0';
      PAL.pillText = '#0B3B6E';
      PAL.sub = '#0B3B6E';
      PAL.track = 'rgba(255,255,255,.5)';
      PAL.pill = 'rgba(255,255,255,.7)';
      PAL.fillA = '#B3F0FF';
      PAL.fillB = '#29B6F6';
      PAL.floatFill = '#FFFFFF';
      PAL.floatOutline = '#1565C0';
      PAL.accent = '#4FC3F7';
      PAL.coins = ['#FFD54F', '#4FC3F7', '#FFFFFF', '#B3F0FF', '#90CAF9'];
    }
    return;
  }
  if (darkMQ.matches) {
    PAL = {
      bg: '#2B251D',
      dot: 'rgba(123,197,161,0.09)',
      blob: ['rgba(123,197,161,0.08)', 'rgba(245,213,112,0.08)', 'rgba(139,200,232,0.08)', 'rgba(242,156,143,0.08)'],
      sub: '#B8A98D',
      line: '#4A4030',
      numFill: '#F8F4E3',
      numOutline: '#6B5A40',
      accent: '#7BC5A1',
      track: '#3A3226',
      fillA: '#7BC5A1',
      fillB: '#4E9B6F',
      pill: '#383024',
      mascot: '#FFC4CC',
      coins: ['#F5D570', '#7BC5A1', '#8BC8E8', '#F29C8F', '#C9B6E4'],
      floatFill: '#F8F4E3',
      floatOutline: '#6B5A40',
      comboFill: '#F29C8F'
    };
  } else {
    PAL = {
      bg: '#F8F4E3',
      dot: 'rgba(123,197,161,0.15)',
      blob: ['rgba(123,197,161,0.20)', 'rgba(245,213,112,0.22)', 'rgba(139,200,232,0.20)', 'rgba(242,156,143,0.18)'],
      sub: '#A8926F',
      line: '#E0D4B4',
      numFill: '#725D42',
      numOutline: '#FFF6DC',
      accent: '#4E9B6F',
      track: '#FFFDF4',
      fillA: '#A5DCA9',
      fillB: '#5FA97C',
      pill: '#FFFCF2',
      mascot: '#FFC4CC',
      coins: ['#F5D570', '#7BC5A1', '#8BC8E8', '#F29C8F', '#C9B6E4'],
      floatFill: '#725D42',
      floatOutline: '#FFF6DC',
      comboFill: '#F29C8F'
    };
  }
}

function makeDots() {
  if (!width || width <= 0) return;
  dotsG = createGraphics(width, height);
  dotsG.noStroke();
  dotsG.fill(PAL.dot);
  const step = 26;
  for (let yy = step / 2; yy < height; yy += step) {
    for (let xx = step / 2; xx < width; xx += step) {
      dotsG.circle(xx, yy, 4);
    }
  }
  fireflies = [];
  if (state.skin === 'night') {
    for (let i = 0; i < 5; i++) {
      fireflies.push({
        x: random(24, Math.max(25, width - 24)),
        y: random(36, Math.max(37, height * 0.72)),
        ph: random(TWO_PI),
        sp: random(0.012, 0.028)
      });
    }
  }
  sea = null;
  if (state.skin === 'aqua') {
    const cols = ['rgba(255,255,255,0.92)', '#D9F2FF', '#BEE7FF'];
    sea = { fish: [], jellies: [], bub: [], pen: { x: Math.max(70, width - 96), dir: -1 } };
    for (let i = 0; i < 3; i++) {
      sea.fish.push({
        x: random(60, Math.max(61, width - 60)),
        y: random(50, Math.max(51, height * 0.6)),
        dir: i % 2 ? 1 : -1,
        sp: random(0.4, 0.8),
        c: cols[i],
        ph: random(TWO_PI),
        sz: random(13, 17)
      });
    }
    for (let i = 0; i < 2; i++) {
      sea.jellies.push({
        x: random(60, Math.max(61, width * 0.8)),
        y: random(70, Math.max(71, height * 0.55)),
        ph: random(TWO_PI),
        c: i ? 'rgba(203,183,237,0.5)' : 'rgba(244,180,210,0.5)'
      });
    }
    for (let i = 0; i < 14; i++) {
      sea.bub.push({
        x: random(10, Math.max(11, width - 10)),
        y: random(height),
        r: random(2, 5),
        sp: random(0.3, 0.8),
        wob: random(TWO_PI)
      });
    }
  }
}

function drawNightSky() {
  noStroke();
  const mx = width - 96;
  const my = 40;
  fill('#F5E6A8');
  circle(mx, my, 30);
  fill(PAL.bg);
  circle(mx + 10, my - 5, 26);
  for (const f of fireflies) {
    const tw = 0.55 + 0.35 * sin(frameCount * f.sp + f.ph);
    fill(255, 228, 120, 255 * tw);
    circle(f.x, f.y + sin(frameCount * f.sp * 0.7 + f.ph) * 5, 5);
  }
}

function drawAquaSea() {
  if (!sea) return;
  const t = frameCount;
  noStroke();
  const grad = drawingContext.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#CFF3FF');
  grad.addColorStop(1, '#6CC9FF');
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(0, 0, width, height);

  for (const b of sea.bub) {
    b.y -= b.sp;
    b.x += sin(t * 0.03 + b.wob) * 0.3;
    if (b.y < -8) {
      b.y = height + 8;
      b.x = random(10, Math.max(11, width - 10));
    }
    fill(255, 255, 255, 38);
    circle(b.x, b.y, b.r * 2);
    fill(255, 255, 255, 70);
    circle(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.7);
  }

  for (const j of sea.jellies) {
    const pulse = sin(t * 0.025 + j.ph);
    const yy = j.y + sin(t * 0.008 + j.ph) * 16;
    push();
    translate(j.x, yy);
    scale(1 + pulse * 0.06, 1 - pulse * 0.06);
    drawingContext.shadowBlur = 25;
    drawingContext.shadowColor = 'rgba(255,255,255,0.9)';
    fill('rgba(255,255,255,0.55)');
    arc(0, 0, 34, 26, PI, 0);
    stroke('rgba(255,255,255,0.55)');
    strokeWeight(1.5);
    noFill();
    for (let k = -2; k <= 2; k++) {
      beginShape();
      vertex(k * 5, 10);
      for (let s = 1; s <= 5; s++) {
        vertex(k * 5 + sin(t * 0.04 + s * 1.1 + k * 1.7) * 4, 10 + s * 8);
      }
      endShape();
    }
    drawingContext.shadowBlur = 0;
    noStroke();
    pop();
  }

  for (const f of sea.fish) {
    f.x += f.dir * f.sp;
    if (f.x < 46) f.dir = 1;
    if (f.x > width - 46) f.dir = -1;
    const yy = f.y + sin(t * 0.02 + f.ph) * 4;
    push();
    translate(f.x, yy);
    scale(f.dir, 1);
    fill(f.c);
    const wag = sin(t * 0.15 + f.ph) * 0.45;
    push();
    translate(-f.sz * 0.48, 0);
    rotate(wag);
    triangle(0, -f.sz * 0.26, 0, f.sz * 0.26, -f.sz * 0.5, 0);
    pop();
    ellipse(0, 0, f.sz, f.sz * 0.62);
    triangle(-f.sz * 0.12, -f.sz * 0.28, f.sz * 0.14, -f.sz * 0.28, 0, -f.sz * 0.52);
    pop();
  }

  const p = sea.pen;
  const lo = Math.max(60, width - 126);
  const hi = Math.max(lo + 10, width - 72);
  p.x += p.dir * 0.25;
  if (p.x < lo) p.dir = 1;
  if (p.x > hi) p.dir = -1;
  push();
  translate(p.x, height - 26);
  rotate(sin(t * 0.09) * 0.1);
  scale(p.dir, 1);
  fill(47, 53, 74);
  ellipse(0, 0, 24, 28);
  fill(252, 250, 245);
  ellipse(0, 5, 14, 16);
  fill(255);
  circle(-4.5, -8, 5.5);
  circle(4.5, -8, 5.5);
  fill(40, 46, 66);
  circle(-3.6, -8, 2.4);
  circle(5.4, -8, 2.4);
  fill('#F5A65B');
  triangle(-2.5, -3.5, 2.5, -3.5, 0, 1.5);
  ellipse(-5, 13.5, 6, 2.6);
  ellipse(5, 13.5, 6, 2.6);
  pop();
}

darkMQ.addEventListener('change', () => {
  makePalette();
  makeDots();
});

function setup() {
  const holder = document.getElementById('canvas-holder');
  const c = createCanvas(holder.clientWidth || windowWidth, holder.clientHeight || 320);
  c.parent(holder);
  noLoop();
  strokeJoin(ROUND);
  strokeCap(ROUND);
  makePalette();
  makeDots();
  c.canvas.addEventListener('mousemove', ev => {
    c.canvas.style.cursor = mascotHit(ev) ? 'pointer' : 'default';
  });
  c.canvas.addEventListener('click', ev => {
    if (mascotHit(ev)) boopDopi();
  });
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('900 100px Nunito'),
      document.fonts.load('800 17px Nunito')
    ]).then(startLoop).catch(startLoop);
    setTimeout(startLoop, 3000);
  } else {
    startLoop();
  }
}

let loopStarted = false;

function startLoop() {
  if (loopStarted) return;
  loopStarted = true;
  textFont('Nunito');
  loop();
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  if (holder && holder.clientWidth > 0) {
    resizeCanvas(holder.clientWidth, holder.clientHeight);
    makeDots();
  }
}

let numX = 0;
let numY = 0;
let numSize = 60;
let pulse = 0;
let rollVal = null;
let rollVel = 0;
let coins = [];
let floats = [];
let motes = [];
let mY = 0;
let mVel = 0;
let mHappy = 0;
let mSquash = 0;

function draw() {
  background(PAL.bg);
  if (dotsG) image(dotsG, 0, 0);
  if (state.skin === 'night') drawNightSky();
  else if (state.skin === 'aqua') drawAquaSea();
  noStroke();
  textAlign(CENTER, CENTER);

  const comboNow = currentCombo();
  const comboBand = comboNow >= 2 ? 34 : 0;

  const cx = width / 2;
  const total = spendable();

  const collectVisible = !!state.goal && !collectBtn.hidden;
  const topPad = 76 + comboBand;
  const bottomPad = 16 + 40 + (collectVisible ? 64 : 0);
  const avail = height - topPad - bottomPad;

  drawComboBadge(topPad - comboBand / 2);

  if (state.goal) {
    const g = state.goal;
    const remain = Math.max(g.pts - total, 0);
    const ratio = Math.min(Math.max(total / g.pts, 0), 1);

    if (rollVal === null) rollVal = remain;
    rollVel += (remain - rollVal) * 0.3;
    rollVel *= 0.72;
    rollVal += rollVel;
    if (Math.abs(remain - rollVal) < 0.4 && Math.abs(rollVel) < 0.4) {
      rollVal = remain;
      rollVel = 0;
    }
    const shown = Math.max(0, Math.round(rollVal));

    const digits = fmt(shown);
    numSize = Math.min(width * 0.26, avail * 0.38, 120);
    let gs = 16;
    let ts = 15;
    let ps = 12;
    let os = 15;
    let barH = 22;
    let pillH = 32;
    let gaps = [8, 6, 10, 6, 8];
    const restNatural = gs + gaps[0] + gaps[1] + ts + gaps[2] + barH + gaps[3] + ps + gaps[4] + pillH;
    const availRest = avail - numSize;
    if (availRest < restNatural) {
      const rk = Math.max(0.55, availRest / restNatural);
      gs = Math.max(12, gs * rk);
      ts = Math.max(11, ts * rk);
      ps = Math.max(10, ps * rk);
      os = Math.max(11, os * rk);
      barH = Math.max(14, barH * rk);
      pillH = Math.max(24, pillH * rk);
      gaps = gaps.map(g0 => Math.max(3, g0 * rk));
    }
    const finalH = numSize + gs + gaps[0] + gaps[1] + ts + gaps[2] + barH + gaps[3] + ps + gaps[4] + pillH;

    let y = topPad + Math.max(0, (avail - finalH) / 2);

    fill(PAL.sub);
    textSize(gs);
    const goalMaxW = width - 28;
    let goalStr = `${g.icon} ${g.name}`;
    if (textWidth(goalStr) > goalMaxW) {
      let nm = g.name;
      while (nm.length > 0 && textWidth(`${g.icon} ${nm}…`) > goalMaxW) nm = nm.slice(0, -1);
      goalStr = `${g.icon} ${nm.trimEnd()}…`;
    }
    text(goalStr, cx, y + gs / 2);
    y += gs + gaps[0];

    numX = cx;
    numY = y + numSize / 2;
    const pSize = numSize * 0.4;
    const gapP = numSize * 0.08;
    textFont('Nunito');
    textStyle(BOLD);
    textSize(numSize);
    const digitsW = textWidth(digits);
    textSize(pSize);
    const pW = textWidth('P');
    const startX = width / 2 - (digitsW + gapP + pW) / 2;
    const baseY = numSize * 0.36;

    push();
    translate(cx, numY);
    scale(1 + 0.08 * pulse);
    drawText900(digits, startX - cx, baseY, numSize, Math.max(6, numSize * 0.13));
    drawText900('P', startX - cx + digitsW + gapP, baseY, pSize, Math.max(4, pSize * 0.18));
    pop();
    textStyle(NORMAL);
    y += numSize + gaps[1];

    fill(PAL.sub);
    textStyle(BOLD);
    textSize(ts);
    text('to go!', cx, y + ts / 2);
    textStyle(NORMAL);
    y += ts + gaps[2];

    const barW = width * 0.72;
    const barX = cx - barW / 2;
    stroke(PAL.line);
    strokeWeight(2);
    fill(PAL.track);
    rect(barX, y, barW, barH, barH / 2);
    noStroke();
    if (ratio > 0.015) {
      fill(lerpColor(color(PAL.fillA), color(PAL.fillB), ratio));
      rect(barX + 1.5, y + 1.5, Math.max((barW - 3) * ratio, barH - 3), barH - 3, (barH - 3) / 2);
      const tipX = Math.min(barX + barW - barH * 0.4, Math.max(barX + barH * 0.6, barX + barW * ratio));
      textSize(barH * 1.15);
      text('🍃', tipX, y + barH / 2 + 1);
    }
    y += barH + gaps[3];

    fill(PAL.sub);
    textStyle(BOLD);
    textSize(ps);
    text(`${Math.round(ratio * 100)}%`, cx, y + ps / 2);
    textStyle(NORMAL);
    y += ps + gaps[4];

    const ownStr = `💰 ${fmt(total)}P saved`;
    textSize(os);
    const pw = textWidth(ownStr) + 30;
    stroke(PAL.line);
    strokeWeight(2);
    fill(PAL.pill);
    rect(cx - pw / 2, y, pw, pillH, pillH / 2);
    noStroke();
    fill(state.skin === 'aqua' ? PAL.pillText : PAL.numFill);
    textStyle(BOLD);
    text(ownStr, cx, y + pillH / 2);
    textStyle(NORMAL);
  }

  updateMotes();
  updateCoins();
  updateFloats();
  updateBubbles();
  if (goalFormEl.hidden) drawMascot(collectVisible);

  pulse = pulse > 0.01 ? pulse * 0.9 : 0;
}

function drawText900(str, x, baselineY, size, outlineW) {
  const ctx = drawingContext;
  ctx.save();
  ctx.font = `900 ${size}px Nunito, "Apple SD Gothic Neo", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = outlineW;
  ctx.strokeStyle = PAL.numOutline;
  ctx.strokeText(str, x, baselineY);
  ctx.fillStyle = PAL.numFill;
  ctx.fillText(str, x, baselineY);
  ctx.restore();
}

function drawComboBadge(y) {
  const combo = currentCombo();
  if (combo < 2) return;
  const str = `COMBO x${combo}!`;
  textSize(13);
  textStyle(BOLD);
  const tw = textWidth(str);
  textStyle(NORMAL);
  const w = tw + 26;
  push();
  translate(width / 2, y);
  rotate(Math.sin(frameCount * 0.1) * 0.08);
  stroke(PAL.line);
  strokeWeight(2);
  fill(PAL.comboFill);
  rect(-w / 2, -14, w, 28, 14);
  noStroke();
  fill(255);
  textStyle(BOLD);
  textSize(13);
  text(str, 0, 1);
  textStyle(NORMAL);
  pop();
  noStroke();
}

function startCoins(pts, xf) {
  if (coins.length > 150) return;
  const n = Math.max(5, Math.min(22, Math.round(pts * 0.7) + 4));
  const baseX = (xf || 0.5) * width;
  for (let i = 0; i < n; i++) {
    const x0 = baseX + random(-36, 36);
    const y0 = height + 24;
    const tx = numX + random(-numSize * 0.4, numSize * 0.4);
    const ty = numY + random(-12, 12);
    const mx = (x0 + tx) / 2 + random(-70, 70);
    const my = (y0 + ty) / 2 - random(50, 130);
    coins.push({
      x0, y0, mx, my, tx, ty,
      t: -random(0, 14),
      dur: random(34, 52),
      r: random(7, 12),
      c: random(PAL.coins)
    });
  }
}

function updateCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.t += 1 / c.dur;
    if (c.t < 0) continue;
    if (c.t >= 1) {
      coins.splice(i, 1);
      pulse = 1;
      continue;
    }
    const tt = c.t * c.t * (3 - 2 * c.t);
    const x = (1 - tt) * (1 - tt) * c.x0 + 2 * (1 - tt) * tt * c.mx + tt * tt * c.tx;
    const yy = (1 - tt) * (1 - tt) * c.y0 + 2 * (1 - tt) * tt * c.my + tt * tt * c.ty;
    push();
    translate(x, yy);
    fill(c.c);
    stroke(PAL.line);
    strokeWeight(2);
    circle(0, 0, c.r * 2);
    noStroke();
    fill(255, 255, 255, 100);
    circle(-c.r * 0.3, -c.r * 0.35, c.r * 0.7);
    pop();
  }
}

function spawnMotes(x, n) {
  const chars = ['🍃', '✨', '🌟', '🍃'];
  for (let i = 0; i < n; i++) {
    motes.push({
      ch: chars[Math.floor(random(chars.length))],
      x: x + random(-20, 20),
      y: height - random(0, 20),
      vy: random(-2.8, -1.4),
      vx: random(-0.6, 0.6),
      rot: random(-0.4, 0.4),
      vr: random(-0.03, 0.03),
      sway: random(0.04, 0.1),
      ph: random(TWO_PI),
      size: random(16, 26),
      life: 1
    });
  }
}

function updateMotes() {
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.x += m.vx + Math.sin(frameCount * m.sway + m.ph) * 0.8;
    m.y += m.vy;
    m.rot += m.vr;
    m.life -= 0.006;
    if (m.life <= 0 || m.y < -30) {
      motes.splice(i, 1);
      continue;
    }
    push();
    translate(m.x, m.y);
    rotate(m.rot + Math.sin(frameCount * 0.05 + m.ph) * 0.2);
    drawingContext.globalAlpha = Math.max(0, Math.min(1, m.life * 1.4));
    textSize(m.size);
    text(m.ch, 0, 0);
    drawingContext.globalAlpha = 1;
    pop();
  }
  if (motes.length > 240) motes.splice(0, motes.length - 240);
}

function floatText(str, size) {
  floats.push({ x: numX + random(-24, 24), y: numY + numSize * 0.8, str, size: size || 26, life: 1 });
}

function updateFloats() {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.y -= 1.3;
    f.life -= 0.018;
    if (f.life <= 0) {
      floats.splice(i, 1);
      continue;
    }
    stroke(PAL.floatOutline);
    strokeWeight(5);
    fill(PAL.floatFill);
    textStyle(BOLD);
    textSize(f.size);
    text(f.str, f.x, f.y);
    noStroke();
    textStyle(NORMAL);
  }
}

function drawMascot(collectVisible) {
  const baseY = collectVisible ? height - 98 : height - 42;
  const mx = 46;
  mVel += 0.35;
  mY += mVel;
  if (mY >= 0) {
    if (mVel > 2.5) mSquash = Math.min(0.35, mVel * 0.05);
    mY = 0;
    mVel = 0;
  }
  mSquash *= 0.86;
  mHappy *= 0.97;
  const bob = Math.sin(frameCount * 0.06) * 2;
  const y = baseY + mY + bob;
  const eyeCol = '#7A5A44';

  push();
  translate(mx, y);
  scale(1 + mSquash, 1 - mSquash);

  if (mHappy > 0.25) {
    stroke(PAL.line);
    strokeWeight(3);
    fill(PAL.mascot);
    circle(-27, -20, 13);
    circle(27, -20, 13);
  }

  stroke(PAL.line);
  strokeWeight(2.5);
  fill(PAL.mascot);
  ellipse(0, 0, 46, 40);

  strokeWeight(3);
  noFill();
  if (mHappy > 0.25) {
    stroke(eyeCol);
    arc(-9, -5, 11, 11, PI, TWO_PI);
    arc(9, -5, 11, 11, PI, TWO_PI);
  } else {
    noStroke();
    fill(eyeCol);
    circle(-9, -5, 5);
    circle(9, -5, 5);
    stroke(eyeCol);
    strokeWeight(2.5);
  }
  if (mHappy > 0.25) {
    noStroke();
    fill('#C96F60');
    arc(0, 5, 14, 12, 0, PI, CHORD);
  } else {
    noFill();
    arc(0, 4, 12, 10, 0.25, PI - 0.25);
  }
  noStroke();
  fill('rgba(242,156,143,0.4)');
  circle(-16, 4, 8);
  circle(16, 4, 8);

  pop();
  noStroke();
}

function mascotPos() {
  const collectVisible = !!state.goal && !collectBtn.hidden;
  const baseY = collectVisible ? height - 98 : height - 42;
  return { x: 46, y: baseY + mY + Math.sin(frameCount * 0.06) * 2 };
}

function mascotHit(ev) {
  if (!goalFormEl.hidden) return false;
  const p = mascotPos();
  const r = drawingContext.canvas.getBoundingClientRect();
  return Math.hypot(ev.clientX - (r.left + p.x), ev.clientY - (r.top + p.y)) <= 30;
}

function boopDopi() {
  mVel = -5;
  mHappy = 1;
  playSound('boop');
  const p = mascotPos();
  for (let i = 0; i < 4; i++) {
    motes.push({
      ch: '💗',
      x: p.x + random(-18, 18),
      y: p.y + random(-16, 8),
      vy: random(-3.2, -2),
      vx: random(-0.8, 0.8),
      rot: random(-0.4, 0.4),
      vr: random(-0.03, 0.03),
      sway: random(0.04, 0.1),
      ph: random(TWO_PI),
      size: random(12, 16),
      life: 1
    });
  }
}

let audioCtx = null;

function playSound(kind) {
  if (!state.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const notes = kind === 'goal' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'boop' ? [587.33] : [987.77, 1318.51];
    const vol = kind === 'boop' ? 0.07 : 0.12;
    const dec = kind === 'boop' ? 0.1 : 0.18;
    notes.forEach((f, i) => {
      const t = t0 + i * 0.09;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dec + 0.02);
    });
  } catch (e) {}
}

function vibrate(ms) {
  if (navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
}

const cardsEl = document.getElementById('cards');
const recentList = document.getElementById('recent-list');
const soundBtn = document.getElementById('sound-btn');
const noGoalEl = document.getElementById('no-goal');
const goalFormEl = document.getElementById('goal-form');
const collectBtn = document.getElementById('collect-btn');
const btnGoalMenu = document.getElementById('btn-goal-menu');
const canvasHolderEl = document.getElementById('canvas-holder');
const menuEl = document.getElementById('goal-menu');
const menuBackdrop = document.getElementById('menu-backdrop');
const menuTitle = document.getElementById('menu-title');
const dialogEl = document.getElementById('dialog');
const dialogBackdrop = document.getElementById('dialog-backdrop');
const dialogMsg = document.getElementById('dialog-msg');

function updateSoundBtn() {
  soundBtn.textContent = state.sound ? '🔊' : '🔇';
}

soundBtn.addEventListener('click', () => {
  state.sound = !state.sound;
  saveState();
  updateSoundBtn();
  if (state.sound) playSound('coin');
});

function spawnXFraction(cardId) {
  const holder = document.getElementById('canvas-holder').getBoundingClientRect();
  const el = document.getElementById(cardId);
  if (!el) return 0.5;
  const r = el.getBoundingClientRect();
  return Math.min(0.95, Math.max(0.05, (r.left + r.width / 2 - holder.left) / holder.width));
}

function renderCards() {
  cardsEl.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card' + (cat.per5 ? ' wide' : '');
    card.id = `card-${cat.id}`;
    card.style.setProperty('--fill', cat.fill);
    card.style.setProperty('--tint', catTint(cat));
    card.style.setProperty('--t', cat.text);
    card.style.setProperty('--btone', catTint(cat));
    card.style.setProperty('--btext', cat.textAqua);

    const head = document.createElement('div');
    head.className = 'cat-head';

    const badge = document.createElement('div');
    badge.className = 'emoji-badge';
    badge.textContent = cat.emoji;

    const info = document.createElement('div');
    info.className = 'cat-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'cat-name';
    nameEl.textContent = cat.name;
    const hintEl = document.createElement('div');
    hintEl.className = 'cat-hint';
    hintEl.textContent = cat.hint;
    info.appendChild(nameEl);
    info.appendChild(hintEl);

    const pill = document.createElement('span');
    pill.className = 'pts-pill';
    pill.id = `pill-${cat.id}`;
    pill.textContent = cat.per5 ? '+0P' : `+${fmt(cat.pts)}P`;

    head.appendChild(badge);
    head.appendChild(info);
    head.appendChild(pill);

    const row = document.createElement('div');
    row.className = 'cat-row';

    const input = document.createElement('input');
    input.id = `input-${cat.id}`;
    input.type = 'text';
    if (cat.per5) input.inputMode = 'numeric';
    input.maxLength = cat.per5 ? 4 : 40;
    input.placeholder = cat.per5 ? 'minutes' : 'what did you do?';
    input.autocomplete = 'off';

    const go = document.createElement('button');
    go.className = 'go-btn';
    go.id = `go-${cat.id}`;
    go.textContent = 'GO';
    if (cat.per5) go.disabled = true;

    row.appendChild(input);
    row.appendChild(go);

    card.appendChild(head);
    card.appendChild(row);
    cardsEl.appendChild(card);

    if (cat.per5) {
      input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '').slice(0, 4);
        if (digits !== input.value) input.value = digits;
        updatePreview(cat, input);
      });
    }
    input.addEventListener('keydown', ev => {
      if (ev.isComposing || ev.keyCode === 229) return;
      if (ev.key === 'Enter') submitCard(cat, input);
    });
    go.addEventListener('click', () => submitCard(cat, input));
  });
}

function updatePreview(cat, input) {
  const pill = document.getElementById(`pill-${cat.id}`);
  const go = document.getElementById(`go-${cat.id}`);
  const mins = toInt(input.value);
  const p = Math.floor(mins / 5) * cat.per5;
  pill.textContent = `+${fmt(p)}P`;
  pill.classList.toggle('zero', p < 1);
  go.disabled = p < 1;
}

function submitCard(cat, input) {
  const text = input.value.trim();
  let pts;
  let label;
  if (cat.per5) {
    const mins = toInt(input.value);
    if (mins < 5) {
      toast('Need at least 5 minutes ⏱️');
      return;
    }
    pts = Math.floor(mins / 5) * cat.per5;
    label = `${cat.name} · ${mins}min`;
  } else {
    pts = cat.pts;
    label = text ? `${cat.name} · ${text}` : cat.name;
  }
  const entry = addEarn(label, pts, spawnXFraction(`card-${cat.id}`));
  const cardEl = document.getElementById(`card-${cat.id}`);
  if (cardEl) {
    cardEl.classList.remove('pop');
    void cardEl.offsetWidth;
    cardEl.classList.add('pop');
  }
  input.value = '';
  if (cat.per5) updatePreview(cat, input);
  input.blur();
  showUndoToast(entry);
}

function addEarn(name, points, xf, extra) {
  const entry = { id: makeId(), ts: Date.now(), name, points: toInt(points), type: 'earn', ...(extra || {}) };
  state.history.push(entry);
  saveState();
  startCoins(entry.points, xf);
  spawnMotes((xf || 0.5) * width, 10);
  floatText(`+${fmt(entry.points)}P`, 26);
  mVel = -4.2;
  mHappy = 1;
  playSound('coin');
  vibrate(12);
  const combo = currentCombo();
  if (combo >= 2) floatText(`COMBO x${combo}!`, 22);
  const todayK = nyDayKey(Date.now());
  if (dailyEarned() >= DAILY_GOAL && state.dailyParty !== todayK) {
    state.dailyParty = todayK;
    state.history.push({ id: makeId(), ts: Date.now(), name: 'Daily goal bonus', points: 5, type: 'earn', bonus: true });
    saveState();
    spawnMotes(width * 0.25, 20);
    spawnMotes(width * 0.75, 20);
    floatText('DAILY GOAL! +5P', 26);
    playSound('goal');
    vibrate(40);
  }
  renderAll();
  return entry;
}

function removeEntry(id) {
  const i = state.history.findIndex(e => e.id === id);
  if (i < 0) return;
  state.history.splice(i, 1);
  saveState();
  renderAll();
}

function updateBadges() {
  document.getElementById('streak-badge').textContent = `🔥 ${streakDays()}d`;
  const earned = dailyEarned();
  const ring = document.getElementById('today-ring');
  const label = document.getElementById('ring-label');
  const p = Math.min(100, Math.round((earned / DAILY_GOAL) * 100));
  ring.style.setProperty('--p', p);
  label.textContent = `${Math.min(earned, DAILY_GOAL)}/${DAILY_GOAL}`;
  if (earned >= DAILY_GOAL) ring.classList.add('done');
  else ring.classList.remove('done');
}

function entryEmoji(e) {
  for (const c of CATEGORIES) {
    if (e.name.startsWith(c.name + ' ·')) return c.emoji;
    if (c.id === 'focus' && e.name.includes(' · Focus ')) return c.emoji;
  }
  return e.type === 'spend' ? '🛍️' : '⭐';
}

function renderRecent() {
  const items = state.history.slice(-8).reverse();
  recentList.innerHTML = '';
  if (!items.length) {
    recentList.innerHTML = '<p class="empty">Nothing yet — go log something! ✨</p>';
    return;
  }
  items.forEach(e => {
    const row = document.createElement('div');
    row.className = 'recent-row';
    const em = document.createElement('span');
    em.className = 'r-emoji';
    em.textContent = entryEmoji(e);
    const info = document.createElement('div');
    info.className = 'r-info';
    const name = document.createElement('span');
    name.className = 'r-name';
    name.textContent = e.name;
    const time = document.createElement('span');
    time.className = 'r-time';
    time.textContent = timeFmt.format(e.ts);
    info.appendChild(name);
    info.appendChild(time);
    const pts = document.createElement('span');
    pts.className = 'r-pts';
    pts.textContent = `${e.type === 'earn' ? '+' : '-'}${fmt(e.points)}P`;
    const del = document.createElement('button');
    del.className = 'r-del';
    del.textContent = '✕';
    del.setAttribute('aria-label', 'Delete entry');
    del.addEventListener('click', () => deleteEntryWithUndo(e.id));
    row.appendChild(em);
    row.appendChild(info);
    row.appendChild(pts);
    row.appendChild(del);
    recentList.appendChild(row);
  });
}

function renderHomeUI() {
  const editing = !goalFormEl.hidden;
  canvasHolderEl.classList.toggle('form-open', editing);
  if (editing) {
    noGoalEl.hidden = true;
    collectBtn.hidden = true;
    btnGoalMenu.hidden = true;
    return;
  }
  btnGoalMenu.hidden = !state.goal;
  if (state.goal) {
    noGoalEl.hidden = true;
    collectBtn.hidden = spendable() < state.goal.pts;
  } else {
    collectBtn.hidden = true;
    noGoalEl.hidden = false;
  }
}

function renderAll() {
  updateBadges();
  renderRecent();
  renderCalendar();
  renderDays();
  renderGoals();
  renderHomeUI();
}

let expandedDay = null;

function dayGroups() {
  const map = new Map();
  for (const e of state.history) {
    const k = nyDayKey(e.ts);
    let g = map.get(k);
    if (!g) {
      g = { key: k, ts: 0, earn: 0, entries: [] };
      map.set(k, g);
    }
    g.entries.push(e);
    if (e.ts > g.ts) g.ts = e.ts;
    if (e.type === 'earn') g.earn += e.points;
  }
  return [...map.values()].sort((a, b) => b.ts - a.ts);
}

function renderDays() {
  const wrap = document.getElementById('days-list');
  wrap.innerHTML = '';
  const groups = dayGroups();
  if (!groups.length) {
    wrap.innerHTML = '<p class="empty">No logs yet — go do something fun! 🌱</p>';
    return;
  }
  const maxEarn = Math.max(30, ...groups.map(g => g.earn));
  groups.forEach(g => {
    const isToday = g.key === nyDayKey(Date.now());
    const dayStr = `${wdFmt.format(g.ts)}, ${dateFmt.format(g.ts)}`;
    const label = isToday ? `Today · ${dayStr}` : dayStr;

    const block = document.createElement('div');
    block.className = 'day-block' + (isToday ? ' today' : '') + (expandedDay === g.key ? ' open' : '');

    const row = document.createElement('button');
    row.className = 'day-row';

    const line = document.createElement('div');
    line.className = 'day-line';
    const dateEl = document.createElement('span');
    dateEl.className = 'day-date';
    dateEl.textContent = label;
    const ptsEl = document.createElement('span');
    ptsEl.className = 'day-pts';
    ptsEl.textContent = `+${fmt(g.earn)}P`;
    line.appendChild(dateEl);
    line.appendChild(ptsEl);
    row.appendChild(line);

    const bar = document.createElement('div');
    bar.className = 'day-bar';
    const fill = document.createElement('div');
    fill.className = 'day-fill';
    fill.style.width = `${Math.round((g.earn / maxEarn) * 100)}%`;
    bar.appendChild(fill);
    row.appendChild(bar);

    const chev = document.createElement('span');
    chev.className = 'day-chev';
    chev.textContent = expandedDay === g.key ? '▲' : '▼';
    row.appendChild(chev);

    block.appendChild(row);

    if (expandedDay === g.key) {
      const listEl = document.createElement('div');
      listEl.className = 'day-entries';
      [...g.entries].reverse().forEach(e => {
        const de = document.createElement('div');
        de.className = 'de-row';
        const name = document.createElement('span');
        name.className = 'de-name';
        name.textContent = e.name;
        const time = document.createElement('span');
        time.className = 'de-time';
        time.textContent = timeFmt.format(e.ts);
        const pts = document.createElement('span');
        pts.className = 'de-pts' + (e.type === 'spend' ? ' spend' : '');
        pts.textContent = `${e.type === 'earn' ? '+' : '-'}${fmt(e.points)}P`;
        de.appendChild(name);
        de.appendChild(time);
        de.appendChild(pts);
        listEl.appendChild(de);
      });
      block.appendChild(listEl);
    }

    row.addEventListener('click', () => {
      expandedDay = expandedDay === g.key ? null : g.key;
      renderDays();
    });

    wrap.appendChild(block);
  });
}

let calMonth = nyDayKey(Date.now()).slice(0, 7);
const calCelebrated = new Set();
const calMonthFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY_TZ, month: 'long', year: 'numeric' });
const calDowFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY_TZ, weekday: 'short' });
const CAL_DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function tsFromKey(key) {
  return new Date(`${key}T12:00:00Z`).getTime();
}

function shiftMonth(key, delta) {
  const y = +key.slice(0, 4);
  const m = +key.slice(5, 7) - 1 + delta;
  return `${y + Math.floor(m / 12)}-${String((((m % 12) + 12) % 12) + 1).padStart(2, '0')}`;
}

function renderCalendar() {
  const wrapEl = document.getElementById('cal-wrap');
  if (!wrapEl) return;
  wrapEl.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'cal-head';
  const prev = document.createElement('button');
  prev.className = 'cal-nav';
  prev.textContent = '◀';
  prev.addEventListener('click', () => { calMonth = shiftMonth(calMonth, -1); renderCalendar(); });
  const title = document.createElement('span');
  title.className = 'cal-title';
  title.textContent = calMonthFmt.format(tsFromKey(`${calMonth}-01`));
  const next = document.createElement('button');
  next.className = 'cal-nav';
  next.textContent = '▶';
  next.addEventListener('click', () => { calMonth = shiftMonth(calMonth, 1); renderCalendar(); });
  const todayBtn = document.createElement('button');
  todayBtn.className = 'cal-today';
  todayBtn.textContent = 'Today';
  todayBtn.addEventListener('click', () => { calMonth = nyDayKey(Date.now()).slice(0, 7); renderCalendar(); });
  head.appendChild(prev);
  head.appendChild(title);
  head.appendChild(next);
  head.appendChild(todayBtn);
  wrapEl.appendChild(head);

  const earnByDay = new Map(dayGroups().map(g => [g.key, g.earn]));
  const y = +calMonth.slice(0, 4);
  const m = +calMonth.slice(5, 7);
  const dim = new Date(y, m, 0).getDate();
  const firstDow = CAL_DOW[calDowFmt.format(tsFromKey(`${calMonth}-01`))];
  const todayKey = nyDayKey(Date.now());

  let monthTotal = 0;
  let c3 = 0;
  let c4 = 0;
  let bestPts = 0;
  let bestKey = null;
  for (let d = 1; d <= dim; d++) {
    const key = `${calMonth}-${String(d).padStart(2, '0')}`;
    const pts = earnByDay.get(key) || 0;
    monthTotal += pts;
    if (pts >= TIERS[2].min && pts < TIERS[3].min) c3++;
    if (pts >= TIERS[3].min) c4++;
    if (pts > bestPts) {
      bestPts = pts;
      bestKey = key;
    }
  }
  const sum = document.createElement('div');
  sum.className = 'cal-sum';
  let sumTxt = `This month: ${fmt(monthTotal)}P`;
  if (c3) sumTxt += ` · 🌸 ${c3} day${c3 > 1 ? 's' : ''}`;
  if (c4) sumTxt += ` · 👑 ${c4} day${c4 > 1 ? 's' : ''}`;
  if (bestKey) sumTxt += ` · Best: ${dateFmt.format(tsFromKey(bestKey))} (+${fmt(bestPts)}P)`;
  sum.textContent = sumTxt;
  wrapEl.appendChild(sum);

  const grid = document.createElement('div');
  grid.className = 'cal-grid';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
    const w = document.createElement('span');
    w.className = 'cal-wd';
    w.textContent = d;
    grid.appendChild(w);
  });
  const addPad = () => {
    const pad = document.createElement('span');
    pad.className = 'cal-cell out';
    grid.appendChild(pad);
  };
  for (let i = 0; i < firstDow; i++) addPad();
  for (let d = 1; d <= dim; d++) {
    const key = `${calMonth}-${String(d).padStart(2, '0')}`;
    const pts = earnByDay.get(key) || 0;
    const tier = TIERS.slice().reverse().find(t => pts >= t.min) || null;
    const cell = document.createElement('button');
    cell.className = 'cal-cell';
    if (tier) cell.classList.add(tier.cls);
    if (key === todayKey) cell.classList.add('today');
    const num = document.createElement('span');
    num.className = 'cal-d';
    num.textContent = d;
    cell.appendChild(num);
    if (tier && (tier.cls === 't3' || tier.cls === 't4')) {
      const meta = document.createElement('span');
      meta.className = 'cal-meta';
      meta.textContent = `${tier.em} +${fmt(pts)}P`;
      cell.appendChild(meta);
    }
    if (pts > 0) cell.title = `+${fmt(pts)}P`;
    cell.addEventListener('click', () => {
      expandedDay = key;
      renderDays();
      const idx = dayGroups().findIndex(g => g.key === key);
      if (idx >= 0) {
        const block = document.querySelectorAll('#days-list .day-block')[idx];
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    grid.appendChild(cell);
  }
  while (grid.children.length % 7 !== 0) addPad();
  wrapEl.appendChild(grid);
}

function maybeCalConfetti() {
  if (calCelebrated.has(calMonth)) return;
  if (!dayGroups().some(g => g.key.startsWith(calMonth) && g.earn >= TIERS[3].min)) return;
  calCelebrated.add(calMonth);
  const wrapEl = document.getElementById('cal-wrap');
  if (!wrapEl) return;
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('span');
    p.className = 'cal-confetti';
    p.style.left = `${4 + Math.random() * 92}%`;
    p.style.background = PAL.coins[i % PAL.coins.length];
    p.style.animationDelay = `${Math.random() * 0.35}s`;
    p.style.animationDuration = `${0.9 + Math.random() * 0.7}s`;
    wrapEl.appendChild(p);
    setTimeout(() => p.remove(), 2000);
  }
}

function renderGoals() {
  const wrap = document.getElementById('goal-current');
  wrap.innerHTML = '';
  if (state.goal) {
    const g = state.goal;
    const total = spendable();
    const pct = Math.min(100, Math.round((total / g.pts) * 100));

    const head = document.createElement('div');
    head.className = 'gc-head';

    const badge = document.createElement('div');
    badge.className = 'gc-badge';
    badge.textContent = g.icon;

    const info = document.createElement('div');
    info.className = 'gc-info';
    const name = document.createElement('div');
    name.className = 'gc-name';
    name.textContent = g.name;
    const price = document.createElement('div');
    price.className = 'gc-price';
    price.textContent = `💰 ${fmt(g.pts)}P`;
    info.appendChild(name);
    info.appendChild(price);

    const edit = document.createElement('button');
    edit.className = 'btn-soft';
    edit.textContent = '✏️ Edit';

    head.appendChild(badge);
    head.appendChild(info);
    head.appendChild(edit);
    wrap.appendChild(head);

    const track = document.createElement('div');
    track.className = 'mini-track';
    const fill = document.createElement('div');
    fill.className = 'mini-fill';
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    wrap.appendChild(track);

    const prog = document.createElement('div');
    prog.className = 'gc-progress';
    prog.textContent = `${fmt(Math.min(total, g.pts))} / ${fmt(g.pts)}P · ${pct}%`;
    wrap.appendChild(prog);

    if (total >= g.pts) {
      const ready = document.createElement('div');
      ready.className = 'gc-ready';
      ready.textContent = '🎉 Ready to collect! Go Home →';
      wrap.appendChild(ready);
    }

    const actions = document.createElement('div');
    actions.className = 'goal-actions';
    const changeBtn = document.createElement('button');
    changeBtn.className = 'btn-soft';
    changeBtn.textContent = '🔄 Change goal';
    const giveBtn = document.createElement('button');
    giveBtn.className = 'btn-soft danger';
    giveBtn.textContent = '🍂 Give up';
    actions.appendChild(changeBtn);
    actions.appendChild(giveBtn);
    wrap.appendChild(actions);

    changeBtn.addEventListener('click', () => {
      switchTab('home');
      openGoalForm('edit');
    });
    giveBtn.addEventListener('click', openGiveUpDialog);

    edit.addEventListener('click', () => {
      switchTab('home');
      openGoalForm('edit');
    });
  } else {
    const msg = document.createElement('p');
    msg.className = 'empty';
    msg.textContent = '🌱 No goal set yet!';
    wrap.appendChild(msg);
    const btn = document.createElement('button');
    btn.className = 'gf-save';
    btn.textContent = '＋ New goal';
    btn.addEventListener('click', () => {
      switchTab('home');
      openGoalForm('new');
    });
    wrap.appendChild(btn);
  }

  const list = document.getElementById('collected-list');
  list.innerHTML = '';
  if (!state.collected.length) {
    list.innerHTML = '<p class="empty">Nothing collected yet — your museum awaits! 🏛️</p>';
  } else {
    state.collected.forEach(c => {
      const row = document.createElement('div');
      row.className = 'collected-row';
      const badge = document.createElement('div');
      badge.className = 'c-badge';
      badge.textContent = c.icon;
      const info = document.createElement('div');
      info.className = 'c-info';
      const name = document.createElement('div');
      name.className = 'c-name';
      name.textContent = c.name;
      const date = document.createElement('div');
      date.className = 'c-date';
      date.textContent = `🗓️ ${dateFmt.format(c.spentAt)}`;
      info.appendChild(name);
      info.appendChild(date);
      const pts = document.createElement('span');
      pts.className = 'c-pts';
      pts.textContent = `-${fmt(c.pts)}P`;
      row.appendChild(badge);
      row.appendChild(info);
      row.appendChild(pts);
      list.appendChild(row);
    });
  }

  const gaveTitle = document.getElementById('gaveup-title');
  const gaveList = document.getElementById('gaveup-list');
  gaveTitle.hidden = !state.gaveUp.length;
  gaveList.hidden = !state.gaveUp.length;
  gaveList.innerHTML = '';
  state.gaveUp.forEach(c => {
    const row = document.createElement('div');
    row.className = 'collected-row';
    const badge = document.createElement('div');
    badge.className = 'c-badge';
    badge.textContent = c.icon;
    const info = document.createElement('div');
    info.className = 'c-info';
    const name = document.createElement('div');
    name.className = 'c-name';
    name.textContent = c.name;
    const date = document.createElement('div');
    date.className = 'c-date';
    date.textContent = `🗓️ ${dateFmt.format(c.gaveUpAt)}`;
    info.appendChild(name);
    info.appendChild(date);
    const pts = document.createElement('span');
    pts.className = 'c-pts gave';
    pts.textContent = `${fmt(c.pts)}P`;
    row.appendChild(badge);
    row.appendChild(info);
    row.appendChild(pts);
    gaveList.appendChild(row);
  });
}

function openMenu() {
  if (!state.goal) return;
  menuTitle.textContent = `${state.goal.icon} ${state.goal.name}`;
  menuEl.classList.add('open');
  menuBackdrop.classList.add('show');
}

function closeMenu() {
  menuEl.classList.remove('open');
  menuBackdrop.classList.remove('show');
}

function openGiveUpDialog() {
  if (!state.goal) return;
  dialogMsg.textContent = `Give up on ${state.goal.icon} ${state.goal.name}?`;
  dialogEl.hidden = false;
  dialogBackdrop.classList.add('show');
}

function closeDialog() {
  dialogEl.hidden = true;
  dialogBackdrop.classList.remove('show');
}

function confirmGiveUp() {
  const g = state.goal;
  if (!g) return;
  state.gaveUp.unshift({ icon: g.icon, name: g.name, pts: g.pts, gaveUpAt: Date.now() });
  state.goal = null;
  saveState();
  closeDialog();
  renderAll();
  spawnMotes(width * 0.5, 10);
  switchTab('home');
  openGoalForm('new');
  toast('Goal released 🍂');
}

btnGoalMenu.addEventListener('click', openMenu);
menuBackdrop.addEventListener('click', closeMenu);
document.getElementById('menu-cancel').addEventListener('click', closeMenu);
document.getElementById('menu-change').addEventListener('click', () => {
  closeMenu();
  switchTab('home');
  openGoalForm('edit');
});
document.getElementById('menu-giveup').addEventListener('click', () => {
  closeMenu();
  openGiveUpDialog();
});
dialogBackdrop.addEventListener('click', closeDialog);
document.getElementById('dialog-no').addEventListener('click', closeDialog);
document.getElementById('dialog-yes').addEventListener('click', confirmGiveUp);

let selIcon = GOAL_ICONS[0];
let usdMode = true;
const gfTitle = document.getElementById('gf-title');
const gfIcons = document.getElementById('gf-icons');
const gfName = document.getElementById('gf-name');
const gfPrice = document.getElementById('gf-price');
const gfCalc = document.getElementById('gf-calc');
const gfSave = document.getElementById('gf-save');
const gfClose = document.getElementById('gf-close');
const gfModeUsd = document.getElementById('gf-mode-usd');
const gfModePt = document.getElementById('gf-mode-pt');

let iconPickerOpen = false;
let iconPickerCat = 0;

function closeIconPicker() {
  iconPickerOpen = false;
  const p = document.getElementById('gf-icon-picker');
  if (p) p.remove();
}

function makePickerTile(ic) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'gfip-emoji';
  b.textContent = ic;
  b.addEventListener('click', ev => {
    ev.stopPropagation();
    selIcon = ic;
    closeIconPicker();
    renderGfIcons();
  });
  return b;
}

function buildIconPicker() {
  closeIconPicker();
  iconPickerOpen = true;
  iconPickerCat = 0;
  goalFormEl.scrollTop = 0;
  const p = document.createElement('div');
  p.id = 'gf-icon-picker';
  p.className = 'gf-icon-picker';
  const head = document.createElement('div');
  head.className = 'gfip-head';
  const title = document.createElement('span');
  title.className = 'gfip-title';
  title.textContent = 'Pick an emoji';
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'gfip-x';
  x.textContent = '✕';
  x.setAttribute('aria-label', 'Close');
  x.addEventListener('click', ev => {
    ev.stopPropagation();
    closeIconPicker();
  });
  head.appendChild(title);
  head.appendChild(x);
  const tabs = document.createElement('div');
  tabs.className = 'gfip-tabs';
  const grid = document.createElement('div');
  grid.className = 'gfip-grid';
  const fillGrid = () => {
    grid.innerHTML = '';
    const rnd = document.createElement('button');
    rnd.type = 'button';
    rnd.className = 'gfip-emoji';
    rnd.textContent = '🎲';
    rnd.title = 'Random';
    rnd.addEventListener('click', ev => {
      ev.stopPropagation();
      const all = ICON_PICKER.flatMap(c => c.icons);
      selIcon = all[Math.floor(Math.random() * all.length)];
      closeIconPicker();
      renderGfIcons();
    });
    grid.appendChild(rnd);
    ICON_PICKER[iconPickerCat].icons.forEach(ic => grid.appendChild(makePickerTile(ic)));
  };
  ICON_PICKER.forEach((cat, ci) => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'gfip-tab' + (ci === iconPickerCat ? ' sel' : '');
    t.textContent = cat.em;
    t.addEventListener('click', ev => {
      ev.stopPropagation();
      iconPickerCat = ci;
      p.querySelectorAll('.gfip-tab').forEach((b, i) => b.classList.toggle('sel', i === ci));
      fillGrid();
    });
    tabs.appendChild(t);
  });
  fillGrid();
  p.appendChild(head);
  p.appendChild(tabs);
  p.appendChild(grid);
  return p;
}

function renderGfIcons() {
  closeIconPicker();
  gfIcons.innerHTML = '';
  GOAL_ICONS.forEach(ic => {
    const b = document.createElement('button');
    b.className = 'gf-ic' + (ic === selIcon ? ' sel' : '');
    b.textContent = ic;
    b.addEventListener('click', () => {
      selIcon = ic;
      renderGfIcons();
    });
    gfIcons.appendChild(b);
  });
  if (selIcon && !GOAL_ICONS.includes(selIcon)) {
    const cb = document.createElement('button');
    cb.className = 'gf-ic sel';
    cb.textContent = selIcon;
    gfIcons.appendChild(cb);
  }
  const plus = document.createElement('button');
  plus.className = 'gf-ic';
  plus.textContent = '＋';
  plus.addEventListener('click', ev => {
    ev.stopPropagation();
    if (iconPickerOpen) closeIconPicker();
    else gfIcons.after(buildIconPicker());
  });
  gfIcons.appendChild(plus);
}

document.addEventListener('click', ev => {
  if (!iconPickerOpen) return;
  if (ev.target && ev.target.closest && ev.target.closest('#gf-icon-picker')) return;
  closeIconPicker();
});

function setModeButtons() {
  gfModeUsd.classList.toggle('active', usdMode);
  gfModePt.classList.toggle('active', !usdMode);
  gfPrice.placeholder = usdMode ? 'e.g. 45.99' : 'e.g. 120';
}

function updateGfCalc() {
  const v = Number(gfPrice.value) || 0;
  if (usdMode) gfCalc.textContent = v ? `= ${fmt(Math.round(v * 10))}P` : '= ?P';
  else gfCalc.textContent = v ? `= ${fmt(Math.round(v))}P` : '= ?P';
}

function openGoalForm(mode) {
  gfTitle.textContent = mode === 'edit' ? '✏️ Edit goal' : '✨ New goal';
  selIcon = mode === 'edit' && state.goal ? state.goal.icon : GOAL_ICONS[0];
  gfName.value = mode === 'edit' && state.goal ? state.goal.name : '';
  usdMode = !(mode === 'edit' && state.goal);
  gfPrice.value = mode === 'edit' && state.goal ? String(state.goal.pts) : '';
  setModeButtons();
  renderGfIcons();
  updateGfCalc();
  goalFormEl.hidden = false;
  renderHomeUI();
  gfName.focus();
}

function closeGoalForm() {
  goalFormEl.hidden = true;
  renderHomeUI();
}

gfClose.addEventListener('click', closeGoalForm);
gfModeUsd.addEventListener('click', () => { usdMode = true; setModeButtons(); updateGfCalc(); });
gfModePt.addEventListener('click', () => { usdMode = false; setModeButtons(); updateGfCalc(); });
gfPrice.addEventListener('input', () => {
  let v = gfPrice.value;
  if (usdMode) {
    v = v.replace(/[^0-9.]/g, '');
    const dot = v.indexOf('.');
    if (dot >= 0) v = v.slice(0, dot) + '.' + v.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    const i = v.indexOf('.');
    v = (i >= 0 ? v.slice(0, i).slice(0, 9) + v.slice(i) : v.slice(0, 9));
  } else {
    v = v.replace(/\D/g, '').slice(0, 9);
  }
  if (v !== gfPrice.value) gfPrice.value = v;
  updateGfCalc();
});
gfName.addEventListener('keydown', ev => { if (ev.isComposing || ev.keyCode === 229) return; if (ev.key === 'Enter') gfPrice.focus(); });
gfPrice.addEventListener('keydown', ev => { if (ev.isComposing || ev.keyCode === 229) return; if (ev.key === 'Enter') saveGoalForm(); });
gfSave.addEventListener('click', saveGoalForm);

function saveGoalForm() {
  const name = gfName.value.trim();
  let pts;
  if (usdMode) {
    const price = Number(gfPrice.value) || 0;
    if (price < 0.1) {
      toast('Price must be at least $0.10!');
      return;
    }
    pts = Math.round(price * 10);
  } else {
    pts = toInt(gfPrice.value);
    if (pts < 1) {
      toast('Points must be at least 1!');
      return;
    }
  }
  if (!name) {
    toast('Give your goal a name!');
    return;
  }
  state.goal = { icon: selIcon, name, pts };
  saveState();
  closeGoalForm();
  renderAll();
  toast('Goal set! Good luck! 🌟');
}

function collectGoal() {
  const g = state.goal;
  if (!g || spendable() < g.pts) return;
  const entry = { id: makeId(), ts: Date.now(), name: `${g.icon} ${g.name}`, points: g.pts, type: 'spend' };
  state.history.push(entry);
  state.collected.unshift({ icon: g.icon, name: g.name, pts: g.pts, spentAt: Date.now() });
  state.goal = null;
  saveState();
  startCoins(g.pts, 0.5);
  spawnMotes(width * 0.2, 16);
  spawnMotes(width * 0.8, 16);
  floatText('COLLECTED! 🎉', 26);
  playSound('goal');
  vibrate(50);
  renderAll();
  setTimeout(() => openGoalForm('new'), 650);
}

collectBtn.addEventListener('click', collectGoal);
document.getElementById('btn-new-goal').addEventListener('click', () => openGoalForm('new'));

function switchTab(name) {
  document.querySelectorAll('.side-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  window.scrollTo(0, 0);
  if (name === 'days') maybeCalConfetti();
}

document.querySelectorAll('.side-btn[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

const skinBtn = document.getElementById('btn-skin');
const skinPop = document.getElementById('skin-pop');
const skinBackdrop = document.getElementById('skin-backdrop');
const SKINS = [
  { id: 'day', em: '☀️', label: 'Day' },
  { id: 'night', em: '🌙', label: 'Night' },
  { id: 'aqua', em: '🐟', label: 'Aquarium' }
];

function applySkin() {
  document.body.classList.toggle('night', state.skin !== 'day');
  document.body.classList.toggle('aqua', state.skin === 'aqua');
  const meta = SKINS.find(s => s.id === state.skin) || SKINS[1];
  skinBtn.querySelector('.s-ico').textContent = meta.em;
  renderSkinPop();
}

function renderSkinPop() {
  skinPop.querySelectorAll('.skin-opt').forEach(b => {
    const s = SKINS.find(x => x.id === b.dataset.skin);
    b.textContent = `${state.skin === b.dataset.skin ? '✓ ' : ''}${s.em} ${s.label}`;
    b.classList.toggle('on', state.skin === b.dataset.skin);
  });
}

function applySkinChoice() {
  saveState();
  applySkin();
  makePalette();
  makeDots();
  renderCards();
  renderBdChips();
  bubbles.forEach(styleBubble);
  redraw();
}

function openSkinPop() {
  skinPop.style.top = `${skinBtn.getBoundingClientRect().top}px`;
  skinPop.hidden = false;
  skinBackdrop.classList.add('show');
}

function closeSkinPop() {
  skinPop.hidden = true;
  skinBackdrop.classList.remove('show');
}

skinBtn.addEventListener('click', () => (skinPop.hidden ? openSkinPop() : closeSkinPop()));
skinBackdrop.addEventListener('click', closeSkinPop);
skinPop.querySelectorAll('.skin-opt').forEach(b => b.addEventListener('click', () => {
  state.skin = b.dataset.skin;
  applySkinChoice();
  closeSkinPop();
}));

let toastTimer = null;
let toastAction = null;

function showToastWithUndo(msg, action) {
  document.getElementById('toast-msg').textContent = msg;
  toastAction = action;
  document.getElementById('toast-undo').hidden = !action;
  document.getElementById('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function toast(msg) {
  showToastWithUndo(msg, null);
}

function showUndoToast(entry) {
  showToastWithUndo(`+${fmt(entry.points)}P ${entry.name}`, () => {
    const i = state.history.findIndex(e => e.id === entry.id);
    if (i >= 0) {
      state.history.splice(i, 1);
      saveState();
      renderAll();
    }
  });
}

function deleteEntryWithUndo(id) {
  const i = state.history.findIndex(e => e.id === id);
  if (i < 0) return;
  const e = state.history[i];
  state.history.splice(i, 1);
  saveState();
  let bub = null;
  if (e.src === 'brain' && e.bubbleText) bub = addBubble(e.bubbleText, e.bubbleCat || 'light');
  renderAll();
  const delta = e.type === 'earn' ? -e.points : e.points;
  const sign = delta < 0 ? '−' : '+';
  showToastWithUndo(`Removed · ${sign}${fmt(Math.abs(delta))}P`, () => {
    state.history.splice(Math.min(i, state.history.length), 0, e);
    saveState();
    if (bub) removeBubble(bub, false);
    renderAll();
  });
}

function hideToast() {
  document.getElementById('toast').classList.remove('show');
  toastAction = null;
}

document.getElementById('toast-undo').addEventListener('click', () => {
  const action = toastAction;
  toastAction = null;
  hideToast();
  if (action) action();
});

const brainBody = document.getElementById('brain-body');
const bdInput = document.getElementById('bd-input');
const bdChips = document.getElementById('bd-chips');
const bdCount = document.getElementById('bd-count');
const focusDialog = document.getElementById('focus-dialog');
const focusBackdrop = document.getElementById('focus-backdrop');
const focusMins = document.getElementById('focus-mins');
const focusCalc = document.getElementById('focus-calc');
const editDialog = document.getElementById('edit-dialog');
const editBackdrop = document.getElementById('edit-backdrop');
const editText = document.getElementById('edit-text');
const editChips = document.getElementById('edit-chips');
const nowDock = document.getElementById('now-dock');
const slotEls = [...nowDock.querySelectorAll('.now-slot')];

let bdSelCat = 'light';
let bubbles = [];
let bt = 0;
let pendingFocusBubble = null;
let pendingEditBubble = null;
let editSelCat = 'light';
let floatScale = 1;
let drag = null;

function shortChip(cat) {
  return `${cat.emoji} ${cat.name.split(' ')[0]}${cat.per5 ? '' : ` ${cat.pts}P`}`;
}

function renderChips(container, selId, cb) {
  container.innerHTML = '';
  const groups = [];
  CATEGORIES.forEach(cat => {
    let grp = groups.find(x => x.name === cat.group);
    if (!grp) {
      grp = { name: cat.group, cats: [] };
      groups.push(grp);
    }
    grp.cats.push(cat);
  });
  groups.forEach(grp => {
    const block = document.createElement('div');
    block.className = 'bd-group';
    const label = document.createElement('span');
    label.className = 'bd-group-label';
    label.textContent = grp.name;
    const row = document.createElement('div');
    row.className = 'bd-group-row';
    grp.cats.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'bd-chip' + (cat.id === selId ? ' sel' : '');
      chip.style.setProperty('--fill', cat.fill);
      chip.style.setProperty('--btone', catTint(cat));
      chip.style.setProperty('--btext', cat.textAqua);
      chip.textContent = shortChip(cat);
      const n = CATEGORIES.indexOf(cat) + 1;
      chip.title = `Option+${n} to select`;
      if (cat.id === selId) {
        chip.style.background = cat.fill;
        chip.style.borderColor = cat.fill;
        chip.style.color = cat.text;
      } else {
        chip.style.background = catTint(cat);
        chip.style.borderColor = cat.fill;
        chip.style.color = '#6B5640';
      }
      chip.addEventListener('click', () => cb(cat.id));
      row.appendChild(chip);
    });
    block.appendChild(label);
    block.appendChild(row);
    container.appendChild(block);
  });
}

function renderBdChips() {
  renderChips(bdChips, bdSelCat, id => {
    bdSelCat = id;
    renderBdChips();
  });
}

function updateBdCount() {
  const now = bubbles.filter(b => b.slot != null).length;
  const fl = bubbles.length - now;
  if (!bubbles.length) {
    bdCount.textContent = 'All clear! Nothing in your head 🌤️';
  } else if (!fl) {
    bdCount.textContent = `🎯 ${now} now`;
  } else {
    bdCount.textContent = `🎯 ${now} now · ${fl} floating`;
  }
}

function bubbleSize(text, catId) {
  const sz = catOf(catId).sz || 1;
  return Math.round(Math.max(64, Math.min(100, 52 + text.length * 6)) * sz);
}

function effD(b) {
  return b.slot != null ? 96 : Math.max(52, Math.round(b.d * floatScale));
}

function applyBubbleSize(b) {
  const d = effD(b);
  b.dCur = d;
  b.el.style.width = `${d}px`;
  b.el.style.height = `${d}px`;
  const bfs = b.slot != null ? 1 : Math.max(0.7, (catOf(b.catId).sz || 1) * floatScale);
  b.el.style.setProperty('--bfs', bfs.toFixed(3));
}

function computeFloatScale() {
  const W = brainBody.clientWidth || 400;
  const H = brainBody.clientHeight || 320;
  const floats = bubbles.filter(b => b.slot == null);
  if (!floats.length) return 1;
  const usable = Math.max(8000, W * H * 0.62);
  const need = floats.reduce((s, b) => s + Math.PI * Math.pow(b.d / 2, 2), 0) * 1.45;
  return Math.min(1, Math.sqrt(usable / need));
}

function bubblePos(b) {
  if (b.slot != null && b.el.parentElement && b.el.parentElement.classList.contains('now-slot')) {
    const r = b.el.getBoundingClientRect();
    const br = brainBody.getBoundingClientRect();
    return { x: r.left + r.width / 2 - br.left, y: r.top + r.height / 2 - br.top };
  }
  return { x: b.x, y: b.y };
}

function spawnPos(d) {
  const W = brainBody.clientWidth || 400;
  const H = brainBody.clientHeight || 320;
  for (let t = 0; t < 14; t++) {
    const x = d / 2 + 8 + Math.random() * Math.max(1, W - d - 16);
    const y = d / 2 + 8 + Math.random() * Math.max(1, H - d - 16);
    if (!bubbles.some(o => Math.hypot(o.x - x, o.y - y) < ((o.dCur || o.d) + d) / 2 + 6)) return { x, y };
  }
  return { x: d / 2 + 8 + Math.random() * Math.max(1, W - d - 16), y: d / 2 + 8 + Math.random() * Math.max(1, H - d - 16) };
}

function placeBubble(b) {
  const d = b.dCur || effD(b);
  b.el.style.transform = `translate(${b.x - d / 2}px, ${b.y - d / 2}px) scale(${b.dragging ? 1.1 : 1})`;
}

function styleBubble(b) {
  const cat = catOf(b.catId);
  b.el.style.background = catTint(cat);
  b.el.style.borderColor = cat.fill;
  b.el.style.setProperty('--fill', cat.fill);
  b.el.style.setProperty('--btone', catTint(cat));
  b.el.style.setProperty('--btext', cat.textAqua);
  b.txtEl.textContent = b.text;
  b.ptsEl.textContent = cat.per5 ? '⏱️' : `+${fmt(cat.pts)}P`;
}

function catOf(id) {
  return CATEGORIES.find(c => c.id === id) || { id: '?', emoji: '⭐', name: 'Task', pts: 0, per5: false, fill: '#CDA97C', tint: '#F2E8D8', tintNight: '#EFE4CC', tintAqua: '#EAF6FF', text: '#FFFFFF', textAqua: '#0B3B6E', sz: 1 };
}

function buildBubbleEl(b) {
  const cat = catOf(b.catId);
  const el = document.createElement('div');
  el.className = 'brain-bubble';
  el.title = b.text;
  const txt = document.createElement('div');
  txt.className = 'bb-text';
  txt.textContent = b.text;
  const pts = document.createElement('div');
  pts.className = 'bb-pts';
  pts.textContent = cat.per5 ? '⏱️' : `+${fmt(cat.pts)}P`;
  const act = document.createElement('div');
  act.className = 'b-act';
  const del = document.createElement('button');
  del.className = 'b-del';
  del.textContent = '✕';
  del.title = 'Delete without points';
  del.addEventListener('click', ev => {
    ev.stopPropagation();
    removeBubble(b, false);
  });
  const ed = document.createElement('button');
  ed.className = 'b-edit';
  ed.textContent = '✎';
  ed.title = 'Edit';
  ed.addEventListener('click', ev => {
    ev.stopPropagation();
    openEditBubble(b);
  });
  act.appendChild(del);
  act.appendChild(ed);
  el.appendChild(txt);
  el.appendChild(pts);
  el.appendChild(act);
  el.addEventListener('click', ev => {
    if (ev.target.closest('.b-act')) return;
    if (b.suppressClick) {
      b.suppressClick = false;
      return;
    }
    completeBubble(b);
  });
  el.addEventListener('pointerdown', ev => onBubblePointerDown(ev, b));
  b.el = el;
  b.txtEl = txt;
  b.ptsEl = pts;
  styleBubble(b);
  applyBubbleSize(b);
  return el;
}

function addBubble(text, catId) {
  const b = {
    id: makeId(),
    text,
    catId,
    x: 0,
    y: 0,
    vx: (Math.random() - 0.5) * 0.7,
    vy: (Math.random() - 0.5) * 0.55,
    d: bubbleSize(text, catId),
    ph: Math.random() * 1000
  };
  const pos = spawnPos(b.d);
  b.x = pos.x;
  b.y = pos.y;
  buildBubbleEl(b);
  brainBody.appendChild(b.el);
  placeBubble(b);
  bubbles.push(b);
  state.brain.push({ id: b.id, text: b.text, catId: b.catId, slot: null });
  saveState();
  updateBdCount();
  return b;
}

function removeBubble(b, animated) {
  const i = bubbles.indexOf(b);
  if (i >= 0) bubbles.splice(i, 1);
  state.brain = state.brain.filter(x => x.id !== b.id);
  saveState();
  updateBdCount();
  const p = b.el.parentElement;
  if (p && p.classList.contains('now-slot')) p.classList.remove('filled');
  if (animated) {
    b.el.classList.add('pop-out');
    setTimeout(() => b.el.remove(), 300);
  } else {
    b.el.remove();
  }
}

function popBurst(x, y) {
  const bits = ['✨', '💛', '🍃', '⭐', '✨', '🌟'];
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('span');
    s.className = 'burst-bit';
    s.textContent = bits[i % bits.length];
    const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.6;
    const dist = 44 + Math.random() * 34;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * dist}px`);
    brainBody.appendChild(s);
    setTimeout(() => s.remove(), 720);
  }
}

function floatPtsAt(x, y, str) {
  const f = document.createElement('span');
  f.className = 'float-pts';
  f.textContent = str;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  brainBody.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

function completeBubble(b) {
  const cat = catOf(b.catId);
  const pos = bubblePos(b);
  if (cat.per5) {
    pendingFocusBubble = b;
    focusMins.value = '';
    updateFocusCalc();
    focusDialog.hidden = false;
    focusBackdrop.classList.add('show');
    focusMins.focus();
    return;
  }
  popBurst(pos.x, pos.y);
  floatPtsAt(pos.x, pos.y - effD(b) / 2 - 8, `+${fmt(cat.pts)}P`);
  addEarn(`${cat.name} · ${b.text}`, cat.pts, 0.5, { src: 'brain', bubbleText: b.text, bubbleCat: b.catId });
  removeBubble(b, true);
}

function slotIndexAt(cx, cy) {
  for (let i = 0; i < slotEls.length; i++) {
    const r = slotEls[i].getBoundingClientRect();
    if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return i;
  }
  return null;
}

function setBubbleSlot(b, slot) {
  b.slot = slot;
  const it = state.brain.find(x => x.id === b.id);
  if (it) it.slot = slot;
  saveState();
}

function attachBubbleToSlot(b, slot) {
  setBubbleSlot(b, slot);
  b.vx = 0;
  b.vy = 0;
  b.el.classList.add('slotted');
  b.el.classList.remove('dragging');
  b.dragging = false;
  b.el.style.transform = '';
  slotEls[slot].classList.add('filled');
  slotEls[slot].appendChild(b.el);
  applyBubbleSize(b);
  const r = slotEls[slot].getBoundingClientRect();
  const br = brainBody.getBoundingClientRect();
  b.x = r.left + r.width / 2 - br.left;
  b.y = r.top + r.height / 2 - br.top;
  updateBdCount();
}

function releaseBubbleToArea(b) {
  const p = b.el.parentElement;
  if (p && p.classList.contains('now-slot')) p.classList.remove('filled');
  setBubbleSlot(b, null);
  b.el.classList.remove('slotted');
  brainBody.appendChild(b.el);
  applyBubbleSize(b);
  updateBdCount();
}

function onBubblePointerDown(ev, b) {
  if (drag || (ev.button !== undefined && ev.button !== 0)) return;
  if (ev.target.closest('.b-act')) return;
  b.suppressClick = false;
  drag = { b, id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, moved: false };
  document.addEventListener('pointermove', onBubblePointerMove);
  document.addEventListener('pointerup', onBubblePointerUp);
  document.addEventListener('pointercancel', onBubblePointerUp);
}

function onBubblePointerMove(ev) {
  if (!drag || ev.pointerId !== drag.id) return;
  const b = drag.b;
  if (!drag.moved) {
    if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) <= 6) return;
    drag.moved = true;
    b.dragging = true;
    if (b.slot != null) {
      slotEls[b.slot].classList.remove('filled');
      setBubbleSlot(b, null);
      b.el.classList.remove('slotted');
      brainBody.appendChild(b.el);
      applyBubbleSize(b);
    }
    b.el.classList.add('dragging');
    nowDock.classList.add('dragging');
  }
  const br = brainBody.getBoundingClientRect();
  b.x = ev.clientX - br.left;
  b.y = ev.clientY - br.top;
  placeBubble(b);
  const idx = slotIndexAt(ev.clientX, ev.clientY);
  slotEls.forEach((s, i) => s.classList.toggle('hover', i === idx));
}

function onBubblePointerUp(ev) {
  document.removeEventListener('pointermove', onBubblePointerMove);
  document.removeEventListener('pointerup', onBubblePointerUp);
  document.removeEventListener('pointercancel', onBubblePointerUp);
  if (!drag || ev.pointerId !== drag.id) return;
  const b = drag.b;
  const moved = drag.moved;
  drag = null;
  nowDock.classList.remove('dragging');
  slotEls.forEach(s => s.classList.remove('hover'));
  if (!moved) return;
  b.dragging = false;
  b.el.classList.remove('dragging');
  b.suppressClick = true;
  const idx = slotIndexAt(ev.clientX, ev.clientY);
  if (idx != null) {
    const occ = bubbles.find(o => o !== b && o.slot === idx);
    if (occ) {
      releaseBubbleToArea(occ);
      const pos = spawnPos(effD(occ));
      occ.x = pos.x;
      occ.y = pos.y;
      placeBubble(occ);
    }
    attachBubbleToSlot(b, idx);
  } else {
    const W = brainBody.clientWidth || 400;
    const H = brainBody.clientHeight || 320;
    const d = effD(b);
    b.x = Math.min(Math.max(b.x, d / 2 + 4), W - d / 2 - 4);
    b.y = Math.min(Math.max(b.y, d / 2 + 4), H - d / 2 - 4);
    setBubbleSlot(b, null);
    placeBubble(b);
  }
  updateBdCount();
}

function updateBubbles() {
  if (!bubbles.length) return;
  const W = brainBody.clientWidth;
  const H = brainBody.clientHeight;
  if (!W || !H) return;
  bt += 1;
  const fs = computeFloatScale();
  if (Math.abs(fs - floatScale) > 0.002) floatScale = fs;
  for (const b of bubbles) {
    if (b.dragging) continue;
    const d = effD(b);
    if (b.dCur !== d) applyBubbleSize(b);
  }
  for (const b of bubbles) {
    if (b.slot != null || b.dragging) continue;
    b.x += b.vx + Math.sin(bt * 0.02 + b.ph) * 0.18;
    b.y += b.vy + Math.cos(bt * 0.016 + b.ph * 1.3) * 0.14;
    const r = b.dCur / 2;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.85; }
    if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx) * 0.85; }
    if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * 0.85; }
    if (b.y > H - r) { b.y = H - r; b.vy = -Math.abs(b.vy) * 0.85; }
  }
  const phys = bubbles.filter(b => b.slot == null);
  for (let i = 0; i < phys.length; i++) {
    for (let j = i + 1; j < phys.length; j++) {
      const a = phys[i];
      const c = phys[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const minD = ((a.dCur + c.dCur) / 2) * 0.96;
      if (dist < minD) {
        const nx = dx / dist;
        const ny = dy / dist;
        const push = minD - dist;
        if (a.dragging) {
          c.x += nx * push;
          c.y += ny * push;
        } else if (c.dragging) {
          a.x -= nx * push;
          a.y -= ny * push;
        } else {
          a.x -= nx * (push / 2);
          a.y -= ny * (push / 2);
          c.x += nx * (push / 2);
          c.y += ny * (push / 2);
        }
        const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (rel < 0) {
          const imp = rel * 0.5;
          a.vx += nx * imp;
          a.vy += ny * imp;
          c.vx -= nx * imp;
          c.vy -= ny * imp;
        }
      }
    }
  }
  for (const b of bubbles) {
    if (b.slot == null) placeBubble(b);
  }
}

bdInput.addEventListener('keydown', ev => {
  if (ev.isComposing || ev.keyCode === 229) return;
  if (ev.key === 'Enter') {
    const text = bdInput.value.trim();
    if (!text) {
      toast('Type something first! 🌱');
      return;
    }
    addBubble(text, bdSelCat);
    bdInput.value = '';
    return;
  }
  const m = ev.altKey ? /^Digit([1-5])$/.exec(ev.code) : null;
  if (m) {
    bdSelCat = CATEGORIES[Number(m[1]) - 1].id;
    renderBdChips();
    ev.preventDefault();
  }
});

function updateFocusCalc() {
  const mins = toInt(focusMins.value);
  focusCalc.textContent = mins ? `= ${fmt(Math.floor(mins / 5))}P` : '= ?P';
}

focusMins.addEventListener('input', () => {
  const digits = focusMins.value.replace(/\D/g, '').slice(0, 4);
  if (digits !== focusMins.value) focusMins.value = digits;
  updateFocusCalc();
});
focusMins.addEventListener('keydown', ev => {
  if (ev.key === 'Enter') confirmFocusBubble();
});

function closeFocusDialog() {
  focusDialog.hidden = true;
  focusBackdrop.classList.remove('show');
  pendingFocusBubble = null;
}

function confirmFocusBubble() {
  const b = pendingFocusBubble;
  if (!b) return;
  const mins = toInt(focusMins.value);
  if (mins < 5) {
    toast('Need at least 5 minutes ⏱️');
    return;
  }
  closeFocusDialog();
  const pos = bubblePos(b);
  popBurst(pos.x, pos.y);
  floatPtsAt(pos.x, pos.y - effD(b) / 2 - 8, `+${fmt(Math.floor(mins / 5))}P`);
  addEarn(`${b.text} · Focus ${mins}min`, Math.floor(mins / 5), 0.5, { src: 'brain', bubbleText: b.text, bubbleCat: b.catId });
  removeBubble(b, true);
}

document.getElementById('focus-ok').addEventListener('click', confirmFocusBubble);
document.getElementById('focus-cancel').addEventListener('click', closeFocusDialog);
focusBackdrop.addEventListener('click', closeFocusDialog);

function openEditBubble(b) {
  pendingEditBubble = b;
  editText.value = b.text;
  editSelCat = b.catId;
  renderEditChips();
  editDialog.hidden = false;
  editBackdrop.classList.add('show');
  editText.focus();
}

function renderEditChips() {
  renderChips(editChips, editSelCat, id => {
    editSelCat = id;
    renderEditChips();
  });
}

function closeEditDialog() {
  editDialog.hidden = true;
  editBackdrop.classList.remove('show');
  pendingEditBubble = null;
}

document.getElementById('edit-cancel').addEventListener('click', closeEditDialog);
editBackdrop.addEventListener('click', closeEditDialog);
document.getElementById('edit-save').addEventListener('click', () => {
  const b = pendingEditBubble;
  if (!b) return;
  const text = editText.value.trim();
  if (!text) {
    toast('Write something! ✎');
    return;
  }
  b.text = text;
  b.catId = editSelCat;
  const saved = state.brain.find(x => x.id === b.id);
  if (saved) {
    saved.text = text;
    saved.catId = editSelCat;
  }
  saveState();
  styleBubble(b);
  b.el.title = text;
  closeEditDialog();
  toast('Bubble updated ✨');
});
editText.addEventListener('keydown', ev => {
  if (ev.isComposing || ev.keyCode === 229) return;
  if (ev.key === 'Enter') document.getElementById('edit-save').click();
});

function loadBubbles() {
  slotEls.forEach(s => s.classList.remove('filled'));
  state.brain.forEach(s => {
    const b = {
      id: s.id,
      text: s.text,
      catId: s.catId,
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.55,
      d: bubbleSize(s.text, s.catId),
      ph: Math.random() * 1000,
      slot: (s.slot === 0 || s.slot === 1 || s.slot === 2) ? s.slot : null
    };
    const pos = spawnPos(b.d);
    b.x = pos.x;
    b.y = pos.y;
    buildBubbleEl(b);
    if (b.slot != null && !bubbles.some(o => o.slot === b.slot)) {
      attachBubbleToSlot(b, b.slot);
    } else {
      setBubbleSlot(b, null);
      brainBody.appendChild(b.el);
      placeBubble(b);
    }
    bubbles.push(b);
  });
  updateBdCount();
}

if (window.ResizeObserver) {
  const roHolder = document.getElementById('canvas-holder');
  const ro = new ResizeObserver(() => {
    if (!loopStarted || !roHolder) return;
    if (roHolder.clientWidth > 0 && roHolder.clientHeight > 0 &&
        (roHolder.clientWidth !== width || roHolder.clientHeight !== height)) {
      resizeCanvas(roHolder.clientWidth, roHolder.clientHeight);
      makeDots();
    }
  });
  ro.observe(roHolder);
}

window.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  if (!editDialog.hidden) closeEditDialog();
  if (!focusDialog.hidden) closeFocusDialog();
  closeIconPicker();
  closeMenu();
  closeDialog();
});

function exportBackup() {
  const data = JSON.stringify({ app: 'point-game', version: 4, exportedAt: new Date().toISOString(), state }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `point-game-backup-${nyDayKey(Date.now()).replaceAll('-', '')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Backup exported 💾');
}

let pendingImport = null;

function importBackupFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const s = migrate(obj && obj.state ? obj.state : obj);
      if (!s || !Array.isArray(s.history)) throw new Error('bad file');
      pendingImport = s;
      document.getElementById('import-dialog').hidden = false;
      document.getElementById('import-backdrop').classList.add('show');
    } catch (e) {
      toast('Could not read that backup 😢');
    }
  };
  reader.readAsText(file);
}

function closeImportDialog() {
  pendingImport = null;
  document.getElementById('import-dialog').hidden = true;
  document.getElementById('import-backdrop').classList.remove('show');
}

function confirmImport() {
  if (!pendingImport) return;
  state = pendingImport;
  pendingImport = null;
  saveState();
  bubbles.forEach(b => b.el.remove());
  bubbles = [];
  loadBubbles();
  renderAll();
  document.getElementById('import-dialog').hidden = true;
  document.getElementById('import-backdrop').classList.remove('show');
  toast('Backup imported 📂');
}

document.getElementById('btn-export').addEventListener('click', exportBackup);
document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import').click());
document.getElementById('file-import').addEventListener('change', ev => {
  const f = ev.target.files[0];
  if (f) importBackupFile(f);
  ev.target.value = '';
});
document.getElementById('import-ok').addEventListener('click', confirmImport);
document.getElementById('import-cancel').addEventListener('click', closeImportDialog);
document.getElementById('import-backdrop').addEventListener('click', closeImportDialog);

renderBdChips();
try {
  loadBubbles();
} catch (e) {}
renderCards();
renderAll();
applySkin();
updateSoundBtn();

const TUT_STEPS = [
  { text: "Hi! I'm Dopi 🧠 your little dopamine buddy. Do things, earn points, buy treats!", target: null },
  { text: 'This is your Goal. Pick something you want and watch the number drop as you earn points!', target: '#canvas-holder' },
  { text: 'Empty your head here! Type anything you need to do and hit Enter — it becomes a bubble 🫧', target: '.col-center .panel' },
  { text: 'Pick how big it is. Tiny chores = 1P, heavy tasks = 30P!', target: '#bd-chips' },
  { text: "Drag up to 3 bubbles here. That's your 'right now' list 🎯", target: '#now-dock' },
  { text: 'Done? Click the bubble to pop it and grab your points!', target: '#brain-body' },
  { text: "Did something you didn't plan? Log it here too, it still counts ⚡", target: '.col-right .panel' },
  { text: 'Hit 30P a day for a bonus, keep your streak 🔥, and undo mistakes in Recent.', target: '.col-left' },
  { text: 'Check your month in Days 📅, your collection in Goals 🏆, change the vibe in Skin 🎨, and back up your data 💾. Your data stays only in this browser. Have fun!', target: '#sidebar' }
];
const tutBackdrop = document.getElementById('tut-backdrop');
const tutSpot = document.getElementById('tut-spot');
const tutBox = document.getElementById('tut-box');
const tutText = document.getElementById('tut-text');
const tutDots = document.getElementById('tut-dots');
let tutActive = false;
let tutStep = 0;
let tutTimer = null;
let tutTyping = false;
let tutFull = '';
let tutLock = 0;

function tutType(str) {
  tutFull = str;
  tutTyping = true;
  clearInterval(tutTimer);
  const chars = Array.from(str);
  let i = 0;
  tutText.textContent = '';
  tutText.classList.add('typing');
  tutTimer = setInterval(() => {
    i++;
    tutText.textContent = chars.slice(0, i).join('');
    if (i >= chars.length) tutFinishType();
  }, 18);
}

function tutFinishType() {
  clearInterval(tutTimer);
  tutTyping = false;
  tutText.textContent = tutFull;
  tutText.classList.remove('typing');
}

function tutRenderDots() {
  tutDots.innerHTML = '';
  TUT_STEPS.forEach((s, i) => {
    const d = document.createElement('span');
    d.className = 'tut-dot' + (i === tutStep ? ' on' : i < tutStep ? ' done' : '');
    tutDots.appendChild(d);
  });
  const c = document.createElement('span');
  c.className = 'tut-count';
  c.textContent = `${tutStep + 1}/${TUT_STEPS.length}`;
  tutDots.appendChild(c);
}

function tutPosition() {
  const step = TUT_STEPS[tutStep];
  const pad = 10;
  const gap = 16;
  const m = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const bw = tutBox.offsetWidth;
  const bh = tutBox.offsetHeight;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  let r = null;
  if (step.target) {
    const t = document.querySelector(step.target);
    if (t) r = t.getBoundingClientRect();
  }
  let bx = 0;
  let by = 0;
  let placed = false;
  if (r) {
    if (r.right + gap + bw <= vw - m) {
      bx = r.right + gap;
      by = clamp(r.top + r.height / 2 - bh / 2, m, vh - bh - m);
      placed = true;
    } else if (r.left - gap - bw >= m) {
      bx = r.left - gap - bw;
      by = clamp(r.top + r.height / 2 - bh / 2, m, vh - bh - m);
      placed = true;
    }
  }
  if (!placed) {
    bx = clamp((vw - bw) / 2, m, Math.max(m, vw - bw - m));
    by = clamp(vh - bh - 24, m, Math.max(m, vh - bh - m));
  }
  tutBox.style.left = `${Math.round(bx)}px`;
  tutBox.style.top = `${Math.round(by)}px`;
  const sr = r || { left: bx, top: by, width: bw, height: bh };
  tutSpot.style.left = `${Math.round(sr.left - pad)}px`;
  tutSpot.style.top = `${Math.round(sr.top - pad)}px`;
  tutSpot.style.width = `${Math.round(sr.width + pad * 2)}px`;
  tutSpot.style.height = `${Math.round(sr.height + pad * 2)}px`;
}

function tutShowStep() {
  tutRenderDots();
  tutType(TUT_STEPS[tutStep].text);
  tutPosition();
  tutBox.classList.remove('bounce');
  void tutBox.offsetWidth;
  tutBox.classList.add('bounce');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function tutAdvance() {
  if (!tutActive) return;
  const now = Date.now();
  if (now - tutLock < 220) return;
  tutLock = now;
  if (tutTyping) {
    tutFinishType();
    return;
  }
  if (tutStep >= TUT_STEPS.length - 1) {
    tutEnd(true);
    return;
  }
  tutStep++;
  tutShowStep();
}

function tutEnd(celebrate) {
  tutActive = false;
  clearInterval(tutTimer);
  tutTyping = false;
  document.body.classList.remove('tut-on');
  state.tutorialDone = true;
  saveState();
  if (celebrate) {
    tutConfetti();
    if (!state.goal) setTimeout(() => openGoalForm('new'), 800);
  }
}

function tutConfetti() {
  const colors = PAL.coins || ['#F5D570', '#7BC5A1', '#8BC8E8', '#F29C8F', '#C9B6E4'];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('span');
    p.className = 'tut-confetti';
    p.style.left = `${3 + Math.random() * 94}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${(Math.random() * 0.35).toFixed(2)}s`;
    p.style.animationDuration = `${(1.1 + Math.random() * 0.8).toFixed(2)}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2300);
  }
}

function startTutorial() {
  if (tutActive) return;
  tutActive = true;
  tutStep = 0;
  switchTab('home');
  closeMenu();
  closeDialog();
  closeSkinPop();
  closeGoalForm();
  document.body.classList.add('tut-on');
  tutShowStep();
}

tutBackdrop.addEventListener('click', tutAdvance);
tutBox.addEventListener('click', ev => {
  if (ev.target.closest('#tut-next') || ev.target.closest('#tut-skip')) return;
  tutAdvance();
});
document.getElementById('tut-next').addEventListener('click', tutAdvance);
document.getElementById('tut-skip').addEventListener('click', () => tutEnd(false));
document.getElementById('btn-help').addEventListener('click', startTutorial);

window.addEventListener('keydown', ev => {
  if (!tutActive) return;
  if (ev.target && ev.target.closest && ev.target.closest('input')) return;
  if (ev.key === 'Enter') {
    ev.preventDefault();
    tutAdvance();
  }
});

window.addEventListener('resize', () => {
  if (tutActive) tutPosition();
});

if (!state.tutorialDone) setTimeout(startTutorial, 700);

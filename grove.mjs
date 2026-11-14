#!/usr/bin/env node
// grove — a seeded Bob Ross landscape painter that writes SVG.
//
// Every dab, ridge and happy little tree comes out of one number, so the same
// seed always paints the same picture. No dependencies, no canvas, no browser.

const W = 1200;
const H = 900;

// ---------------------------------------------------------------- randomness

const hash = (s) => {
  let h = 2166136261 >>> 0;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

function rngFrom(seed) {
  let a = (typeof seed === 'number' ? seed >>> 0 : hash(seed)) || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = { next };
  r.f = (lo = 0, hi = 1) => lo + next() * (hi - lo);
  r.i = (lo, hi) => Math.floor(r.f(lo, hi + 1 - 1e-9));
  r.pick = (list) => list[Math.floor(next() * list.length)];
  r.chance = (p) => next() < p;
  r.gauss = (mu = 0, sd = 1) => {
    let u = 0;
    let v = 0;
    while (!u) u = next();
    while (!v) v = next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  r.shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return r;
}

// ---------------------------------------------------------------- palettes

const PALETTES = {
  morning: {
    skyTop: '#7ea9c9', skyMid: '#c3dbe6', skyLow: '#f3ddbf',
    sun: '#fff6da', cloudLo: '#cdd8e2', cloudHi: '#fffaf0',
    ridgeFar: '#8fa6bd', ridgeFarLit: '#e6eef6',
    ridgeMid: '#5d7288', ridgeMidLit: '#b9ccdb',
    treeDark: '#1d3630', treeMid: '#2f5b45', treeLit: '#5c8f5d', treeTip: '#cfe3c0',
    groundA: '#6f8f52', groundB: '#3d5738', grass: '#94ad60',
    waterTop: '#a9c8d6', waterLow: '#5d7f93', waterLight: '#e8f2f7',
    rock: '#7d7f82', rockLit: '#b6b8ba',
    cabin: '#4a3b35', roof: '#2f2725', window: '#ffcf6b', smoke: '#efe9e3',
    mist: '#dfe8ef',
  },
  dusk: {
    skyTop: '#3d4d7a', skyMid: '#a2677c', skyLow: '#f2a86b',
    sun: '#ffd9a0', cloudLo: '#6d5a72', cloudHi: '#ffc9a3',
    ridgeFar: '#6a5a77', ridgeFarLit: '#e7b9ae',
    ridgeMid: '#40394f', ridgeMidLit: '#a58ba0',
    treeDark: '#161a24', treeMid: '#26303a', treeLit: '#3f5a52', treeTip: '#c8a98c',
    groundA: '#4b5348', groundB: '#222a28', grass: '#6d7a55',
    waterTop: '#b07f88', waterLow: '#33334a', waterLight: '#ffd7b0',
    rock: '#4a4a55', rockLit: '#8b8090',
    cabin: '#241d22', roof: '#171316', window: '#ffb347', smoke: '#cbb9c4',
    mist: '#c9a6a8',
  },
  winter: {
    skyTop: '#5f7c95', skyMid: '#a9c0cf', skyLow: '#dfe9ee',
    sun: '#fdfaf0', cloudLo: '#b9c8d4', cloudHi: '#f2f7fa',
    ridgeFar: '#8ea4b6', ridgeFarLit: '#f4f9fc',
    ridgeMid: '#5a6d80', ridgeMidLit: '#dbe8f1',
    treeDark: '#1a2a2c', treeMid: '#294a45', treeLit: '#4d7a6c', treeTip: '#f0f7f7',
    groundA: '#e9f1f5', groundB: '#c3d3dc', grass: '#b9c9c5',
    waterTop: '#c8dde8', waterLow: '#7f9aab', waterLight: '#ffffff',
    rock: '#6d7c86', rockLit: '#e2ecf2',
    cabin: '#3b322e', roof: '#211b19', window: '#ffd27a', smoke: '#f4f0ec',
    mist: '#eef4f8',
  },
  storm: {
    skyTop: '#37424c', skyMid: '#68737a', skyLow: '#aab0ae',
    sun: '#d8d3c2', cloudLo: '#4a545c', cloudHi: '#cfd4d2',
    ridgeFar: '#67727a', ridgeFarLit: '#bcc4c4',
    ridgeMid: '#3f4a52', ridgeMidLit: '#8f9aa0',
    treeDark: '#16201f', treeMid: '#23332f', treeLit: '#3c5a4c', treeTip: '#aebfae',
    groundA: '#4f6152', groundB: '#26302b', grass: '#7b8a66',
    waterTop: '#7d8f99', waterLow: '#3a4750', waterLight: '#dfe6e6',
    rock: '#4f565c', rockLit: '#99a1a5',
    cabin: '#2e2826', roof: '#1b1817', window: '#ffbf5c', smoke: '#d3d6d6',
    mist: '#c6cdcd',
  },
  noon: {
    skyTop: '#3f86c6', skyMid: '#8dc0e2', skyLow: '#d4e9ef',
    sun: '#ffffff', cloudLo: '#dbe8f2', cloudHi: '#ffffff',
    ridgeFar: '#7f9db5', ridgeFarLit: '#e1eef6',
    ridgeMid: '#4f6a7e', ridgeMidLit: '#aac6d6',
    treeDark: '#123028', treeMid: '#22543f', treeLit: '#4e8f56', treeTip: '#d6ecb8',
    groundA: '#6a9450', groundB: '#34512f', grass: '#9cc061',
    waterTop: '#93c6d8', waterLow: '#3f6a80', waterLight: '#f2fbff',
    rock: '#77787a', rockLit: '#c2c3c4',
    cabin: '#463a31', roof: '#2a2320', window: '#ffd271', smoke: '#f0ece7',
    mist: '#e2eef4',
  },
};

// ---------------------------------------------------------------- geometry

const n = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
const pt = (x, y) => `${n(x)} ${n(y)}`;
const poly = (pts, close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${pt(p[0], p[1])}`).join('') + (close ? 'Z' : '');

// A single brush stroke: a tapered lens from (x,y) along `angle` for `len`.
function dab(x, y, len, width, angle, bend = 0) {
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const tx = x + ax * len;
  const ty = y + ay * len;
  const px = -ay;
  const py = ax;
  const mx = x + ax * len * 0.45;
  const my = y + ay * len * 0.45;
  const w1 = width * (0.55 + bend);
  const w2 = width * (0.55 - bend);
  return `M${pt(x, y)}Q${pt(mx + px * w1, my + py * w1)} ${pt(tx, ty)}Q${pt(mx - px * w2, my - py * w2)} ${pt(x, y)}Z`;
}

// A ragged ridge line from midpoint displacement, left to right.
function ridgeLine(rng, { x0, x1, y, amp, depth = 6 }) {
  let pts = [
    [x0, y + rng.f(-amp, amp)],
    [x1, y + rng.f(-amp, amp)],
  ];
  let step = amp;
  for (let d = 0; d < depth; d += 1) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      next.push(pts[i]);
      next.push([(ax + bx) / 2, (ay + by) / 2 + rng.gauss(0, step * 0.55)]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    step *= 0.52;
  }
  return pts;
}

const pathLength = (pts) => {
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
};

function alongPath(pts, t) {
  const target = pathLength(pts) * t;
  let walked = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (walked + seg >= target) {
      const k = (target - walked) / (seg || 1);
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k,
      ];
    }
    walked += seg;
  }
  return pts[pts.length - 1];
}

// ---------------------------------------------------------------- painters

function sky(rng, pal, horizon) {
  const out = [];
  out.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  const sunX = rng.f(W * 0.14, W * 0.86);
  const sunY = horizon - rng.f(70, horizon * 0.6);
  const glow = rng.f(190, 330);
  out.push(
    `<circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(glow)}" fill="url(#glow)" opacity="0.5"/>`,
    `<circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(rng.f(24, 46))}" fill="${pal.sun}" opacity="0.9"/>`,
  );

  const banks = rng.i(5, 9);
  for (let b = 0; b < banks; b += 1) {
    const cx = rng.f(-0.1 * W, 1.1 * W);
    const cy = rng.f(horizon * 0.08, horizon * 0.85);
    const spread = rng.f(100, 360);
    const puffs = rng.i(16, 34);
    const opacity = rng.f(0.07, 0.2);
    const dabs = [];
    for (let i = 0; i < puffs; i += 1) {
      const x = cx + rng.gauss(0, spread * 0.6);
      const y = cy + rng.gauss(0, spread * 0.14);
      const rx = rng.f(30, 110) * (1 - Math.abs(x - cx) / (spread * 2.2));
      const ry = rng.f(10, 30);
      dabs.push(
        `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(Math.max(10, rx))}" ry="${n(ry)}" fill="${rng.chance(0.45) ? pal.cloudLo : pal.cloudHi}"/>`,
      );
    }
    for (let i = 0; i < 5; i += 1) {
      dabs.push(
        `<ellipse cx="${n(cx + rng.gauss(0, spread))}" cy="${n(cy + rng.gauss(0, 14))}" rx="${n(rng.f(90, 220))}" ry="${n(rng.f(5, 13))}" fill="${pal.cloudHi}"/>`,
      );
    }
    out.push(`<g opacity="${opacity.toFixed(3)}" filter="url(#cloud)">${dabs.join('')}</g>`);
  }
  return { markup: out.join(''), sunX, sunY };
}

function mountains(rng, pal, { horizon, scale = 1, far = true, id = 'far' }) {
  const amp = (far ? 92 : 124) * scale;
  const baseY = horizon + (far ? 4 : 18);
  const ridge = ridgeLine(rng, { x0: -40, x1: W + 40, y: baseY - amp * 0.6, amp, depth: 6 });
  const color = far ? pal.ridgeFar : pal.ridgeMid;
  const lit = far ? pal.ridgeFarLit : pal.ridgeMidLit;
  const body = poly([...ridge, [W + 40, baseY + 70], [-40, baseY + 70]]);
  const clip = `<clipPath id="ridge-${id}"><path d="${body}"/></clipPath>`;
  const out = [`<path d="${body}" fill="${color}"/>`];

  // Faces: alternating light and shadow down from the crest, so the range reads
  // as folded rock instead of a silhouette.
  const faces = [];
  const depth = (far ? 90 : 130) * scale;
  for (let i = 0; i < ridge.length - 1; i += 1) {
    const [ax, ay] = ridge[i];
    const [bx, by] = ridge[i + 1];
    if (by - ay < 0.5) continue;
    const d = depth * rng.f(0.5, 1.1);
    faces.push(
      `<path d="${poly([[ax, ay], [bx, by], [bx + rng.f(-14, 14), by + d], [ax + rng.f(-14, 14), ay + d]])}" fill="${lit}" opacity="${rng.f(0.12, 0.3).toFixed(2)}"/>`,
    );
  }
  for (let i = 0; i < ridge.length - 1; i += 1) {
    const [ax, ay] = ridge[i];
    const [bx, by] = ridge[i + 1];
    if (ay - by < 0.5) continue;
    const d = depth * rng.f(0.5, 1.1);
    faces.push(
      `<path d="${poly([[ax, ay], [bx, by], [bx + rng.f(-14, 14), by + d], [ax + rng.f(-14, 14), ay + d]])}" fill="${pal.treeDark}" opacity="${rng.f(0.05, 0.14).toFixed(2)}"/>`,
    );
  }
  out.push(`<g clip-path="url(#ridge-${id})">${faces.join('')}</g>`);

  // Spurs: tapering strokes falling from the crest, light down the left faces
  // and shadow down the right, which is what makes a ridge read as folded rock.
  const spurs = [];
  const count = far ? 90 : 130;
  for (let i = 0; i < count; i += 1) {
    const t = rng.f(0.01, 0.99);
    const [x, y] = alongPath(ridge, t);
    const ahead = alongPath(ridge, Math.min(1, t + 0.01));
    const slope = Math.atan2(ahead[1] - y, ahead[0] - x);
    const faceLeft = Math.cos(slope) > 0 ? rng.chance(0.72) : rng.chance(0.3);
    const side = faceLeft ? -1 : 1;
    const len = rng.f(30, 150) * scale * (faceLeft ? 1 : 0.8);
    const angle = slope + side * rng.f(0.7, 1.5);
    const width = rng.f(3, 11) * scale;
    spurs.push(
      `<path d="${dab(x, y + rng.f(0, 3), len, width, angle, rng.f(-0.18, 0.18))}" fill="${faceLeft ? lit : pal.ridgeMid}" opacity="${rng.f(0.18, 0.5).toFixed(2)}"/>`,
    );
  }
  out.push(`<g clip-path="url(#ridge-${id})">${spurs.join('')}</g>`);

  // The crest catches the light: one line of short dabs riding the ridge.
  const crest = [];
  for (let i = 0; i < 150; i += 1) {
    const t = rng.f(0, 1);
    const [x, y] = alongPath(ridge, t);
    const ahead = alongPath(ridge, Math.min(1, t + 0.006));
    const slope = Math.atan2(ahead[1] - y, ahead[0] - x);
    crest.push(
      `<path d="${dab(x, y + rng.f(-1, 2), rng.f(7, 20), rng.f(1.6, 4), slope + Math.PI * (rng.chance(0.5) ? 0 : 1), rng.f(-0.1, 0.1))}" fill="${lit}" opacity="${rng.f(0.25, 0.7).toFixed(2)}"/>`,
    );
  }
  out.push(`<g clip-path="url(#ridge-${id})">${crest.join('')}</g>`);

  // Snow only on the high ground, laid along the slope rather than dripping.
  if (rng.chance(0.7)) {
    const lowest = Math.min(...ridge.map((p) => p[1]));
    const snow = [];
    for (let i = 0; i < 70; i += 1) {
      const t = rng.f(0.05, 0.95);
      const [x, y] = alongPath(ridge, t);
      if (y > lowest + amp * 0.55) continue;
      const ahead = alongPath(ridge, Math.min(1, t + 0.008));
      const slope = Math.atan2(ahead[1] - y, ahead[0] - x);
      snow.push(
        `<path d="${dab(x + rng.f(-4, 4), y + rng.f(2, 18), rng.f(6, 16), rng.f(2, 5), slope + Math.PI / 2 + rng.f(-0.3, 0.3))}" fill="${pal.sun}" opacity="${rng.f(0.2, 0.55).toFixed(2)}"/>`,
      );
    }
    out.push(`<g clip-path="url(#ridge-${id})" filter="url(#soft)">${snow.join('')}</g>`);
  }
  return { markup: out.join(''), clip, ridge, baseY };
}

function water(rng, pal, { horizon, shoreY, reflected = '', sunX = W / 2 }) {
  const top = horizon + 2;
  const out = [
    `<rect x="0" y="${n(top)}" width="${W}" height="${n(shoreY - top)}" fill="url(#water)"/>`,
  ];
  if (reflected) {
    out.push(
      `<g transform="translate(0 ${n(top * 2)}) scale(1 -1)" opacity="0.14" clip-path="url(#waterband)" filter="url(#soft)">${reflected}</g>`,
    );
  }
  const streaks = rng.i(120, 200);
  const bands = [];
  for (let i = 0; i < streaks; i += 1) {
    const y = top + 4 + Math.pow(rng.next(), 0.75) * (shoreY - top - 6);
    const depth = (y - top) / Math.max(1, shoreY - top);
    const away = Math.min(1, Math.abs(rng.f(-40, W) - sunX) / 500);
    const len = rng.f(30, 80) + depth * rng.f(30, 160);
    const x = rng.f(-40, W);
    const h = rng.f(1.4, 3.4) + depth * 1.6;
    const light = rng.chance(0.55);
    bands.push(
      `<rect x="${n(x)}" y="${n(y)}" width="${n(len)}" height="${n(h)}" rx="${n(h / 2)}" fill="${light ? pal.waterLight : pal.waterLow}" opacity="${(rng.f(0.04, 0.2) * (1 - depth * 0.3) * (light ? 0.5 + 0.5 * away : 1)).toFixed(2)}"/>`,
    );
  }
  out.push(`<g>${bands.join('')}</g>`);

  // The sun's path on the water, broken up by the ripples.
  const glitter = [];
  for (let i = 0; i < 150; i += 1) {
    const t = Math.pow(rng.next(), 0.55);
    const y = top + 4 + t * (shoreY - top - 8);
    const spread = 18 + t * 120;
    const x = sunX + rng.gauss(0, spread * 0.4);
    const len = rng.f(12, 34) + t * 58;
    const core = 1 - Math.min(1, Math.abs(x - sunX) / (spread * 1.6));
    glitter.push(
      `<rect x="${n(x)}" y="${n(y)}" width="${n(len)}" height="${n(rng.f(2, 5.5))}" rx="2.5" fill="${pal.waterLight}" opacity="${(0.14 + core * 0.45).toFixed(2)}"/>`,
    );
  }
  out.push(`<g filter="url(#glint)">${glitter.join('')}</g>`);
  return out.join('');
}

// The strip of land the far treeline stands on, so it isn't ankle-deep in water.
function farShore(rng, pal, { horizon }) {
  const bottom = ridgeLine(rng, { x0: -60, x1: W + 60, y: horizon + 30, amp: 13, depth: 5 });
  const band = poly([[-60, horizon + 3], [W + 60, horizon + 3], ...[...bottom].reverse()]);
  const out = [`<path d="${band}" fill="${pal.treeDark}" opacity="0.8"/>`];
  // A lighter lip where the bank meets the water.
  const lip = [];
  for (let i = 0; i < 60; i += 1) {
    const [x, y] = alongPath(bottom, rng.f(0, 1));
    lip.push(
      `<rect x="${n(x)}" y="${n(y - 3)}" width="${n(rng.f(14, 60))}" height="${n(rng.f(1.5, 4))}" fill="${pal.groundA}" opacity="${rng.f(0.2, 0.55).toFixed(2)}"/>`,
    );
  }
  out.push(`<g>${lip.join('')}</g>`);
  return out.join('');
}

function conifer(rng, pal, { x, baseY, height, width, lean = 0, snow = false }) {
  const detailed = height > 90;
  const tiers = Math.max(6, Math.round(height / (detailed ? 20 : 11)));
  const half = (t) => Math.max(1.8, (width / 2) * Math.pow(1 - t, 1.05));

  // One silhouette, with a sawtooth edge for the drooping skirts, so the tree
  // reads as a single mass instead of a stack of triangles.
  const steps = Math.max(16, Math.round(height / 7));
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = baseY - height * t;
    const cx = x + lean * height * t;
    const saw = (t * tiers) % 1;
    left.push([cx - half(t) * (0.82 + 0.32 * saw), y]);
    right.push([cx + half(t) * (0.82 + 0.32 * (((t * tiers) + 0.45) % 1)), y]);
  }
  const tip = [x + lean * height, baseY - height];
  const outline = [...left, tip, ...right.reverse()];
  const out = [`<path d="${poly(outline)}" fill="${pal.treeDark}"/>`];

  // Trunk showing under the lowest skirt.
  out.push(
    `<path d="${poly([[x - width * 0.045, baseY], [x + width * 0.045, baseY], [x + width * 0.03, baseY - height * 0.1], [x - width * 0.03, baseY - height * 0.1]])}" fill="${pal.treeDark}"/>`,
  );

  // Chevrons inside the mass, so the tiers still read as branches.
  const chevrons = [];
  for (let i = 1; i < tiers; i += 1) {
    const t = i / tiers;
    const y = baseY - height * t;
    const cx = x + lean * height * t;
    const w = half(t);
    chevrons.push(
      `<path d="${poly([[cx - w, y], [cx, y - height * 0.035], [cx + w, y], [cx, y - height * 0.02]])}" fill="${rng.chance(0.5) ? pal.treeMid : pal.treeDark}" opacity="${rng.f(0.25, 0.6).toFixed(2)}"/>`,
    );
  }
  out.push(`<g>${chevrons.join('')}</g>`);

  // Snow sits on the upper face of each skirt.
  if (snow) {
    const caps = [];
    for (let i = 1; i < tiers; i += 1) {
      const t = i / tiers;
      const y = baseY - height * t;
      const cx = x + lean * height * t;
      const w = half(t);
      const n = Math.max(2, Math.round(w / 6));
      for (let k = 0; k < n; k += 1) {
        const sx = cx + rng.f(-w * 0.85, w * 0.85);
        caps.push(
          `<path d="${dab(sx, y - rng.f(0, 4), rng.f(4, 12), rng.f(1.6, 3.6), rng.f(-0.35, 0.35), rng.f(-0.1, 0.1))}" fill="${pal.treeTip}" opacity="${rng.f(0.5, 0.95).toFixed(2)}"/>`,
        );
      }
    }
    out.push(`<g>${caps.join('')}</g>`);
  }

  if (!detailed) return out.join('');

  // Needles: short strokes riding the lit left flank and the odd one on the right.
  const strokes = [];
  const count = Math.round(width * 1.4);
  for (let i = 0; i < count; i += 1) {
    const t = rng.f(0.06, 0.95);
    const y = baseY - height * t;
    const cx = x + lean * height * t;
    const side = rng.chance(0.68) ? -1 : 1;
    const w = half(t) * rng.f(0.15, 0.95);
    const sx = cx + side * w;
    const angle = side < 0 ? Math.PI + rng.f(-0.5, 0.25) : rng.f(-0.25, 0.5);
    const color = side < 0 ? (rng.chance(0.35) ? pal.treeTip : pal.treeLit) : pal.treeMid;
    strokes.push(
      `<path d="${dab(sx, y + rng.f(-3, 3), rng.f(4, 12) * (0.6 + (1 - t) * 0.7), rng.f(1.8, 4.2), angle, rng.f(-0.2, 0.2))}" fill="${color}" opacity="${rng.f(0.4, 0.9).toFixed(2)}"/>`,
    );
  }
  out.push(`<g>${strokes.join('')}</g>`);

  const crown = [];
  for (let i = 0; i < 12; i += 1) {
    crown.push(
      `<path d="${dab(tip[0] + rng.f(-width * 0.05, width * 0.02), tip[1] + rng.f(0, height * 0.1), rng.f(4, 11), rng.f(1.4, 3.2), -Math.PI / 2 + rng.f(-0.7, 0.7))}" fill="${pal.treeTip}" opacity="${rng.f(0.25, 0.65).toFixed(2)}"/>`,
    );
  }
  out.push(`<g>${crown.join('')}</g>`);
  return out.join('');
}

function broadleaf(rng, pal, { x, baseY, height, width, lean = 0, snow = false }) {
  const out = [];
  const topX = x + lean * height;
  const crownY = baseY - height * 0.78;
  out.push(
    `<path d="${poly([[x - 5, baseY], [x + 5, baseY], [topX + 3, crownY], [topX - 3, crownY]])}" fill="${pal.treeDark}"/>`,
  );

  // Branches first, so the leaves have something to hang on.
  const limbs = rng.i(3, 5);
  const branches = [];
  for (let i = 0; i < limbs; i += 1) {
    const angle = -Math.PI / 2 + rng.f(-0.9, 0.9);
    const len = height * rng.f(0.22, 0.4);
    const sx = topX + rng.f(-4, 4);
    const sy = crownY + height * rng.f(0.06, 0.22);
    branches.push(
      `<path d="${dab(sx, sy, len, rng.f(1.5, 3), angle, rng.f(-0.15, 0.15))}" fill="${pal.treeDark}" opacity="0.85"/>`,
    );
  }
  out.push(`<g>${branches.join('')}</g>`);

  // A dark mass under the leaves, then lit dabs on top of it.
  const mass = [];
  const clusters = rng.i(4, 6);
  const litLeaves = [];
  for (let c = 0; c < clusters; c += 1) {
    const cx = topX + rng.gauss(0, width * 0.2);
    const cy = baseY - height * rng.f(0.5, 0.88);
    const r = width * rng.f(0.26, 0.44);
    const count = rng.i(26, 46);
    for (let i = 0; i < count; i += 1) {
      const a = rng.f(0, Math.PI * 2);
      const rad = Math.sqrt(rng.next()) * r;
      const lx = cx + Math.cos(a) * rad;
      const ly = cy + Math.sin(a) * rad * 0.76;
      const facing = Math.cos(a) < 0.1 && Math.sin(a) < 0.35;
      const lit = facing && rng.chance(0.55);
      mass.push(
        `<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="${n(rng.f(4, 10))}" ry="${n(rng.f(2.5, 6))}" transform="rotate(${n(rng.f(-50, 50))} ${n(lx)} ${n(ly)})" fill="${snow && rng.chance(0.3) ? pal.treeTip : rng.chance(0.5) ? pal.treeDark : pal.treeMid}" opacity="${rng.f(0.7, 1).toFixed(2)}"/>`,
      );
      if (lit) {
        litLeaves.push(
          `<path d="${dab(lx, ly, rng.f(5, 13), rng.f(1.8, 4), rng.f(-2.4, -0.7), rng.f(-0.15, 0.15))}" fill="${rng.chance(0.35) ? pal.treeTip : pal.treeLit}" opacity="${rng.f(0.45, 0.9).toFixed(2)}"/>`,
        );
      }
    }
  }
  out.push(`<g>${mass.join('')}</g>`);
  out.push(`<g>${litLeaves.join('')}</g>`);
  return out.join('');
}

function ground(rng, pal, { from, snow }) {
  const out = [];
  const top = ridgeLine(rng, { x0: -40, x1: W + 40, y: from, amp: 12, depth: 5 });
  out.push(`<path d="${poly([...top, [W + 40, H + 40], [-40, H + 40]])}" fill="url(#ground)"/>`);

  const grass = [];
  const tufts = rng.i(220, 380);
  for (let i = 0; i < tufts; i += 1) {
    const y = rng.f(from + 6, H - 2);
    const depth = (y - from) / Math.max(1, H - from);
    const x = rng.f(-20, W + 20);
    const len = (4 + depth * 26) * rng.f(0.5, 1.3);
    const color = snow ? (rng.chance(0.5) ? pal.groundA : pal.rockLit) : rng.chance(0.5) ? pal.grass : pal.groundB;
    grass.push(
      `<path d="${dab(x, y, len, rng.f(1.2, 3.4 * (0.6 + depth)), -Math.PI / 2 + rng.f(-0.6, 0.6), rng.f(-0.2, 0.2))}" fill="${color}" opacity="${rng.f(0.25, 0.8).toFixed(2)}"/>`,
    );
  }
  out.push(`<g>${grass.join('')}</g>`);

  const rocks = rng.i(3, 8);
  for (let i = 0; i < rocks; i += 1) {
    const y = rng.f(Math.max(from + 130, H * 0.72), H - 24);
    const depth = (y - from) / Math.max(1, H - from);
    const x = rng.f(30, W - 30);
    const rx = rng.f(8, 26) * (0.5 + depth);
    const ry = rx * rng.f(0.45, 0.8);
    out.push(
      `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${pal.rock}" opacity="${snow ? 0.55 : 0.9}"/>`,
      `<path d="${dab(x - rx * 0.5, y - ry * 0.3, rx * 1.1, ry * 0.35, -0.35, 0.1)}" fill="${pal.rockLit}" opacity="0.6"/>`,
    );
  }
  return out.join('');
}

function cabin(rng, pal, { x, y, scale }) {
  const w = 70 * scale;
  const h = 42 * scale;
  const out = [
    `<ellipse cx="${n(x)}" cy="${n(y + 2)}" rx="${n(w * 0.95)}" ry="${n(h * 0.34)}" fill="${pal.treeDark}" opacity="0.85"/>`,
    `<path d="${poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h], [x - w / 2, y - h]])}" fill="${pal.cabin}"/>`,
    `<path d="${poly([[x - w * 0.64, y - h * 0.95], [x, y - h * 1.75], [x + w * 0.64, y - h * 0.95]])}" fill="${pal.roof}"/>`,
  ];
  const winX = x + w * rng.f(-0.2, 0.2);
  out.push(
    `<rect x="${n(winX - w * 0.1)}" y="${n(y - h * 0.72)}" width="${n(w * 0.2)}" height="${n(h * 0.28)}" fill="${pal.window}" opacity="0.95"/>`,
    `<circle cx="${n(winX)}" cy="${n(y - h * 0.58)}" r="${n(w * 0.42)}" fill="${pal.window}" opacity="0.12" filter="url(#soft)"/>`,
  );
  const puffs = rng.i(3, 5);
  const smoke = [];
  for (let i = 0; i < puffs; i += 1) {
    smoke.push(
      `<ellipse cx="${n(x + w * 0.3 + rng.f(-8, 14) + i * 5)}" cy="${n(y - h * 1.9 - i * 9 * scale)}" rx="${n((8 + i * 4) * scale)}" ry="${n((6 + i * 3) * scale)}" fill="${pal.smoke}" opacity="${(0.3 - i * 0.05).toFixed(2)}"/>`,
    );
  }
  out.push(`<g filter="url(#soft)">${smoke.join('')}</g>`);
  return out.join('');
}

function birds(rng, pal, { horizon }) {
  const count = rng.i(3, 7);
  const baseX = rng.f(W * 0.2, W * 0.7);
  const baseY = rng.f(horizon * 0.2, horizon * 0.55);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const x = baseX + rng.gauss(0, 90);
    const y = baseY + rng.gauss(0, 40);
    const s = rng.f(4, 9);
    out.push(
      `<path d="M${pt(x - s, y)}q${pt(s * 0.6, -s * 0.75)} ${pt(s * 1.2, 0)}q${pt(s * 0.6, -s * 0.75)} ${pt(s * 1.2, 0)}" fill="none" stroke="${pal.treeDark}" stroke-width="${n(s * 0.22)}" stroke-linecap="round" opacity="0.55"/>`,
    );
  }
  return `<g>${out.join('')}</g>`;
}

function mist(rng, pal, { horizon }) {
  const bands = rng.i(3, 6);
  const out = [];
  for (let i = 0; i < bands; i += 1) {
    const y = horizon + rng.f(-30, 60);
    const h = rng.f(10, 34);
    out.push(
      `<rect x="-20" y="${n(y)}" width="${W + 40}" height="${n(h)}" fill="${pal.mist}" opacity="${rng.f(0.05, 0.16).toFixed(2)}" filter="url(#soft)"/>`,
    );
  }
  return `<g>${out.join('')}</g>`;
}

// ---------------------------------------------------------------- assembly

export const SCENES = ['lake', 'valley', 'forest', 'cabin', 'winter'];
export const PALETTE_NAMES = Object.keys(PALETTES);

const SCENE_DEFAULTS = {
  lake: 'morning',
  valley: 'noon',
  forest: 'storm',
  cabin: 'dusk',
  winter: 'winter',
};

export function paint({ seed = 1, scene = 'lake', palette, width = W, height = H } = {}) {
  const rng = rngFrom(`${scene}:${seed}`);
  const shape = SCENES.includes(scene) ? scene : 'lake';
  const pal = PALETTES[palette] || PALETTES[SCENE_DEFAULTS[shape]];

  const horizon = Math.round(height * (shape === 'lake' ? 0.52 : 0.58));
  const hasWater = shape === 'lake';
  const snow = shape === 'winter';
  const shoreY = hasWater ? Math.round(height * 0.82) : null;
  const parts = [];

  const skyMarkup = sky(rng, pal, horizon);
  const far = mountains(rng, pal, { horizon, scale: 0.9, far: true, id: 'far' });
  const near = mountains(rng, pal, { horizon, scale: 0.72, far: false, id: 'near' });
  // The far shore: a band of small conifers standing at the water's edge.
  const treeline = [];
  const count = rng.i(16, 28);
  for (let i = 0; i < count; i += 1) {
    const x = rng.f(-30, W + 30);
    const y = horizon + (hasWater ? rng.f(4, 10) : rng.f(10, 50));
    const h = rng.f(11, 40) * rng.f(0.75, 1.15);
    treeline.push(conifer(rng, pal, { x, baseY: y, height: h, width: h * rng.f(0.45, 0.8), lean: rng.f(-0.05, 0.05), snow }));
  }
  const treelineMarkup = `<g opacity="0.92">${treeline.join('')}</g>`;

  parts.push(`<g>${skyMarkup.markup}${birds(rng, pal, { horizon })}</g>`);
  parts.push(`<g>${far.markup}</g>`);
  parts.push(mist(rng, pal, { horizon }));
  parts.push(`<g>${near.markup}</g>`);

  if (hasWater) {
    const reflected = `${far.markup}${near.markup}${treelineMarkup}`;
    parts.push(water(rng, pal, { horizon, shoreY, reflected, sunX: skyMarkup.sunX }));
    parts.push(farShore(rng, pal, { horizon }));
    parts.push(treelineMarkup);
    parts.push(cabin(rng, pal, { x: rng.f(W * 0.62, W * 0.84), y: horizon + 6, scale: rng.f(0.42, 0.6) }));
    parts.push(ground(rng, pal, { from: shoreY, snow: false }));
  } else {
    parts.push(ground(rng, pal, { from: horizon + 24, snow }));
    parts.push(treelineMarkup);
    if (shape === 'cabin') {
      parts.push(cabin(rng, pal, { x: rng.f(W * 0.24, W * 0.52), y: horizon + 96, scale: rng.f(1.15, 1.5) }));
    }
  }

  // The happy little trees, centre stage, standing on solid ground.
  const heroes = shape === 'forest' ? rng.i(4, 5) : rng.i(2, 3);
  const slot = (width * 0.78) / heroes;
  const footFrom = hasWater ? shoreY + 40 : horizon + 150;
  const footTo = height - 30;
  for (let i = 0; i < heroes; i += 1) {
    const x = width * 0.09 + slot * i + rng.f(0, slot * 0.55);
    const baseY = rng.f(footFrom, footTo);
    const height = rng.f(190, 330) * (0.9 + (baseY - footFrom) / 400);
    const trunkW = height * rng.f(0.17, 0.26);
    parts.push(
      `<ellipse cx="${n(x)}" cy="${n(baseY + 4)}" rx="${n(trunkW * 1.6)}" ry="${n(trunkW * 0.3)}" fill="${pal.treeDark}" opacity="0.22" filter="url(#soft)"/>`,
    );
    if (rng.chance(0.26)) {
      parts.push(broadleaf(rng, pal, { x, baseY, height, width: trunkW * 2.2, lean: rng.f(-0.05, 0.05), snow }));
    } else {
      parts.push(conifer(rng, pal, { x, baseY, height, width: trunkW, lean: rng.f(-0.05, 0.05), snow }));
    }
    // A smaller companion at its foot.
    if (rng.chance(0.6)) {
      const h2 = height * rng.f(0.22, 0.4);
      parts.push(
        conifer(rng, pal, { x: x + rng.f(-80, 80), baseY: baseY + rng.f(16, 50), height: h2, width: h2 * rng.f(0.4, 0.6), lean: rng.f(-0.06, 0.06), snow }),
      );
    }
  }

  // Foreground brush along the bottom edge.
  const bushes = rng.i(4, 7);
  for (let i = 0; i < bushes; i += 1) {
    const x = rng.f(-20, W + 20);
    const y = rng.f(shoreY ?? horizon + 200, H + 20);
    const h = rng.f(40, 100);
    parts.push(broadleaf(rng, pal, { x, baseY: y, height: h, width: h * rng.f(0.8, 1.3), lean: rng.f(-0.05, 0.05), snow }));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="A painted landscape, ${shape}, seed ${seed}">
<title>a happy little grove — ${shape}, seed ${seed}</title>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${pal.skyTop}"/>
<stop offset="0.55" stop-color="${pal.skyMid}"/>
<stop offset="1" stop-color="${pal.skyLow}"/>
</linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${pal.groundA}"/>
<stop offset="1" stop-color="${pal.groundB}"/>
</linearGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${pal.waterTop}"/>
<stop offset="1" stop-color="${pal.waterLow}"/>
</linearGradient>
<radialGradient id="glow">
<stop offset="0" stop-color="${pal.sun}" stop-opacity="0.95"/>
<stop offset="1" stop-color="${pal.sun}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="vignette">
<stop offset="0.62" stop-color="#000" stop-opacity="0"/>
<stop offset="1" stop-color="#000" stop-opacity="0.22"/>
</radialGradient>
<clipPath id="waterband"><rect x="0" y="${horizon + 2}" width="${width}" height="${Math.max(0, (shoreY ?? height) - horizon - 2)}"/></clipPath>
${far.clip}${near.clip}
<filter id="soft" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="glint" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.5"/></filter>
<filter id="cloud" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="oil" x="-3%" y="-3%" width="106%" height="106%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="noise"/>
<feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" seed="11"/>
<feColorMatrix type="saturate" values="0"/>
</filter>
</defs>
<g filter="url(#oil)">
${parts.join('\n')}
</g>
<rect width="${width}" height="${height}" fill="url(#vignette)"/>
<rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.05" style="mix-blend-mode:multiply"/>
<text x="22" y="${height - 18}" font-family="Georgia, serif" font-size="13" fill="${pal.treeDark}" opacity="0.45">${shape} · seed ${seed}</text>
</svg>
`;
}

// ---------------------------------------------------------------- gallery

function galleryPage(items) {
  const cards = items
    .map(
      (it) => `<figure><img src="${it.file}" alt="${it.scene}, seed ${it.seed}"/><figcaption>${it.scene} · seed ${it.seed}</figcaption></figure>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>a happy little grove</title>
<style>
  body{margin:0;background:#14181a;color:#dfe6e3;font:16px/1.5 Georgia,serif;padding:32px}
  h1{font-weight:normal;font-size:28px;margin:0 0 4px}
  p.sub{margin:0 0 28px;color:#8fa39c;font-size:14px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
  figure{margin:0;background:#1d2325;padding:8px;border-radius:4px}
  img{width:100%;display:block;border-radius:2px}
  figcaption{font-size:13px;color:#93a7a0;padding-top:6px}
</style></head>
<body>
<h1>a happy little grove</h1>
<p class="sub">Seeded landscapes, painted as SVG. Idea from NaNdi on Rainshare.</p>
<div class="grid">
${cards}
</div>
</body></html>
`;
}

// ---------------------------------------------------------------- cli

const HELP = `grove — seeded Bob Ross landscapes as SVG

  node grove.mjs [--seed n] [--scene name] [--palette name] [--out file]
  node grove.mjs --list
  node grove.mjs --gallery [dir] [--count n] [--seed-base n]

scenes:   ${SCENES.join(', ')}
palettes: ${PALETTE_NAMES.join(', ')}
`;

async function main(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else {
        args[key] = next;
        i += 1;
      }
    } else args._.push(a);
  }

  if (args.help || args.h) {
    process.stdout.write(HELP);
    return;
  }
  if (args.list) {
    process.stdout.write(`scenes:\n${SCENES.map((s) => `  ${s} (${SCENE_DEFAULTS[s]})`).join('\n')}\n`);
    process.stdout.write(`palettes:\n${PALETTE_NAMES.map((p) => `  ${p}`).join('\n')}\n`);
    return;
  }
  if (args.gallery) {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = args.gallery === true ? 'examples' : args.gallery;
    mkdirSync(dir, { recursive: true });
    const count = Number(args.count) || 8;
    const base = Number(args['seed-base']) || 1;
    const items = [];
    for (let i = 0; i < count; i += 1) {
      const scene = SCENES[i % SCENES.length];
      const seed = base + i;
      const file = `${scene}-${seed}.svg`;
      writeFileSync(join(dir, file), paint({ seed, scene }));
      items.push({ scene, seed, file });
    }
    writeFileSync(join(dir, 'index.html'), galleryPage(items));
    process.stdout.write(`wrote ${items.length} paintings and index.html to ${dir}/\n`);
    return;
  }

  const seed = args.seed !== undefined ? Number(args.seed) : args._[0] !== undefined ? Number(args._[0]) : 1;
  const scene = typeof args.scene === 'string' ? args.scene : 'lake';
  const palette = typeof args.palette === 'string' ? args.palette : undefined;
  const svg = paint({ seed: Number.isFinite(seed) ? seed : 1, scene, palette });
  if (typeof args.out === 'string') {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(args.out, svg);
    process.stdout.write(`${args.out}\n`);
  } else process.stdout.write(svg);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  });
}

/* Figures géométriques dessinées à partir des données de la question (SVG, encre sur voile). */

const FIG = (() => {
  const INK = '#111', SOFT = '#6B685F';
  const nf = v => niceNumber(String(v));
  const lab = (x, y, t, o = {}) => {
    if (t == null || t === '') return '';
    t = String(t);
    const anchor = o.anchor || 'middle';
    if (t.includes('?')) {
      const w = Math.max(30, t.length * 11 + 14);
      const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      return `<rect x="${x0}" y="${y - 15}" width="${w}" height="30" rx="8" fill="var(--lv)" stroke="${INK}" stroke-width="2"/>`
        + `<text x="${x0 + w / 2}" y="${y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="900" fill="${INK}">${esc(t)}</text>`;
    }
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-size="${o.size || 16}" font-weight="${o.w || 700}" fill="${o.fill || INK}"${o.italic ? ' font-style="italic"' : ''}>${esc(t)}</text>`;
  };
  const pt = (x, y, name, dx = 0, dy = -14) => `<circle cx="${x}" cy="${y}" r="3" fill="${INK}"/>` + (name ? lab(x + dx, y + dy, name, { italic: true, fill: SOFT, size: 15, w: 800 }) : '');
  const line = (a, b, o = {}) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${o.c || INK}" stroke-width="${o.w || 2.5}"${o.dash ? ' stroke-dasharray="6 5"' : ''} stroke-linecap="round"/>`;
  const poly = (pts, o = {}) => `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${o.fill || 'none'}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const right = (v, a, b, s = 12) => { const u = unit(v, a), w = unit(v, b); const p1 = [v[0] + u[0] * s, v[1] + u[1] * s], p2 = [p1[0] + w[0] * s, p1[1] + w[1] * s], p3 = [v[0] + w[0] * s, v[1] + w[1] * s]; return `<path d="M${p1} L${p2} L${p3}" fill="none" stroke="${INK}" stroke-width="2"/>`; };
  const arc = (v, a, b, r = 26) => { const u = unit(v, a), w = unit(v, b); const s = [v[0] + u[0] * r, v[1] + u[1] * r], e = [v[0] + w[0] * r, v[1] + w[1] * r]; const cross = u[0] * w[1] - u[1] * w[0]; return `<path d="M${s} A${r},${r} 0 0 ${cross > 0 ? 1 : 0} ${e}" fill="none" stroke="${INK}" stroke-width="2"/>`; };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const out = (a, b, c, d = 18) => { // point décalé vers l'extérieur du segment [ab], à l'opposé de c
    const m = mid(a, b); const n = [-(b[1] - a[1]), b[0] - a[0]]; const l = Math.hypot(...n) || 1; let k = [n[0] / l, n[1] / l];
    if ((c[0] - m[0]) * k[0] + (c[1] - m[1]) * k[1] > 0) k = [-k[0], -k[1]];
    return [m[0] + k[0] * d, m[1] + k[1] * d];
  };
  const svg = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" font-family="Archivo, system-ui, sans-serif">${body}</svg>`;

  const R = {
    numberLine(f) {
      const W = 320, x0 = 24, x1 = 296, y = 70, span = f.max - f.min || 1;
      const X = v => x0 + (v - f.min) / span * (x1 - x0);
      let b = line([x0 - 10, y], [x1 + 12, y]) + `<path d="M${x1 + 12},${y - 6} L${x1 + 20},${y} L${x1 + 12},${y + 6}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
      for (const t of f.ticks) b += line([X(t), y - 8], [X(t), y + 8], { w: 2 });
      for (const l of f.labels) b += lab(X(l), y + 26, nf(l));
      for (const p of f.points) b += `<path d="M${X(p.x)},${y - 12} l-7,-12 h14 z" fill="${INK}"/>` + lab(X(p.x), y - 40, p.label);
      return svg(W, 110, b, 'Droite graduée');
    },
    rect(f) {
      const sq = f.square, w = sq ? 120 : 190, h = sq ? 120 : 110, x = (320 - w) / 2, y = 24;
      return svg(320, 190, `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`
        + right([x, y + h], [x + w, y + h], [x, y]) + lab(x + w / 2, y + h + 22, f.w) + lab(x + w + 10, y + h / 2, f.h, { anchor: 'start' }), sq ? 'Carré' : 'Rectangle');
    },
    circle(f) {
      const c = [160, 95], r = 70;
      let b = `<circle cx="${c[0]}" cy="${c[1]}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` + pt(c[0], c[1], 'O', -12, -12);
      if (f.d) b += line([c[0] - r, c[1]], [c[0] + r, c[1]]) + lab(c[0] + 30, c[1] + 20, f.d);
      else b += line(c, [c[0] + r, c[1]]) + lab(c[0] + r / 2, c[1] + 20, f.r);
      return svg(320, 190, b, 'Cercle');
    },
    rightTriangle(f) {
      const C = [70, 160], B = [260, 160], A = [70, 30];
      let b = poly([A, B, C], { fill: '#fff' }) + right(C, B, A);
      b += lab(...out(C, B, A, 20), f.adj) + lab(...out(A, C, B, 26), f.opp) + lab(...out(A, B, C, 22), f.hyp);
      if (f.angle) b += arc(B, C, A, 34) + lab(B[0] - 58, B[1] - 14, f.angle);
      return svg(320, 190, b, 'Triangle rectangle');
    },
    cuboid(f) {
      const x = 70, y = 70, w = 150, h = 90, dx = 50, dy = -40;
      let b = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`;
      b += poly([[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]], { fill: '#EDEBE4' });
      b += poly([[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]], { fill: '#E2E0D7' });
      b += line([x, y + h], [x + dx, y + h + dy], { dash: true, w: 1.5 }) + line([x + dx, y + h + dy], [x + dx, y + dy], { dash: true, w: 1.5 }) + line([x + dx, y + h + dy], [x + w + dx, y + h + dy], { dash: true, w: 1.5 });
      b += lab(x + w / 2, y + h + 20, f.a) + lab(x + w + dx / 2 + 14, y + h + dy / 2 + 14, f.b, { anchor: 'start' }) + lab(x - 10, y + h / 2, f.c, { anchor: 'end' });
      return svg(320, 190, b, 'Pavé droit');
    },
    triangleHeight(f) {
      const A = [40, 160], B = [280, 160], C = [190, 36], H = [190, 160];
      return svg(320, 195, poly([A, B, C], { fill: '#fff' }) + line(C, H, { dash: true }) + right(H, A, C) + lab(160, 182, f.base) + lab(182, 100, f.height, { anchor: 'end' }), 'Triangle et hauteur');
    },
    triangle(f) {
      let A = [50, 160], B = [270, 160], C = [170, 32];
      const ga = parseFloat(f.angles && f.angles[0]), gb = parseFloat(f.angles && f.angles[1]);
      if (ga > 0 && gb > 0 && ga + gb < 175) { // triangle construit avec les angles donnés
        const ta = Math.tan(ga * Math.PI / 180), tb = Math.tan(gb * Math.PI / 180);
        const x = ga === 90 ? 0 : gb === 90 ? 1 : tb / (ta + tb), h = ga === 90 ? tb : x * ta;
        const lo = Math.min(0, x), hi = Math.max(1, x), k = Math.min(240 / (hi - lo), 130 / Math.max(h, .01)), left = 160 - (lo + hi) / 2 * k;
        A = [left, 165]; B = [left + k, 165]; C = [left + x * k, 165 - h * k];
      }
      let b = poly([A, B, C], { fill: '#fff' });
      if (f.angles) {
        b += arc(A, B, C) + arc(B, C, A) + arc(C, A, B, 22);
        const ia = unit(A, mid(B, C)), ib = unit(B, mid(A, C)), ic = unit(C, mid(A, B));
        b += lab(A[0] + ia[0] * 48, A[1] + ia[1] * 30, f.angles[0]) + lab(B[0] + ib[0] * 48, B[1] + ib[1] * 30, f.angles[1]) + lab(C[0] + ic[0] * 44, C[1] + ic[1] * 44, f.angles[2]);
      } else if (f.sides) {
        b += lab(...out(A, B, C, 20), f.sides[0]) + lab(...out(B, C, A, 22), f.sides[1]) + lab(...out(C, A, B, 22), f.sides[2]);
      }
      return svg(320, 195, b, 'Triangle');
    },
    parallels(f) {
      const g = parseFloat(String(f.given).replace(',', '.')) || 60;
      const acute = Math.min(70, Math.max(38, g > 90 ? 180 - g : g)) * Math.PI / 180;
      const y1 = 64, y2 = 144, P = [150, y1], Q = [150 - (y2 - y1) / Math.tan(acute), y2];
      const up = [Math.cos(acute), -Math.sin(acute)], down = [-up[0], -up[1]], L = [-1, 0], Rt = [1, 0];
      let b = line([16, y1], [304, y1]) + line([16, y2], [304, y2]);
      b += line([Q[0] + down[0] * 46, Q[1] + down[1] * 46], [P[0] + up[0] * 46, P[1] + up[1] * 46]);
      b += lab(300, y1 - 14, '(d)', { anchor: 'end', size: 14, fill: SOFT }) + lab(300, y2 + 16, '(d′)', { anchor: 'end', size: 14, fill: SOFT });
      const wedge = (v, a, c, fill, t) => {
        const r = 30, s1 = [v[0] + a[0] * r, v[1] + a[1] * r], s2 = [v[0] + c[0] * r, v[1] + c[1] * r];
        const sweep = a[0] * c[1] - a[1] * c[0] > 0 ? 1 : 0;
        const m = unit([0, 0], [a[0] + c[0], a[1] + c[1]]);
        return `<path d="M${v} L${s1} A${r},${r} 0 0 ${sweep} ${s2} Z" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>` + lab(v[0] + m[0] * 52, v[1] + m[1] * 46, t);
      };
      const obtuse = g > 90;
      // angle donné : en P, entre la sécante (vers le bas) et (d)
      b += wedge(P, down, obtuse ? Rt : L, '#fff', f.given);
      b += f.target === 'alterne' ? wedge(Q, up, obtuse ? L : Rt, 'var(--lv)', '?') : wedge(Q, down, obtuse ? Rt : L, 'var(--lv)', '?');
      return svg(320, 200, b, 'Droites parallèles coupées par une sécante');
    },
    parallelogram(f) {
      const A = [40, 160], B = [230, 160], C = [290, 50], D = [100, 50], H = [100, 160];
      return svg(320, 195, poly([A, B, C, D], { fill: '#fff' }) + line(D, H, { dash: true }) + right(H, B, D) + lab(135, 182, f.base) + lab(110, 105, f.height, { anchor: 'start' }), 'Parallélogramme et hauteur');
    },
    grid(f) {
      const o = [160, 100], s = 15; let b = '';
      for (let i = -9; i <= 9; i++) b += line([o[0] + i * s, 8], [o[0] + i * s, 192], { c: '#D9D6CC', w: 1 });
      for (let j = -6; j <= 6; j++) b += line([16, o[1] - j * s], [304, o[1] - j * s], { c: '#D9D6CC', w: 1 });
      b += line([16, o[1]], [304, o[1]], { w: 2 }) + line([o[0], 192], [o[0], 8], { w: 2 });
      b += lab(o[0] + s, o[1] + 14, '1', { size: 12, fill: SOFT }) + lab(o[0] - 9, o[1] - s, '1', { size: 12, fill: SOFT }) + lab(o[0] - 9, o[1] + 12, 'O', { size: 12, fill: SOFT, italic: true });
      const P = [o[0] + f.x * s, o[1] - f.y * s];
      b += `<circle cx="${P[0]}" cy="${P[1]}" r="7" fill="var(--lv)" stroke="${INK}" stroke-width="2.5"/>` + lab(P[0] + 10, P[1] - 14, 'A', { anchor: 'start', italic: true, w: 800 });
      return svg(320, 200, b, 'Repère du plan');
    },
    pie(f) {
      const c = [160, 100], r = 80, a = f.percent / 100 * 2 * Math.PI;
      const e = [c[0] + r * Math.sin(a), c[1] - r * Math.cos(a)];
      const b = `<circle cx="${c[0]}" cy="${c[1]}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`
        + `<path d="M${c} L${c[0]},${c[1] - r} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${e} Z" fill="var(--lv)" stroke="${INK}" stroke-width="2.5"/>`
        + lab(c[0] + 34 * Math.sin(a / 2), c[1] - 34 * Math.cos(a / 2), '?') + lab(c[0] + (r + 22) * Math.sin(a / 2), c[1] - (r + 18) * Math.cos(a / 2), `${f.percent} %`, { size: 15 });
      return svg(320, 200, b, 'Diagramme circulaire');
    },
    midpoints() {
      const A = [160, 24], B = [40, 170], C = [280, 170], I = mid(A, B), J = mid(A, C);
      return svg(320, 200, poly([A, B, C], { fill: '#fff' }) + line(I, J, { c: INK, w: 3 }) + pt(...A, 'A') + pt(...B, 'B', -12, 12) + pt(...C, 'C', 12, 12) + pt(...I, 'I', -14, -4) + pt(...J, 'J', 14, -4), 'Droite des milieux');
    },
    thales(f) {
      let A, B, C, M, N;
      if (f.papillon) { A = [160, 100]; B = [60, 170]; C = [250, 170]; M = [205, 65]; N = [115, 65]; }
      else { A = [160, 20]; B = [40, 175]; C = [290, 175]; M = [100, 97]; N = [225, 97]; }
      let b = f.papillon ? line(B, M) + line(C, N) + line(B, C) + line(M, N) : poly([A, B, C], { fill: '#fff' }) + line(M, N);
      b += pt(...A, 'A', f.papillon ? 16 : 0, f.papillon ? 0 : -12) + pt(...B, 'B', -12, 12) + pt(...C, 'C', 12, 12) + pt(...M, 'M', f.papillon ? 14 : -14, -8) + pt(...N, 'N', f.papillon ? -14 : 14, -8);
      return svg(320, 200, b, f.papillon ? 'Configuration de Thalès en papillon' : 'Configuration de Thalès');
    },
  };
  return f => { try { return R[f.kind] ? R[f.kind](f) : ''; } catch (e) { return ''; } };
})();

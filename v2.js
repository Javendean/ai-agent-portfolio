/* v2.js - the hero canvas: hand-rolled, no library, no build.
 * E2: two planes of account nodes turning in 3D, each edge a mapping. All calm
 * and dim but one, in the accent: it lands on the wrong node, and the empty
 * square marks where it should have gone. It draws in .hero-lane, a column of
 * its own: see index.html. E6 no per-frame allocation, 60fps, DPR-aware.
 * B4: the defect edge's alpha is 0.42 + 0.25 * depth. Depth for that pair
 * runs .304 to .418 over the whole turn, so alpha runs .496 to .524, which
 * composites to 3.22:1 and 3.46:1 on --base. Floor for a graphic is 3:1.
 */
(function () {
  'use strict';

  var cv = document.querySelector('.hero-canvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  if (!ctx) return;
  var still = document.querySelector('.hero-still');

  var css = getComputedStyle(document.documentElement);
  var DIM = css.getPropertyValue('--text-3').trim() || '#8E97A1';
  var ACC = css.getPropertyValue('--accent').trim() || '#5CC8E6';

  // 12 accounts per chart, 4x3 on planes at x -1.15 and +1.15
  var N = 12, PTS = 32, i, k;
  var M = new Float32Array(PTS * 3); // model x, y, z
  var P = new Float32Array(PTS * 3); // projected sx, sy, depth
  var CY = [1.42, 1.42, -1.42, -1.42], CZ = [-0.95, 0.95, 0.95, -0.95];
  for (i = 0; i < PTS; i++) {
    k = i * 3;
    M[k] = (i < N || (i > 23 && i < 28)) ? -1.15 : 1.15;
    M[k + 1] = i < 24 ? 1.05 - ((((i % N) / 3) | 0) * 0.7) : CY[i % 4];
    M[k + 2] = i < 24 ? ((i % 3) - 1) * 0.62 : CZ[i % 4];
  }
  var WIRE = new Int16Array([24, 25, 25, 26, 26, 27, 27, 24,
                             28, 29, 29, 30, 30, 31, 31, 28]);
  // entity i lands on group MAP[i]; ERR misses DST
  var MAP = new Int8Array([0, 1, 2, 3, 3, 5, 6, 1, 8, 10, 10, 11]);
  var ERR = 7, DST = 7;

  var W = 0, H = 0, cx = 0, cy = 0, R = 0, FOCAL = 3.2, CAM = 4;

  function fit() {
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w; H = h;
    // The figure spans 1.43R by 1.92R, the 24 nodes 1.19R by 1.44R: every
    // node stays in the lane, and its clip crops the plane corners.
    cx = w * 0.5; cy = h * 0.5;
    R = Math.min(w / 2.9, h / 3.6);
    return true;
  }

  function seg(a, b) { ctx.moveTo(P[a], P[a + 1]); ctx.lineTo(P[b], P[b + 1]); }
  function sq(p, s) { ctx.fillRect(P[p] - s * 0.5, P[p + 1] - s * 0.5, s, s); }

  function render(ms) {
    var yaw = -0.42 + 0.62 * Math.sin(ms * 0.000185);
    var tilt = 0.2 + 0.06 * Math.cos(ms * 0.000119);
    var sy = Math.sin(yaw), cw = Math.cos(yaw), st = Math.sin(tilt);
    var ct = Math.cos(tilt), a, b, x, y, z, x1, z1, y2, z2, s, d;

    for (i = 0; i < PTS; i++) {
      k = i * 3; x = M[k]; y = M[k + 1]; z = M[k + 2];
      x1 = x * cw + z * sy;   // yaw, about the vertical axis
      z1 = z * cw - x * sy;
      y2 = y * ct - z1 * st;  // tilt, about the horizontal
      z2 = y * st + z1 * ct;
      s = FOCAL / (CAM + z2);   // perspective: shrink by FOCAL/depth
      P[k] = cx + x1 * s * R; P[k + 1] = cy - y2 * s * R;
      d = (s - 0.6) / 0.6;
      P[k + 2] = d < 0 ? 0 : (d > 1 ? 1 : d);  // 0 far, 1 near
    }

    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.strokeStyle = DIM; ctx.globalAlpha = 0.14;
    ctx.beginPath();
    for (i = 0; i < 16; i += 2) seg(WIRE[i] * 3, WIRE[i + 1] * 3);
    ctx.stroke();

    for (i = 0; i < N; i++) {
      if (i === ERR) continue;
      a = i * 3; b = (N + MAP[i]) * 3;
      ctx.globalAlpha = 0.09 + 0.12 * (P[a + 2] + P[b + 2]);
      ctx.beginPath(); seg(a, b); ctx.stroke();
    }

    ctx.fillStyle = DIM;
    for (i = 0; i < 24; i++) {
      d = P[i * 3 + 2]; ctx.globalAlpha = 0.2 + 0.42 * d;
      sq(i * 3, 2.2 + 2.4 * d);
    }

    a = ERR * 3; b = (N + MAP[ERR]) * 3; k = (N + DST) * 3;
    d = (P[a + 2] + P[b + 2]) * 0.5;
    ctx.strokeStyle = ACC; ctx.lineWidth = 1.4;   // the defect
    ctx.globalAlpha = 0.42 + 0.25 * d;    // .496 to .524 over a turn
    ctx.beginPath(); seg(a, b); ctx.stroke();
    ctx.fillStyle = ACC;
    sq(a, 3.4 + 2.4 * P[a + 2]); sq(b, 3.4 + 2.4 * P[b + 2]);

    d = P[k + 2]; s = 7 + 3 * d;   // where it should have landed
    ctx.lineWidth = 1; ctx.globalAlpha = 0.2 + 0.2 * d;
    ctx.strokeRect(P[k] - s * 0.5, P[k + 1] - s * 0.5, s, s);
    ctx.globalAlpha = 1;
  }

  var raf = 0, clock = 0, prev = 0, onscreen = true;
  var quiet = window.matchMedia('(prefers-reduced-motion: reduce)');

  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = now - prev;
    if (dt < 15) return;   // 60fps ceiling
    prev = now; clock += dt > 100 ? 16 : dt;
    render(clock);
  }
  function start() {
    if (raf || quiet.matches || !onscreen || document.hidden || !W) return;
    prev = performance.now(); raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  if (!fit()) return;   // no size: the SVG stays, and that is E3
  if (still) still.remove();

  window.addEventListener('resize', function () {
    if (fit() && !raf) render(clock);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  if (window.IntersectionObserver) {
    new window.IntersectionObserver(function (e) {
      // E5: the LAST, or a [false, true] batch freezes the canvas on screen
      onscreen = e[e.length - 1].isIntersecting;
      if (onscreen) start(); else stop();
    }, { threshold: 0 }).observe(cv);
  }

  // A3, live. Read once at load, this left the canvas at 57fps under an
  // emulated reduce. On: one frame, no loop. Off: restart.
  function quietChanged() {
    if (quiet.matches) { stop(); render(clock); } else start();
  }
  if (quiet.addEventListener) quiet.addEventListener('change', quietChanged);
  quietChanged();
}());

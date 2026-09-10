/* v2.js - hero figure, living ground, ichthys loader, narrative index.
 * No library, no build. X2 cap 14,592 B (amended 2026-09-10; rationale in
 * RUBRIC-V3-MOTION.md X2). */

/* MOTION DRIVER. Sole gate on whether a loop runs (A3, E5, L6, L7). */
function jnDrive(el, step, paint) {
  'use strict';
  var raf = 0, prev = 0, near = true, t = 0;
  var quiet = window.matchMedia('(prefers-reduced-motion: reduce)');

  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = now - prev;
    if (dt < step) return;                 // frame ceiling
    prev = now; t += dt > 100 ? 16 : dt;   // long gap counts as one frame
    paint(t, false);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function sync() {
    if (quiet.matches || document.hidden || !near) {
      stop(); paint(t, quiet.matches);
    } else if (!raf) {
      prev = performance.now(); raf = requestAnimationFrame(tick);
    }
  }
  document.addEventListener('visibilitychange', sync);
  if (window.IntersectionObserver) {
    new window.IntersectionObserver(function (e) {
      near = e[e.length - 1].isIntersecting; sync();
    }, { threshold: 0 }).observe(el);
  }
  if (quiet.addEventListener) quiet.addEventListener('change', sync);
  sync.stop = stop;        // the loader takes its canvas
  return sync;
}

/* THE HERO CANVAS. E2: two planes of account nodes turning in 3D, each edge a
 * mapping; all dim but the accent one, which lands on the wrong node and
 * leaves an empty square. B4: .496 to .524 alpha, 3.22:1 to 3.46:1. */
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

  // 12 accounts a chart, 4x3 on planes at x -1.15 and +1.15
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
    // 1.43R by 1.92R overall, 1.19R by 1.44R for the 24 nodes: all in lane
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

  if (!fit()) return;   // no size: the SVG stays, and that is E3
  if (still) still.remove();

  var sync = jnDrive(cv, 15, render);   // 15: E6's 60fps ceiling
  window.addEventListener('resize', function () {
    if (fit()) sync();
  }, { passive: true });
  sync();
}());

/* PART L. Film grain at 25fps. L5 forces the design: 1.3M px is past what JS
 * writes in 4ms, so noise bakes ONCE into a 128px tile and each frame is one
 * pattern fill at a fresh offset. A blit, not a generation. Measured 5.05
 * levels/frame (window 1.5-6.0), 71% over 2 (floor 25%), text 8.4:1. */
(function () {
  'use strict';

  // The markup owns this layer: its CSS texture is the JS-off stand-in (L8),
  // its aria-hidden covers the canvas (L9; pointer-events in CSS).
  var host = document.querySelector('.ground');
  if (!host) return;
  var cv = document.createElement('canvas');
  cv.className = 'ground-c';
  var ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) return;              // no 2d: the CSS texture stands
  host.appendChild(cv);

  var TILE = 128, GRAIN = 16, REBAKE = 24, W = 0, H = 0, n = 0, pat = null;
  var tile = document.createElement('canvas');
  tile.width = tile.height = TILE;
  var tctx = tile.getContext('2d'), img = tctx.createImageData(TILE, TILE);
  var bits = img.data;
  bits.fill(255);                // only the alpha varies

  function bake() {
    for (var i = 3; i < bits.length; i += 4) bits[i] = Math.random() * GRAIN;
    tctx.putImageData(img, 0, 0);
    // createPattern snapshots its source: a new tile needs a new one.
    ctx.fillStyle = pat = ctx.createPattern(tile, 'repeat');
  }

  function fit() {               // true only if it was rebuilt
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h || (w === W && h === H)) return false;
    // One backing pixel per CSS pixel at any DPR: 2x would be 4x the fill.
    W = w; H = h; cv.width = w; cv.height = h;
    ctx.globalCompositeOperation = 'copy';   // one pass; a resize clears
    ctx.imageSmoothingEnabled = false;       // every property set here
    if (pat) ctx.fillStyle = pat;
    return true;
  }

  function paint() {
    if (n++ % REBAKE === 0) bake();
    // Sub-pixel offset, smoothing OFF: each pixel takes the NEAREST texel,
    // because filtering averages neighbours and halves the delta.
    var ox = Math.random() * TILE, oy = Math.random() * TILE;
    ctx.setTransform(1, 0, 0, 1, -ox, -oy);
    ctx.fillRect(ox, oy, W, H);
  }

  if (!fit()) return;
  paint();                               // one frame before any decision
  var sync = jnDrive(host, 40, paint);   // 40: 25fps
  window.addEventListener('resize', function () {
    if (fit()) paint();
  }, { passive: true });
  sync();
}());

/* v3 PART I - THE ICHTHYS LOADER. Two equal-radius arcs, centres offset +/-c
 * about the axis, authored offline; no authoring tool ships (I2). The lower
 * arc is the upper turned a half turn about X, (x, -y, -z), so half the
 * numbers are not stored. Nose gap 0, tail crossing 0.0114 (I1, I4). */
(function () {
  'use strict';

  // I10, once a session. A locked-down browser throws instead of remembering.
  try {
    if (sessionStorage.getItem('jn-mark')) return;
    sessionStorage.setItem('jn-mark', '1');
  } catch (e) { }
  /* Nothing left to wait on, or the 2,000ms cap went by while a slow network
     fetched this file: covering painted content is the bug I5 names. */
  if (document.readyState === 'complete' || performance.now() >= 1520) return;

  /* The upper arc in thousandths of a model unit, tail first, nose last: every
     fourth exported point. The dropped ones would move the curve 0.13px here;
     the tail crossing at index 7 and the nose survived. */
  var G = [
    982,-635,0,995,-544,0,1000,-452,0,997,-360,0,986,-269,0,967,-179,0,
    940,-91,0,906,-6,0,864,76,19,815,154,39,760,228,58,698,296,77,
    631,358,94,558,415,110,481,465,125,400,508,138,315,543,148,
    227,571,157,138,592,163,46,604,166,-45,608,168,-137,604,167,
    -228,593,163,-318,573,157,-406,545,149,-491,510,138,-572,468,126,
    -650,418,112,-723,362,96,-791,300,78,-853,232,60,-908,159,40,
    -958,82,20,-1000,0,0
  ];
  var N = G.length / 3, i, k;

  /* I3, the arc-length table: cumulative chord length normalised to 1, NOT
     the point index. Recomputed from the array above: 33 segments, 0.0911 to
     0.0943 model units, 3.063058 total; an index walk would speed the tip up
     and slow it down. */
  var S = new Float32Array(N), run = 0, dx, dy, dz;
  for (i = 1; i < N; i++) {
    k = i * 3;
    dx = G[k] - G[k - 3]; dy = G[k + 1] - G[k - 2]; dz = G[k + 2] - G[k - 1];
    S[i] = run += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  for (i = 1; i < N; i++) S[i] /= run;

  /* The overlay is in the markup, hidden; this class is the only thing that
     shows it (I6). I8: its label ships EMPTY and takes its text a tick later,
     because a live region announces what changes after it exists, and v2.css
     no longer uppercases it. */
  var box = document.querySelector('.loader'), cv = box && box.firstElementChild;
  if (!cv) return;
  document.documentElement.classList.add('loader-on');
  setTimeout(function () {
    if (box) box.lastElementChild.textContent = 'Loading the page';
  }, 0);

  var ctx = cv.getContext && cv.getContext('2d');
  var CAM = 5.4, W = 0, H = 0, cx = 0, cy = 0, R = 0;

  function fit() {
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return false;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    W = w; H = h; cx = w * 0.5; cy = h * 0.5;
    // 2 by 1.27 units, near side inflated 1.28: every point in, at any angle
    R = Math.min(w / 2.4, h / 1.75);
    ctx.lineWidth = Math.max(1.25, R * 0.014);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = getComputedStyle(cv).color;   // inherits --text-2
    return true;
  }

  /* Draw the figure to arc length p, posed at yaw. Two walks in one. The
     PROJECTION: yaw each point about the vertical, divide by depth. The
     ARC-LENGTH WALK: every vertex behind the head, then the head placed
     BETWEEN two, advancing the tip at constant speed. */
  function draw(p, yaw) {
    var sn = Math.sin(yaw), cs = Math.cos(yaw);
    var a, sg, x, z, d, ux, uy, vx = 0, vy = 0, t;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    for (a = 0; a < 2; a++) {
      sg = a ? -0.001 : 0.001;
      for (i = 0; i < N; i++) {
        k = i * 3; x = G[k] * 0.001; z = G[k + 2] * sg;
        d = CAM / (CAM + z * cs - x * sn);      // perspective: focal / depth
        ux = cx + (x * cs + z * sn) * d * R;    // yaw, about the vertical
        uy = cy - G[k + 1] * sg * d * R;        // canvas y down, model y up
        if (!i) ctx.moveTo(ux, uy);
        else if (S[i] <= p) ctx.lineTo(ux, uy);
        else {
          t = (p - S[i - 1]) / (S[i] - S[i - 1]);
          ctx.lineTo(vx + (ux - vx) * t, vy + (uy - vy) * t);
          break;
        }
        vx = ux; vy = uy;
      }
    }
    ctx.stroke();
  }

  /* I12: SWEEP clamps the turn instead of letting the timer bound it. Past 60 deg
     the arcs go edge-on into a tangle; +0.3 rad holds -17.19 to +17.19 deg at
     any lifetime. I3: load beats DRAWN warm, so the draw is graded throttled;
     a minimum display time would fix it and break I5. */
  var YAW0 = -0.3, SPIN = 0.3, SWEEP = 0.6, DRAWN = 760;
  var live = !!ctx && fit(), sync = null, last = 0;

  function pose(t) { return YAW0 + Math.min(SPIN * t * 0.001, SWEEP); }

  function paint(t, frozen) {   // I7: frozen draws the finished figure
    last = t;
    draw(frozen || t >= DRAWN ? 1 : t / DRAWN, pose(t));
  }
  function done() {             // I5. I12: a whole figure fades
    if (!box) return;
    if (live) { sync.stop(); draw(1, pose(last)); }
    box.className = 'loader loader-done';   // the 420ms fade is in the CSS
    setTimeout(shut, 460);
  }
  function shut() {
    if (!box) return;
    box.parentNode.removeChild(box);   // I8: out of the DOM, out of the tree
    document.documentElement.classList.remove('loader-on');
    cv.width = 0;   // the driver outlives the overlay, so drop the buffer too
    box = null;
  }

  if (live) { sync = jnDrive(cv, 0, paint); sync(); }
  window.addEventListener('load', done);
  /* I5: armed from NAVIGATION START (deferred-script start drifted 15.9-1010.5ms
     over four loads), 480ms early so the overlay is GONE at 2,000ms. */
  setTimeout(done, Math.max(0, 1520 - performance.now()));
}());

/* PART S driver. v2.css takes each word's range from --i and its animation-name
   from --na; nothing set either, so the reveal shipped inert. Native
   view-timeline owns progress, so no scroll listener runs (S2). --na is the
   fallback hinge: unresolved it becomes `none` and the animation is off, so JS
   off leaves words at opacity 1 (S5/S6). An unset --i alone would NOT do that,
   fill:both pins them at .78. */
(function (w) {
  if (!w.length) return;
  w[0].closest('.narr').style.setProperty('--na', 'narr-word');
  w.forEach(function (e, i) { e.style.setProperty('--i', i); });
}(document.querySelectorAll('.narr-w')));

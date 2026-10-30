// Alternating zoom at camera cuts (run AFTER the face framing is applied).
// Every switch between the wide track and the close track starts a new "run". Run 0 stays still; then runs alternate
// a slow zoom-in (1 -> 1+amount) and zoom-out (1+amount -> 1), so the scale is continuous across each cut.
//  - close track (interviewee camera): scale goes base*f(t) and the position is rescaled around the face guide
//    (pos' = G + (pos - G) * f), so the face stays on the guides. Only clips inside a "guides" range are touched.
//  - wide track: scale base*f(t) anchored at (0.5, anchorY) of the frame, keyed only on its visible intervals.
//  - clips whose Scale is already animated (zoom made by hand, or this script already ran) are skipped.
// Usage from execute_extendscript (batch with from/to; part "close" or "wide"; dry:true only reports):
//   var ARGS={wide:0, close:1, amount:0.08, anchorY:0.35, guides:[[0,28,1075,425],[29,55,1090,470]],
//             skip:[], part:"close", from:0, to:20, dry:false};
//   return $.evalFile("<skill>/scripts/zoom_alternado.jsx");
(function () {
  var A = ARGS, seq = app.project.activeSequence, W = seq.frameSizeHorizontal, H = seq.frameSizeVertical;
  var wide = seq.videoTracks[A.wide], close = seq.videoTracks[A.close];
  var amt = A.amount != null ? A.amount : 0.08, ay = A.anchorY != null ? A.anchorY : 0.35;
  var frame = Number(seq.timebase) / 254016000000;
  function has(list, v) { if (!list) return false; for (var q = 0; q < list.length; q++) if (list[q] == v) return true; return false; }
  function motion(c) { for (var j = 0; j < c.components.numItems; j++) if (c.components[j].matchName == "AE.ADBE Motion") return c.components[j]; return null; }
  function tm(s) { var t = new Time(); t.seconds = s; return t; }

  // close-track coverage and camera runs (gaps with nothing visible count as the wide camera)
  var cov = [], edges = [0], i, k;
  for (i = 0; i < close.clips.numItems; i++) { cov.push([close.clips[i].start.seconds, close.clips[i].end.seconds]); edges.push(cov[i][0], cov[i][1]); }
  var endT = 0;
  for (i = 0; i < wide.clips.numItems; i++) endT = Math.max(endT, wide.clips[i].end.seconds);
  for (i = 0; i < cov.length; i++) endT = Math.max(endT, cov[i][1]);
  edges.push(endT); edges.sort(function (a, b) { return a - b; });
  function onClose(t) { for (var q = 0; q < cov.length; q++) if (cov[q][0] <= t && t < cov[q][1]) return true; return false; }
  var runs = [];
  for (k = 0; k + 1 < edges.length; k++) {
    var a = edges[k], b = edges[k + 1]; if (b - a < 1e-4) continue;
    var cam = onClose((a + b) / 2) ? 1 : 0, last = runs[runs.length - 1];
    if (last && last[2] == cam && Math.abs(last[1] - a) < 1e-4) last[1] = b; else runs.push([a, b, cam]);
  }
  function f(t) {
    for (var q = 0; q < runs.length; q++) {
      var r = runs[q]; if (t < r[0] - 1e-4 || t > r[1] + 1e-4) continue;
      if (q == 0) return 1; var u = Math.max(0, Math.min(1, (t - r[0]) / (r[1] - r[0])));
      return q % 2 == 1 ? 1 + amt * u : 1 + amt * (1 - u);
    }
    return 1;
  }
  function guideOf(ci) { for (var q = 0; A.guides && q < A.guides.length; q++) if (ci >= A.guides[q][0] && ci <= A.guides[q][1]) return [A.guides[q][2] / W, A.guides[q][3] / H]; return null; }

  var rep = { runs: runs.length, done: [], skipped: [] }, from = A.from || 0;
  if (A.part == "close") {
    for (i = from; i < close.clips.numItems && i < (A.to != null ? A.to : 1e9); i++) {
      var c = close.clips[i], mo = motion(c), G = guideOf(i);
      if (!mo || !G || has(A.skip, i) || mo.properties[1].isTimeVarying()) { rep.skipped.push(i); continue; }
      var pos = mo.properties[0], sc = mo.properties[1], s0 = sc.getValue(), inp = c.inPoint.seconds, spd = c.getSpeed() || 1;
      var dur = c.end.seconds - c.start.seconds, ts = [], keys = [];
      // sample every 0.1 s plus the last frame (media time = in + timeline offset * speed), reading the current framing
      for (var t = 0; t < dur - frame + 1e-6; t += 0.1) ts.push(t);
      ts.push(dur - frame);
      for (k = 0; k < ts.length; k++) {
        var p = pos.isTimeVarying() ? pos.getValueAtTime(tm(inp + ts[k] * spd)) : pos.getValue(), r = f(c.start.seconds + ts[k]);
        keys.push([inp + ts[k] * spd, s0 * r, G[0] + (p[0] - G[0]) * r, G[1] + (p[1] - G[1]) * r]);
      }
      if (!A.dry) {
        pos.setTimeVarying(false); sc.setTimeVarying(false); pos.setTimeVarying(true); sc.setTimeVarying(true);
        for (k = 0; k < keys.length; k++) { var kt = tm(keys[k][0]); pos.addKey(kt); pos.setValueAtKey(kt, [keys[k][2], keys[k][3]], true); sc.addKey(kt); sc.setValueAtKey(kt, keys[k][1], true); }
      }
      rep.done.push([i, keys.length, Math.round(keys[0][1] * 100) / 100, Math.round(keys[keys.length - 1][1] * 100) / 100]);
    }
  } else {
    for (i = from; i < wide.clips.numItems && i < (A.to != null ? A.to : 1e9); i++) {
      var w = wide.clips[i], wm = motion(w);
      if (!wm || has(A.skip, i) || wm.properties[0].isTimeVarying() || wm.properties[1].isTimeVarying()) { rep.skipped.push(i); continue; }
      var ws = w.start.seconds, we = w.end.seconds, pts = [ws, we], vis = [];
      for (k = 0; k < cov.length; k++) { if (cov[k][0] > ws && cov[k][0] < we) pts.push(cov[k][0]); if (cov[k][1] > ws && cov[k][1] < we) pts.push(cov[k][1]); }
      pts.sort(function (a, b) { return a - b; });
      for (k = 0; k + 1 < pts.length; k++) if (pts[k + 1] - pts[k] > 1e-4 && !onClose((pts[k] + pts[k + 1]) / 2)) vis.push([pts[k], pts[k + 1]]);
      var s1 = wm.properties[1].getValue(), p1 = wm.properties[0].getValue(), wk = [], moving = false;
      for (k = 0; k < vis.length; k++) {
        var pair = [vis[k][0], vis[k][1] - frame];
        for (var e = 0; e < 2; e++) { var rr = f(pair[e]); if (Math.abs(rr - 1) > 1e-6) moving = true;
          wk.push([w.inPoint.seconds + (pair[e] - ws), s1 * rr, 0.5 + (p1[0] - 0.5) * rr, ay + (p1[1] - ay) * rr]); }
      }
      if (!moving) continue;
      if (!A.dry) {
        var wp = wm.properties[0], wsc = wm.properties[1];
        wp.setTimeVarying(true); wsc.setTimeVarying(true);
        for (k = 0; k < wk.length; k++) { var wt = tm(wk[k][0]); wp.addKey(wt); wp.setValueAtKey(wt, [wk[k][2], wk[k][3]], true); wsc.addKey(wt); wsc.setValueAtKey(wt, wk[k][1], true); }
      }
      rep.done.push([i, wk.length, Math.round(wk[0][1] * 100) / 100, Math.round(wk[wk.length - 1][1] * 100) / 100]);
    }
  }
  return JSON.stringify(rep);
})();

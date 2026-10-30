// Checks that each clip in ARGS.only still has the expected inPoint/duration (ARGS.exp = {idx:[in,dur]}) and the track
// still has ARGS.n clips; only then runs the skill's apply_keys.jsx for that batch.
(function () {
  var tr = app.project.activeSequence.videoTracks[ARGS.trackIndex];
  if (tr.clips.numItems != ARGS.n) return JSON.stringify({ ok: false, error: "trilha tem " + tr.clips.numItems + " clipes, esperado " + ARGS.n });
  var bad = [];
  for (var o = 0; o < ARGS.only.length; o++) {
    var i = ARGS.only[o], c = tr.clips[i], e = ARGS.exp[i];
    var d = c.end.seconds - c.start.seconds;
    if (Math.abs(c.inPoint.seconds - e[0]) > 0.01 || Math.abs(d - e[1]) > 0.01) bad.push([i, c.inPoint.seconds, d]);
  }
  if (bad.length) return JSON.stringify({ ok: false, changed: bad });
  return $.evalFile("C:/Users/Gustavo/.claude/skills/reenquadrar-entrevistado/scripts/apply_keys.jsx");
})();

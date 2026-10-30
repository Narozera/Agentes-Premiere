// Applies keys.json (per clip: [[tRel, scale, posXnorm, posYnorm], ...]) to the Motion effect of a video track.
// Usage: var ARGS={trackIndex:1, keysPath:"C:/.../keys.json", only:null /* or [2,5] */}; $.evalFile("<skill>/scripts/apply_keys.jsx");
(function () {
  var f = new File(ARGS.keysPath); f.open("r"); var K = eval(f.read()); f.close();
  var tr = app.project.activeSequence.videoTracks[ARGS.trackIndex];
  // guard: keys.json must be [clip][key][t,scale,x,y]. A file missing its outer brackets evals (comma operator)
  // to the LAST clip only, which once corrupted clips half-way through a batch.
  if (!(K instanceof Array) || K.length != tr.clips.numItems || !(K[0] instanceof Array) || !(K[0][0] instanceof Array))
    return JSON.stringify({ ok: false, error: "keys.json malformado: esperado [clipe][key][t,escala,x,y] com " + tr.clips.numItems + " clipes; lido " + (K && K.length) + ". Nada foi aplicado." });
  var rep = [];
  for (var i = 0; i < tr.clips.numItems && i < K.length; i++) {
    if (ARGS.only) { var hit = false; for (var o = 0; o < ARGS.only.length; o++) if (ARGS.only[o] == i) hit = true; if (!hit) continue; }
    var c = tr.clips[i], keys = K[i], mo = null;
    for (var j = 0; j < c.components.numItems; j++) if (c.components[j].matchName == "AE.ADBE Motion") mo = c.components[j];
    // Motion: properties[0] = Position, properties[1] = Scale (display names are localized)
    var pos = mo.properties[0], sc = mo.properties[1];
    pos.setTimeVarying(false); sc.setTimeVarying(false);
    var scaleAnim = Math.abs(keys[0][1] - keys[keys.length - 1][1]) > 0.01;
    pos.setTimeVarying(true);
    if (scaleAnim) sc.setTimeVarying(true); else sc.setValue(keys[0][1], true);
    for (var k = 0; k < keys.length; k++) {
      // keyframe times are in media time: clip inPoint + offset
      var t = new Time(); t.seconds = c.inPoint.seconds + keys[k][0];
      pos.addKey(t); pos.setValueAtKey(t, [keys[k][2], keys[k][3]], true);
      if (scaleAnim) { sc.addKey(t); sc.setValueAtKey(t, keys[k][1], true); }
    }
    rep.push([i, pos.getKeys().length, scaleAnim ? sc.getKeys().length : 0]);
  }
  return JSON.stringify(rep);
})();

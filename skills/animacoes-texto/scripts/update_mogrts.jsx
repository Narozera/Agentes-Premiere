// Swaps the text-animation MOGRTs already on a track for the current version of their template (after the templates
// were rebuilt, e.g. a new field), keeping what the user set: start/end, every field (Valor, Rótulo, Cor, Tamanho,
// Brilho...) and the clip's Motion position/scale. Clips are matched to templates by name ("Dinheiro - Pop" ->
// <mogrtDir>/Dinheiro - Pop.mogrt).
// Usage: var ARGS={trackIndex:4, mogrtDir:"C:/Users/Gustavo/.claude/skills/animacoes-texto/mogrt"};
//        $.evalFile("<skill>/scripts/update_mogrts.jsx");
(function () {
  var seq = app.project.activeSequence, track = seq.videoTracks[ARGS.trackIndex], TICKS = 254016000000;
  function params(comp) {
    var o = {};
    for (var i = 0; i < comp.properties.numItems; i++) {
      var p = comp.properties[i], n = p.displayName;
      try { o[n] = (n == "Cor") ? { color: p.getColorValue() } : { v: p.getValue() }; } catch (e) {}
    }
    return o;
  }
  function motion(clip) {
    for (var i = 0; i < clip.components.numItems; i++) {
      var c = clip.components[i];
      if (c.displayName == "Movimento" || c.displayName == "Motion") return c;
    }
    return null;
  }
  // read everything first (removing clips shifts the collection)
  var olds = [];
  for (var k = 0; k < track.clips.numItems; k++) {
    var c = track.clips[k], comp = c.getMGTComponent();
    if (!comp) continue;
    var m = motion(c), mv = null;
    if (m) {
      var pos = m.properties[0], sc = m.properties[1];
      mv = { pos: pos.isTimeVarying() ? null : pos.getValue(), scale: sc.isTimeVarying() ? null : sc.getValue(), keys: pos.isTimeVarying() || sc.isTimeVarying() };
    }
    olds.push({ clip: c, name: c.name, start: c.start.seconds, end: c.end.seconds, p: params(comp), mv: mv });
  }
  var out = [];
  for (var k = 0; k < olds.length; k++) {
    var o = olds[k], f = new File(ARGS.mogrtDir + "/" + o.name + ".mogrt");
    if (!f.exists) { out.push({ name: o.name, start: o.start, ok: false, error: "template não encontrado" }); continue; }
    o.clip.remove(false, false);
    var nc = seq.importMGT(f.fsName, String(Math.round(o.start * 60) / 60 * TICKS), ARGS.trackIndex, 0);
    if (!nc) { out.push({ name: o.name, start: o.start, ok: false, error: "importMGT falhou (clipe antigo já removido)" }); continue; }
    var e = new Time(); e.seconds = o.end; nc.end = e;
    var op = new Time(); op.seconds = nc.inPoint.seconds + (o.end - o.start); nc.outPoint = op;
    var comp = nc.getMGTComponent(), fields = [];
    for (var i = 0; i < comp.properties.numItems; i++) {
      var p = comp.properties[i], was = o.p[p.displayName];
      fields.push(p.displayName);
      if (!was) continue;
      if (was.color) p.setColorValue(was.color[0], was.color[1], was.color[2], was.color[3], true);
      else p.setValue(was.v, true);
    }
    var m = motion(nc), warn = "";
    if (m && o.mv) {
      if (o.mv.pos) m.properties[0].setValue(o.mv.pos, true);
      if (o.mv.scale != null) m.properties[1].setValue(o.mv.scale, true);
      if (o.mv.keys) warn = "Movimento tinha keyframes: refazer à mão";
    }
    out.push({ name: o.name, start: nc.start.seconds, end: nc.end.seconds, ok: true, fields: fields.join(","), warn: warn });
  }
  return JSON.stringify(out);
})();

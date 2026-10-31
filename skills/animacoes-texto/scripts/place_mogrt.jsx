// Replaces rendered overlays (.mov) on a video track with the "Dinheiro" Motion Graphics Template, keeping each clip's
// start/end and the Position/Scale the user set by hand (the .mov block was centered at y=movY; the template's is
// centered on the frame), and fills the template controls. Items not found are placed at `start`/`dur` instead.
// Usage: var ARGS={mogrt:"C:/.../Dinheiro.mogrt", trackIndex:2, movY:1050, dry:false, items:[
//   {replace:"dinheiro_04.mov", valor:"R$ 50", rotulo:"A R$ 70", anim:"Pop", atraso:0.75, tamanho:120}, ...]};
//   return $.evalFile("<skill>/scripts/place_mogrt.jsx");
(function () {
  var seq = app.project.activeSequence, track = seq.videoTracks[ARGS.trackIndex];
  var H = seq.frameSizeVertical, ANIMS = ["Bounce", "Pop", "Stamp", "Slide"], rep = [];
  function comp(c, mn) { for (var j = 0; j < c.components.numItems; j++) if (c.components[j].matchName == mn) return c.components[j]; return null; }
  function tm(s) { var t = new Time(); t.seconds = s; return t; }
  function setText(mgt, name, txt) {
    var p = mgt.properties.getParamForDisplayName(name); if (!p) return false;
    var v = JSON.parse(p.getValue()); v.textEditValue = txt; v.fontTextRunLength = [txt.length]; p.setValue(JSON.stringify(v), true); return true;
  }
  function setNum(mgt, name, val) { var p = mgt.properties.getParamForDisplayName(name); if (p && val != null) p.setValue(val, true); }
  for (var i = 0; i < ARGS.items.length; i++) {
    var it = ARGS.items[i], old = null;
    for (var k = 0; k < track.clips.numItems; k++) if (it.replace && track.clips[k].name == it.replace) old = track.clips[k];
    var start = old ? old.start.seconds : it.start, end = old ? old.end.seconds : it.start + it.dur;
    var pos = [0.5, 0.5], sc = 100;
    if (old) {
      var mo = comp(old, "AE.ADBE Motion"); pos = mo.properties[0].getValue(); sc = mo.properties[1].getValue();
      // keep the text where the user saw it: .mov block center = pos + (movY - H/2) * scale
      pos = [pos[0], pos[1] + (ARGS.movY - H / 2) / H * sc / 100];
    }
    if (ARGS.dry) { rep.push([it.replace, start, end, Math.round(pos[1] * H), sc]); continue; }
    if (old) old.remove(false, false);
    var c = seq.importMGT(ARGS.mogrt, tm(start).ticks, ARGS.trackIndex, ARGS.audioTrackIndex || 0);
    if (!c) { rep.push([it.replace, "falhou"]); continue; }
    c.end = tm(end);
    var m2 = comp(c, "AE.ADBE Motion"); m2.properties[0].setValue(pos, true); m2.properties[1].setValue(sc, true);
    var g = c.getMGTComponent();
    setText(g, "Valor", it.valor); setText(g, "R\u00f3tulo", it.rotulo || "");
    var a = 0; for (var q = 0; q < ANIMS.length; q++) if (ANIMS[q] == it.anim) a = q;
    setNum(g, "Anima\u00e7\u00e3o", a); setNum(g, "Atraso do r\u00f3tulo", it.atraso); setNum(g, "Tamanho", it.tamanho);
    c.name = it.replace ? it.replace.replace(/\.mov$/, "") : c.name;
    rep.push([c.name, c.start.seconds, c.end.seconds, Math.round(pos[1] * H), sc]);
  }
  return JSON.stringify(rep);
})();

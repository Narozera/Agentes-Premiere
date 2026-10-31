// Places editable text animations (.mogrt from ../mogrt) on a video track and fills their fields.
// Usage: var ARGS={trackIndex:2, items:[{mogrt:"C:/.../Dinheiro - Pop.mogrt", start:21.75, dur:0.82,
//          valor:"R$ 200", rotulo:"", cor:[0,1,0], tamanho:100, brilho:50}, ...]};
//        $.evalFile("<skill>/scripts/place_mogrt.jsx");
// Field names are the template's Essential Properties: Valor, Rotulo (shown as "Rótulo"), Cor, Tamanho, Brilho.
(function () {
  var seq = app.project.activeSequence, TICKS = 254016000000;
  while (seq.videoTracks.numTracks <= ARGS.trackIndex) { app.enableQE(); qe.project.getActiveSequence().addTracks(1, seq.videoTracks.numTracks, 0); }
  function findParam(comp, names) {
    for (var i = 0; i < comp.properties.numItems; i++) {
      var p = comp.properties[i], n = p.displayName.toLowerCase();
      for (var k = 0; k < names.length; k++) if (n == names[k]) return p;
    }
    return null;
  }
  // AE text fields take a JSON document ({"textEditValue": ...}); keep the rest of it (font, size) as it is
  function setText(p, txt) {
    var cur = p.getValue();
    if (typeof cur == "string" && cur.charAt(0) == "{") {
      var o = eval("(" + cur + ")"); o.textEditValue = txt;
      // one style run: it must cover the whole new text (the template's run has the default text's length)
      if (o.fontTextRunLength && o.fontTextRunLength.length == 1) o.fontTextRunLength = [txt.length];
      var s = [];
      for (var k in o) s.push('"' + k + '":' + (typeof o[k] == "string" ? '"' + o[k].replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"' : (o[k] === null ? "null" : (typeof o[k] == "object" ? o[k].toSource().replace(/^\(|\)$/g, "") : String(o[k])))));
      p.setValue("{" + s.join(",") + "}", true);
    } else p.setValue(txt, true);
    return p.getValue();
  }
  var out = [];
  for (var i = 0; i < ARGS.items.length; i++) {
    var it = ARGS.items[i];
    var ticks = String(Math.round(it.start * 60) / 60 * TICKS);
    var clip = seq.importMGT(new File(it.mogrt).fsName, ticks, ARGS.trackIndex, 0);
    if (!clip) { out.push({ i: i, ok: false, error: "importMGT falhou" }); continue; }
    if (it.dur) {
      var e = new Time(); e.seconds = clip.start.seconds + it.dur; clip.end = e;
      var o = new Time(); o.seconds = clip.inPoint.seconds + it.dur; clip.outPoint = o;
    }
    var comp = clip.getMGTComponent(), r = { i: i, ok: true, start: clip.start.seconds, end: clip.end.seconds };
    if (comp) {
      var pv = findParam(comp, ["valor"]), pr = findParam(comp, ["r\u00f3tulo", "rotulo"]);
      if (pv && it.valor != null) r.valor = setText(pv, it.valor);
      if (pr && it.rotulo != null) r.rotulo = setText(pr, it.rotulo);
      var pc = findParam(comp, ["cor"]); if (pc && it.cor) pc.setColorValue(255, Math.round(it.cor[0] * 255), Math.round(it.cor[1] * 255), Math.round(it.cor[2] * 255), true);
      var pt = findParam(comp, ["tamanho"]); if (pt && it.tamanho != null) pt.setValue(it.tamanho, true);
      var pb = findParam(comp, ["brilho"]); if (pb && it.brilho != null) pb.setValue(it.brilho, true);
    } else r.warn = "sem componente MGT";
    out.push(r);
  }
  return JSON.stringify({ track: "V" + (ARGS.trackIndex + 1), placed: out });
})();

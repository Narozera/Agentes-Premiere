// Imports rendered overlays and places each one on a video track at its start time (overwrite edit).
// Usage: var ARGS={trackIndex:2, bin:"Animações de texto", items:[{file:"C:/.../dinheiro_01.mov", start:13.06, dur:1.35}, ...]};
//        $.evalFile("<skill>/scripts/place.jsx");
(function () {
  var seq = app.project.activeSequence, root = app.project.rootItem, bin = null;
  for (var i = 0; i < root.children.numItems; i++) if (root.children[i].name == ARGS.bin && root.children[i].type == ProjectItemType.BIN) bin = root.children[i];
  if (!bin) bin = root.createBin(ARGS.bin);
  while (seq.videoTracks.numTracks <= ARGS.trackIndex) { app.enableQE(); qe.project.getActiveSequence().addTracks(1, seq.videoTracks.numTracks, 0); }
  var paths = []; for (var k = 0; k < ARGS.items.length; k++) paths.push(new File(ARGS.items[k].file).fsName);
  app.project.importFiles(paths, true, bin, false);
  var placed = [], track = seq.videoTracks[ARGS.trackIndex];
  for (var k = 0; k < ARGS.items.length; k++) {
    var name = new File(ARGS.items[k].file).displayName, item = null;
    for (var j = bin.children.numItems - 1; j >= 0; j--) if (bin.children[j].name == name) { item = bin.children[j]; break; }
    if (!item) { placed.push({ file: name, ok: false }); continue; }
    var t = new Time(); t.seconds = ARGS.items[k].start;
    // media is longer than the speech (still text after the intro): place only `dur` seconds so the user
    // can drag the clip end out later; the project item's in/out is restored afterwards
    if (ARGS.items[k].dur) { item.setInPoint(0, 4); item.setOutPoint(ARGS.items[k].dur, 4); }
    track.overwriteClip(item, t);
    if (ARGS.items[k].dur) { item.clearInPoint(); item.clearOutPoint(); }
    placed.push({ file: name, ok: true, start: ARGS.items[k].start, dur: ARGS.items[k].dur });
  }
  return JSON.stringify({ track: "V" + (ARGS.trackIndex + 1), placed: placed });
})();

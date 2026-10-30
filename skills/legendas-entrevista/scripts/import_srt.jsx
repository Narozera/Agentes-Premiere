// Imports an SRT into the project and creates a caption track from it on the active sequence (starting at 0).
// Usage: var ARGS={srt:"D:/.../Sequência 01 - corrigida.srt"}; $.evalFile("<skill>/scripts/import_srt.jsx");
(function () {
  var f = new File(ARGS.srt);
  app.project.importFiles([f.fsName], true, app.project.rootItem, false);
  var item = null, root = app.project.rootItem;
  for (var i = root.children.numItems - 1; i >= 0; i--) if (root.children[i].name == f.displayName) { item = root.children[i]; break; }
  if (!item) return JSON.stringify({ ok: false, error: "SRT not found in project after import: " + f.displayName });
  var ok = app.project.activeSequence.createCaptionTrack(item, 0, Sequence.CAPTION_FORMAT_SUBTITLE);
  return JSON.stringify({ ok: ok, item: item.name });
})();

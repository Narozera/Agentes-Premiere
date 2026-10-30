// Lists the clips of one video track of the active sequence.
// Usage from execute_extendscript:  var ARGS={trackIndex:1}; $.evalFile("<skill>/scripts/dump_clips.jsx");
(function () {
  var seq = app.project.activeSequence;
  var tr = seq.videoTracks[ARGS.trackIndex];
  var out = { sequence: seq.name, frameW: seq.frameSizeHorizontal, frameH: seq.frameSizeVertical, clips: [] };
  for (var i = 0; i < tr.clips.numItems; i++) {
    var c = tr.clips[i];
    // current Motion scale (first/last keyframe if animated) so position-only runs can keep it
    var scale = null, mo = null;
    for (var j = 0; j < c.components.numItems; j++) if (c.components[j].matchName == "AE.ADBE Motion") mo = c.components[j];
    if (mo) {
      var sp = mo.properties[1];
      if (sp.isTimeVarying()) { var ks = sp.getKeys(); scale = [sp.getValueAtKey(ks[0]), sp.getValueAtKey(ks[ks.length - 1])]; }
      else { var v = sp.getValue(); scale = [v, v]; }
    }
    out.clips.push({ index: i, name: c.name, start: c.start.seconds, end: c.end.seconds,
      "in": c.inPoint.seconds, dur: c.end.seconds - c.start.seconds, scale: scale,
      media: c.projectItem ? c.projectItem.getMediaPath() : "",
      proxy: c.projectItem && c.projectItem.hasProxy() ? c.projectItem.getProxyPath() : "" });
  }
  return JSON.stringify(out);
})();

// Dumps what the caption scripts need from the active sequence:
//  audio:   clips of the dialogue audio track (media, timeline start/end, media in-point) to rebuild the mix
//  cam:     [start, end] ranges of the interviewee camera track (captions there get the "cam" color)
//  overlay: [start, end, name] of clips on the video tracks above the cameras (animations, graphics) — the user
//           leaves those stretches without captions
//  cuts:    times where the visible picture cuts (camera switch or jump cut) — every caption starts/ends on one
// Usage: var ARGS={audioTrack:0, camTrack:1}; $.evalFile("<skill>/scripts/dump_timeline.jsx");
// (ARGS.overlayFrom = first overlay track index; default: the track above max(camTrack, 1))
(function () {
  var seq = app.project.activeSequence, out = { sequence: seq.name, end: seq.end / 254016000000, audio: [], cam: [], overlay: [] };
  var at = seq.audioTracks[ARGS.audioTrack];
  for (var i = 0; i < at.clips.numItems; i++) {
    var c = at.clips[i];
    out.audio.push({ media: c.projectItem.getMediaPath(), start: c.start.seconds, end: c.end.seconds, "in": c.inPoint.seconds });
  }
  var vt = seq.videoTracks[ARGS.camTrack];
  for (var k = 0; k < vt.clips.numItems; k++) out.cam.push([vt.clips[k].start.seconds, vt.clips[k].end.seconds]);
  // cuts: every boundary of the picture you actually see (topmost camera clip), so a cut on V1 hidden under the
  // interviewee camera on V2 is not a cut
  var top = Math.max(ARGS.camTrack, 0), bounds = [], cover = [];
  for (var v = 0; v <= top; v++) {
    var ct = seq.videoTracks[v]; cover[v] = [];
    for (var q = 0; q < ct.clips.numItems; q++) { var a = ct.clips[q].start.seconds, b = ct.clips[q].end.seconds; cover[v].push([a, b]); bounds.push([a, v]); bounds.push([b, v]); }
  }
  var seen = {}; out.cuts = [];
  for (var u = 0; u < bounds.length; u++) {
    var t = bounds[u][0], hidden = false;
    if (t < 0.01 || t > out.end - 0.01) continue;
    for (var w = bounds[u][1] + 1; w <= top && !hidden; w++) for (var r = 0; r < cover[w].length; r++) if (t > cover[w][r][0] + 0.02 && t < cover[w][r][1] - 0.02) { hidden = true; break; }
    var key = Math.round(t * 1000); if (!hidden && !seen[key]) { seen[key] = 1; out.cuts.push(t); }
  }
  out.cuts.sort(function (x, y) { return x - y; });
  var from = ARGS.overlayFrom !== undefined ? ARGS.overlayFrom : Math.max(ARGS.camTrack, 1) + 1;
  for (var t = from; t < seq.videoTracks.numTracks; t++) {
    var ot = seq.videoTracks[t];
    for (var m = 0; m < ot.clips.numItems; m++) out.overlay.push([ot.clips[m].start.seconds, ot.clips[m].end.seconds, ot.clips[m].name]);
  }
  return JSON.stringify(out);
})();

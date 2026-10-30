// Dumps what the caption scripts need from the active sequence:
//  audio: clips of the dialogue audio track (media, timeline start/end, media in-point) to rebuild the mix
//  cam:   [start, end] ranges of the interviewee camera track (captions there get the "cam" color)
// Usage: var ARGS={audioTrack:0, camTrack:1}; $.evalFile("<skill>/scripts/dump_timeline.jsx");
(function () {
  var seq = app.project.activeSequence, out = { sequence: seq.name, end: seq.end / 254016000000, audio: [], cam: [] };
  var at = seq.audioTracks[ARGS.audioTrack];
  for (var i = 0; i < at.clips.numItems; i++) {
    var c = at.clips[i];
    out.audio.push({ media: c.projectItem.getMediaPath(), start: c.start.seconds, end: c.end.seconds, "in": c.inPoint.seconds });
  }
  var vt = seq.videoTracks[ARGS.camTrack];
  for (var k = 0; k < vt.clips.numItems; k++) out.cam.push([vt.clips[k].start.seconds, vt.clips[k].end.seconds]);
  return JSON.stringify(out);
})();

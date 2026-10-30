param([Parameter(Mandatory)][string]$Job, [Parameter(Mandatory)][string]$OutDir)
# Tracks the subject's face through every clip (10 fps, quarter-res gray, NCC template matching),
# starting from the manual mid-frame measurement (faceX, headY) and going both ways.
# Writes <OutDir>\track.json: per clip [[sourceTime, faceX, headTopY, score], ...] in source pixels.
. "$PSScriptRoot\common.ps1"
Add-Type -TypeDefinition @"
using System; using System.IO; using System.Collections.Generic;
public static class FaceTrack {
  public static int W = 540, H = 960; const int P = 24; // template 48x48 px = 192 source px
  static double Ncc(byte[] f, int cx, int cy, double[] tpl, double tm, double ts) {
    double s = 0, m = 0, q = 0; int n = 0;
    for (int y = -P; y < P; y++) for (int x = -P; x < P; x++) { double v = f[(cy + y) * W + cx + x]; m += v; q += v * v; n++; }
    m /= n; double sd = Math.Sqrt(Math.Max(q / n - m * m, 1e-6));
    int k = 0; for (int y = -P; y < P; y++) for (int x = -P; x < P; x++) s += (f[(cy + y) * W + cx + x] - m) * (tpl[k++] - tm);
    return s / (n * sd * ts); }
  static double[] Tpl(byte[] f, int cx, int cy, out double tm, out double ts) {
    double[] t = new double[4 * P * P]; int k = 0; double m = 0, q = 0;
    for (int y = -P; y < P; y++) for (int x = -P; x < P; x++) { double v = f[(cy + y) * W + cx + x]; t[k++] = v; m += v; q += v * v; }
    m /= t.Length; tm = m; ts = Math.Sqrt(Math.Max(q / t.Length - m * m, 1e-6)); return t; }
  static int[] Step(byte[] f, int px, int py, double[] tpl, double tm, double ts, out double best) {
    // search radius 36 px (=144 source px) per 0.1 s step: 14 could not follow fast handheld pans
    best = -2; int bx = px, by = py; const int R = 36;
    for (int dy = -R; dy <= R; dy++) for (int dx = -R; dx <= R; dx++) {
      int x = px + dx, y = py + dy; if (x < P || y < P || x >= W - P || y >= H - P) continue;
      double c = Ncc(f, x, y, tpl, tm, ts); if (c > best) { best = c; bx = x; by = y; } }
    return new int[] { bx, by }; }
  public static string Run(string raw, int refIdx, int rx, int ry) {
    byte[] all = File.ReadAllBytes(raw); int nF = all.Length / (W * H);
    var fr = new List<byte[]>(); for (int i = 0; i < nF; i++) { byte[] b = new byte[W * H]; Buffer.BlockCopy(all, i * W * H, b, 0, W * H); fr.Add(b); }
    if (refIdx >= nF) refIdx = nF - 1;
    rx = Math.Max(P, Math.Min(W - P - 1, rx)); ry = Math.Max(P, Math.Min(H - P - 1, ry));
    int[][] pos = new int[nF][]; double[] sc = new double[nF];
    pos[refIdx] = new int[] { rx, ry }; sc[refIdx] = 1;
    for (int dir = -1; dir <= 1; dir += 2) {
      double tm, ts; double[] tpl = Tpl(fr[refIdx], rx, ry, out tm, out ts);
      int px = rx, py = ry;
      for (int i = refIdx + dir; i >= 0 && i < nF; i += dir) {
        double b; int[] p = Step(fr[i], px, py, tpl, tm, ts, out b); pos[i] = p; sc[i] = b; px = p[0]; py = p[1];
        // slowly adapt the template while the match is confident (head turns, light changes)
        if (b > 0.6) { double m2, s2; double[] t2 = Tpl(fr[i], px, py, out m2, out s2); for (int k = 0; k < tpl.Length; k++) tpl[k] = 0.8 * tpl[k] + 0.2 * t2[k]; tm = 0.8 * tm + 0.2 * m2; ts = 0.8 * ts + 0.2 * s2; }
      } }
    var sb = new System.Text.StringBuilder();
    for (int i = 0; i < nF; i++) sb.AppendFormat(System.Globalization.CultureInfo.InvariantCulture, "{0},{1},{2:F2};", pos[i][0], pos[i][1], sc[i]);
    return sb.ToString(); }
}
"@
$j = Read-Job $Job; $ff = Get-FFmpeg
New-Item -ItemType Directory -Force "$OutDir\frames" | Out-Null
$q = [double]$j.srcW / [FaceTrack]::W   # source px per tracking px
$res = @()
foreach ($c in $j.clips) {
  # start sampling at an offset so the reference sample (refIdx) falls exactly on the measured mid frame (in + dur/2)
  $dur = [double]$c.dur; $ci = [int]$c.index; $off = $dur / 2 - [math]::Floor($dur / 2 * 10) / 10; $in = [double]$c.in + $off
  $raw = "$OutDir\frames\c$ci.gray"
  # per-clip "media" overrides the job's (several takes/files on the same track)
  $media = if ($c.media) { $c.media } else { $j.media }
  & $ff -v error -y -ss (Fmt $in) -t (Fmt ($dur + 0.05)) -i $media -vf "fps=10,scale=$([FaceTrack]::W):$([FaceTrack]::H),format=gray" -f rawvideo $raw
  $refIdx = [int][math]::Floor($dur / 2 * 10)
  $str = [FaceTrack]::Run($raw, $refIdx, [int]([double]$c.faceX / $q), [int](([double]$c.headY + [double]$j.faceOffset) / $q))
  $pts = @(); $k = 0
  foreach ($p in ($str.TrimEnd(';') -split ';')) { $v = $p -split ','; $pts += '[{0},{1},{2},{3}]' -f (Fmt ($in + $k * 0.1)), ($q * [double]$v[0]), ($q * [double]$v[1] - [double]$j.faceOffset), $v[2]; $k++ }
  $res += '[' + ($pts -join ',') + ']'
  $scores = $str.TrimEnd(';') -split ';' | ForEach-Object { [double]::Parse(($_ -split ',')[2], $script:Inv) }
  '{0,2}: {1,2} frames  minScore {2:F2}{3}' -f $ci, $k, ($scores | Measure-Object -Minimum).Minimum, $(if (($scores | Measure-Object -Minimum).Minimum -lt 0.4) { '  <- conferir' } else { '' })
}
[IO.File]::WriteAllText("$OutDir\track.json", '[' + ($res -join ',') + ']')

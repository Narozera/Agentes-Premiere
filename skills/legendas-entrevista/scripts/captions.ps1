param(
  [Parameter(Mandatory)][string]$Srt,        # SRT exported from Premiere (Texto > ... > Exportar para arquivo SRT)
  [Parameter(Mandatory)][string]$Out,        # corrected SRT to import back
  [Parameter(Mandatory)][string]$WorkDir,    # folder with dump.json, words.csv, edit.wav
  [string]$Fixes,                            # optional JSON {"6":"aqui no Brás", ...} (caption number -> new text)
  [string]$Texto,                            # optional UTF-8 file, one caption per line: replaces Premiere's split/text

  [string]$CamColor = '#FFFFFFFF',           # captions while the interviewee camera is on screen
  [string]$OtherColor = '#FCFC00FF',         # captions on the other camera (interviewer)
  [ValidateSet('cam', 'other', 'both', 'none')][string]$Retime = 'cam',
  [double]$Lead = 0.017,                     # captions appear this much early (1 frame at 60 fps; best over 3 videos)
  [double]$Snap = 0.25                       # a caption start this close to a cut moves onto the cut (0 = off)
)
# 1) text fixes  2) color by camera coverage  3) retime starts to Whisper word onsets (refined by audio energy)
. "$PSScriptRoot\..\..\reenquadrar-entrevistado\scripts\common.ps1"
Add-Type -TypeDefinition @"
using System; using System.IO;
public static class CapUtil {
  // 10 ms RMS (dB) of a 16-bit mono WAV with a 44-byte header
  public static double[] Db(string p) {
    byte[] b = File.ReadAllBytes(p); int n = (b.Length - 44) / 2, hop = 160, f = n / hop; double[] o = new double[f];
    for (int i = 0; i < f; i++) { double e = 0; for (int k = 0; k < hop; k++) { double v = BitConverter.ToInt16(b, 44 + 2 * (i * hop + k)) / 32768.0; e += v * v; } o[i] = 10 * Math.Log10(e / hop + 1e-12); }
    return o; }
  // edit-distance alignment: for each a[i], index of the equal b[j] it aligns to, or -1
  public static int[] Align(string[] a, string[] b) {
    int n = a.Length, m = b.Length; int[,] d = new int[n + 1, m + 1];
    for (int i = 0; i <= n; i++) d[i, 0] = i; for (int j = 0; j <= m; j++) d[0, j] = j;
    for (int i = 1; i <= n; i++) for (int j = 1; j <= m; j++) { int c = a[i - 1] == b[j - 1] ? 0 : 1; d[i, j] = Math.Min(Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1), d[i - 1, j - 1] + c); }
    int[] r = new int[n]; for (int i = 0; i < n; i++) r[i] = -1; int x = n, y = m;
    while (x > 0 && y > 0) { int c = a[x - 1] == b[y - 1] ? 0 : 1;
      if (d[x, y] == d[x - 1, y - 1] + c) { if (c == 0) r[x - 1] = y - 1; x--; y--; } else if (d[x, y] == d[x - 1, y] + 1) x--; else y--; }
    return r; }
}
"@
$enc = New-Object Text.UTF8Encoding $false
function Norm([string]$s) { $s = $s.ToLowerInvariant().Normalize([Text.NormalizationForm]::FormD); (($s.ToCharArray() | Where-Object { [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne 'NonSpacingMark' }) -join '') -replace '[^a-z0-9 ]', ' ' }
function ToSec([string]$tc) { $p = $tc.Trim() -split '[:,]'; [int]$p[0] * 3600 + [int]$p[1] * 60 + [int]$p[2] + [int]$p[3] / 1000.0 }
function Tc([double]$x) { $ms = [int][math]::Round($x * 1000); '{0:00}:{1:00}:{2:00},{3:000}' -f [int][math]::Floor($ms / 3600000), ([int][math]::Floor($ms / 60000) % 60), ([int][math]::Floor($ms / 1000) % 60), ($ms % 1000) }

$dump = Read-Job "$WorkDir\dump.json"
$fixMap = @{}; if ($Fixes) { (Read-Job $Fixes).PSObject.Properties | ForEach-Object { $fixMap[[int]$_.Name] = [string]$_.Value } }

# --- parse SRT, strip Premiere's <font> tags, apply text fixes
$caps = @()
foreach ($b in (([IO.File]::ReadAllText($Srt, $enc) -replace "`r`n", "`n").Trim() -split "`n\s*`n")) {
  $L = $b -split "`n"; $num = [int]$L[0].Trim([char]0xFEFF, ' '); $tt = $L[1] -split ' --> '
  $text = (($L[2..($L.Count - 1)] -join "`n") -replace '</?font[^>]*>', '').Trim()
  if ($fixMap.ContainsKey($num)) { $text = $fixMap[$num] }
  $caps += [pscustomobject]@{ n = $num; s = (ToSec $tt[0]); e = (ToSec $tt[1]); text = $text; spk = ''; old = $null }
}

# --- re-segmented text (one caption per line): rough times come from the Premiere words each line covers
if ($Texto) {
  $pt = @()   # Premiere words, each with a time spread evenly over its caption
  foreach ($c in $caps) {
    $toks = @((Norm $c.text) -split '\s+' | Where-Object { $_ }); $nk = $toks.Count
    for ($j = 0; $j -lt $nk; $j++) { $pt += [pscustomobject]@{ tok = $toks[$j]; s = $c.s + ($c.e - $c.s) * $j / $nk; e = $c.s + ($c.e - $c.s) * ($j + 1) / $nk } }
  }
  $lines = @([IO.File]::ReadAllLines($Texto, $enc) | ForEach-Object { $_.Trim([char]0xFEFF, ' ', "`t") } | Where-Object { $_ })
  $nt = @(); for ($i = 0; $i -lt $lines.Count; $i++) { foreach ($tok in ((Norm $lines[$i]) -split '\s+' | Where-Object { $_ })) { $nt += [pscustomobject]@{ tok = $tok; cap = $i } } }
  $pa = [CapUtil]::Align([string[]]@($nt | ForEach-Object tok), [string[]]@($pt | ForEach-Object tok))
  $s0 = @{}; $e0 = @{}
  # the user's captions come in 0-3 frames before Premiere's; $Lead = 1 frame scored best over 3 videos
  for ($k = 0; $k -lt $nt.Count; $k++) { if ($pa[$k] -ge 0) { $ci = $nt[$k].cap; if (-not $s0.ContainsKey($ci)) { $s0[$ci] = [math]::Max(0.0, $pt[$pa[$k]].s - $Lead) }; $e0[$ci] = $pt[$pa[$k]].e } }
  $caps = @(); $cursor = 0.0
  for ($i = 0; $i -lt $lines.Count; $i++) {
    # a line with no word in common with Premiere (e.g. "Sinal 1" x "Se naum") starts where the previous one ends
    $cs = if ($s0.ContainsKey($i)) { [math]::Max($s0[$i], $cursor) } elseif ($i -gt 0) { [math]::Max($caps[$i - 1].e, $cursor) } else { $cursor }
    $ce = if ($e0.ContainsKey($i) -and $e0[$i] -gt $cs) { $e0[$i] } else { $cs + 0.3 }
    $caps += [pscustomobject]@{ n = $i + 1; s = $cs; e = $ce; text = $lines[$i]; spk = ''; old = $null }
    $cursor = $cs + 0.01
  }
  # captions run into each other; only a pause of 1 s or more leaves a gap
  for ($i = 0; $i -lt $caps.Count - 1; $i++) { if ($caps[$i + 1].s - $caps[$i].e -lt 1.0) { $caps[$i].e = $caps[$i + 1].s } }
}

# --- align caption words to Whisper words (gives the real time each caption is spoken)
$wt = @(); foreach ($l in (Get-Content "$WorkDir\words.csv" -Encoding UTF8 | Select-Object -Skip 1)) {
  $p = $l -split ',', 3; foreach ($tok in ((Norm $p[2].Trim('"')) -split '\s+' | Where-Object { $_ })) { $wt += [pscustomobject]@{ tok = $tok; s = [double]$p[0] / 1000; e = [double]$p[1] / 1000 } } }
$ct = @(); for ($i = 0; $i -lt $caps.Count; $i++) { foreach ($tok in ((Norm $caps[$i].text) -split '\s+' | Where-Object { $_ })) { $ct += [pscustomobject]@{ tok = $tok; cap = $i } } }
$al = [CapUtil]::Align([string[]]@($ct | ForEach-Object tok), [string[]]@($wt | ForEach-Object tok))
$first = @{}; $last = @{}
for ($k = 0; $k -lt $ct.Count; $k++) { if ($al[$k] -ge 0) { $ci = $ct[$k].cap; $w = $wt[$al[$k]]; if (-not $first.ContainsKey($ci)) { $first[$ci] = $w.s }; $last[$ci] = $w.e } }

# --- speaker by camera: >= 50% of the spoken words (or of the caption, if unaligned) under the interviewee camera
for ($i = 0; $i -lt $caps.Count; $i++) {
  $c = $caps[$i]
  $a0 = $c.s; $a1 = $c.e
  if ($first.ContainsKey($i) -and $last[$i] - $first[$i] -gt 0.05) { $a0 = $first[$i]; $a1 = $last[$i] }
  $cover = 0.0; foreach ($r in $dump.cam) { $overlap = [math]::Min($a1, [double]$r[1]) - [math]::Max($a0, [double]$r[0]); if ($overlap -gt 0) { $cover += $overlap } }
  $c.spk = if ($cover -ge ($a1 - $a0) / 2) { 'cam' } else { 'other' }
}
# a short caption whose two neighbours belong to the other speaker usually sits on a cut boundary: follow them
for ($i = 1; $i -lt $caps.Count - 1; $i++) {
  if (($caps[$i].e - $caps[$i].s) -lt 0.6 -and $caps[$i - 1].spk -eq $caps[$i + 1].spk -and $caps[$i].spk -ne $caps[$i - 1].spk) { $caps[$i].spk = $caps[$i - 1].spk }
}

# --- retime starts to word onsets
$flagged = @()
if ($Retime -ne 'none') {
  $db = [CapUtil]::Db("$WorkDir\edit.wav"); $thr = (($db | Sort-Object)[[int]($db.Count * 0.35)]) + 6
  function Onset([double]$t) { $f = [int]($t * 100); for ($k = 0; $k -lt 40 -and ($f + $k) -lt $db.Count; $k++) { if ($db[$f + $k] -gt $thr) { return ($f + $k) / 100.0 } }; $t }
  $want = { param($c) $Retime -eq 'both' -or $c.spk -eq $Retime }
  for ($i = 0; $i -lt $caps.Count; $i++) {
    $c = $caps[$i]; if (-not (& $want $c) -or -not $first.ContainsKey($i)) { continue }
    $ns = [math]::Max(0.0, [double]((Onset $first[$i]) - $Lead))
    # Whisper word times are occasionally off by ~1 s: a big jump is more likely a Whisper error than a Premiere one
    # (checked BEFORE clamping to the previous caption, or a far-off onset gets clamped into a "plausible" one)
    if ([math]::Abs($ns - $c.s) -gt 0.6) { $flagged += $c.n; continue }
    if ($i -gt 0) { $ns = [math]::Max($ns, $caps[$i - 1].s + 0.1) }
    $c.old = $c.s; $c.s = $ns
  }
  # ends: run into the next caption when close, else hold 0.2 s after the last word
  for ($i = 0; $i -lt $caps.Count; $i++) {
    $c = $caps[$i]; $nextS = if ($i + 1 -lt $caps.Count) { $caps[$i + 1].s } else { $c.e }
    # flagged (REVISAR) captions, or ones whose aligned words end before the caption starts, keep Premiere's end
    $trust = $last.ContainsKey($i) -and ($flagged -notcontains $c.n) -and ($last[$i] -gt $c.s + 0.05)
    if (& $want $c) { $wordEnd = if ($trust) { $last[$i] } else { $c.e }; $c.e = if ($nextS - $wordEnd -lt 0.6) { $nextS } else { $wordEnd + 0.2 } }
    elseif ($c.e -gt $nextS) { $c.e = $nextS }
    if ($i -gt 0 -and $caps[$i - 1].e -gt $c.s) { $caps[$i - 1].e = $c.s }
  }
  # never emit an end before (or equal to) the start
  for ($i = 0; $i -lt $caps.Count; $i++) { $c = $caps[$i]; if ($c.e -le $c.s) { $nextS = if ($i + 1 -lt $caps.Count) { $caps[$i + 1].s } else { $c.s + 0.5 }; $c.e = [math]::Max($c.s + 0.05, [math]::Min($c.s + 0.5, $nextS)) } }
}

# --- the user starts a new caption on every cut (dialogue clips and camera switches): snap the nearest start onto it
$lonely = @()
if ($Snap -gt 0) {
  $cuts = @(@($dump.audio | ForEach-Object { [double]$_.start }) + @($dump.cam | ForEach-Object { [double]$_[0]; [double]$_[1] }) |
    Where-Object { $_ -gt 0.01 -and $_ -lt [double]$dump.end - 0.01 } | ForEach-Object { [math]::Round($_, 3) } | Sort-Object -Unique)
  foreach ($t in $cuts) {
    $best = -1; $bd = $Snap
    for ($i = 0; $i -lt $caps.Count; $i++) { $dd = [math]::Abs($caps[$i].s - $t); if ($dd -le $bd) { $bd = $dd; $best = $i } }
    if ($best -lt 0) { if ($t -gt $caps[0].s -and $t -lt $caps[$caps.Count - 1].e) { $lonely += $t }; continue }
    $c = $caps[$best]
    if ($best -gt 0 -and [math]::Abs($caps[$best - 1].e - $c.s) -lt 0.02) { $caps[$best - 1].e = $t }
    if ($null -eq $c.old) { $c.old = $c.s }; $c.s = $t
    if ($c.e -le $c.s) { $c.e = $c.s + 0.1 }
  }
}

# --- no captions under animations/graphics (dump.overlay): the user leaves those stretches empty
$dropped = @()
foreach ($o in @($dump.overlay)) {
  if ($null -eq $o) { continue }
  $o0 = [double]$o[0]; $o1 = [double]$o[1]; $keep = @()
  foreach ($c in $caps) {
    # a caption that starts under the animation goes; one that starts before it just ends where the animation starts
    # (ends were stretched to the next caption, so overlap alone would also drop the words said right before it)
    if ($c.s -ge $o0 - 0.1 -and $c.s -lt $o1 - 0.1) { $dropped += "$($c.text) ($(Tc $c.s))"; continue }
    if ($c.s -lt $o0 -and $c.e -gt $o0) { $c.e = $o0 }
    $keep += $c
  }
  $caps = $keep
}
# ends that ran into a removed caption stop where the animation starts
foreach ($o in @($dump.overlay)) { if ($null -ne $o) { foreach ($c in $caps) { if ($c.s -lt [double]$o[0] -and $c.e -gt [double]$o[0]) { $c.e = [double]$o[0] } } } }
for ($i = 0; $i -lt $caps.Count; $i++) { $caps[$i].n = $i + 1 }

$sb = New-Object Text.StringBuilder
foreach ($c in $caps) { $col = if ($c.spk -eq 'cam') { $CamColor } else { $OtherColor }; [void]$sb.Append("$($c.n)`r`n$(Tc $c.s) --> $(Tc $c.e)`r`n<font color=$col>$($c.text)</font>`r`n`r`n") }
[IO.File]::WriteAllText($Out, $sb.ToString(), $enc)
$caps | ForEach-Object { '{0,3} {1,-5} {2,7} {3,7}  {4}' -f $_.n, $_.spk, $(if ($null -ne $_.old) { Fmt $_.old 'F2' } else { '' }), (Fmt $_.s 'F2'), $_.text }
if ($dropped.Count) { "TIRADAS (embaixo de animacao/grafico): " + ($dropped -join ' | ') }
if ($lonely.Count) { "CORTES SEM LEGENDA NOVA (divida o texto ali se fizer sentido): " + (($lonely | ForEach-Object { Tc $_ }) -join ', ') }
if ($flagged.Count) { "REVISAR (tempo do Whisper muito diferente do Premiere, mantido o original): " + ($flagged -join ', ') }

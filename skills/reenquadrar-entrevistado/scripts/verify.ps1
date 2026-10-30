param([Parameter(Mandatory)][string]$Job, [Parameter(Mandatory)][string]$OutDir, [int[]]$Clips, [Parameter(Mandatory)][string]$Out, [double]$Step = 0)
# Renders what Premiere will show (keys.json applied to the source) at the start/middle/end of each clip,
# with the guides drawn in cyan, so the framing can be checked without exporting from Premiere.
. "$PSScriptRoot\common.ps1"
$j = Read-Job $Job; $ff = Get-FFmpeg
$raw = [IO.File]::ReadAllText("$OutDir\keys.json")
$clipStr = $raw.Trim().TrimStart('[').TrimEnd(']') -split '\]\],\[\['
$allKeys = foreach ($c in $clipStr) { ,@(($c.Trim('[', ']') -split '\],\[') | ForEach-Object { ,@($_.Split(',') | ForEach-Object { [double]::Parse($_, $script:Inv) }) }) }
if (-not $Clips) { $Clips = 0..($allKeys.Count - 1) }
function Interp($keys, [double]$t) {
  for ($i = 0; $i -lt $keys.Count - 1; $i++) { if ($t -le $keys[$i + 1][0]) { $a = $keys[$i]; $b = $keys[$i + 1]; $u = ($t - $a[0]) / ($b[0] - $a[0]); return ,@(($a[1] + ($b[1] - $a[1]) * $u), ($a[2] + ($b[2] - $a[2]) * $u), ($a[3] + ($b[3] - $a[3]) * $u)) } }
  $l = $keys[$keys.Count - 1]; ,@($l[1], $l[2], $l[3]) }
$seqW = [int]$j.seqW; $seqH = [int]$j.seqH; $tw = [int]($seqW / 5); $th = [int]($seqH / 5)
$gx = [int]$j.guideX - 2; $gy = [int]$j.guideY - 2
$font = 'fontfile=C\\:/Windows/Fonts/arialbd.ttf'
$tmp = Join-Path $OutDir 'verify_tmp'; New-Item -ItemType Directory -Force $tmp | Out-Null
$files = @(); $n = 0
foreach ($ci in $Clips) {
  $keys = $allKeys[$ci]; $T = $keys[$keys.Count - 1][0]; $cc = $j.clips[$ci]; $cin = [double]$cc.in
  # per-clip media/guides/speed (keys.json times are timeline offsets; media time = in + t * speed)
  $media = if ($cc.media) { $cc.media } else { $j.media }; $spd = if ($cc.speed) { [double]$cc.speed } else { 1.0 }
  $gx = $(if ($null -ne $cc.guideX) { [int]$cc.guideX } else { [int]$j.guideX }) - 2; $gy = $(if ($null -ne $cc.guideY) { [int]$cc.guideY } else { [int]$j.guideY }) - 2
  # -Step s: one frame every s seconds (long clips) instead of start/middle/end
  $times = if ($Step -gt 0) { $tl = @(); for ($q = 0.05; $q -lt $T; $q += $Step) { $tl += $q }; $tl + ($T - 0.05) } else { @(0.05, ($T / 2), ($T - 0.05)) }
  foreach ($tt in $times) {
    $v = Interp $keys $tt; $s = $v[0] / 100.0
    $scaledW = [int][math]::Round($j.srcW * $s); $scaledH = [int][math]::Round($j.srcH * $s)
    $cx = [int][math]::Round($scaledW / 2 - $v[1] * $seqW); $cy = [int][math]::Round($scaledH / 2 - $v[2] * $seqH)
    $lab = "clip $ci  t $(Fmt $tt 'F1')s  esc $([int]$v[0])"
    $f = Join-Path $tmp "v$n.png"
    & $ff -v error -y -ss (Fmt ($cin + $tt * $spd)) -i $media -frames:v 1 -vf "scale=${scaledW}:${scaledH},crop=${seqW}:${seqH}:${cx}:${cy},drawbox=x=${gx}:y=0:w=4:h=${seqH}:c=cyan:t=fill,drawbox=x=0:y=${gy}:w=${seqW}:h=4:c=cyan:t=fill,scale=${tw}:${th},drawtext=$font`:text='$lab':fontsize=15:fontcolor=yellow:borderw=2:x=4:y=4" $f
    $files += $f; $n++
  }
}
$in = $files | ForEach-Object { '-i'; $_ }
$pos = for ($k = 0; $k -lt $n; $k++) { '{0}_{1}' -f (($k % 6) * $tw), ([math]::Floor($k / 6) * $th) }
& $ff -v error -y @in -filter_complex "$((0..($n - 1) | ForEach-Object { "[$_]" }) -join '')xstack=inputs=${n}:layout=$($pos -join '|'):fill=black" $Out
"sheet: $Out ($n frames)"

param([string]$Job, [string]$OutDir, [int[]]$Clips, [string]$Out, [double]$Step = 0, [int]$RX = 432, [int]$RY = 216, [int]$RW = 1296, [int]$RH = 1296)
# Like verify.ps1 but shows only the head region of the OUTPUT frame (x RX..RX+RW, y RY..RY+RH) at 1:3,
# guides in cyan, faint grid every 108 output px (so offsets can be read: 1 cell = 108 px).
. "C:\Users\Gustavo\.claude\skills\reenquadrar-entrevistado\scripts\common.ps1"
$j = Read-Job $Job; $ff = Get-FFmpeg
$raw = [IO.File]::ReadAllText("$OutDir\keys.json")
$clipStr = $raw.Trim().TrimStart('[').TrimEnd(']') -split '\]\],\[\['
$allKeys = foreach ($c in $clipStr) { ,@(($c.Trim('[', ']') -split '\],\[') | ForEach-Object { ,@($_.Split(',') | ForEach-Object { [double]::Parse($_, $script:Inv) }) }) }
function Interp($keys, [double]$t) {
  for ($i = 0; $i -lt $keys.Count - 1; $i++) { if ($t -le $keys[$i + 1][0]) { $a = $keys[$i]; $b = $keys[$i + 1]; $u = ($t - $a[0]) / ($b[0] - $a[0]); return ,@(($a[1] + ($b[1] - $a[1]) * $u), ($a[2] + ($b[2] - $a[2]) * $u), ($a[3] + ($b[3] - $a[3]) * $u)) } }
  $l = $keys[$keys.Count - 1]; ,@($l[1], $l[2], $l[3]) }
$seqW = [int]$j.seqW; $seqH = [int]$j.seqH; $tw = [int]($RW / 3); $th = [int]($RH / 3)
$font = 'fontfile=C\\:/Windows/Fonts/arialbd.ttf'
$tmp = Join-Path $OutDir 'vh_tmp'; New-Item -ItemType Directory -Force $tmp | Out-Null
$files = @(); $n = 0
$gox = ((108 - ($RX % 108)) % 108) / 3; $goy = ((108 - ($RY % 108)) % 108) / 3
foreach ($ci in $Clips) {
  $keys = $allKeys[$ci]; $T = $keys[$keys.Count - 1][0]; $cc = $j.clips[$ci]; $cin = [double]$cc.in
  $gx = [int](([int]$cc.guideX - $RX) / 3) - 1; $gy = [int](([int]$cc.guideY - $RY) / 3) - 1
  $times = if ($Step -gt 0) { $tl = @(); for ($q = 0.05; $q -lt $T; $q += $Step) { $tl += $q }; $tl + ($T - 0.05) } else { @(0.05, ($T / 2), ($T - 0.05)) }
  foreach ($tt in $times) {
    $v = Interp $keys $tt; $s = $v[0] / 100.0
    $sw = [int][math]::Round($j.srcW * $s); $sh = [int][math]::Round($j.srcH * $s)
    $cx = [int][math]::Round($sw / 2 - $v[1] * $seqW); $cy = [int][math]::Round($sh / 2 - $v[2] * $seqH)
    $lab = "c$ci t$(Fmt $tt 'F1') e$([int]$v[0])"
    $f = Join-Path $tmp "h$n.png"
    & $ff -v error -y -ss (Fmt ($cin + $tt)) -i (Get-Src $cc $j) -frames:v 1 -vf "scale=${sw}:${sh},crop=${seqW}:${seqH}:${cx}:${cy},crop=${RW}:${RH}:${RX}:${RY},scale=${tw}:${th},drawgrid=x=${gox}:y=${goy}:w=36:h=36:t=1:c=white@0.25,drawbox=x=${gx}:y=0:w=2:h=${th}:c=cyan:t=fill,drawbox=x=0:y=${gy}:w=${tw}:h=2:c=cyan:t=fill,drawtext=$font`:text='$lab':fontsize=18:fontcolor=yellow:borderw=2:x=4:y=4" $f
    $files += $f; $n++
  }
}
$in = $files | ForEach-Object { '-i'; $_ }
$pos = for ($k = 0; $k -lt $n; $k++) { '{0}_{1}' -f (($k % 6) * $tw), ([math]::Floor($k / 6) * $th) }
& $ff -v error -y @in -filter_complex "$((0..($n - 1) | ForEach-Object { "[$_]" }) -join '')xstack=inputs=${n}:layout=$($pos -join '|'):fill=black" $Out
"sheet: $Out ($n frames)"

param([string]$Job, [string]$Items, [string]$Out, [int]$Half = 270)
# Items: "clip:t:x:y;..." (t = source time, or -1 for middle). Crop (2*Half src px) around (x,y) for 4K; for 1080 sources
# the window is halved so every tile shows the same body area; tile 540x540, grid every 54 tile px, yellow cross at (x,y).
. "$PSScriptRoot\common.ps1"
$j = Read-Job $Job; $ff = Get-FFmpeg
$tmp = Join-Path ([IO.Path]::GetDirectoryName($Out)) 'xcrop_tmp'; New-Item -ItemType Directory -Force $tmp | Out-Null
$font = 'fontfile=C\\:/Windows/Fonts/arialbd.ttf'
$files = @(); $n = 0
foreach ($it in ($Items -split ';')) {
  $p = $it -split ':'; $ci = [int]$p[0]; $c = $j.clips[$ci]; $wh = Get-WH $c $j
  $t = [double]::Parse($p[1], $script:Inv); if ($t -lt 0) { $t = [double]$c.in + [double]$c.dur / 2 }
  $x = [double]$p[2]; $y = [double]$p[3]
  $h = [int]($Half * $wh[0] / 2160); $z = 270.0 / $h   # tile px per src px
  $x0 = [int][math]::Max(0, [math]::Min($wh[0] - 2 * $h, $x - $h)); $y0 = [int][math]::Max(0, [math]::Min($wh[1] - 2 * $h, $y - 0.5 * $h))
  $mx = [int](($x - $x0) * $z); $my = [int](($y - $y0) * $z)
  $step = 54
  $lab = "c$ci t$(Fmt $t 'F2') x$([int]$x) y$([int]$y) 1tile $(Fmt (1/$z) 'F2')src"
  $f = Join-Path $tmp "x$n.png"
  & $ff -v error -y -ss (Fmt $t) -i (Get-Src $c $j) -frames:v 1 -vf "scale=$($wh[0]):$($wh[1]),crop=$(2*$h):$(2*$h):${x0}:${y0},scale=540:540,drawgrid=x=$($mx % $step):y=$($my % $step):w=${step}:h=${step}:t=1:c=red@0.5,drawbox=x=$($mx-1):y=0:w=2:h=540:c=yellow@0.6:t=fill,drawbox=x=0:y=$($my-1):w=540:h=2:c=yellow@0.6:t=fill,drawtext=$font`:text='$lab':fontsize=16:fontcolor=yellow:borderw=2:x=4:y=4" $f
  $files += $f; $n++
}
if ($n -eq 1) { Copy-Item $files[0] $Out -Force } else {
$in = $files | ForEach-Object { '-i'; $_ }
$pos = for ($k = 0; $k -lt $n; $k++) { '{0}_{1}' -f (($k % 3) * 540), ([math]::Floor($k / 3) * 540) }
& $ff -v error -y @in -filter_complex "$((0..($n - 1) | ForEach-Object { "[$_]" }) -join '')xstack=inputs=${n}:layout=$($pos -join '|'):fill=black" $Out }
"sheet: $Out ($n)"

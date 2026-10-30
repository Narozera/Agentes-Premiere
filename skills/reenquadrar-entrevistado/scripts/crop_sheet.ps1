param([string]$Job, [int[]]$Clips, [string]$Out, [int]$X0 = 324, [int]$Y0 = 648, [int]$CW = 1512, [int]$CH = 1188, [double[]]$Times, [int]$TimesClip = -1, [string]$Marks = '')
# Crop of the head region at 1:2 (1 tile px = 2 source px), grid every 108 source px, labels every 216.
# -Marks "x,y;x,y;..." draws a yellow cross per item (source px) to check an estimate.
. "C:\Users\Gustavo\.claude\skills\reenquadrar-entrevistado\scripts\common.ps1"
$j = Read-Job $Job; $ff = Get-FFmpeg
$tmp = Join-Path ([IO.Path]::GetDirectoryName($Out)) 'crop_tmp'; New-Item -ItemType Directory -Force $tmp | Out-Null
$items = @()
if ($Clips) { foreach ($ci in $Clips) { $c = $j.clips[$ci]; $items += ,@(([double]$c.in + [double]$c.dur / 2), "clip $ci", (Get-Src $c $j)) } }
if ($Times) { $m = Get-Src $j.clips[$TimesClip] $j; foreach ($t in $Times) { $items += ,@($t, "c$TimesClip t $(Fmt $t 'F2')", $m) } }
$mk = if ($Marks) { $Marks -split ';' } else { @() }
$tw = $CW / 2; $th = $CH / 2
$font = 'fontfile=C\\:/Windows/Fonts/arialbd.ttf'
$lab = @()
for ($x = [math]::Ceiling($X0 / 216) * 216; $x -lt $X0 + $CW; $x += 216) { $lab += "drawtext=$font`:text='$x':fontsize=16:fontcolor=white:borderw=2:x=$([int](($x-$X0)/2)+2):y=$($th-20)" }
for ($y = [math]::Ceiling($Y0 / 216) * 216; $y -lt $Y0 + $CH; $y += 216) { $lab += "drawtext=$font`:text='$y':fontsize=16:fontcolor=white:borderw=2:x=2:y=$([int](($y-$Y0)/2)+2)" }
$gx = ((108 - ($X0 % 108)) % 108) / 2; $gy = ((108 - ($Y0 % 108)) % 108) / 2
$files = @(); $n = 0
foreach ($it in $items) {
  $f = Join-Path $tmp "c$n.png"
  $vf = "scale=$($j.srcW):$($j.srcH),crop=${CW}:${CH}:${X0}:${Y0},scale=${tw}:${th},drawgrid=x=${gx}:y=${gy}:w=54:h=54:t=1:c=red@0.6," + ($lab -join ',')
  if ($n -lt $mk.Count -and $mk[$n]) { $p = $mk[$n] -split ','; $mx = [int](([double]$p[0] - $X0) / 2); $my = [int](([double]$p[1] - $Y0) / 2)
    $vf += ",drawbox=x=$($mx-1):y=$($my-25):w=3:h=50:c=yellow:t=fill,drawbox=x=$($mx-25):y=$($my-1):w=50:h=3:c=yellow:t=fill" }
  $vf += ",drawtext=$font`:text='$($it[1])':fontsize=24:fontcolor=yellow:borderw=3:x=8:y=8"
  & $ff -v error -y -ss (Fmt $it[0]) -i $it[2] -frames:v 1 -vf $vf $f
  $files += $f; $n++
}
$in = $files | ForEach-Object { '-i'; $_ }
$pos = for ($k = 0; $k -lt $n; $k++) { '{0}_{1}' -f (($k % 3) * $tw), ([math]::Floor($k / 3) * $th) }
if ($n -eq 1) { Copy-Item $files[0] $Out -Force } else {
& $ff -v error -y @in -filter_complex "$((0..($n - 1) | ForEach-Object { "[$_]" }) -join '')xstack=inputs=${n}:layout=$($pos -join '|'):fill=black" $Out }
"sheet: $Out ($n)"

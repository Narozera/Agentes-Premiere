param(
  [Parameter(Mandatory)][string]$Job,      # job.json
  [int[]]$Clips,                           # clip indices -> uses each clip's middle frame
  [double[]]$Times,                        # or explicit source times (seconds)
  [Parameter(Mandatory)][string]$Out,      # output PNG
  [int]$PerRow = 4,
  [int]$TimesClip = -1                     # take the media for -Times from this clip (per-clip "media" in the job)
)
# Contact sheet of source frames with a grid labelled in SOURCE pixels, for reading her
# face center X and head-top Y by eye. Thin lines every 108 px, thick+labelled every 432 (x) / 384 (y).
. "$PSScriptRoot\common.ps1"
$j = Read-Job $Job; $ff = Get-FFmpeg
$tmp = Join-Path ([IO.Path]::GetDirectoryName($Out)) 'measure_tmp'; New-Item -ItemType Directory -Force $tmp | Out-Null
$items = @()
if ($Clips) { foreach ($ci in $Clips) { $c = $j.clips[$ci]; $items += ,@(([double]$c.in + [double]$c.dur / 2), "clip $ci", (Get-Src $c $j)) } }
# -Times use the media of clip -TimesClip (if given) or the job's
if ($Times) { $tm = if ($TimesClip -ge 0) { Get-Src $j.clips[$TimesClip] $j } else { Get-Src $null $j }; foreach ($t in $Times) { $items += ,@($t, "t $(Fmt $t 'F2')", $tm) } }
$sc = 4.0; $tw = [int]($j.srcW / $sc); $th = [int]($j.srcH / $sc)
$font = 'fontfile=C\\:/Windows/Fonts/arialbd.ttf'
$labels = @()
for ($x = 432; $x -lt $j.srcW; $x += 432) { $labels += "drawtext=$font`:text='$x':fontsize=14:fontcolor=white:borderw=2:x=$([int]($x/$sc)+2):y=$($th-18)" }
for ($y = 384; $y -lt $j.srcH; $y += 384) { $labels += "drawtext=$font`:text='$y':fontsize=14:fontcolor=white:borderw=2:x=2:y=$([int]($y/$sc)+2)" }
$files = @(); $n = 0
foreach ($it in $items) {
  $f = Join-Path $tmp "m$n.png"
  $vf = "scale=${tw}:${th},drawgrid=w=27:h=27:t=1:c=cyan@0.35,drawgrid=w=108:h=96:t=2:c=red@0.7," + ($labels -join ',') + ",drawtext=$font`:text='$($it[1])':fontsize=26:fontcolor=yellow:borderw=3:x=8:y=8"
  & $ff -v error -y -ss (Fmt $it[0]) -i $it[2] -frames:v 1 -vf $vf $f
  $files += $f; $n++
}
$in = $files | ForEach-Object { '-i'; $_ }
$pos = for ($k = 0; $k -lt $n; $k++) { '{0}_{1}' -f (($k % $PerRow) * $tw), ([math]::Floor($k / $PerRow) * $th) }
& $ff -v error -y @in -filter_complex "$((0..($n - 1) | ForEach-Object { "[$_]" }) -join '')xstack=inputs=${n}:layout=$($pos -join '|'):fill=black" $Out
"sheet: $Out ($n frames, tile ${tw}x${th}, 1 tile px = $sc source px)"

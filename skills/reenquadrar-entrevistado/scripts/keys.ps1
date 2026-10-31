param([Parameter(Mandatory)][string]$Job, [Parameter(Mandatory)][string]$OutDir)
# Builds <OutDir>\keys.json from track.json + the job's zoom plan and manual overrides.
# Per clip: [[tRelative, scale, posXnorm, posYnorm], ...], one key every 0.2s plus the clip's last frame.
# Position keeps the face center on guideX and the head top on guideY at that instant's scale:
#   X = guideX - (faceX - srcW/2) * s      Y = guideY - (headY - srcH/2) * s      (s = scale/100, anchor at center)
. "$PSScriptRoot\common.ps1"
$j = Read-Job $Job
$raw = [IO.File]::ReadAllText("$OutDir\track.json")
$clipStr = $raw.Trim().TrimStart('[').TrimEnd(']') -split '\]\],\[\['
$track = foreach ($c in $clipStr) { ,@(($c.Trim('[', ']') -split '\],\[') | ForEach-Object { ,@($_.Split(',') | ForEach-Object { [double]::Parse($_, $script:Inv) }) }) }

# manual overrides: samples within 0.25s of the manual range are replaced by interpolation (clamped at the ends)
if ($j.manual) {
  foreach ($prop in $j.manual.PSObject.Properties) {
    $ci = [int]$prop.Name; $mk = @($prop.Value | ForEach-Object { ,@([double]$_[0], [double]$_[1], [double]$_[2]) })
    $firstT = $mk[0][0]; $lastT = $mk[$mk.Count - 1][0]
    foreach ($p in $track[$ci]) {
      if ($p[0] -gt $lastT + 0.25 -or $p[0] -lt $firstT - 0.25) { continue }
      $a = $mk[0]; $b = $mk[0]
      for ($i = 0; $i -lt $mk.Count; $i++) { if ($mk[$i][0] -le $p[0]) { $a = $mk[$i]; $b = $mk[[math]::Min($i + 1, $mk.Count - 1)] } }
      $u = if ($b[0] -gt $a[0]) { [math]::Min(1.0, ($p[0] - $a[0]) / ($b[0] - $a[0])) } else { 0.0 }
      $p[1] = $a[1] + ($b[1] - $a[1]) * $u; $p[2] = $a[2] + ($b[2] - $a[2]) * $u
    }
  }
}

$GX = [double]$j.guideX; $GY = [double]$j.guideY; $SW = [double]$j.srcW; $SH = [double]$j.srcH; $W = [double]$j.seqW; $H = [double]$j.seqH
function Covered($fx, $fy, $s) { $X = $GX - ($fx - $SW / 2) * $s; $Y = $GY - ($fy - $SH / 2) * $s; ($X - $SW / 2 * $s -le 0) -and ($X + $SW / 2 * $s -ge $W) -and ($Y - $SH / 2 * $s -le 0) -and ($Y + $SH / 2 * $s -ge $H) }
$out = @(); $pi = 0
foreach ($c in $j.clips) {
  # track.json/keys.json/apply_keys are positional: the job must list EVERY clip of the track, in order (index = position)
  if ([int]$c.index -ne $pi) { throw "job.clips[$pi] has index $($c.index): list every clip of the track in order" }; $pi++
  # per-clip guides (several videos with different references on one timeline)
  $wh = Get-WH $c $j; $SW = $wh[0]; $SH = $wh[1]
  $GX = if ($null -ne $c.guideX) { [double]$c.guideX } else { [double]$j.guideX }; $GY = if ($null -ne $c.guideY) { [double]$c.guideY } else { [double]$j.guideY }
  # speed-changed clip: in/dur in the job are REAL media seconds; Premiere key offsets are timeline seconds = media offset / speed
  $spd = if ($c.speed) { [double]$c.speed } else { 1.0 }
  $ci = [int]$c.index; $dur = [double]$c.dur; $p = $track[$ci]; $n = $p.Count; $in = [double]$c.in
  # 3-sample moving average (0.3s): removes jitter without lagging behind camera pans
  $sm = for ($q = 0; $q -lt $n; $q++) { $a = [math]::Max(0, $q - 1); $b = [math]::Min($n - 1, $q + 1); $sx = 0.0; $sy = 0.0; for ($i = $a; $i -le $b; $i++) { $sx += $p[$i][1]; $sy += $p[$i][2] }; ,@(($p[$q][0] - $in), ($sx / ($b - $a + 1)), ($sy / ($b - $a + 1))) }
  # samples start slightly after the clip in-point (see track.ps1): add a key at 0 so the clip's first frame is framed too
  $keys = @(); if ($sm[0][0] -gt 0.001) { $keys += ,@(0.0, $sm[0][1], $sm[0][2]) }; for ($q = 0; $q -lt $n; $q += 2) { $keys += ,$sm[$q] }
  $end = $dur - $spd / 60.0; $last = $sm[$n - 1]
  if ($end - $keys[-1][0] -gt 0.05) { $keys += ,@($end, $last[1], $last[2]) } else { $keys[-1] = @($end, $keys[-1][1], $keys[-1][2]) }
  $z0 = [double]$c.zoom[0]; $z1 = [double]$c.zoom[1]; $bump = 0
  do { $ok = $true; foreach ($kk in $keys) { $s = (($z0 + $bump) + ($z1 - $z0) * $kk[0] / $dur) / 100.0; if (-not (Covered $kk[1] $kk[2] $s)) { $ok = $false; break } }; if (-not $ok) { $bump++ } } while (-not $ok -and $bump -lt 150)
  # optional per-clip "maxZoom": face too close to the source edge would need an absurd zoom; cap it and instead clamp
  # the position to the frame edges (the face leaves the guide there, but no black border appears)
  $capped = $false
  if ($c.maxZoom -and ($z0 + $bump) -gt [double]$c.maxZoom) { $bump = [double]$c.maxZoom - [math]::Max($z0, $z1); $capped = $true }
  $kl = foreach ($kk in $keys) { $scp = ($z0 + $bump) + ($z1 - $z0) * $kk[0] / $dur; $s = $scp / 100.0
    $X = $GX - ($kk[1] - $SW / 2) * $s; $Y = $GY - ($kk[2] - $SH / 2) * $s
    $X = [math]::Min($SW / 2 * $s, [math]::Max($W - $SW / 2 * $s, $X)); $Y = [math]::Min($SH / 2 * $s, [math]::Max($H - $SH / 2 * $s, $Y))
    '[{0},{1},{2},{3}]' -f (Fmt ($kk[0] / $spd)), (Fmt $scp 'F2'), (Fmt ($X / $W) 'F5'), (Fmt ($Y / $H) 'F5') }
  $out += '[' + ($kl -join ',') + ']'
  '{0,2}: {1,2} keys  zoom {2}->{3}{4}{5}' -f $ci, $keys.Count, ($z0 + $bump), ($z1 + $bump), $(if ($bump) { "  (+$bump para cobrir o quadro)" } else { '' }), $(if ($capped) { '  (maxZoom: posicao presa na borda, rosto sai da regua)' } else { '' })
}
[IO.File]::WriteAllText("$OutDir\keys.json", '[' + ($out -join ',') + ']')

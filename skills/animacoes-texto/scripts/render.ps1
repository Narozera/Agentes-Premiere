param(
  [Parameter(Mandatory)][string]$Spec,     # spec.json (see SKILL.md)
  [Parameter(Mandatory)][string]$OutDir,   # one .mov (ProRes 4444 with alpha) per item + preview.png
  [string]$DigitFallback = 'Montserrat Black',
  [double]$Hold = 10                       # media length: the text stays still after the intro, so the clip can be extended in Premiere
)
# Renders animated text overlays with ffmpeg drawtext. Every animation is pure per-frame expressions of t
# (size, position, alpha), so any installed font/colour works. Lines of an item are stacked and staggered.
. "$PSScriptRoot\..\..\reenquadrar-entrevistado\scripts\common.ps1"
$ff = Get-FFmpeg
$cfg = Read-Job $Spec   # not $spec: same variable as the [string] param, it would be coerced back to text
New-Item -ItemType Directory -Force "$OutDir\txt" | Out-Null

function Resolve-Font([string]$name) {
  # installed fonts by (part of) their registered name, e.g. "DK Longreach", "digital-7", "Montserrat Black"
  if (Test-Path $name) { return $name }
  foreach ($k in 'HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts', 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts') {
    $props = (Get-ItemProperty $k -ErrorAction SilentlyContinue).PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' }
    $hit = $props | Where-Object { ($_.Name -replace '\s*\(.*\)$', '') -ieq $name } | Select-Object -First 1
    if (-not $hit) { $hit = $props | Where-Object { $_.Name -like "*$name*" -or [IO.Path]::GetFileNameWithoutExtension($_.Value) -ieq $name } | Select-Object -First 1 }
    if ($hit) { $v = [string]$hit.Value; if (-not [IO.Path]::IsPathRooted($v)) { $v = Join-Path "$env:WINDIR\Fonts" $v }; return $v }
  }
  throw "Fonte nao encontrada: $name"
}
function FfPath([string]$p) { ($p -replace '\\', '/') -replace '^([A-Za-z]):', '$1\:' }
function HexColor([string]$c) { $h = $c.TrimStart('#'); if ($h.Length -eq 6) { "0x$h" } else { "0x$h" } }

# animation library: returns drawtext expressions using T = time since this line appears
function Anim([string]$name, [double]$S, [double]$Yc) {
  $center = "$Yc-text_h/2"
  switch ($name) {
    # opacity is never animated (the user does fades in Effect Controls): lines just appear at their delay
    'pop'    { @{ size = "max(1,$S*if(lt(T,0.15),1.15*T/0.15,if(lt(T,0.25),1.15-0.15*(T-0.15)/0.1,1)))"; y = $center; x = '(w-text_w)/2'; a = 'gte(T,0)' } }
    'stamp'  { @{ size = "max(1,$S*if(lt(T,0.12),2.2-1.2*T/0.12,1))"; y = $center; x = "(w-text_w)/2+if(between(T,0.12,0.32),(12*$K)*sin(T*110)*(0.32-T)/0.2,0)"; a = 'gte(T,0)' } }
    'slide'  { @{ size = "$S"; y = "$center+(140*$K)*pow(1-clip(T/0.32,0,1),3)"; x = '(w-text_w)/2'; a = 'gte(T,0)' } }
    'led'    { @{ size = "$S"; y = $center; x = '(w-text_w)/2'; a = 'if(lt(T,0),0,if(lt(T,0.35),gt(sin(T*95),0),1))' } }
    # damped spring: drops from 200 px above, overshoots a little below and settles (~0.6 s)
    'bounce' { @{ size = "$S"; y = "$center-(200*$K)*exp(-5.5*max(T,0))*cos(9*max(T,0))"; x = '(w-text_w)/2'; a = 'gte(T,0)' } }
    default  { throw "Animacao desconhecida: $name (use pop, stamp, slide, led, bounce)" }
  }
}

$W = [int]$cfg.width; $H = [int]$cfg.height; $fps = [int]$cfg.fps
$K = $W / 1080.0   # pixel offsets of the animations (shake, slide, bounce) scale with the frame (2 for 4K)
$report = @()
foreach ($it in $cfg.items) {
  $dur = [double]$it.dur; $lines = @($it.lines)
  $sizes = $lines | ForEach-Object { [double]$_.size }
  $total = ($sizes | ForEach-Object { $_ * 1.05 } | Measure-Object -Sum).Sum
  $top = [double]$it.y - $total / 2; $acc = 0.0
  $filters = @(); $li = 0
  foreach ($ln in $lines) {
    $S = [double]$ln.size; $Yc = $top + $acc + $S * 1.05 / 2; $acc += $S * 1.05
    $fontName = [string]$ln.font
    if ($fontName -match 'longreach' -and ([string]$ln.text + [string]$ln.count.prefix + [string]$ln.count.to) -match '[45]') {
      $report += "  aviso: '$($ln.text)' tem 4/5 (rabisco na DK Longreach) -> $DigitFallback"; $fontName = $DigitFallback }
    $font = FfPath (Resolve-Font $fontName)
    $delay = 0.1 * $li
    $anim = if ($ln.anim) { [string]$ln.anim } else { [string]$it.anim }
    $e = Anim $anim $S $Yc
    $T = "(t-$delay)"
    # count-up: text becomes prefix + running integer + suffix (drawtext %{eif} expansion, from a text file)
    $txt = Join-Path "$OutDir\txt" "$($it.id)_$li.txt"
    if ($ln.count) {
      $to = [double]$ln.count.to; $cd = if ($ln.count.dur) { [double]$ln.count.dur } else { 0.6 }
      $content = "$($ln.count.prefix)%{eif:min($to,$to*pow(clip((t-$delay)/$cd,0,1),0.6)):d}$($ln.count.suffix)"
    } else { $content = [string]$ln.text }
    [IO.File]::WriteAllText($txt, $content, (New-Object Text.UTF8Encoding $false))
    $stroke = if ($null -ne $ln.stroke) { [int]$ln.stroke } else { 6 }
    $sc = if ($ln.strokeColor) { HexColor $ln.strokeColor } else { 'black' }
    $f = "drawtext=fontfile='$font':textfile='$(FfPath $txt)':fontsize='$($e.size.Replace('T',$T))':fontcolor=$(HexColor $ln.color)" +
         ":alpha='$($e.a.Replace('T',$T))':borderw=${stroke}:bordercolor=${sc}:x='$($e.x.Replace('T',$T))':y='$($e.y.Replace('T',$T))'"
    $filters += $f; $li++
  }
  $out = Join-Path $OutDir "$($it.id).mov"
  $mediaDur = [math]::Max($dur, $Hold)
  & $ff -v error -y -f lavfi -i "color=c=black@0.0:s=${W}x${H}:r=${fps}:d=$(Fmt $mediaDur),format=rgba" -vf ($filters -join ',') -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -an $out
  $report += '{0,-14} {1,6}s  {2,-6} {3}' -f $it.id, (Fmt ([double]$it.start) 'F2'), $it.anim, (($lines | ForEach-Object { if ($_.count) { "$($_.count.prefix)$($_.count.to)$($_.count.suffix)" } else { $_.text } }) -join ' / ')
}

# preview: 4 moments of every item over a neutral background (check sizes, overlaps, legibility)
$tiles = @(); $n = 0
foreach ($it in $cfg.items) {
  foreach ($tt in 0.08, 0.2, 0.45, ([double]$it.dur * 0.6)) {
    $p = Join-Path "$OutDir\txt" "p$n.png"
    & $ff -v error -y -f lavfi -i "color=c=0x556070:s=${W}x${H}" -i (Join-Path $OutDir "$($it.id).mov") -filter_complex "[1]trim=start=$(Fmt $tt),setpts=PTS-STARTPTS[o];[0][o]overlay=format=auto,scale=270:480,drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='$($it.id) $(Fmt $tt 'F2')s':fontsize=16:fontcolor=yellow:x=4:y=4" -frames:v 1 $p
    $tiles += $p; $n++
  }
}
$in = $tiles | ForEach-Object { '-i'; $_ }
$pos = for ($k = 0; $k -lt $n; $k++) { '{0}_{1}' -f (($k % 8) * 270), ([math]::Floor($k / 8) * 480) }
& $ff -v error -y @in -filter_complex "$((0..($n - 1) | ForEach-Object { "[$_]" }) -join '')xstack=inputs=${n}:layout=$($pos -join '|'):fill=black" (Join-Path $OutDir 'preview.png')
$report
"preview: $(Join-Path $OutDir 'preview.png')"

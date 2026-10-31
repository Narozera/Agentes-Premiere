param(
  [Parameter(Mandatory)][string]$Spec,     # spec.json (see SKILL.md); same format as render.ps1
  [Parameter(Mandatory)][string]$OutDir,   # one .mov (ProRes 4444 with alpha) per item + preview.png
  [string]$DigitFallback = 'Montserrat Black',
  [double]$Hold = 10,                      # media length: the text stays still after the intro, so the clip can be extended
  [string]$Only = ''                       # comma-separated item ids to (re)render; empty = all
)
# Renders the text animations with Remotion (motion\ in this skill: spring physics, digit rolls, per-letter stagger,
# motion blur). Installs/updates the Remotion project in %LOCALAPPDATA%\claude-premiere-tools\motion on first use.
. "$PSScriptRoot\..\..\reenquadrar-entrevistado\scripts\common.ps1"
$ff = Get-FFmpeg
$src = Join-Path $PSScriptRoot '..\motion'
$dst = Join-Path $env:LOCALAPPDATA 'claude-premiere-tools\motion'
New-Item -ItemType Directory -Force "$dst\src", "$dst\public\fonts", $OutDir | Out-Null

# sync the project (sources only) and install packages when package.json changed
$pkgChanged = -not (Test-Path "$dst\package.json") -or ((Get-FileHash "$src\package.json").Hash -ne (Get-FileHash "$dst\package.json").Hash)
Copy-Item "$src\package.json", "$src\render.mjs" $dst -Force
Copy-Item "$src\src\*" "$dst\src" -Force
if ($pkgChanged -or -not (Test-Path "$dst\node_modules\remotion")) {
  Push-Location $dst; npm install --no-audit --no-fund 2>&1 | Select-Object -Last 2; Pop-Location
}

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

$cfg = Read-Job $Spec   # not $spec: same variable as the [string] param
$fonts = @{}; $report = @()
foreach ($it in $cfg.items) {
  foreach ($ln in $it.lines) {
    $all = [string]$ln.text + [string]$ln.count.prefix + [string]$ln.count.to + [string]$ln.count.suffix
    if ([string]$ln.font -match 'longreach' -and $all -match '[45]') {
      # DK Longreach draws 4 and 5 as a scribble
      $report += "  aviso: '$all' tem 4/5 (rabisco na DK Longreach) -> $DigitFallback"; $ln.font = $DigitFallback }
    $f = [string]$ln.font
    if (-not $fonts.ContainsKey($f)) {
      $file = Resolve-Font $f; $name = [IO.Path]::GetFileName($file)
      Copy-Item -LiteralPath $file "$dst\public\fonts\$name" -Force
      $fonts[$f] = $name
    }
  }
}
$cfg | Add-Member -NotePropertyName fonts -NotePropertyValue @($fonts.GetEnumerator() | ForEach-Object { @{ family = $_.Key; file = $_.Value } }) -Force
$resolved = Join-Path $OutDir 'spec.resolved.json'
[IO.File]::WriteAllText($resolved, ($cfg | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))

$env:ONLY = $Only
Push-Location $dst
node render.mjs $resolved $OutDir $ff $Hold
$ok = $LASTEXITCODE -eq 0
Pop-Location
Remove-Item -Recurse -Force "$OutDir\tmp" -ErrorAction SilentlyContinue
if (-not $ok) { throw 'render falhou' }

# preview: 4 moments of every item over a neutral background (check sizes, overlaps, legibility, final value)
New-Item -ItemType Directory -Force "$OutDir\txt" | Out-Null
$W = [int]$cfg.width; $H = [int]$cfg.height
$tiles = @(); $n = 0
foreach ($it in $cfg.items) {
  if ($Only -and ($Only -split ',') -notcontains $it.id) { continue }
  foreach ($tt in 0.1, 0.25, 0.5, 2.0) {
    $p = Join-Path "$OutDir\txt" "p$n.png"
    # red line = lineY (the caption line): the main line must sit centred on it
    $guide = if ($null -ne $it.lineY) { "drawbox=x=0:y=$([int]$it.lineY - 2):w=iw:h=4:c=red@0.8:t=fill," } else { '' }
    & $ff -v error -y -f lavfi -i "color=c=0x556070:s=${W}x${H}" -i (Join-Path $OutDir "$($it.id).mov") -filter_complex "[1]trim=start=$(Fmt $tt),setpts=PTS-STARTPTS[o];[0][o]overlay=format=auto,${guide}scale=270:480,drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='$($it.id) $(Fmt $tt 'F2')s':fontsize=16:fontcolor=yellow:x=4:y=4" -frames:v 1 $p
    $tiles += $p; $n++
  }
}
$in = $tiles | ForEach-Object { '-i'; $_ }
$pos = for ($k = 0; $k -lt $n; $k++) { '{0}_{1}' -f (($k % 8) * 270), ([math]::Floor($k / 8) * 480) }
& $ff -v error -y @in -filter_complex "$((0..($n - 1) | ForEach-Object { "[$_]" }) -join '')xstack=inputs=${n}:layout=$($pos -join '|'):fill=black" (Join-Path $OutDir 'preview.png')
$report
"preview: $(Join-Path $OutDir 'preview.png')"

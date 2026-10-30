# Shared helpers for the reframing scripts. Dot-source it: . "$PSScriptRoot\common.ps1"
# Windows PowerShell 5.1 notes (learned the hard way):
#  - variable names are case-insensitive ($K and $k are the SAME variable)
#  - [math]::Max(0, 1.5) picks the Int32 overload; always pass doubles (0.0)
#  - scripts containing non-ASCII text must be saved as UTF-8 *with* BOM
#  - format numbers with InvariantCulture (pt-BR uses comma decimals)
$script:Inv = [Globalization.CultureInfo]::InvariantCulture

function Get-FFmpeg {
  # ffmpeg is kept in %LOCALAPPDATA%\claude-premiere-tools; downloaded once if missing
  $dir = Join-Path $env:LOCALAPPDATA 'claude-premiere-tools'
  $exe = Join-Path $dir 'ffmpeg.exe'
  if (-not (Test-Path $exe)) {
    New-Item -ItemType Directory -Force $dir | Out-Null
    $zip = Join-Path $dir 'ff.zip'; $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile $zip
    Expand-Archive $zip -DestinationPath "$dir\x" -Force
    Get-ChildItem -Recurse "$dir\x" -Include ffmpeg.exe, ffprobe.exe | Copy-Item -Destination $dir
    Remove-Item -Recurse -Force "$dir\x", $zip
  }
  $exe
}

function Read-Job([string]$path) { [IO.File]::ReadAllText($path) | ConvertFrom-Json }

function Fmt([double]$v, [string]$f = 'F3') { $v.ToString($f, $script:Inv) }

function Get-Src($c, $j) {
  # Video to decode for clip $c: its Premiere proxy when the job lists one (same picture at lower resolution; every
  # script scales the frame to srcW x srcH first, so coordinates stay in source pixels), else the original media.
  # "noProxy": true in the job forces the originals.
  $m = if ($c -and $c.media) { $c.media } else { $j.media }
  $p = if ($c -and $c.proxy) { $c.proxy } elseif (-not ($c -and $c.media)) { $j.proxy } else { $null }
  if ($p -and -not $j.noProxy -and (Test-Path -LiteralPath $p)) { $p } else { $m }
}

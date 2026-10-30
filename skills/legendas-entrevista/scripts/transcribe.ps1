param([Parameter(Mandatory)][string]$Dump, [Parameter(Mandatory)][string]$OutDir, [string]$Lang = 'pt',
  # large-v3 (full) made 24% fewer word errors than turbo over 4 videos (94.9% x 92.7%); turbo is ~4x faster
  [ValidateSet('large-v3', 'turbo')][string]$Model = 'large-v3')
# Rebuilds the sequence's dialogue audio exactly as edited (from dump.json) and transcribes it with Whisper.
# Outputs in OutDir: edit.wav (16 kHz mono, timeline time), words.csv (word timestamps, ms), sent.srt (sentences).
. "$PSScriptRoot\..\..\reenquadrar-entrevistado\scripts\common.ps1"
$ff = Get-FFmpeg
$wdir = Join-Path $env:LOCALAPPDATA 'claude-premiere-tools\whisper'
$file = if ($Model -eq 'turbo') { 'ggml-large-v3-turbo-q5_0.bin' } else { 'ggml-large-v3.bin' }
$dtw = if ($Model -eq 'turbo') { 'large.v3.turbo' } else { 'large.v3' }
$threads = [math]::Min([Environment]::ProcessorCount, 16)
$cli = Join-Path $wdir 'whisper-cli.exe'; $modelPath = Join-Path $wdir $file
if (-not (Test-Path $cli)) {
  New-Item -ItemType Directory -Force $wdir | Out-Null; $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip' -OutFile "$wdir\w.zip"
  Expand-Archive "$wdir\w.zip" -DestinationPath "$wdir\x" -Force; Copy-Item "$wdir\x\Release\*" $wdir -Force; Remove-Item -Recurse -Force "$wdir\x", "$wdir\w.zip"
}
if (-not (Test-Path $modelPath)) { $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$file" -OutFile "$modelPath.part"; Move-Item "$modelPath.part" $modelPath }

$d = Read-Job $Dump
# one ffmpeg input per distinct media; each clip trimmed and delayed to its timeline start, then mixed
$medias = @($d.audio | ForEach-Object media | Select-Object -Unique)
$inputs = foreach ($m in $medias) { '-i'; $m }
$parts = @(); $labels = ''; $n = 0
foreach ($c in $d.audio) {
  $mi = [array]::IndexOf($medias, $c.media)
  $a = [double]$c.in; $b = $a + ([double]$c.end - [double]$c.start); $ms = [int][math]::Round([double]$c.start * 1000)
  $parts += "[${mi}:a]atrim=start=$(Fmt $a 'F4'):end=$(Fmt $b 'F4'),asetpts=PTS-STARTPTS,aformat=channel_layouts=mono,adelay=delays=${ms}:all=1[a$n]"
  $labels += "[a$n]"; $n++
}
$fc = ($parts -join ';') + ";${labels}amix=inputs=${n}:normalize=0:duration=longest[out]"
[IO.File]::WriteAllText("$OutDir\fc.txt", $fc)
& $ff -v error -y @inputs '-/filter_complex' "$OutDir\fc.txt" -map '[out]' -ac 1 -ar 16000 -c:a pcm_s16le "$OutDir\edit.wav"
& $cli -m $modelPath -f "$OutDir\edit.wav" -l $Lang -ml 1 -sow -ocsv -of "$OutDir\words" -t $threads -dtw $dtw 2>$null | Out-Null
& $cli -m $modelPath -f "$OutDir\edit.wav" -l $Lang -osrt -of "$OutDir\sent" -t $threads 2>$null | Out-Null
"audio: $n clips -> edit.wav; transcript ($Model): words.csv, sent.srt"

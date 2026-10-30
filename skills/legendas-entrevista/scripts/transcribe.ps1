param([Parameter(Mandatory)][string]$Dump, [Parameter(Mandatory)][string]$OutDir, [string]$Lang = 'pt')
# Rebuilds the sequence's dialogue audio exactly as edited (from dump.json) and transcribes it with Whisper.
# Outputs in OutDir: edit.wav (16 kHz mono, timeline time), words.csv (word timestamps, ms), sent.srt (sentences).
. "$PSScriptRoot\..\..\reenquadrar-entrevistado\scripts\common.ps1"
$ff = Get-FFmpeg
$wdir = Join-Path $env:LOCALAPPDATA 'claude-premiere-tools\whisper'
$cli = Join-Path $wdir 'whisper-cli.exe'; $model = Join-Path $wdir 'ggml-large-v3-turbo-q5_0.bin'
if (-not (Test-Path $cli)) {
  New-Item -ItemType Directory -Force $wdir | Out-Null; $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip' -OutFile "$wdir\w.zip"
  Expand-Archive "$wdir\w.zip" -DestinationPath "$wdir\x" -Force; Copy-Item "$wdir\x\Release\*" $wdir -Force; Remove-Item -Recurse -Force "$wdir\x", "$wdir\w.zip"
}
if (-not (Test-Path $model)) { $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin' -OutFile $model }

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
& $cli -m $model -f "$OutDir\edit.wav" -l $Lang -ml 1 -sow -ocsv -of "$OutDir\words" -t 8 -dtw large.v3.turbo 2>$null | Out-Null
& $cli -m $model -f "$OutDir\edit.wav" -l $Lang -osrt -of "$OutDir\sent" -t 8 2>$null | Out-Null
"audio: $n clips -> edit.wav; transcript: words.csv, sent.srt"

param([string]$Style = 'dinheiro', [int]$TimeoutSec = 600)
# Runs build_mogrts.jsx in After Effects and waits for it. While the script runs, AE opens confirmation dialogs on
# every export ("fonts not synced with Adobe" for Digital-7/DK Longreach, "save the project first?"); their default
# button (OK / Salvar) is the right answer, so they are confirmed with Enter. Log: %TEMP%\build_mogrts.log
$ae = 'C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\AfterFX.exe'
$jsx = Join-Path $PSScriptRoot 'build_mogrts.jsx'
$log = Join-Path $env:TEMP 'build_mogrts.log'
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public static class AeDlg { public delegate bool EP(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] static extern bool EnumWindows(EP f, IntPtr l);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
 [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
 // untitled dialog boxes of the AE process (the confirmations); the progress window has a title
 public static List<IntPtr> Dialogs(uint pid){ var r=new List<IntPtr>(); EnumWindows((h,l)=>{uint p; GetWindowThreadProcessId(h,out p);
   if(p==pid && IsWindowVisible(h)){var s=new StringBuilder(256); GetWindowText(h,s,256); var c=new StringBuilder(64); GetClassName(h,c,64);
   if(c.ToString()=="#32770" && s.Length==0) r.Add(h);} return true;}, IntPtr.Zero); return r; } }
"@
# style goes in through a tiny wrapper script (AfterFX -r takes no arguments)
$wrap = Join-Path $env:TEMP 'build_mogrts_run.jsx'
[IO.File]::WriteAllText($wrap, "var ARGS={style:'$Style'}; `$.evalFile(new File('$($jsx -replace '\\','/')'));")
Remove-Item $log -ErrorAction SilentlyContinue
& $ae -r $wrap
$t0 = Get-Date; $n = 0
while (((Get-Date) - $t0).TotalSeconds -lt $TimeoutSec) {
  Start-Sleep 3
  if ((Test-Path $log) -and ((Get-Content $log -Raw) -match 'aep:|ERRO')) { break }
  $p = Get-Process AfterFX -ErrorAction SilentlyContinue
  if ($p) { foreach ($h in [AeDlg]::Dialogs($p.Id)) { [AeDlg]::PostMessage($h, 0x100, [IntPtr]0x0D, [IntPtr]0) | Out-Null; [AeDlg]::PostMessage($h, 0x101, [IntPtr]0x0D, [IntPtr]0) | Out-Null; $n++ } }
}
"avisos confirmados: $n"
Get-Content $log -Encoding UTF8

# options AE scripting cannot set (font editable, slider ranges): patch definition.json inside each new .mogrt
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$built = Select-String -Path $log -Pattern '^ok\s+(.+\.mogrt)' | ForEach-Object { $_.Matches[0].Groups[1].Value.Trim() }
foreach ($m in $built) {
  $zip = [IO.Compression.ZipFile]::Open($m, 'Update')
  try {
    # through temp files: PowerShell 5.1 pipes to native programs in ASCII and would break the accents
    $e = $zip.GetEntry('definition.json'); $tin = Join-Path $env:TEMP 'mogrt_def_in.json'; $tout = Join-Path $env:TEMP 'mogrt_def_out.json'
    [IO.Compression.ZipFileExtensions]::ExtractToFile($e, $tin, $true)
    Remove-Item $tout -ErrorAction SilentlyContinue
    node (Join-Path $PSScriptRoot 'patch_definition.mjs') $tin $tout
    if (-not (Test-Path $tout)) { throw "patch falhou: $m" }
    $e.Delete()
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $tout, 'definition.json') | Out-Null
    "fonte editável + faixas: $([IO.Path]::GetFileName($m))"
  } finally { $zip.Dispose() }
}

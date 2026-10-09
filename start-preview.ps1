$ErrorActionPreference = 'Stop'
$previewPort = 4174
$env:PORT = $previewPort
$previewListening = netstat -ano -p tcp | Select-String "127\.0\.0\.1:$previewPort\s+0\.0\.0\.0:0\s+LISTENING"
if ($previewListening) {
    Write-Output "Preview already running: http://localhost:$previewPort"
    exit 0
}
$previewNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $previewNode) {
    $previewNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $previewNode)) {
    throw 'Node.js not found. Open presentation/index.html directly in a browser.'
}
$previewServer = Join-Path $PSScriptRoot 'server.cjs'
$previewProcess = Start-Process -FilePath $previewNode -ArgumentList ('"' + $previewServer + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'preview-output.log') -RedirectStandardError (Join-Path $PSScriptRoot 'preview-error.log') -PassThru
Write-Output "Preview starting: http://localhost:$previewPort"
Write-Output "Process ID: $($previewProcess.Id)"

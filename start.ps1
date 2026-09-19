param(
    [int]$Port = 8000,
    [string]$ListenAddress = '127.0.0.1'
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$boothPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $boothPython)) { throw 'Create .venv and install backend/requirements.txt first. See README.md.' }
& $boothPython -m uvicorn main:app --app-dir backend --host $ListenAddress --port $Port

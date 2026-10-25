# Packs extension/ into store/gif-anywhere-<version>.zip for the Chrome Web Store.
# Uses forward-slash entry names; Compress-Archive in Windows PowerShell 5.1 writes
# backslashes, which the store can reject.
# Usage: powershell -File store/build-zip.ps1
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'extension'
$version = (Get-Content (Join-Path $src 'manifest.json') -Raw | ConvertFrom-Json).version
$zip = Join-Path $PSScriptRoot "gif-anywhere-$version.zip"
if (Test-Path $zip) { Remove-Item $zip -Confirm:$false }
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$z = [IO.Compression.ZipFile]::Open($zip, 'Create')
try {
  Get-ChildItem $src -Recurse -File | ForEach-Object {
    $name = $_.FullName.Substring($src.Length + 1).Replace('\', '/')
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $_.FullName, $name)
  }
} finally { $z.Dispose() }
Write-Output $zip

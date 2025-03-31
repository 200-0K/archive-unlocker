$currentPath = (Get-Location).Path
Set-Location -Path (Split-Path -Parent $PSScriptRoot)
npm run start -- $args
Set-Location -Path $currentPath 
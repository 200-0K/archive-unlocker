$currentPath = (Get-Location).Path
Set-Location -Path (Split-Path -Parent $PSScriptRoot)
npm run start -- --work-dir "$currentPath" $args
Set-Location -Path $currentPath 
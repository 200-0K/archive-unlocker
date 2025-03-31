# This script is used to unlock RAR, 7Z, and ZIP files
# It will try to unlock the archive file using the wordlist
# If it succeeds, it will extract the files into a folder named after the archive file
# If it fails, it... fails

<#
.SYNOPSIS
    Archive Unlocker - A PowerShell script to unlock password-protected RAR, 7Z, and ZIP archives.

.DESCRIPTION
    This script attempts to unlock password-protected archive files (RAR, 7Z, ZIP) using a wordlist.
    It supports both single file and directory processing modes.
    When successful, it extracts the contents to a folder named after the archive in the same location.

.PARAMETER archiveFile
    Path to a single archive file to process. Cannot be used with -archiveDir.

.PARAMETER archiveDir
    Path to a directory containing archive files to process. Cannot be used with -archiveFile.

.PARAMETER wordlist
    Path to the wordlist file containing passwords to try.

.PARAMETER help
    Show this help message.

.EXAMPLE
    # Process a single archive file
    ./archive-unlocker.ps1 -archiveFile "path/to/archive.rar" -wordlist "path/to/wordlist.txt"

.EXAMPLE
    # Process all archives in a directory
    ./archive-unlocker.ps1 -archiveDir "path/to/archives" -wordlist "path/to/wordlist.txt"

.EXAMPLE
    # Show help
    ./archive-unlocker.ps1 -help

.NOTES
    Requirements:
    - WinRAR installed (for RAR files)
      Default path: C:\Program Files\WinRAR\WinRAR.exe
      Download: https://www.win-rar.com/
    - 7-Zip installed (for 7Z and ZIP files)
      Default path: C:\Program Files\7-Zip\7z.exe
      Download: https://7-zip.org/
    - PowerShell 5.1 or later

    Configuration:
    The script uses a .env file to configure binary paths. Create a .env file in the same directory
    as the script with the following variables:
    - WINRAR_PATH: Path to WinRAR executable
    - SEVENZIP_PATH: Path to 7-Zip executable

    The script will:
    1. Try each password from the wordlist
    2. Show progress as it attempts each password
    3. Extract to a folder named after the archive when successful
    4. Skip if output folder already exists
#>

param(
    [Parameter(ParameterSetName = "SingleFile")]
    [string]$archiveFile,
    
    [Parameter(ParameterSetName = "Directory")]
    [string]$archiveDir,
    
    [Parameter(Mandatory = $true, ParameterSetName = "SingleFile")]
    [Parameter(Mandatory = $true, ParameterSetName = "Directory")]
    [string]$wordlist,

    [Parameter(ParameterSetName = "Help")]
    [switch]$help
)

# Show help if requested
if ($help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

# Clear any existing environment variables
Remove-Item -Path "Env:WINRAR_PATH" -ErrorAction SilentlyContinue
Remove-Item -Path "Env:SEVENZIP_PATH" -ErrorAction SilentlyContinue

# Load environment variables from .env file
$envPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

# Check for required binaries with configurable paths
$winrarPath = $env:WINRAR_PATH ?? "C:\Program Files\WinRAR\WinRAR.exe"
$sevenZipPath = $env:SEVENZIP_PATH ?? "C:\Program Files\7-Zip\7z.exe"

$missingBinaries = @()

if (-not (Test-Path $winrarPath)) {
    $missingBinaries += "WinRAR (Required for RAR files)`n  Expected path: $winrarPath`n  Download: https://www.win-rar.com/"
}

if (-not (Test-Path $sevenZipPath)) {
    $missingBinaries += "7-Zip (Required for 7Z and ZIP files)`n  Expected path: $sevenZipPath`n  Download: https://7-zip.org/"
}

if ($missingBinaries.Count -gt 0) {
    Write-Error "Missing required binaries:`n`n$($missingBinaries -join "`n`n")`n`nYou can configure the paths in the .env file."
    exit 1
}

# Function to try unlocking a single archive file
function Unlock-ArchiveFile {
    param(
        [string]$archivePath,
        [string]$wordlistPath
    )
    
    Write-Host "Attempting to unlock: $archivePath"
    
    # Create output directory based on archive filename in the same location as the archive
    $archiveDirectory = [System.IO.Path]::GetDirectoryName($archivePath)
    $archiveNameWithoutExt = [System.IO.Path]::GetFileNameWithoutExtension($archivePath)
    $outputDir = Join-Path $archiveDirectory $archiveNameWithoutExt
    
    if (Test-Path $outputDir) {
        Write-Host "Output directory already exists: $outputDir"
        return $false
    }
    
    # Read wordlist
    $words = Get-Content $wordlistPath
    $totalWords = $words.Count
    $currentWord = 0
    
    # Determine file type and set appropriate command
    $fileExtension = [System.IO.Path]::GetExtension($archivePath).ToLower()
    $extractor = switch ($fileExtension) {
        '.rar' { $winrarPath }
        '.7z' { $sevenZipPath }
        '.zip' { $sevenZipPath }
        default { throw "Unsupported file type: $fileExtension" }
    }
    
    foreach ($word in $words) {
        $currentWord++
        $progress = [math]::Round(($currentWord / $totalWords) * 100, 2)
        Write-Progress -Activity "Trying passwords" -Status "Current password: $word" -PercentComplete $progress
        
        try {
            # Try to extract with current password
            if ($fileExtension -eq '.rar') {
                $result = & $extractor x -y -p"$word" $archivePath $outputDir 2>&1
            }
            else {
                # Both 7z and zip files use the same 7-Zip command format
                $result = & $extractor x -y -p"$word" $archivePath -o"$outputDir" 2>&1
            }
            
            # Check if extraction was successful
            if ($LASTEXITCODE -eq 0) {
                Write-Progress -Activity "Trying passwords" -Completed
                Write-Host "Success! Password found: $word"
                Write-Host "Files extracted to: $outputDir"
                return $true
            }
        }
        catch {
            Write-Progress -Activity "Trying passwords" -Completed
            Write-Error "Error during extraction: $_"
            return $false
        }
    }
    
    Write-Progress -Activity "Trying passwords" -Completed
    Write-Host "Failed to find password for: $archivePath"
    return $false
}

# Main script logic
if (-not (Test-Path $wordlist)) {
    Write-Error "Wordlist file not found: $wordlist"
    exit 1
}

if ($archiveFile) {
    if (-not (Test-Path $archiveFile)) {
        Write-Error "Archive file not found: $archiveFile"
        exit 1
    }
    Unlock-ArchiveFile -archivePath $archiveFile -wordlistPath $wordlist
}
elseif ($archiveDir) {
    if (-not (Test-Path $archiveDir)) {
        Write-Error "Directory not found: $archiveDir"
        exit 1
    }
    
    $archiveFiles = Get-ChildItem -Path $archiveDir -Include @("*.rar", "*.7z", "*.zip") -Recurse
    if ($archiveFiles.Count -eq 0) {
        Write-Error "No RAR, 7Z, or ZIP files found in directory: $archiveDir"
        exit 1
    }
    
    foreach ($file in $archiveFiles) {
        Write-Host "`nProcessing file: $($file.Name)"
        Unlock-ArchiveFile -archivePath $file.FullName -wordlistPath $wordlist
    }
}
else {
    Write-Error "Please specify either -archiveFile or -archiveDir parameter"
    exit 1
}
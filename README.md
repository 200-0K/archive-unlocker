# Archive Unlocker

A command-line tool to unlock password-protected RAR, 7Z, and ZIP archives using a wordlist.

## Features

- Unlock RAR, 7Z, and ZIP archives with password protection
- Process a single archive file or a directory of archives
- Customize batch size, timeout, and parallel processing
- Clear progress indication with Listr2
- Extract successful archives to folders named after the archive

## Requirements

- Node.js 16.0 or later
- WinRAR installed (for RAR files)
  - Default path: `C:\Program Files\WinRAR\WinRAR.exe`
  - Download: https://www.win-rar.com/
- 7-Zip installed (for 7Z and ZIP files)
  - Default path: `C:\Program Files\7-Zip\7z.exe`
  - Download: https://7-zip.org/

## Installation

### From NPM

```bash
npm install -g archive-unlocker
```

### From source

1. Clone the repository:
```bash
git clone https://github.com/200-0K/archive-unlocker.git
cd archive-unlocker
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The tool uses environment variables to locate the required binaries. 
You can create a `.env` file in the project directory with these variables:

```
# Windows paths (use double backslashes)
WINRAR_PATH=C:\\Program Files\\WinRAR\\WinRAR.exe
SEVENZIP_PATH=C:\\Program Files\\7-Zip\\7z.exe

# macOS paths (via Homebrew)
# WINRAR_PATH=/usr/bin/wine /home/user/.wine/drive_c/Program\ Files/WinRAR/WinRAR.exe
# SEVENZIP_PATH=/usr/local/bin/7z

# Linux paths
# WINRAR_PATH=/usr/bin/wine /home/user/.wine/drive_c/Program\ Files/WinRAR/WinRAR.exe
# SEVENZIP_PATH=/usr/bin/7z
```

See `.env.example` for more detailed examples.

## Usage

### Command Line Options

- `-f, --archive-file <path>`: Path to a single archive file to process
- `-d, --archive-dir <path>`: Path to a directory containing archive files to process
- `-w, --wordlist <path>`: Path to the wordlist file containing passwords to try
- `-b, --batch-size <number>`: Number of passwords to try in each batch (default: 100)
- `-t, --timeout <number>`: Maximum time in milliseconds to try each password (0 for no timeout, default: 0)
- `-p, --parallel <number>`: Number of files to process in parallel (default: number of CPU cores)
- `-V, --version`: Output the version number
- `-h, --help`: Display help

### Platform-Specific Usage

#### Windows
Using Command Prompt:
```cmd
.\bin\archive-unlocker.bat -d .\test\ -w .\test\wordlist.txt
```

Using PowerShell:
```powershell
.\bin\archive-unlocker.ps1 -d .\test\ -w .\test\wordlist.txt
```

#### macOS/Linux
Using Bash:
```bash
chmod +x ./bin/archive-unlocker.sh  # Make executable (first time only)
./bin/archive-unlocker.sh -d ./test/ -w ./test/wordlist.txt
```

Using Node directly:
```bash
chmod +x ./bin/archive-unlocker  # Make executable (first time only)
./bin/archive-unlocker -d ./test/ -w ./test/wordlist.txt
```

### Examples

Process a single archive file:
```bash
archive-unlocker -f path/to/archive.rar -w path/to/wordlist.txt
```

Process all archives in a directory:
```bash
archive-unlocker -d path/to/archives -w path/to/wordlist.txt
```

Process with custom batch size and timeout:
```bash
archive-unlocker -d path/to/archives -w path/to/wordlist.txt -b 200 -t 10000
```

Process with a timeout of 5 seconds per password:
```bash
archive-unlocker -d path/to/archives -w path/to/wordlist.txt -t 5000
```

## Wordlist Format

The wordlist should be a plain text file with one password per line. For example:

```
password123
P@ssw0rd
Secret123!
```

## License

ISC 
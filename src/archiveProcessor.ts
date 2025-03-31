import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { Listr } from 'listr2';
import moment from 'moment';

const execAsync = promisify(exec);

// Supported archive extensions
const SUPPORTED_EXTENSIONS = ['.rar', '.7z', '.zip'];

// Default paths for binaries (can be overridden with env variables)
const DEFAULT_WINRAR_PATH = 'C:\\Program Files\\WinRAR\\WinRAR.exe';
const DEFAULT_SEVENZIP_PATH = 'C:\\Program Files\\7-Zip\\7z.exe';

// Interface for the main function parameters
export interface ProcessArchivesOptions {
  archiveFile?: string;
  archiveDir?: string;
  wordlistPath: string;
  batchSize: number;
  timeout: number;
  parallel: number;
}

// Interface for a single archive processing operation
interface ArchiveProcessingTask {
  filePath: string;
  outputDir: string;
  wordlistPath: string;
  batchSize: number;
  timeout: number;
}

/**
 * Main function to process archives
 */
export async function processArchives(options: ProcessArchivesOptions): Promise<void> {
  const { archiveFile, archiveDir, wordlistPath, batchSize, timeout, parallel } = options;

  // Verify binaries are available
  await verifyBinaries();

  // Get word list
  const words = fs
    .readFileSync(wordlistPath, 'utf-8')
    .split(/\r?\n/)
    .filter(word => word.trim().length > 0);

  console.log(chalk.blue(`Loaded ${words.length} passwords from wordlist`));

  // Collect archive files to process
  let archiveFiles: string[] = [];

  if (archiveFile) {
    archiveFiles = [archiveFile];
  } else if (archiveDir) {
    archiveFiles = findArchiveFiles(archiveDir);
  }

  if (archiveFiles.length === 0) {
    throw new Error('No archive files found to process');
  }

  console.log(chalk.blue(`Found ${archiveFiles.length} archive files to process`));

  // Create tasks for each archive file
  const tasks: ArchiveProcessingTask[] = archiveFiles.map(filePath => {
    const outputDir = path.join(
      path.dirname(filePath),
      path.basename(filePath, path.extname(filePath))
    );

    return {
      filePath,
      outputDir,
      wordlistPath,
      batchSize,
      timeout,
    };
  });

  // Process archives with progress reporting
  const startTime = Date.now();

  const taskRunner = new Listr(
    tasks.map(task => ({
      title: `Processing ${path.basename(task.filePath)}`,
      task: async (ctx, listrTask) => {
        listrTask.title = `Processing ${path.basename(task.filePath)} (${words.length} passwords)`;

        // Skip if output directory already exists
        if (fs.existsSync(task.outputDir)) {
          listrTask.title = `${chalk.yellow('SKIPPED')} ${path.basename(task.filePath)} (output directory already exists)`;
          return;
        }

        try {
          const password = await unlockArchive(task, words, listrTask);

          if (password) {
            listrTask.title = `${chalk.green('SUCCESS')} ${path.basename(task.filePath)} (password: ${password})`;
          } else {
            listrTask.title = `${chalk.red('FAILED')} ${path.basename(task.filePath)} (no password matched)`;
          }
        } catch (error: any) {
          listrTask.title = `${chalk.red('ERROR')} ${path.basename(task.filePath)} (${error.message})`;
          throw error;
        }
      },
    })),
    {
      concurrent: parallel,
      exitOnError: false,
    }
  );

  try {
    await taskRunner.run();

    const duration = moment.duration(Date.now() - startTime);
    console.log(chalk.green(`\nCompleted in ${duration.humanize()}`));
  } catch (error) {
    console.log(chalk.red('\nSome archives failed to process'));
  }
}

/**
 * Find all supported archive files in directory recursively
 */
function findArchiveFiles(directoryPath: string): string[] {
  const files: string[] = [];

  function scanDirectory(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (
        entry.isFile() &&
        SUPPORTED_EXTENSIONS.includes(path.extname(fullPath).toLowerCase())
      ) {
        files.push(fullPath);
      }
    }
  }

  scanDirectory(directoryPath);
  return files;
}

/**
 * Verify that required binaries are available
 */
async function verifyBinaries(): Promise<void> {
  const winrarPath = process.env.WINRAR_PATH || DEFAULT_WINRAR_PATH;
  const sevenzipPath = process.env.SEVENZIP_PATH || DEFAULT_SEVENZIP_PATH;

  const missingBinaries: string[] = [];

  if (!fs.existsSync(winrarPath)) {
    missingBinaries.push(`WinRAR (expected at ${winrarPath})`);
  }

  if (!fs.existsSync(sevenzipPath)) {
    missingBinaries.push(`7-Zip (expected at ${sevenzipPath})`);
  }

  if (missingBinaries.length > 0) {
    throw new Error(
      `Missing required binaries:\n${missingBinaries.join('\n')}\n` +
        'Please install the missing software or update the paths in .env file'
    );
  }
}

/**
 * Attempt to unlock an archive with the provided passwords
 * Returns the successful password or null if none worked
 */
async function unlockArchive(
  task: ArchiveProcessingTask,
  words: string[],
  listrTask: any
): Promise<string | null> {
  const { filePath, outputDir, batchSize, timeout } = task;
  const fileExt = path.extname(filePath).toLowerCase();

  // Determine which binary to use based on file extension
  const winrarPath = process.env.WINRAR_PATH || DEFAULT_WINRAR_PATH;
  const sevenzipPath = process.env.SEVENZIP_PATH || DEFAULT_SEVENZIP_PATH;

  // Process words in batches to show progress
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    listrTask.title = `Processing ${path.basename(filePath)} - ${i + 1}/${words.length} passwords (${Math.floor((i / words.length) * 100)}%)`;

    // Try each password in the batch
    for (const password of batch) {
      try {
        if (fileExt === '.rar') {
          // For RAR files use WinRAR
          const cmd = `"${winrarPath}" x -y -p"${password}" "${filePath}" "${outputDir}"`;
          await execWithTimeout(cmd, timeout);
        } else {
          // For 7Z and ZIP files use 7-Zip
          const cmd = `"${sevenzipPath}" x -y -p"${password}" "${filePath}" -o"${outputDir}"`;
          await execWithTimeout(cmd, timeout);
        }

        // Check if files were actually extracted
        if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
          return password;
        } else {
          // Clean up empty directory if extraction failed
          if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
          }
        }
      } catch (error: any) {
        // Clean up empty directory if extraction failed
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
        }

        // If error contains "Wrong password", continue to next password
        if (
          error.message.includes('Wrong password') ||
          error.message.includes('incorrect password') ||
          error.message.includes('CRC failed')
        ) {
          continue;
        }

        // If we get a timeout, continue to next password
        if (error.message.includes('timeout')) {
          continue;
        }

        // For other errors, check if extraction was still successful
        if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
          return password;
        }
      }
    }
  }

  return null;
}

/**
 * Execute a command with a timeout
 */
async function execWithTimeout(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr && !stdout) {
        reject(new Error(stderr));
        return;
      }

      resolve(stdout);
    });

    // Set timeout only if a positive value is provided
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (process.pid) {
          exec(`taskkill /pid ${process.pid} /T /F`);
        }
        reject(new Error('timeout'));
      }, timeoutMs);

      // Clear timeout if process completes before timeout
      process.on('exit', () => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    }
  });
}

#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { cpus } from 'os';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { processArchives } from './archiveProcessor.js';

// Load environment variables from .env file
dotenv.config();

// Get package.json for version
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Configure the CLI
program
  .name('archive-unlocker')
  .description('A tool to unlock password-protected RAR, 7Z, and ZIP archives using a wordlist')
  .version(packageJson.version)
  .option('-f, --archive-file <path>', 'Path to a single archive file to process')
  .option('-d, --archive-dir <path>', 'Path to a directory containing archive files to process')
  .option(
    '-w, --wordlist <path>',
    'Path to the wordlist file containing passwords to try',
    './wordlist.txt'
  )
  .option('-b, --batch-size <number>', 'Number of passwords to try in each batch', '100')
  .option(
    '-t, --timeout <number>',
    'Maximum time in milliseconds to try each password (0 for no timeout)',
    '0'
  )
  .option(
    '-p, --parallel <number>',
    'Number of files to process in parallel',
    String(cpus().length)
  )
  .option('--work-dir <path>', 'Working directory for resolving relative paths', process.cwd())
  .parse(process.argv);

const options = program.opts();

async function main() {
  // Set working directory if specified
  if (options.workDir) {
    process.chdir(options.workDir);
  }

  // Validate options
  if (!options.archiveFile && !options.archiveDir) {
    console.error(
      chalk.red('Error: You must specify either --archive-file or --archive-dir option')
    );
    program.help();
    process.exit(1);
  }

  if (options.archiveFile && options.archiveDir) {
    console.error(
      chalk.red('Error: You cannot specify both --archive-file and --archive-dir options')
    );
    program.help();
    process.exit(1);
  }

  if (!options.wordlist) {
    console.error(chalk.red('Error: Wordlist path is required'));
    program.help();
    process.exit(1);
  }

  // Check if wordlist exists
  if (!existsSync(options.wordlist)) {
    console.error(chalk.red(`Error: Wordlist not found at ${options.wordlist}`));
    process.exit(1);
  }

  // Check if archive file or directory exists
  if (options.archiveFile && !existsSync(options.archiveFile)) {
    console.error(chalk.red(`Error: Archive file not found at ${options.archiveFile}`));
    process.exit(1);
  }

  if (options.archiveDir && !existsSync(options.archiveDir)) {
    console.error(chalk.red(`Error: Archive directory not found at ${options.archiveDir}`));
    process.exit(1);
  }

  // Parse numeric options
  const batchSize = parseInt(options.batchSize, 10);
  const timeout = parseInt(options.timeout, 10);
  const parallel = parseInt(options.parallel, 10);

  try {
    await processArchives({
      archiveFile: options.archiveFile,
      archiveDir: options.archiveDir,
      wordlistPath: options.wordlist,
      batchSize,
      timeout,
      parallel,
    });
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});

#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Construct paths
const testDir = path.join(rootDir, 'test');
const wordlistPath = path.join(testDir, 'wordlist.txt');

// Command line arguments for the archive-unlocker
const args = ['run', 'start', '--', '-d', testDir, '-w', wordlistPath];

console.log(`Running: npm ${args.join(' ')}`);

// Spawn the process
const child = spawn('npm', args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32', // Use shell on Windows
});

// Handle process completion
child.on('close', code => {
  console.log(`Process exited with code ${code}`);
});

// Handle errors
child.on('error', err => {
  console.error('Failed to start subprocess:', err);
});

#!/usr/bin/env node

/**
 * PerfWeaver CLI entry point (compiled output is used as the npm "bin" entry).
 */

import { runCLI } from '../cli/cli';

runCLI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

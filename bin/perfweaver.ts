#!/usr/bin/env node

/**
 * PerfWeaver CLI Entry Point
 */

import { runCLI } from '../src/cli/cli';

runCLI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

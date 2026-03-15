import * as fs from 'fs';
import * as path from 'path';

describe('CLI package configuration', () => {
  it('exposes a "perfweaver" bin entry in package.json', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as any;

    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.perfweaver).toBeDefined();
    expect(typeof pkg.bin.perfweaver).toBe('string');
    expect(pkg.bin.perfweaver).toMatch(/dist\/bin\/perfweaver\.js$/);
  });

  it('includes a CLI entrypoint at src/bin/perfweaver.ts', () => {
    const cliEntry = path.resolve(__dirname, '../../src/bin/perfweaver.ts');
    expect(fs.existsSync(cliEntry)).toBe(true);

    const contents = fs.readFileSync(cliEntry, 'utf-8');
    expect(contents.split('\n')[0].trim()).toBe('#!/usr/bin/env node');
    expect(contents).toContain("import { runCLI } from '../cli/cli'" );
  });
});

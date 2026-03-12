import { Transaction, LoadModelConfig } from '../../types';
import { BaseToolAdapter } from '../base-adapter';

/**
 * Playwright Adapter
 * Converts behavior model to Playwright TypeScript format (API mode)
 */
export class PlaywrightAdapter extends BaseToolAdapter {
  readonly toolName = 'playwright';
  readonly fileExtension = '.ts';

  public generate(transactions: Transaction[], loadConfig: LoadModelConfig): string {
    const lines: string[] = [];

    lines.push('import { test, expect, APIRequestContext } from "@playwright/test";');
    lines.push("");

    lines.push("test.describe('Load Test', () => {");

    for (const transaction of transactions) {
      lines.push(`  test('${transaction.name}', async ({ request }) => {`);

      for (const block of transaction.blocks) {
        for (const request of block.requests) {
          lines.push(this.generatePlaywrightRequest(request));
        }

        // Add think time
        if ('thinkTimes' in block && Object.keys(block.thinkTimes).length > 0) {
          const thinkTime = Object.values(block.thinkTimes)[0] || 0;
          if (thinkTime > 0) {
            lines.push(`    await new Promise(resolve => setTimeout(resolve, ${thinkTime}));`);
          }
        }
      }

      lines.push("  });");
      lines.push("");
    }

    lines.push("});");

    return lines.join("\n");
  }

  private generatePlaywrightRequest(request: any): string {
    const method = request.method.toLowerCase();
    const headers = JSON.stringify(request.headers || {});

    let options = `{ `;
    
    if (Object.keys(request.headers || {}).length > 0) {
      options += `headers: ${headers}`;
    }

    if (request.payload) {
      if (options !== "{ ") options += ", ";
      options += `data: '${this.escapeString(request.payload)}'`;
    }

    options += " }";

    return `    const response = await request.${method}('${request.url}'${options === " }" ? "" : `, ${options}`});`;
  }
}

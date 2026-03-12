import { Transaction, LoadModelConfig } from '../../types';
import { BaseToolAdapter } from '../base-adapter';

/**
 * k6 Adapter
 * Converts behavior model to k6 JavaScript format
 */
export class K6Adapter extends BaseToolAdapter {
  readonly toolName = 'k6';
  readonly fileExtension = '.js';

  public generate(transactions: Transaction[], loadConfig: LoadModelConfig): string {
    const lines: string[] = [];

    // Imports
    lines.push("import http from 'k6/http';");
    lines.push("import { check, sleep, group } from 'k6';");
    lines.push("");

    // Options/Configuration
    lines.push("export const options = {");
    lines.push(`  vus: ${loadConfig.threadCount},`);
    lines.push(`  duration: '${loadConfig.duration}s',`);
    lines.push(`  rampUp: '${loadConfig.rampUpTime}s',`);
    lines.push("  thresholds: {");
    lines.push("    http_req_duration: ['p(95)<500', 'p(99)<1000'],");
    lines.push("    http_req_failed: ['rate<0.1'],");
    lines.push("  },");
    lines.push("};");
    lines.push("");

    // Main test function
    lines.push("export default function test() {");

    for (const transaction of transactions) {
      const txnName = this.formatTransactionName(transaction.name);
      
      lines.push(`  group('${transaction.name}', function() {`);

      for (const block of transaction.blocks) {
        for (const request of block.requests) {
          lines.push(this.generateHTTPRequest(request));
        }

        // Add think time
        if ('thinkTimes' in block && Object.keys(block.thinkTimes).length > 0) {
          const thinkTime = Object.values(block.thinkTimes)[0] || 0;
          if (thinkTime > 0) {
            lines.push(`    sleep(${this.msToSeconds(thinkTime)});`);
          }
        }
      }

      lines.push("  });");
      lines.push("");
    }

    lines.push("}");

    return lines.join("\n");
  }

  private generateHTTPRequest(request: any): string {
    const method = request.method.toLowerCase();
    const url = this.formatURL(request.url);
    const headers = JSON.stringify(request.headers || {});

    let options = `\n    { headers: ${headers}`;

    if (request.payload) {
      options += `, body: '${this.escapeString(request.payload)}'`;
    }

    options += " }";

    return `    http.${method}('${url}'${options === " }" ? "" : options});`;
  }
}

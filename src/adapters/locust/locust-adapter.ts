import { Transaction, LoadModelConfig } from '../../types';
import { BaseToolAdapter } from '../base-adapter';

/**
 * Locust Adapter
 * Converts behavior model to Locust Python format
 */
export class LocustAdapter extends BaseToolAdapter {
  readonly toolName = 'locust';
  readonly fileExtension = '.py';

  public generate(transactions: Transaction[], loadConfig: LoadModelConfig): string {
    const lines: string[] = [];

    lines.push('from locust import HttpUser, task, between, events');
    lines.push('import time');
    lines.push("");

    // Generate task class for each transaction
    for (const transaction of transactions) {
      const className = this.formatTransactionName(transaction.name)
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      lines.push(`class ${className}User(HttpUser):`);
      lines.push(`    wait_time = between(1, 3)`);
      lines.push("");
      lines.push(`    @task`);
      lines.push(`    def ${this.formatTransactionName(transaction.name)}(self):`);

      for (const block of transaction.blocks) {
        for (const request of block.requests) {
          const method = request.method.toLowerCase();
          lines.push(`        self.client.${method}("${request.url}")`);
        }

        // Add think time
        if ('thinkTimes' in block && Object.keys(block.thinkTimes).length > 0) {
          const thinkTime = Object.values(block.thinkTimes)[0] || 0;
          if (thinkTime > 0) {
            lines.push(`        time.sleep(${(thinkTime / 1000).toFixed(2)})`);
          }
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }
}

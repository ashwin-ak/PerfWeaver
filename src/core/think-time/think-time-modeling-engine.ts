import { Transaction, ThinkTimeConfig, RequestNode, BehaviorBlock } from '../../types';

/**
 * Think Time Modeling Engine
 * Calculates and manages realistic user pacing
 */
export class ThinkTimeModelingEngine {
  private config: ThinkTimeConfig;
  private thinkTimes: Map<string, number> = new Map();

  constructor(config: ThinkTimeConfig) {
    this.config = config;
  }

  /**
   * Calculate think times from transactions
   */
  public calculateThinkTimes(transactions: Transaction[]): Map<string, number> {
    this.thinkTimes.clear();

    for (const transaction of transactions) {
      this.calculateTransactionThinkTimes(transaction);
    }

    return this.thinkTimes;
  }

  /**
   * Calculate think times within a transaction
   */
  private calculateTransactionThinkTimes(transaction: Transaction): void {
    const requests = transaction.blocks.flatMap(b => b.requests);

    for (let i = 0; i < requests.length - 1; i++) {
      const currentRequest = requests[i];
      const nextRequest = requests[i + 1];
      const thinkTime = Math.max(0, nextRequest.startTime - currentRequest.endTime);

      if (thinkTime > this.config.minThinkTime) {
        const cappedThinkTime = Math.min(thinkTime, this.config.maxThinkTime);
        const key = `${currentRequest.id}_to_${nextRequest.id}`;
        this.thinkTimes.set(key, cappedThinkTime);
      }
    }
  }

  /**
   * Get percentile think time
   */
  public getPercentileThinkTime(transactions: Transaction[], percentile: number): number {
    const thinkTimes: number[] = [];

    for (const transaction of transactions) {
      const requests = transaction.blocks.flatMap(b => b.requests);

      for (let i = 0; i < requests.length - 1; i++) {
        const thinkTime = Math.max(
          0,
          requests[i + 1].startTime - requests[i].endTime
        );

        if (thinkTime >= this.config.minThinkTime) {
          thinkTimes.push(Math.min(thinkTime, this.config.maxThinkTime));
        }
      }
    }

    return this.calculatePercentile(thinkTimes, percentile);
  }

  /**
   * Calculate percentile value from an array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * Generate think time for a specific percentile
   */
  public generateThinkTime(): number {
    if (this.thinkTimes.size === 0) {
      return this.config.minThinkTime;
    }

    const times = Array.from(this.thinkTimes.values());
    const percentileValue = this.calculatePercentile(times, this.config.percentile);

    return Math.max(this.config.minThinkTime, percentileValue);
  }

  /**
   * Get think time statistics
   */
  public getStatistics(transactions: Transaction[]): {
    minThinkTime: number;
    maxThinkTime: number;
    averageThinkTime: number;
    medianThinkTime: number;
    p50ThinkTime: number;
    p75ThinkTime: number;
    p90ThinkTime: number;
    p95ThinkTime: number;
    p99ThinkTime: number;
  } {
    const thinkTimes: number[] = [];

    for (const transaction of transactions) {
      const requests = transaction.blocks.flatMap(b => b.requests);

      for (let i = 0; i < requests.length - 1; i++) {
        const thinkTime = Math.max(
          0,
          requests[i + 1].startTime - requests[i].endTime
        );

        if (thinkTime >= this.config.minThinkTime) {
          thinkTimes.push(Math.min(thinkTime, this.config.maxThinkTime));
        }
      }
    }

    if (thinkTimes.length === 0) {
      return {
        minThinkTime: 0,
        maxThinkTime: 0,
        averageThinkTime: 0,
        medianThinkTime: 0,
        p50ThinkTime: 0,
        p75ThinkTime: 0,
        p90ThinkTime: 0,
        p95ThinkTime: 0,
        p99ThinkTime: 0,
      };
    }

    const sorted = thinkTimes.sort((a, b) => a - b);
    const sum = thinkTimes.reduce((a, b) => a + b, 0);

    return {
      minThinkTime: sorted[0],
      maxThinkTime: sorted[sorted.length - 1],
      averageThinkTime: sum / thinkTimes.length,
      medianThinkTime: this.calculatePercentile(thinkTimes, 50),
      p50ThinkTime: this.calculatePercentile(thinkTimes, 50),
      p75ThinkTime: this.calculatePercentile(thinkTimes, 75),
      p90ThinkTime: this.calculatePercentile(thinkTimes, 90),
      p95ThinkTime: this.calculatePercentile(thinkTimes, 95),
      p99ThinkTime: this.calculatePercentile(thinkTimes, 99),
    };
  }

  /**
   * Apply think time pattern to transactions
   */
  public applyThinkTimePattern(
    transactions: Transaction[],
    pattern: 'constant' | 'random' | 'percentile' = 'percentile'
  ): Transaction[] {
    const stats = this.getStatistics(transactions);

    const applied: Transaction[] = [];

    for (const transaction of transactions) {
      const blocks = transaction.blocks.map((block, blockIndex) => {
        const requests = block.requests.map((request, requestIndex) => {
          if (blockIndex < transaction.blocks.length - 1 || 
              requestIndex < block.requests.length - 1) {
            
            let thinkTime = 0;

            switch (pattern) {
              case 'constant':
                thinkTime = stats.medianThinkTime;
                break;
              case 'random':
                thinkTime = Math.random() * stats.maxThinkTime;
                break;
              case 'percentile':
              default:
                thinkTime = stats[`p${this.config.percentile}ThinkTime` as keyof typeof stats] || stats.medianThinkTime;
                break;
            }

            // Store think time in block if possible
            if ('thinkTimes' in block) {
              (block as any).thinkTimes[request.id] = thinkTime;
            }
          }

          return request;
        });

        return {
          ...block,
          requests,
        };
      });

      applied.push({
        ...transaction,
        blocks,
      });
    }

    return applied;
  }

  /**
   * Set think time configuration
   */
  public setConfig(config: Partial<ThinkTimeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ThinkTimeConfig {
    return { ...this.config };
  }

  /**
   * Visualize think time distribution
   */
  public visualizeDistribution(transactions: Transaction[]): string {
    const stats = this.getStatistics(transactions);
    const lines: string[] = [];

    lines.push('Think Time Distribution (ms):');
    lines.push(`Min:     ${Math.round(stats.minThinkTime)}`);
    lines.push(`P50:     ${Math.round(stats.p50ThinkTime)}`);
    lines.push(`P75:     ${Math.round(stats.p75ThinkTime)}`);
    lines.push(`P90:     ${Math.round(stats.p90ThinkTime)}`);
    lines.push(`P95:     ${Math.round(stats.p95ThinkTime)}`);
    lines.push(`P99:     ${Math.round(stats.p99ThinkTime)}`);
    lines.push(`Max:     ${Math.round(stats.maxThinkTime)}`);
    lines.push(`Average: ${Math.round(stats.averageThinkTime)}`);

    return lines.join('\n');
  }
}

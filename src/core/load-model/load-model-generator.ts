import { LoadModelConfig, Transaction } from '../../types';

/**
 * Load Model Generator
 * Generates configurable load profiles for performance tests
 */
export class LoadModelGenerator {
  private baseConfig: LoadModelConfig;

  constructor(config: LoadModelConfig) {
    this.baseConfig = config;
  }

  /**
   * Generate load model for a set of transactions
   */
  public generateLoadModel(transactions: Transaction[]): LoadModelConfig {
    const duration = this.calculateMinimalDuration(transactions);

    return {
      ...this.baseConfig,
      duration: Math.max(this.baseConfig.duration, Math.ceil(duration / 1000)),
    };
  }

  /**
   * Calculate minimal duration needed to execute all transactions
   */
  private calculateMinimalDuration(transactions: Transaction[]): number {
    if (transactions.length === 0) {
      return this.baseConfig.duration * 1000;
    }

    let totalDuration = 0;

    for (const transaction of transactions) {
      totalDuration += transaction.duration;
    }

    // Add buffer for ramp-up and other overhead
    totalDuration += this.baseConfig.rampUpTime * 1000;

    return totalDuration;
  }

  /**
   * Generate stepped load profile
   */
  public generateSteppedLoadProfile(steps: number = 5): Array<{
    stepNumber: number;
    threadCount: number;
    duration: number;
    description: string;
  }> {
    const profile: Array<any> = [];
    const threadIncrement = Math.ceil(this.baseConfig.threadCount / steps);
    const stepDuration = Math.ceil(this.baseConfig.duration / steps);

    for (let i = 0; i < steps; i++) {
      const threadCount = (i + 1) * threadIncrement;
      profile.push({
        stepNumber: i + 1,
        threadCount: Math.min(threadCount, this.baseConfig.threadCount),
        duration: stepDuration,
        description: `Step ${i + 1}: ${Math.min(threadCount, this.baseConfig.threadCount)} users for ${stepDuration}s`,
      });
    }

    return profile;
  }

  /**
   * Generate spike load profile
   */
  public generateSpikeLoadProfile(): Array<{
    phase: string;
    threadCount: number;
    duration: number;
  }> {
    const baseThreads = this.baseConfig.threadCount;

    return [
      {
        phase: 'normal',
        threadCount: baseThreads,
        duration: Math.ceil(this.baseConfig.duration * 0.5),
      },
      {
        phase: 'spike',
        threadCount: baseThreads * 3,
        duration: Math.ceil(this.baseConfig.duration * 0.3),
      },
      {
        phase: 'recovery',
        threadCount: baseThreads,
        duration: Math.ceil(this.baseConfig.duration * 0.2),
      },
    ];
  }

  /**
   * Generate ramp-up curve
   */
  public generateRampUpCurve(samples: number = 10): Array<{
    time: number;
    threadCount: number;
    percentage: number;
  }> {
    const curve: Array<any> = [];
    const timeStep = Math.ceil(this.baseConfig.rampUpTime / samples);

    for (let i = 0; i <= samples; i++) {
      const time = i * timeStep;
      const percentage = (i / samples) * 100;
      const threadCount = Math.ceil((percentage / 100) * this.baseConfig.threadCount);

      curve.push({
        time,
        threadCount,
        percentage,
      });
    }

    return curve;
  }

  /**
   * Generate cool-down curve
   */
  public generateCoolDownCurve(coolDownTime: number = 60, samples: number = 10): Array<{
    time: number;
    threadCount: number;
    percentage: number;
  }> {
    const curve: Array<any> = [];
    const timeStep = Math.ceil(coolDownTime / samples);

    for (let i = 0; i <= samples; i++) {
      const time = i * timeStep;
      const percentage = 100 - (i / samples) * 100;
      const threadCount = Math.ceil((percentage / 100) * this.baseConfig.threadCount);

      curve.push({
        time,
        threadCount,
        percentage,
      });
    }

    return curve;
  }

  /**
   * Calculate expected throughput
   */
  public calculateExpectedThroughput(
    transactionDuration: number,
    concurrentUsers: number = this.baseConfig.threadCount
  ): {
    transactionsPerSecond: number;
    transactionsPerMinute: number;
    transactionsPerHour: number;
    totalTransactions: number;
  } {
    const transactionsPerSecond = (concurrentUsers * 1000) / transactionDuration;
    const totalTransactions = Math.ceil(
      transactionsPerSecond * (this.baseConfig.duration - this.baseConfig.rampUpTime)
    );

    return {
      transactionsPerSecond: Math.round(transactionsPerSecond * 100) / 100,
      transactionsPerMinute: Math.round(transactionsPerSecond * 60 * 100) / 100,
      transactionsPerHour: Math.round(transactionsPerSecond * 3600 * 100) / 100,
      totalTransactions,
    };
  }

  /**
   * Generate resource allocation recommendations
   */
  public generateResourceRecommendations(): {
    estimateCpuCores: number;
    estimateMemoryMB: number;
    estimateBandwidthMbps: number;
    notes: string[];
  } {
    const notes: string[] = [];
    let estimateCpuCores = this.baseConfig.threadCount / 10;
    let estimateMemoryMB = this.baseConfig.threadCount * 2; // 2MB per thread estimate
    let estimateBandwidthMbps = this.baseConfig.threadCount * 0.1; // Estimate 100KB per transaction

    if (this.baseConfig.threadCount > 1000) {
      notes.push('High thread count detected. Consider distributed load generation.');
      estimateCpuCores *= 1.5;
      estimateMemoryMB *= 1.5;
    }

    if (this.baseConfig.duration > 3600) {
      notes.push('Long test duration detected. Monitor for memory leaks.');
      estimateMemoryMB *= 1.2;
    }

    return {
      estimateCpuCores: Math.ceil(estimateCpuCores),
      estimateMemoryMB: Math.ceil(estimateMemoryMB),
      estimateBandwidthMbps: Math.ceil(estimateBandwidthMbps),
      notes,
    };
  }

  /**
   * Get current load model configuration
   */
  public getConfig(): LoadModelConfig {
    return { ...this.baseConfig };
  }

  /**
   * Set new configuration
   */
  public setConfig(config: Partial<LoadModelConfig>): void {
    this.baseConfig = { ...this.baseConfig, ...config };
  }

  /**
   * Validate load model configuration
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.baseConfig.threadCount <= 0) {
      errors.push('Thread count must be greater than 0');
    }

    if (this.baseConfig.rampUpTime < 0) {
      errors.push('Ramp-up time cannot be negative');
    }

    if (this.baseConfig.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (this.baseConfig.iterations < 0) {
      errors.push('Iterations cannot be negative');
    }

    if (this.baseConfig.rampUpTime > this.baseConfig.duration) {
      errors.push('Ramp-up time cannot exceed total duration');
    }

    if (this.baseConfig.connectionTimeout < 0 || this.baseConfig.responseTimeout < 0) {
      errors.push('Timeouts cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate summary report
   */
  public generateReport(): string {
    const validation = this.validateConfig();
    const recommendations = this.generateResourceRecommendations();
    const throughput = this.calculateExpectedThroughput(1000); // Assume 1s avg transaction

    const lines: string[] = [];

    lines.push('=== Load Model Report ===');
    lines.push('');
    lines.push('Configuration:');
    lines.push(`  Thread Count: ${this.baseConfig.threadCount}`);
    lines.push(`  Ramp-up Time: ${this.baseConfig.rampUpTime}s`);
    lines.push(`  Duration: ${this.baseConfig.duration}s`);
    lines.push(`  Iterations: ${this.baseConfig.iterations}`);
    lines.push(`  Connection Timeout: ${this.baseConfig.connectionTimeout}ms`);
    lines.push(`  Response Timeout: ${this.baseConfig.responseTimeout}ms`);
    lines.push('');

    lines.push('Projected Throughput (assuming 1s per transaction):');
    lines.push(`  Transactions/sec: ${throughput.transactionsPerSecond}`);
    lines.push(`  Transactions/min: ${throughput.transactionsPerMinute}`);
    lines.push(`  Total Transactions: ${throughput.totalTransactions}`);
    lines.push('');

    lines.push('Resource Recommendations:');
    lines.push(`  CPU Cores: ${recommendations.estimateCpuCores}`);
    lines.push(`  Memory: ${recommendations.estimateMemoryMB}MB`);
    lines.push(`  Bandwidth: ${recommendations.estimateBandwidthMbps}Mbps`);

    if (recommendations.notes.length > 0) {
      lines.push('');
      lines.push('Notes:');
      for (const note of recommendations.notes) {
        lines.push(`  - ${note}`);
      }
    }

    lines.push('');
    if (validation.valid) {
      lines.push('✓ Configuration is valid');
    } else {
      lines.push('✗ Configuration has errors:');
      for (const error of validation.errors) {
        lines.push(`  - ${error}`);
      }
    }

    return lines.join('\n');
  }
}

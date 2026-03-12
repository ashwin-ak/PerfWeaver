import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { PerfWeaverConfig } from '../types';

/**
 * Configuration Manager
 * Loads and manages PerfWeaver configuration from YAML files
 */
export class ConfigurationManager {
  private config: PerfWeaverConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || './perfweaver.config.yaml';
    this.config = this.getDefaultConfig();

    if (configPath && fs.existsSync(configPath)) {
      this.loadFromFile(configPath);
    }
  }

  /**
   * Load configuration from YAML file
   */
  public loadFromFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = yaml.load(content) as any;

      if (data) {
        this.config = this.mergeConfig(this.getDefaultConfig(), data);
        this.configPath = filePath;
      }
    } catch (error) {
      console.error(`Failed to load configuration from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load configuration from JSON object
   */
  public loadFromObject(obj: Partial<PerfWeaverConfig>): void {
    this.config = this.mergeConfig(this.getDefaultConfig(), obj);
  }

  /**
   * Merge user config with defaults
   */
  private mergeConfig(
    defaults: PerfWeaverConfig,
    userConfig: any
  ): PerfWeaverConfig {
    return {
      filters: { ...defaults.filters, ...userConfig.filters },
      parallelDetection: {
        ...defaults.parallelDetection,
        ...userConfig.parallelDetection,
      },
      correlation: {
        ...defaults.correlation,
        ...userConfig.correlation,
      },
      parameterization: {
        ...defaults.parameterization,
        ...userConfig.parameterization,
      },
      thinkTime: { ...defaults.thinkTime, ...userConfig.thinkTime },
      loadModel: { ...defaults.loadModel, ...userConfig.loadModel },
      tools: { ...defaults.tools, ...userConfig.tools },
      output: { ...defaults.output, ...userConfig.output },
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PerfWeaverConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get specific configuration section
   */
  public getSection<K extends keyof PerfWeaverConfig>(section: K): PerfWeaverConfig[K] {
    return this.config[section];
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<PerfWeaverConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Save configuration to file
   */
  public saveToFile(filePath: string): void {
    try {
      const yaml_content = yaml.dump(this.config);
      fs.writeFileSync(filePath, yaml_content, 'utf-8');
      this.configPath = filePath;
    } catch (error) {
      console.error(`Failed to save configuration to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PerfWeaverConfig {
    return {
      filters: {
        ignoreExtensions: [
          'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
          'css', 'woff', 'woff2', 'ttf', 'eot',
        ],
        ignoreResourceTypes: ['image', 'stylesheet', 'font', 'media'],
        ignorePatterns: ['.*analytics.*', '.*tracking.*', '.*beacon.*'],
      },
      parallelDetection: {
        overlapThresholdMs: 40,
        minParallelRequests: 2,
      },
      correlation: {
        enableAutoCorrelation: true,
        extractors: [
          { type: 'json', patterns: ['.*token.*', '.*id.*', '.*session.*'] },
        ],
      },
      parameterization: {
        envVars: ['BASE_URL', 'AUTH_TOKEN', 'USER_ID'],
        datasets: [],
      },
      thinkTime: {
        enabled: true,
        percentile: 50,
        minThinkTime: 100,
        maxThinkTime: 30000,
      },
      loadModel: {
        threadCount: 10,
        rampUpTime: 60,
        duration: 300,
        iterations: 1,
        connectionTimeout: 10000,
        responseTimeout: 30000,
      },
      tools: {
        enabled: ['jmeter', 'k6'],
      },
      output: {
        directory: './scripts',
        logLevel: 'info',
        sourceMaps: true,
        formatCode: true,
      },
    };
  }

  /**
   * Validate configuration
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.loadModel.threadCount <= 0) {
      errors.push('loadModel.threadCount must be greater than 0');
    }

    if (this.config.loadModel.duration <= 0) {
      errors.push('loadModel.duration must be greater than 0');
    }

    if (this.config.parallelDetection.overlapThresholdMs < 0) {
      errors.push('parallelDetection.overlapThresholdMs cannot be negative');
    }

    if (this.config.thinkTime.minThinkTime < 0 || this.config.thinkTime.maxThinkTime < 0) {
      errors.push('thinkTime min and max cannot be negative');
    }

    if (this.config.thinkTime.minThinkTime > this.config.thinkTime.maxThinkTime) {
      errors.push('thinkTime.minThinkTime cannot exceed maxThinkTime');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Print configuration summary
   */
  public printSummary(): void {
    console.log('=== PerfWeaver Configuration ===');
    console.log(`Configuration file: ${this.configPath}`);
    console.log('');
    console.log('Load Model:');
    console.log(`  Threads: ${this.config.loadModel.threadCount}`);
    console.log(`  Ramp-up: ${this.config.loadModel.rampUpTime}s`);
    console.log(`  Duration: ${this.config.loadModel.duration}s`);
    console.log('');
    console.log('Tools Enabled:');
    for (const tool of this.config.tools.enabled) {
      console.log(`  - ${tool}`);
    }
  }
}

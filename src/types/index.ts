/**
 * Core types and interfaces used across PerfWeaver modules
 */

/**
 * Represents a single HTTP request from HAR
 */
export interface RequestNode {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers: Record<string, string>;
  payload?: string;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  responseStatus: number;
  startTime: number; // Unix timestamp in ms
  endTime: number; // Unix timestamp in ms
  duration: number; // In ms
  initiator?: {
    type: string;
    url?: string;
  };
  resourceType?: string;
  priority?: string;
}

/**
 * Represents a sequence of requests that must happen serially
 */
export interface SequentialBlock {
  id: string;
  parentId?: string;
  requests: RequestNode[];
  startTime: number;
  endTime: number;
  thinkTimes: Record<string, number>; // Between request IDs
}

/**
 * Represents requests that execute in parallel
 */
export interface ParallelBlock {
  id: string;
  parentId?: string;
  requests: RequestNode[];
  startTime: number;
  endTime: number;
}

/**
 * A behavioral block can be either sequential or parallel
 */
export type BehaviorBlock = SequentialBlock | ParallelBlock;

/**
 * Represents a logical user transaction (e.g., Login, Checkout)
 */
export interface Transaction {
  id: string;
  name: string;
  description?: string;
  blocks: BehaviorBlock[];
  correlationVariables: CorrelationVariable[];
  parameterizedVariables: string[]; // Variable names used
  startTime: number;
  endTime: number;
  duration: number; // In ms
}

/**
 * Represents a dynamically extracted value from responses
 */
export interface CorrelationVariable {
  id: string;
  name: string;
  sourceRequestId: string;
  extractionMethod: 'json' | 'regex' | 'xpath';
  extractionPath: string;
  extractedValue?: string;
  referencedInRequests: string[]; // Request IDs that use this variable
}

/**
 * Represents a parameterization variable
 */
export interface ParameterizationVariable {
  name: string;
  type: 'env' | 'csv' | 'constant';
  defaultValue?: string;
  sourceFile?: string; // For CSV
  column?: string; // For CSV
}

/**
 * Complete behavioral model of the HAR
 */
export interface BehaviorModel {
  id: string;
  transactions: Transaction[];
  globalVariables: ParameterizationVariable[];
  loadModelConfig: LoadModelConfig;
  thinkTimeConfig: ThinkTimeConfig;
}

/**
 * Load testing configuration
 */
export interface LoadModelConfig {
  threadCount: number;
  rampUpTime: number; // In seconds
  duration: number; // In seconds
  iterations: number;
  connectionTimeout: number; // In ms
  responseTimeout: number; // In ms
}

/**
 * Think time configuration and data
 */
export interface ThinkTimeConfig {
  enabled: boolean;
  percentile: number;
  minThinkTime: number; // In ms
  maxThinkTime: number; // In ms
}

/**
 * Overall PerfWeaver configuration
 */
export interface PerfWeaverConfig {
  filters: FilterConfig;
  parallelDetection: ParallelDetectionConfig;
  correlation: CorrelationConfig;
  parameterization: ParameterizationConfig;
  thinkTime: ThinkTimeConfig;
  loadModel: LoadModelConfig;
  tools: ToolsConfig;
  output: OutputConfig;
}

/**
 * Resource filtering configuration
 */
export interface FilterConfig {
  ignoreExtensions: string[];
  ignoreResourceTypes: string[];
  ignorePatterns: string[];
}

/**
 * Parallel detection configuration
 */
export interface ParallelDetectionConfig {
  overlapThresholdMs: number;
  minParallelRequests: number;
}

/**
 * Correlation engine configuration
 */
export interface CorrelationConfig {
  enableAutoCorrelation: boolean;
  extractors: {
    type: 'json' | 'regex' | 'xpath';
    patterns: string[];
  }[];
}

/**
 * Parameterization configuration
 */
export interface ParameterizationConfig {
  envVars: string[];
  datasets: string[];
}

/**
 * Tools configuration
 */
export interface ToolsConfig {
  enabled: ('jmeter' | 'k6' | 'gatling' | 'locust' | 'playwright')[];
  jmeter?: Record<string, any>;
  k6?: Record<string, any>;
  gatling?: Record<string, any>;
  locust?: Record<string, any>;
  playwright?: Record<string, any>;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  directory: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sourceMaps: boolean;
  formatCode: boolean;
}

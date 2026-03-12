/**
 * PerfWeaver - Main Index
 * Exports all public APIs
 */

// Types
export * from './types';

// Core modules
export { HARParser, ResourceFilter, loadHARFile, saveHARFile, validateHAR } from './core/har-parser';
export { BehaviorModelingEngine } from './core/behavior-model';
export { TransactionDetectionEngine, CorrelationEngine } from './core/correlation-engine';
export { ParameterizationEngine } from './core/parameterization';
export { ThinkTimeModelingEngine } from './core/think-time';
export { LoadModelGenerator } from './core/load-model';

// Adapters
export {
  IToolAdapter,
  BaseToolAdapter,
  JMeterAdapter,
  K6Adapter,
  GatlingAdapter,
  LocustAdapter,
  PlaywrightAdapter,
} from './adapters';

// Configuration
export { ConfigurationManager } from './config';

// CLI
export { runCLI } from './cli/cli';

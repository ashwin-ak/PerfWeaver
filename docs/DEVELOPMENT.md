# PerfWeaver Development Guide

This guide provides developers with information for extending and improving PerfWeaver.

## Architecture Overview

PerfWeaver uses a modular, layered architecture:

### Core Pipeline

```
HAR File
    ↓
HARParser (extracts RequestNodes)
    ↓
ResourceFilter (excludes noise)
    ↓
BehaviorModelingEngine (detects blocks)
    ↓
TransactionDetectionEngine (groups transactions)
    ↓
CorrelationEngine (identifies dynamic values)
    ↓
ParameterizationEngine (replaces with variables)
    ↓
ThinkTimeModelingEngine (calculates delays)
    ↓
LoadModelGenerator (configures load)
    ↓
ToolAdapter (generates scripts)
    ↓
Output Script (JMX, JS, Scala, Python, TypeScript)
```

### Key Design Patterns

1. **Single Responsibility**: Each module has one job
2. **Composition**: Modules are combined via orchestration
3. **Type Safety**: Full TypeScript typing throughout
4. **Testability**: Pure functions where possible
5. **Configurability**: External config drives behavior

## Core Modules

### HAR Parser (`src/core/har-parser/`)

Converts HAR JSON into typed RequestNode objects.

**Key Classes:**
- `HARParser`: Main parser class
- `ResourceFilter`: Filters requests by pattern
- HAR type definitions

**Entry Point:**
```typescript
const parser = new HARParser(harData, filterConfig);
const requests = parser.parse();
```

### Behavior Modeling (`src/core/behavior-model/`)

Detects sequential and parallel request execution patterns.

**Key Classes:**
- `BehaviorModelingEngine`: Analyzes timing relationships
- Utilities for visualization and analysis

**Key Methods:**
- `analyzeRequests()`: Convert requests to behavior blocks
- `detectNavigationBoundaries()`: Find page load boundaries
- `mergeSequentialBlocks()`: Consolidate related blocks

### Transaction Detection (`src/core/correlation-engine/`)

Groups behavior blocks into logical user transactions.

**Key Classes:**
- `TransactionDetectionEngine`: Groups blocks into transactions

**Key Methods:**
- `detectTransactions()`: Create transaction groups
- `mergeTransactions()`: Consolidate similar transactions
- `inferTransactionName()`: Auto-name from URL patterns

### Correlation Engine (`src/core/correlation-engine/`)

Detects dynamic values that need correlation.

**Key Classes:**
- `CorrelationEngine`: Main detection engine
- `JSONExtractor`, `RegexExtractor`, `XPathExtractor`: Value extractors

**Key Methods:**
- `detectCorrelations()`: Find all variables in transactions
- `extractValue()`: Extract specific values
- `findUsageInRequests()`: Track where values are used

### Parameterization (`src/core/parameterization/`)

Replaces variable values with ${VAR} references.

**Key Classes:**
- `ParameterizationEngine`: Variable replacement

**Key Methods:**
- `parameterizeTransactions()`: Replace values in all transactions
- `parameterizeRequest()`: Replace values in single request
- `generateParamScript()`: Output config in various formats

### Think Time Modeling (`src/core/think-time/`)

Calculates and applies realistic user delays.

**Key Classes:**
- `ThinkTimeModelingEngine`: Calculates and applies delays

**Key Methods:**
- `calculateThinkTimes()`: Extract delays from HAR
- `getPercentileThinkTime()`: Get specific percentile
- `applyThinkTimePattern()`: Apply delay pattern to transactions

### Load Model Generator (`src/core/load-model/`)

Configures load testing parameters.

**Key Classes:**
- `LoadModelGenerator`: Load model configuration

**Key Methods:**
- `generateLoadModel()`: Create optimized load model
- `generateSteppedLoadProfile()`: Stepped load pattern
- `generateSpikeLoadProfile()`: Spike pattern
- `calculateExpectedThroughput()`: Predict performance
- `validateConfig()`: Verify configuration

## Adapter System

All tool adapters inherit from `BaseToolAdapter`:

```typescript
export abstract class BaseToolAdapter implements IToolAdapter {
  abstract readonly toolName: string;
  abstract readonly fileExtension: string;
  
  abstract generate(
    transactions: Transaction[], 
    loadConfig: LoadModelConfig
  ): string;
}
```

### Adding a New Tool

1. Create `src/adapters/{toolname}/` directory
2. Implement `{toolname}-adapter.ts`
3. Export from `src/adapters/index.ts`
4. Add tests
5. Update documentation

Example:
```typescript
import { BaseToolAdapter } from '../base-adapter';

export class MyToolAdapter extends BaseToolAdapter {
  readonly toolName = 'mytool';
  readonly fileExtension = '.myscript';
  
  public generate(transactions: Transaction[], loadConfig: LoadModelConfig): string {
    // Generate script string
    return '';
  }
}
```

## Type System

PerfWeaver uses strict TypeScript typing. Key types in `src/types/index.ts`:

```typescript
// Single request
RequestNode {
  id, url, method, headers, payload,
  responseBody, responseStatus,
  startTime, endTime, duration,
  ...
}

// Sequential requests
SequentialBlock {
  id, requests[], startTime, endTime, thinkTimes
}

// Parallel requests
ParallelBlock {
  id, requests[], startTime, endTime
}

// User action
Transaction {
  id, name, blocks[], 
  correlationVariables[], parameterizedVariables[],
  startTime, endTime, duration
}

// Variable extracted from response
CorrelationVariable {
  id, name, sourceRequestId,
  extractionMethod, extractionPath,
  extractedValue, referencedInRequests[]
}
```

## Testing

### Unit Tests (`tests/unit/`)

Test individual components:

```bash
npm test -- tests/unit/core.test.ts
```

### Integration Tests (`tests/integration/`)

Test end-to-end workflows:

```bash
npm test -- tests/integration/end-to-end.test.ts
```

### Test Structure

```typescript
describe('Component', () => {
  it('should do something', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = component.method(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Configuration Management

`ConfigurationManager` loads YAML config:

```typescript
const manager = new ConfigurationManager('./perfweaver.config.yaml');
const config = manager.getConfig();
manager.updateConfig({ loadModel: { threadCount: 20 } });
manager.saveToFile('./new-config.yaml');
```

Default values are applied when config doesn't specify values.

## CLI Architecture

CLI uses yargs for command routing:

- `src/cli/cli.ts`: Main CLI entry
- `src/cli/commands/`: Individual command handlers
- `bin/perfweaver.ts`: Executable entry point

Add command by creating a new file:

```typescript
// commands/mycommand.command.ts
export const command = 'mycommand <arg>';
export const describe = 'Description';
export const builder = { /* yargs options */ };
export async function handler(argv) { /* implementation */ }
```

## Performance Considerations

1. **Memory**: Proportional to HAR size
   - ~10MB HAR → ~100MB memory
2. **Speed**: Sub-second for typical HARs
   - Parsing: O(n) requests
   - Behavior analysis: O(n²) for parallel detection
3. **Optimization**: 
   - Cache parsed HAR
   - Stream large files
   - Precompile regex patterns

## Common Patterns

### Iterating Transactions and Requests

```typescript
for (const transaction of transactions) {
  for (const block of transaction.blocks) {
    for (const request of block.requests) {
      // Process request
    }
  }
}
```

### Extracting Timing Information

```typescript
const duration = request.endTime - request.startTime;
const thinkTime = nextRequest.startTime - request.endTime;
const totalDuration = lastBlock.endTime - firstBlock.startTime;
```

### Cloning Configuration

```typescript
const newConfig = { ...oldConfig };
newConfig.loadModel = { ...oldConfig.loadModel, threadCount: 50};
```

## Debugging

### Enable Verbose Logging

```bash
perfweaver generate --verbose --tool jmeter traffic.har
```

### Print Configuration

```typescript
const manager = new ConfigurationManager();
manager.printSummary();
```

### Visualize Behavior

```bash
perfweaver visualize traffic.har
```

## Contributing Code

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following code style
3. Add tests for new functionality
4. Run tests: `npm test`
5. Lint: `npm run lint`
6. Commit: `git commit -m "feat: description"`
7. Push and create PR

## Release Process

1. Update version: `npm version minor`
2. Update CHANGELOG.md
3. Rebuild: `npm run build`
4. Run tests: `npm test`
5. Tag: `git tag v0.2.0`
6. Publish: `npm publish`

## Related Documentation

- [User Guide](DOCUMENTATION.md)
- [Performance Tuning](docs/PERFORMANCE_TUNING.md)
- [Contributing](CONTRIBUTING.md)

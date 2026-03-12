# PerfWeaver Documentation

Complete documentation for PerfWeaver.

## Table of Contents

1. [Getting Started](#getting-started)
2. [CLI Commands](#cli-commands)
3. [Configuration](#configuration)
4. [API Guide](#api-guide)
5. [Supported Tools](#supported-tools)
6. [Architecture](#architecture)

## Getting Started

### Installation

```bash
npm install perfweaver
```

### Quick Start

1. Capture a HAR file from your browser (DevTools → Network → Export HAR)
2. Create a configuration file (optional):
   ```bash
   cp perfweaver.config.example.yaml perfweaver.config.yaml
   ```
3. Generate a load testing script:
   ```bash
   perfweaver generate --tool jmeter --har mytraffic.har --output mytest.jmx
   ```

## CLI Commands

### Generate Script

**Command:** `perfweaver generate <tool> <har> [options]`

Generate a load testing script from a HAR file.

**Options:**
- `--tool` (required): Target tool (jmeter, k6, gatling, locust, playwright)
- `--har` (required): Path to HAR file
- `--output` (-o): Output file path (default: `script.<ext>`)
- `--config` (-c): Configuration file path (default: `./perfweaver.config.yaml`)
- `--verbose` (-v): Enable verbose logging

**Examples:**

```bash
# Generate JMeter script
perfweaver generate jmeter traffic.har

# Generate k6 script with custom output
perfweaver generate k6 traffic.har -o mytest.js

# Use custom configuration
perfweaver generate gatling traffic.har -c my-config.yaml
```

### Analyze HAR

**Command:** `perfweaver analyze <har> [options]`

Analyze a HAR file and generate a detailed report.

**Options:**
- `--verbose` (-v): Enable verbose logging

**Example:**

```bash
perfweaver analyze traffic.har
```

**Output includes:**
- Request count and duration
- Requests by method and type
- Behavior blocks (sequential/parallel)
- Transaction breakdown
- Correlation variables
- Think time statistics

### Visualize Traffic

**Command:** `perfweaver visualize <har> [options]`

Create a text-based visualization of request flow.

**Options:**
- `--verbose` (-v): Enable verbose logging

**Example:**

```bash
perfweaver visualize traffic.har
```

## Configuration

### Configuration File

Create `perfweaver.config.yaml`:

```yaml
# Resource filtering
filters:
  ignoreExtensions:
    - png
    - jpg
    - css
  ignoreResourceTypes:
    - image
    - stylesheet

# Parallel request detection
parallelDetection:
  overlapThresholdMs: 40  # Requests overlapping by 40ms+ are parallel
  minParallelRequests: 2

# Automatic correlation
correlation:
  enableAutoCorrelation: true
  extractors:
    - type: json
      patterns:
        - ".*token.*"
        - ".*id.*"

# Environment variables to parameterize
parameterization:
  envVars:
    - BASE_URL
    - AUTH_TOKEN
    - USER_ID

# Think time configuration
thinkTime:
  enabled: true
  percentile: 50        # Use 50th percentile (median)
  minThinkTime: 100     # Minimum 100ms
  maxThinkTime: 30000   # Maximum 30 seconds

# Load testing parameters
loadModel:
  threadCount: 10       # Concurrent users
  rampUpTime: 60        # Seconds to reach full load
  duration: 300         # Total test duration in seconds
  iterations: 1         # Iterations per user
  connectionTimeout: 10000
  responseTimeout: 30000

# Which tools to generate scripts for
tools:
  enabled:
    - jmeter
    - k6
    - gatling

# Output settings
output:
  directory: ./scripts
  logLevel: info
  formatCode: true
```

## API Guide

### Using PerfWeaver as a Library

```typescript
import {
  HARParser,
  BehaviorModelingEngine,
  TransactionDetectionEngine,
  CorrelationEngine,
  JMeterAdapter,
  ConfigurationManager,
} from 'perfweaver';

// Load configuration
const config = new ConfigurationManager('./perfweaver.config.yaml');

// Parse HAR
import fs from 'fs';
const harData = JSON.parse(fs.readFileSync('traffic.har', 'utf-8'));
const parser = new HARParser(harData, config.getSection('filters'));
const requests = parser.parse();

// Model behavior
const behaviorEngine = new BehaviorModelingEngine();
const blocks = behaviorEngine.analyzeRequests(requests);

// Detect transactions
const transactionEngine = new TransactionDetectionEngine();
const transactions = transactionEngine.detectTransactions(blocks);

// Detect correlations
const correlationEngine = new CorrelationEngine();
const correlations = correlationEngine.detectCorrelations(transactions);

// Generate script
const adapter = new JMeterAdapter();
const script = adapter.generate(transactions, config.getSection('loadModel'));
```

### Key Classes

#### HARParser
```typescript
const parser = new HARParser(harData, filterConfig);
const requests = parser.parse();
const stats = parser.getStatistics();
```

#### BehaviorModelingEngine
```typescript
const engine = new BehaviorModelingEngine(overlapThresholdMs, minParallelRequests);
const blocks = engine.analyzeRequests(requests);
const stats = engine.getStatistics(blocks);
```

#### TransactionDetectionEngine
```typescript
const engine = new TransactionDetectionEngine();
const transactions = engine.detectTransactions(blocks);
engine.addTransactionPattern('custom', /pattern/i);
```

#### CorrelationEngine
```typescript
const engine = new CorrelationEngine();
const variables = engine.detectCorrelations(transactions);
const value = engine.extractValue(responseBody, 'json', 'pathToValue');
```

#### ParameterizationEngine
```typescript
const engine = new ParameterizationEngine();
const parameterized = engine.parameterizeTransactions(
  transactions,
  correlationVariables,
  envVars
);
```

## Supported Tools

### Apache JMeter
- Output format: JMX
- Features: Full transaction support, correlation variables, think times
- File extension: `.jmx`

### k6
- Output format: JavaScript
- Features: Group-based transactions, check() assertions, sleep()
- File extension: `.js`

### Gatling
- Output format: Scala
- Features: Scenario-based, rampUsers, assertions
- File extension: `.scala`

### Locust
- Output format: Python
- Features: Task-based, custom wait times
- File extension: `.py`

### Playwright
- Output format: TypeScript
- Features: API mode testing, assertion support
- File extension: `.ts`

## Architecture

PerfWeaver uses a layered, modular architecture:

```
HAR Input
    ↓
HAR Parsing Engine (extracts requests)
    ↓
Behavior Modeling (detects sequences & parallelism)
    ↓
Transaction Detection (groups into user actions)
    ↓
Correlation Engine (detects dynamic values)
    ↓
Parameterization (replaces with variables)
    ↓
Think Time Modeling (realistic pacing)
    ↓
Load Model Generator (configures load profiles)
    ↓
Tool Adapters (generates tool-specific scripts)
    ↓
Output (JMX, JS, Scala, Python, TypeScript)
```

### Design Principles

1. **Modularity**: Each component is independent and testable
2. **Extensibility**: Easy to add new tools and features
3. **Accuracy**: Preserves real user behavior from HAR
4. **Configuration**: External config files drive behavior
5. **Clarity**: Type-safe TypeScript throughout

## Performance Considerations

- HAR files under 10MB process in <1 second
- Memory usage proportional to HAR size (~100KB per 1MB HAR)
- Suitable for CI/CD integration
- Supports distributed generation (coming soon)

## Troubleshooting

### No requests found after parsing
- Check if requests are being filtered
- Review `perfweaver.config.yaml` filters
- Use `perfweaver analyze` to debug

### Transactions not detected correctly
- Adjust think time threshold in `parallelDetection.overlapThresholdMs`
- Add custom transaction patterns
- Review automatically detected patterns

### Correlation variables not found
- Ensure `correlation.enableAutoCorrelation` is true
- Check response body format (JSON/XML/text)
- Use `perfweaver analyze` to see detected variables

## Getting Help

- Review examples in `examples/` directory
- Check unit tests in `tests/` for usage patterns
- Open an issue on GitHub
- Read contributing guide for development setup

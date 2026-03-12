# PerfWeaver Architecture

Comprehensive overview of PerfWeaver's design and implementation.

## System Overview

PerfWeaver transforms browser HTTP Archive (HAR) files into production-ready load testing scripts through a pipeline of modular components.

### Data Flow

```
┌─────────────────────┐
│   HAR JSON File     │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────┐
│  HAR Parser Module       │
│ (Extract RequestNodes)   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Resource Filter         │
│ (Remove static assets)   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Behavior Modeling       │
│ (Detect Seq/Parallel)    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Transaction Detection   │
│ (Group into actions)     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Correlation Engine      │
│ (Find variables)         │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Parameterization        │
│ (Replace with vars)      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Think Time Modeling     │
│ (Calculate delays)       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Load Model Generator    │
│ (Configure virtual users)│
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Tool Adapter            │
│ (Generate target format) │
└──────────┬───────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Output Script                  │
│  (JMX, JS, Scala, Python, TS)   │
└─────────────────────────────────┘
```

## Module Architecture

### Layer 1: Input Processing

#### HAR Parser Module (`src/core/har-parser/`)

**Responsibility**: Convert HAR JSON into structured request objects

**Components:**
- `HARParser`: Main parser class
- `ResourceFilter`: Filter static resources
- Type definitions for HAR structure
- Utility functions for data extraction

**Key Functionality:**
- Parse HAR 1.2 standard format
- Extract HTTP headers, payloads, timing
- Validate request/response pairs
- Generate request statistics
- Support for streaming large HAR files

**Configuration:**
```typescript
interface FilterConfig {
  enabled: boolean;
  mode: 'strict' | 'moderate' | 'lenient';
  excludeStaticResources: boolean;
  customExclude: ResourceFilter[];
}
```

**Algorithms:**
- **Time Normalization**: Convert absolute timestamps to relative offsets
- **Header Parsing**: Extract cookies, auth tokens, custom headers
- **Payload Analysis**: Parse JSON/form-encoded/XML payloads
- **Timing Adjustment**: Account for browser overhead

---

### Layer 2: Behavior Analysis

#### Behavior Modeling Engine (`src/core/behavior-model/`)

**Responsibility**: Detect sequential and parallel request execution patterns

**Key Components:**
- `BehaviorModelingEngine`: Main analysis engine
- Visualization and reporting utilities

**Key Algorithms:**

1. **Parallelism Detection** (O(n²))
   - Calculate time overlaps between requests
   - Use configurable threshold (default 40ms)
   - Group overlapping requests into ParallelBlocks
   - Example:
     ```
     Request A: [100ms --|--200ms]
     Request B:        [120ms --|--180ms]  ← Overlaps with A
     Result: ParallelBlock { A, B }
     ```

2. **Navigation Boundary Detection**
   - Identify page load boundaries
   - Detect navigation events
   - Separate sequential flows

3. **Block Consolidation**
   - Merge adjacent sequential blocks
   - Identify inter-block think times
   - Build block timeline

**Output Structure:**
```typescript
interface BehaviorModel {
  id: string;
  blocks: BehaviorBlock[];
  totalDuration: number;
  parallelBlocksCount: number;
  averageParallelism: number;
  statistics: {
    minRequestDuration: number;
    maxRequestDuration: number;
    avgRequestDuration: number;
  };
}
```

---

#### Transaction Detection Engine (`src/core/correlation-engine/`)

**Responsibility**: Group related requests into logical user transactions

**Key Features:**

1. **Pattern-Based Detection**
   - Built-in patterns: login, logout, search, checkout, navigation, profile
   - URL matching and fuzzy matching
   - HTTP method analysis

2. **Transaction Merging**
   - Similarity scoring between blocks
   - Consolidate related transactions
   - Custom pattern support

3. **Auto-Naming**
   - Extract names from URLs
   - Use HTTP method + resource combination
   - Pattern-based naming (login, checkout, etc.)

**Example Detection:**
```
Requests:
  POST /api/auth/login → [ 200 OK, Set-Cookie session_id ]
  GET /api/user/profile
  GET /api/user/preferences

Detected Transaction:
  - Name: "Login"
  - Requests: [login, profile, preferences]
  - Correlation Variables: [session_id]
```

---

### Layer 3: Dynamic Value Processing

#### Correlation Engine (`src/core/correlation-engine/`)

**Responsibility**: Auto-detect and extract dynamic values (tokens, session IDs, etc.)

**Multi-Extractor Architecture:**

1. **JSON Extractor**
   - Parse response JSON
   - Use JSONPath expressions
   - Extract nested values
   - Example: `response.data.token` → extracted token value

2. **Regex Extractor**
   - Pattern matching on response body
   - Capture groups for value extraction
   - Fallback when JSON parsing fails
   - Example: `Set-Cookie: GUID=([a-f0-9]+);` → GUID value

3. **XPath Extractor**
   - XML/HTML response parsing
   - XPath expression evaluation
   - HTML form field extraction
   - Example: `/html/body/script[1]/text()` → JavaScript code

**Detection Algorithm:**
1. Scan response bodies for patterns
2. Identify candidate variables
3. Track usage in subsequent requests
4. Confirm correlation through reference analysis
5. Extract values using appropriate extractor
6. Store correlation metadata

```typescript
interface CorrelationVariable {
  id: string;
  name: string;
  sourceRequestId: string;
  extractionMethod: 'json' | 'regex' | 'xpath';
  extractionPath: string;
  extractedValue: string;
  referencedInRequests: string[];
  confidence: number; // 0-1
}
```

---

### Layer 4: Parameterization

#### Parameterization Engine (`src/core/parameterization/`)

**Responsibility**: Replace hardcoded values with variable references

**Variable Categories:**

1. **Correlation Variables** (from responses)
   - Dynamic tokens
   - Session IDs
   - Timestamps
   - Resource IDs

2. **Environment Variables**
   - BASE_URL
   - API_KEY
   - USER_ID
   - ENVIRONMENT

3. **Data Variables**
   - From CSV datasets
   - From JSON files
   - From environment files

**Replacement Strategy:**
```typescript
// Original request
const request = {
  url: 'https://api.example.com/user/12345/profile',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...'
  }
};

// Parameterized request
const request = {
  url: '${BASE_URL}/user/${USER_ID}/profile',
  headers: {
    'Authorization': 'Bearer ${AUTH_TOKEN}'
  }
};
```

**Output Formats:**
- `.env` file (shell/bash)
- `config.json` (JSON)
- `data.csv` (CSV dataset)
- `variables.yaml` (YAML)

---

### Layer 5: Timing & Load Configuration

#### Think Time Modeling Engine (`src/core/think-time/`)

**Responsibility**: Calculate realistic user pacing between requests

**Percentile-Based Approach:**

```
Think time distribution from HAR:
  p50: 500ms   (50% of users wait ≤500ms)
  p75: 1200ms  (75% of users wait ≤1200ms)
  p90: 2000ms  (90% of users wait ≤2000ms)
  p95: 3000ms
  p99: 5000ms
```

**Algorithm:**
1. Extract inter-request delays from HAR timestamps
2. Sort delays by duration
3. Calculate requested percentile
4. Apply min/max bounds
5. Normalize for different transaction types

**Configuration:**
```typescript
interface ThinkTimeConfig {
  percentile: 'p50' | 'p75' | 'p90' | 'p95' | 'p99';
  minThinkTime: number; // milliseconds
  maxThinkTime: number;
  includeNavigationTime: boolean;
  randomVariation: boolean;
}
```

**Output:**
- Think times per transaction
- Distribution statistics
- Visual histogram
- Recommendations for tool settings

---

#### Load Model Generator (`src/core/load-model/`)

**Responsibility**: Configure load testing parameters

**Load Profiles:**

1. **Stepped Load**
   ```
   Users
      ^
      │     ┌─────
      │    ┌┘
    10├───┼─
      │
    1 │  /
      └─────────────── Time
   ```
   - Gradual user increase
   - Step-wise thread ramp
   - Common for baseline testing

2. **Spike Load**
   ```
   Users
      ^
      │       │
      │       │
    50├───────┼────
      │      ╱╲
    10├─────╱  ╲───
      │
      └─────────────── Time
   ```
   - Sudden traffic spike
   - Test system recovery
   - Identify breaking points

3. **Ramp-up Load**
   ```
   Users
      ^
      │           ██
      │        ╱╱╱
    100├─────╱
      │   ╱╱
      └─────────────── Time
   ```
   - Linear gradual increase
   - Smooth traffic ramp
   - Monitor system resources

**Validation:**
```typescript
interface LoadModelConfig {
  threadCount: number;      // Must be > 0
  rampUpDuration: number;   // Must be > 0
  duration: number;         // Must be > 0
  iterations: number;       // Must be > 0
  thinkTimeFactor: number;  // 0.5 - 2.0
  profile: 'stepped' | 'spike' | 'ramp';
  sustainDuration: number;  // For sustained profiles
}
```

**Recommendations Engine:**
- CPU cores based on thread count
- Memory requirements estimate
- Bandwidth prediction
- Optimal backend resources

---

### Layer 6: Output Generation

#### Base Tool Adapter (`src/adapters/base-adapter.ts`)

**Responsibility**: Common functionality for all tool adapters

**Design Pattern**: Adapter Pattern

```typescript
interface IToolAdapter {
  readonly toolName: string;
  readonly fileExtension: string;
  generate(
    transactions: Transaction[], 
    loadConfig: LoadModelConfig
  ): string;
}

abstract class BaseToolAdapter implements IToolAdapter {
  // Common methods for all adapters
  formatTransactionName(name: string): string
  escapeString(str: string): string
  formatURL(url: string): string
  msToSeconds(ms: number): number
}
```

**Template Functions:**
- `escapeString()`: Language-specific string escaping
- `formatURL()`: URL encoding and parameterization
- `formatHeaders()`: Convert header objects to tool format
- `formatPayload()`: Serialize request bodies
- `buildTransactionName()`: Create valid identifiers

---

#### Tool-Specific Adapters

**JMeter Adapter** (`src/adapters/jmeter/`)
- Output: JMX (XML format)
- Components: ThreadGroup, TransactionController, HTTPSampler
- Timing: ConstantTimer for think time
- Format: Nested HashTree structure

**k6 Adapter** (`src/adapters/k6/`)
- Output: JavaScript (ESM module)
- Components: group(), function calls, sleep()
- Timing: sleep(seconds) for think time
- Format: CommonJS exports with default function

**Gatling Adapter** (`src/adapters/gatling/`)
- Output: Scala code
- Components: Simulation class, scenarios, chains
- Timing: pause(seconds) for think time
- Format: Scala object with ExecutionConfigBuilder

**Locust Adapter** (`src/adapters/locust/`)
- Output: Python class definition
- Components: HttpUser subclass, @task decorators
- Timing: wait_time callable for think time
- Format: Python with class-based task definitions

**Playwright Adapter** (`src/adapters/playwright/`)
- Output: TypeScript test file
- Components: test.describe groups, test() functions
- Timing: await page.waitForLoadState() for pacing
- Format: Playwright API request spec format

---

## Type System

**All types defined in `src/types/index.ts`**

Key type hierarchies:

```typescript
// HAR-derived
RequestNode {
  id, url, method, httpVersion,
  headers, cookies, payload,
  responseStatus, responseHeaders, responseBody,
  startTime, endTime, duration,
  timings: { wait, receive, ssl, dns, ... }
}

// Behavior blocks
type BehaviorBlock = SequentialBlock | ParallelBlock

SequentialBlock {
  id, requests, startTime, endTime, thinkTimes
}

ParallelBlock {
  id, requests, startTime, endTime
}

// High-level actions
Transaction {
  id, name, blocks,
  correlationVariables, parameterizedVariables,
  startTime, endTime, duration
}

// Variables
CorrelationVariable {
  id, name, sourceRequestId,
  extractionMethod, extractionPath,
  extractedValue, referencedInRequests
}

ParameterizationVariable {
  id, name, value, source,
  dataFormat, variableReference
}

// Complete model
BehaviorModel {
  id, blocks, totalDuration,
  parallelBlocksCount, statistics
}

// Configuration
PerfWeaverConfig {
  filters: FilterConfig,
  loadModel: LoadModelConfig,
  tools: ToolsConfig,
  correlation: CorrelationConfig,
  parameterization: ParameterizationConfig,
  thinkTime: ThinkTimeConfig
}
```

---

## Configuration System

**Architecture**: YAML-based external configuration

**ConfigurationManager** responsibilities:
- Load YAML files
- Merge with defaults
- Validate against schema
- Provide type-safe accessor methods
- Save modified configs

**Default Values:**
```yaml
filters:
  enabled: true
  mode: moderate
  
loadModel:
  threadCount: 10
  rampUpDuration: 60
  duration: 300
  iterations: 1
  
correlation:
  enabled: true
  extractionMethods: [json, regex, xpath]
  
thinkTime:
  percentile: 90
  minThinkTime: 100
  maxThinkTime: 5000
```

---

## CLI Architecture

**Pattern**: Command-based interface with yargs routing

**Three Main Commands:**

1. **generate** - Create load testing scripts
   - `--tool`: Target tool (jmeter, k6, gatling, locust, playwright)
   - `--har`: Input HAR file path
   - `--config`: Optional config file
   - `--output`: Output filename
   - `--verbose`: Debug logging

2. **analyze** - Analyze HAR files
   - `--har`: Input HAR file
   - `--config`: Optional config file
   - `--format`: Output format (json, text, csv)
   - Shows: transactions, variables, statistics

3. **visualize** - Create text-based visualizations
   - `--har`: Input HAR file
   - Shows: request timeline, parallel blocks, think times

---

## Testing Architecture

### Unit Tests
- Pure function testing with Jest
- No external dependencies
- Fast execution (<100ms each)
- Coverage targets: core logic, edge cases

### Integration Tests
- End-to-end pipeline testing
- Sample HAR fixtures
- Validate output format correctness
- Verify data flow through layers

### Test Fixtures
- `examples/sample.har`: Login flow (3 requests)
- Mock configurations
- Expected output samples

---

## Key Design Principles

### 1. Single Responsibility
Each module has one clear purpose and can be tested independently.

### 2. Type Safety
Full TypeScript typing prevents runtime errors and enables IDE support.

### 3. Composition Over Inheritance
Modules are composed via orchestration, not deep inheritance hierarchies.

### 4. Immutability
Core data structures are treated as immutable where possible.

### 5. Configurability
External YAML configuration drives behavior, enabling flexibility.

### 6. Extensibility
Adapter pattern enables adding new tools without modifying harnesses.

### 7. Performance
Optimized for typical HAR files (1-100MB) with streaming support.

---

## Performance Characteristics

| Operation | Time | Space | Complexity |
|-----------|------|-------|------------|
| Parse HAR | O(n) | O(n) | Linear in requests |
| Filter Resources | O(n) | O(n) | Linear in requests |
| Behavior Analysis | O(n²) | O(n) | Quadratic (overlap detection) |
| Correlation | O(n*m) | O(m) | Linear in requests, responses |
| Parameterization | O(n) | O(n) | Linear in requests |
| Think Time | O(n log n) | O(n) | Sorting + percentile calc |
| Load Model | O(1) | O(n) | Constant time validation |
| Script Generation | O(n) | O(n) | Linear in transactions |

**Memory Usage:**
- 10MB HAR → ~100MB memory (10x expansion due to parsing)
- 100MB HAR → ~1GB memory
- Optimizations: streaming parser, chunked processing

---

## Extension Points

### Adding a New Tool Adapter
1. Create `src/adapters/{toolname}/` folder
2. Implement `{toolname}-adapter.ts` extending BaseToolAdapter
3. Implement `generate()` method
4. Add tests
5. Update adapter index

### Adding Custom Extractors
1. Implement `IValueExtractor` interface
2. Add to `CorrelationEngine.extractors`
3. Register extraction method
4. Add test cases

### Custom Transaction Patterns
1. Add pattern to `TransactionDetectionEngine.patterns`
2. Implement pattern matching logic
3. Add to configuration schema
4. Document in user guide

---

## Deployment & Distribution

### Build Process
```bash
npm run build          # TypeScript → JavaScript
npm run test           # Validate functionality
npm run lint           # Code quality
npm pack               # Create tarball
npm publish            # Publish to npm registry
```

### Package Structure
- `dist/`: Compiled JavaScript
- `src/`: TypeScript source
- `docs/`: User and developer documentation
- `examples/`: Sample HAR files
- `tests/`: Unit and integration tests

### Version Management
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Update CHANGELOG.md with releases
- Tag releases in git

---

## Future Evolution

### Short-term
- Enhanced correlation detection
- WebSocket protocol support
- GraphQL optimization
- Better performance profiling

### Medium-term
- Plugin/extension system
- Distributed load generation
- Cloud provider integration
- Advanced assertion generation

### Long-term
- Real-time HAR recording integration
- Enterprise clustering support
- Machine learning-based optimization
- Native GUI application
- Comprehensive monitoring dashboard

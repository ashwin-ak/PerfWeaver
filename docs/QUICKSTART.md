# PerfWeaver Quick Start

Get started with PerfWeaver in 5 minutes.

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- A HAR file (export from Chrome DevTools)

## Installation

### From Source

```bash
git clone https://github.com/ashwinkumarkulkarni/perfweaver.git
cd perfweaver
npm install
npm run build
```

### Global Installation

```bash
npm install -g perfweaver
```

## Basic Usage

### 1. Export HAR from Browser

**Chrome/Edge:**
1. Open DevTools (F12)
2. Go to Network tab
3. Perform user actions (login, search, etc.)
4. Right-click → Save all as HAR with content

**Firefox:**
1. Open DevTools (F12)
2. Go to Network tab
3. Right-click → Save All As HAR

### 2. Analyze Your HAR

```bash
perfweaver analyze your-traffic.har
```

Output shows:
- Total requests
- Parallel blocks detected
- Estimated think times
- Dynamic variables found
- Transaction breakdown

### 3. Generate Load Testing Script

```bash
# For k6
perfweaver generate --tool k6 --har your-traffic.har

# For JMeter
perfweaver generate --tool jmeter --har your-traffic.har

# For Gatling
perfweaver generate --tool gatling --har your-traffic.har

# For Locust
perfweaver generate --tool locust --har your-traffic.har

# For Playwright
perfweaver generate --tool playwright --har your-traffic.har
```

### 4. Visualize the Behavior

```bash
perfweaver visualize your-traffic.har
```

Shows text-based timeline of requests.

### 5. Run the Generated Script

#### k6
```bash
k6 run perfweaver-script.js
```

#### JMeter
```bash
jmeter -n -t perfweaver-script.jmx -l results.jtl
```

#### Gatling
```bash
mvn gatling:test -Dgatling.simulationClass=PerfWeaverSimulation
```

#### Locust
```bash
locust -f perfweaver-script.py --host https://yourapp.com
```

#### Playwright
```bash
npx playwright test perfweaver-script.ts
```

## Configuration File

Create `perfweaver.config.yaml`:

```yaml
# Resource filtering
filters:
  enabled: true
  mode: moderate
  customExclude:
    - patterns:
        - '\.(gif|ico|png|jpg|svg|webp|woff|woff2|ttf|eot)$'

# Load configuration
loadModel:
  threadCount: 10
  rampUpDuration: 60
  duration: 300
  iterations: 1
  
# Tool-specific settings
tools:
  jmeter:
    connectTimeout: 10000
    responseTimeout: 30000
  k6:
    summary: true
  gatling:
    packageName: com.example

# Correlation settings
correlation:
  enabled: true
  extractionMethods:
    - json
    - regex
    - xpath

# Parameterization settings
parameterization:
  enabled: true
  outputFormats:
    - env
    - json
    - csv

# Think time settings
thinkTime:
  percentile: 90
  minThinkTime: 100
  maxThinkTime: 5000
```

## Common Tasks

### Exclude More Resources

```yaml
filters:
  mode: strict
  customExclude:
    - extensions:
        - '.ttf'
        - '.woff'
```

### Increase Load

```yaml
loadModel:
  threadCount: 100
  rampUpDuration: 120
  duration: 600
```

### Change Think Time

```yaml
thinkTime:
  percentile: 75  # More aggressive
  minThinkTime: 50
  maxThinkTime: 2000
```

### Export Parameterization

```yaml
parameterization:
  outputFormats:
    - csv    # Generate CSV dataset
    - json   # Generate JSON config
    - env    # Generate .env file
```

## Example Workflows

### E-Commerce Load Test

1. Record checkout flow in HAR
2. `perfweaver analyze checkout.har` → see timing
3. `perfweaver generate --tool k6 --har checkout.har`
4. Edit `perfweaver.config.yaml`:
   ```yaml
   loadModel:
     threadCount: 50
     rampUpDuration: 120
     duration: 1800  # 30 minutes
   ```
5. `perfweaver generate --tool k6 --har checkout.har`
6. `k6 run perfweaver-script.js`

### API Load Test

1. Record API calls (use tools/postman to HAR converter)
2. `perfweaver analyze api-calls.har`
3. Generate for Locust (Python-based, great for APIs)
4. Adjust user count in config
5. Run distributed with Locust

### Spike Test

```yaml
loadModel:
  threadCount: 500      # Large spike
  rampUpDuration: 10    # Very quick ramp
  duration: 300         # Short test
```

## Choosing a Tool

| Tool | Best For | Learning Curve |
|------|----------|-----------------|
| **k6** | Cloud load testing, DevOps | Easy |
| **JMeter** | GUI-based testing, complex scenarios | Medium |
| **Gatling** | CI/CD integration, Scala projects | Medium |
| **Locust** | Distributed load testing, Python | Easy |
| **Playwright** | API testing, TypeScript projects | Easy |

## Troubleshooting

### "HAR file not found"
```bash
# Make sure file exists and path is correct
perfweaver analyze ./path/to/file.har
```

### "No transactions detected"
```bash
# HAR might have too much noise
# Use stricter filtering
filters:
  mode: strict
```

### "Correlation failed"
```bash
# Check if response bodies are included in HAR
# (Need "capture response bodies" option when exporting)
```

### Slow generation
```bash
# For large HARs (>100MB), filter more aggressively
filters:
  mode: strict
  customExclude:
    - extensions: ['.js', '.css', '.woff', '.png']
```

## Next Steps

1. Read [Full Documentation](DOCUMENTATION.md)
2. Check [Performance Tuning Guide](PERFORMANCE_TUNING.md)
3. Review [Contributing Guide](../CONTRIBUTING.md)
4. Explore examples in `examples/` directory

## Getting Help

- Check [Troubleshooting](DOCUMENTATION.md#troubleshooting-guide) in docs
- Review [Development Guide](DEVELOPMENT.md)
- Create GitHub issue or PR
- Contact maintainer

## Tips & Tricks

### Reduce File Size
```bash
# Convert HAR to CSV parameterization (compact format)
perfweaver generate --tool locust --har large.har
# Use generated params with CSV
```

### Generate Multiple Scripts
```bash
# Test with different tools to find best fit
for tool in jmeter k6 gatling locust; do
  perfweaver generate --tool $tool --har traffic.har
done
```

### Baseline Performance
```bash
# Generate lightweight test first
filters:
  mode: strict
loadModel:
  threadCount: 1
  iterations: 1
# Then scale up
```

Happy load testing! 🚀

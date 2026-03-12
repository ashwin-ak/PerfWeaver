# Changelog

All notable changes to PerfWeaver will be documented in this file.

## [0.1.0] - 2024-03-13

### Added
- Initial release of PerfWeaver
- HAR (HTTP Archive) parsing engine
  - Extract and structure HTTP requests from browser recordings
  - Support for HAR 1.2 specification
  - Detailed request metadata extraction
- Resource filtering module
  - Filter out browser noise (images, CSS, fonts, analytics)
  - Configurable filtering rules
  - Pattern-based and extension-based filtering
- Behavior modeling engine
  - Detect sequential and parallel request blocks
  - Analyze request timing relationships
  - Configurable parallelism detection
- Transaction detection
  - Group requests into logical user transactions
  - Auto-detect transaction names from URL patterns
  - Support for custom transaction patterns
- Correlation engine
  - Automatically detect dynamic values (tokens, session IDs)
  - Multi-extractor support (JSON, Regex, XPath)
  - Track variable usage across requests
- Parameterization engine
  - Replace hardcoded values with variables
  - Support for environment variables and CSV datasets
  - Generate parameterization scripts (env, JSON, CSV)
- Think time modeling
  - Calculate realistic delays between requests
  - Percentile-based think time simulation
  - Configurable min/max thresholds
- Load model generator
  - Configure thread count, ramp-up, duration
  - Generate stepped and spike load profiles
  - Calculate expected throughput
  - Resource allocation recommendations
- Tool adapters
  - Apache JMeter (JMX format)
  - k6 (JavaScript format)
  - Gatling (Scala format)
  - Locust (Python format)
  - Playwright (TypeScript format)
- Configuration system
  - YAML-based configuration files
  - Comprehensive default settings
  - Configuration validation
- CLI interface with commands:
  - `generate`: Generate load testing scripts
  - `analyze`: Analyze HAR files and generate reports
  - `visualize`: Create text-based visualizations
- Test coverage
  - Unit tests for core components
  - Integration tests for end-to-end workflows
  - Jest configuration and test utilities
- Documentation
  - Comprehensive README with quick start
  - Contributing guide
  - API documentation
  - Performance tuning guide
  - Example HAR files

### Features Not Yet Implemented
- Distributed load generation
- Real-time HAR recording integration
- Advanced correlation patterns
- Custom extractor plugins
- UI dashboard for analysis
- Cloud-based testing integration
- Advanced load profile patterns (sine wave, etc.)
- Response assertion generation

## Future Roadmap

### v0.2.0
- [ ] Advanced correlation detection (context-aware)
- [ ] Support for WebSocket traffic
- [ ] GraphQL request optimization
- [ ] Real-time performance dashboards
- [ ] Improved documentation with video tutorials

### v0.3.0
- [ ] Plugin system for custom adapters
- [ ] Distributed load generation support
- [ ] Cloud provider integrations (AWS, Azure, GCP)
- [ ] Advanced assertion generation
- [ ] Load testing result analysis tools

### v1.0.0
- [ ] Production-ready stability
- [ ] Enterprise features (clustering, advanced reporting)
- [ ] Extended tool support
- [ ] Native GUI application
- [ ] CI/CD pipeline integrations

## [Unreleased]

### In Development
- Interactive configuration wizard
- HAR recording library for Node.js
- VS Code extension
- GitHub Actions integration

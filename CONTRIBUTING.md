# Contributing to PerfWeaver

Thank you for your interest in contributing to PerfWeaver! We welcome contributions from the community.

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm 7+
- TypeScript 5+

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/perfweaver.git
   cd perfweaver
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/core.test.ts
```

### Code Style

We follow standard TypeScript conventions. Run linting before committing:

```bash
npm run lint
```

## Project Structure

```
src/
├── core/                 # Core algorithms and engines
│   ├── har-parser/       # HAR parsing and filtering
│   ├── behavior-model/   # Behavior modeling engine
│   ├── correlation-engine/  # Dynamic value detection
│   ├── parameterization/ # Variable parameterization
│   ├── think-time/       # Think time modeling
│   └── load-model/       # Load profile generation
├── adapters/             # Tool-specific adapters
│   ├── base-adapter.ts   # Base class for all adapters
│   ├── jmeter/
│   ├── k6/
│   ├── gatling/
│   ├── locust/
│   └── playwright/
├── config/               # Configuration management
├── cli/                  # Command-line interface
├── types/                # TypeScript type definitions
└── index.ts              # Main export file
```

## Adding a New Tool Adapter

To add support for a new performance testing tool:

1. Create a new directory under `src/adapters/{tool-name}/`
2. Create `{tool-name}-adapter.ts` extending `BaseToolAdapter`
3. Implement the `generate()` method
4. Export from `src/adapters/index.ts`
5. Add tests in `tests/unit/adapters.test.ts`
6. Update README with tool documentation

Example:
```typescript
import { BaseToolAdapter } from '../base-adapter';
import { Transaction, LoadModelConfig } from '../../types';

export class MyToolAdapter extends BaseToolAdapter {
  readonly toolName = 'mytool';
  readonly fileExtension = '.myscript';

  public generate(transactions: Transaction[], loadConfig: LoadModelConfig): string {
    // Implementation
    return '';
  }
}
```

## Adding New Features

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes and add tests

3. Ensure all tests pass:
   ```bash
   npm test
   ```

4. Commit with meaningful messages:
   ```bash
   git commit -m "feat: add my feature"
   ```

5. Push and create a pull request

## Pull Request Process

1. Update documentation if needed
2. Add/update tests for new functionality
3. Ensure all tests pass: `npm test`
4. Run linting: `npm run lint`
5. Create a clear PR description explaining the changes
6. Link any related issues

## Code Guidelines

- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Type all function parameters and returns
- Use meaningful variable names
- Keep functions focused and small
- Add tests for new functionality (aim for >80% coverage)

## Reporting Bugs

Create an issue with:
- Clear title describing the bug
- Detailed steps to reproduce
- Expected vs actual behavior
- HAR file sample (if applicable)
- Environment details (Node version, OS, etc.)

## Feature Requests

Feel free to open an issue for feature requests. Include:
- Clear use case and motivation
- Proposed API design
- How it benefits users

## Release Process

(Maintainers only)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Create release branch
5. Tag release: `git tag v1.0.0`
6. Push to npm: `npm publish`

## Questions?

Feel free to open an issue or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

import * as chalk from 'chalk';
import { HARParser, loadHARFile } from '../../core/har-parser';
import { ConfigurationManager } from '../../config';
import {
  JMeterAdapter,
  K6Adapter,
  GatlingAdapter,
  LocustAdapter,
  PlaywrightAdapter,
} from '../../adapters';
import { BehaviorModelingEngine } from '../../core/behavior-model';
import { TransactionDetectionEngine } from '../../core/correlation-engine';
import { ThinkTimeModelingEngine } from '../../core/think-time';

export const command = 'generate <tool> <har>';
export const describe = 'Generate load testing script from HAR file';
export const builder = {
  tool: {
    describe: 'Target tool (jmeter, k6, gatling, locust, playwright)',
    type: 'string' as const,
    choices: ['jmeter', 'k6', 'gatling', 'locust', 'playwright'],
  },
  har: {
    describe: 'HAR file path',
    type: 'string' as const,
  },
  output: {
    alias: 'o',
    describe: 'Output file path',
    type: 'string' as const,
  },
  config: {
    alias: 'c',
    describe: 'Configuration file path',
    type: 'string' as const,
    default: './perfweaver.config.yaml',
  },
};

export async function handler(argv: any) {
  try {
    console.log(chalk.blue(`Generating ${argv.tool} script from ${argv.har}...`));

    // Load configuration
    const configManager = new ConfigurationManager(argv.config);
    const config = configManager.getConfig();

    // Load and parse HAR
    const har = loadHARFile(argv.har);
    const harParser = new HARParser(har, config.filters);
    const requests = harParser.parse();

    console.log(chalk.green(`✓ Parsed ${requests.length} requests from HAR`));

    // Build behavior model
    const behaviorEngine = new BehaviorModelingEngine(
      config.parallelDetection.overlapThresholdMs,
      config.parallelDetection.minParallelRequests
    );
    const blocks = behaviorEngine.analyzeRequests(requests);

    console.log(chalk.green(`✓ Detected ${blocks.length} behavior blocks`));

    // Detect transactions
    const transactionEngine = new TransactionDetectionEngine();
    const transactions = transactionEngine.detectTransactions(blocks);

    console.log(chalk.green(`✓ Detected ${transactions.length} transactions`));

    // Generate script based on tool
    let adapter: any;

    switch (argv.tool) {
      case 'jmeter':
        adapter = new JMeterAdapter();
        break;
      case 'k6':
        adapter = new K6Adapter();
        break;
      case 'gatling':
        adapter = new GatlingAdapter();
        break;
      case 'locust':
        adapter = new LocustAdapter();
        break;
      case 'playwright':
        adapter = new PlaywrightAdapter();
        break;
      default:
        throw new Error(`Unknown tool: ${argv.tool}`);
    }

    const script = adapter.generate(transactions, config.loadModel);

    // Save output
    const outputPath = argv.output || `./script${adapter.fileExtension}`;
    await adapter.generateAndSave(transactions, config.loadModel, outputPath);

    console.log(chalk.green(`✓ Generated ${argv.tool} script`));
    console.log(chalk.blue(`Output: ${outputPath}`));
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    if (argv.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

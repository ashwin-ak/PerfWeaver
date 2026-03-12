import * as chalk from 'chalk';
import { HARParser, loadHARFile } from '../../core/har-parser';
import { BehaviorModelingEngine } from '../../core/behavior-model';
import { TransactionDetectionEngine } from '../../core/correlation-engine';
import { CorrelationEngine } from '../../core/correlation-engine';
import { ThinkTimeModelingEngine } from '../../core/think-time';

export const command = 'analyze <har>';
export const describe = 'Analyze HAR file and generate report';
export const builder = {
  har: {
    describe: 'HAR file path',
    type: 'string',
  },
};

export async function handler(argv: any) {
  try {
    console.log(chalk.blue(`Analyzing ${argv.har}...`));

    // Load and parse HAR
    const har = loadHARFile(argv.har);
    const harParser = new HARParser(har);
    const requests = harParser.parse();

    // Get statistics
    const stats = harParser.getStatistics();

    console.log('');
    console.log(chalk.bold('HAR Analysis Report'));
    console.log('');
    console.log('Requests:');
    console.log(`  Total: ${stats.totalRequests}`);
    console.log(`  Duration: ${stats.totalDuration}ms`);
    console.log(`  Avg Duration: ${Math.round(stats.averageRequestDuration)}ms`);
    console.log('');
    console.log('By Method:');
    for (const [method, count] of Object.entries(stats.requestsByMethod)) {
      console.log(`  ${method}: ${count}`);
    }
    console.log('');
    console.log('By Resource Type:');
    for (const [type, count] of Object.entries(stats.requestsByResourceType)) {
      console.log(`  ${type}: ${count}`);
    }

    // Behavior analysis
    const behaviorEngine = new BehaviorModelingEngine();
    const blocks = behaviorEngine.analyzeRequests(requests);
    const behaviorStats = behaviorEngine.getStatistics(blocks);

    console.log('');
    console.log('Behavior Model:');
    console.log(`  Total Blocks: ${behaviorStats.totalBlocks}`);
    console.log(`  Sequential: ${behaviorStats.sequentialBlocks}`);
    console.log(`  Parallel: ${behaviorStats.parallelBlocks}`);
    console.log(`  Parallelism Factor: ${(behaviorStats.parallelismFactor * 100).toFixed(1)}%`);

    // Transaction analysis
    const transactionEngine = new TransactionDetectionEngine();
    const transactions = transactionEngine.detectTransactions(blocks);
    const txnStats = transactionEngine.getStatistics(transactions);

    console.log('');
    console.log('Transactions:');
    console.log(`  Total: ${txnStats.totalTransactions}`);
    console.log(`  Avg Blocks per Txn: ${txnStats.averageBlocksPerTransaction.toFixed(1)}`);
    console.log('  By Name:');
    for (const [name, count] of Object.entries(txnStats.transactionsByName)) {
      console.log(`    ${name}: ${count}`);
    }

    // Correlation analysis
    const correlationEngine = new CorrelationEngine();
    const correlations = correlationEngine.detectCorrelations(transactions);
    const corrStats = correlationEngine.getStatistics(correlations);

    console.log('');
    console.log('Correlations:');
    console.log(`  Total Variables: ${corrStats.totalVariables}`);
    console.log(`  Avg References: ${corrStats.averageReferences.toFixed(1)}`);

    if (corrStats.mostReferencedVariables.length > 0) {
      console.log('  Most Referenced:');
      for (const variable of corrStats.mostReferencedVariables.slice(0, 5)) {
        console.log(`    ${variable.name}: ${variable.references} refs`);
      }
    }

    // Think time analysis
    const thinkTimeEngine = new ThinkTimeModelingEngine({
      enabled: true,
      percentile: 50,
      minThinkTime: 100,
      maxThinkTime: 30000,
    });
    const ttStats = thinkTimeEngine.getStatistics(transactions);

    console.log('');
    console.log('Think Times (ms):');
    console.log(`  Min: ${Math.round(ttStats.minThinkTime)}`);
    console.log(`  P50: ${Math.round(ttStats.p50ThinkTime)}`);
    console.log(`  P90: ${Math.round(ttStats.p90ThinkTime)}`);
    console.log(`  P95: ${Math.round(ttStats.p95ThinkTime)}`);
    console.log(`  Max: ${Math.round(ttStats.maxThinkTime)}`);

    console.log('');
    console.log(chalk.green('✓ Analysis complete'));
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    if (argv.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

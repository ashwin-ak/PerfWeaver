import * as chalk from 'chalk';
import { HARParser, loadHARFile } from '../../core/har-parser';
import { BehaviorModelingEngine, visualizeBehaviorBlocks } from '../../core/behavior-model';

export const command = 'visualize <har>';
export const describe = 'Visualize HAR behavior as text';
export const builder = {
  har: {
    describe: 'HAR file path',
    type: 'string',
  },
};

export async function handler(argv: any) {
  try {
    console.log(chalk.blue(`Visualizing ${argv.har}...`));
    console.log('');

    // Load and parse HAR
    const har = loadHARFile(argv.har);
    const harParser = new HARParser(har);
    const requests = harParser.parse();

    // Build behavior model
    const behaviorEngine = new BehaviorModelingEngine();
    const blocks = behaviorEngine.analyzeRequests(requests);

    // Visualize
    const visualization = visualizeBehaviorBlocks(blocks);
    console.log(visualization);

    console.log('');
    console.log(chalk.green('✓ Visualization complete'));
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    if (argv.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

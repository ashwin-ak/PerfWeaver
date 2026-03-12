import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as chalk from 'chalk';
import * as generateCommand from './commands/generate.command';
import * as analyzeCommand from './commands/analyze.command';
import * as visualizeCommand from './commands/visualize.command';

/**
 * Main CLI entry point
 */
export async function runCLI(args?: string[]): Promise<void> {
  const argv = await yargs(args || hideBin(process.argv))
    .command(generateCommand.handler as any)
    .command(analyzeCommand.handler as any)
    .command(visualizeCommand.handler as any)
    .option('config', {
      alias: 'c',
      describe: 'Path to perfweaver.config.yaml',
      type: 'string',
      default: './perfweaver.config.yaml',
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    })
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'V')
    .example('$0 generate --tool jmeter --har login.har', 'Generate JMeter script from HAR')
    .example('$0 analyze login.har', 'Analyze HAR file')
    .strict()
    .parse();

  // If no command was specified, show help
  if (!argv._?.length) {
    yargs.showHelp();
  }
}

/**
 * Main entry point
 */
if (require.main === module) {
  runCLI().catch(error => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
}

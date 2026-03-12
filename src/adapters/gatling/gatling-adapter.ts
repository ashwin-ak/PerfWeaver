import { Transaction, LoadModelConfig } from '../../types';
import { BaseToolAdapter } from '../base-adapter';

/**
 * Gatling Adapter
 * Converts behavior model to Gatling Scala format
 */
export class GatlingAdapter extends BaseToolAdapter {
  readonly toolName = 'gatling';
  readonly fileExtension = '.scala';

  public generate(transactions: Transaction[], loadConfig: LoadModelConfig): string {
    const lines: string[] = [];

    lines.push("package perfweaver");
    lines.push("");
    lines.push("import scala.concurrent.duration._");
    lines.push("import io.gatling.core.Predef._");
    lines.push("import io.gatling.http.Predef._");
    lines.push("");

    lines.push("class PerfWeaverSimulation extends Simulation {");
    lines.push("");
    lines.push("  val httpProtocol = http");
    lines.push("    .baseUrl(\"${BASE_URL}\")");
    lines.push("    .acceptEncodingHeader(\"gzip, deflate\")");
    lines.push("    .acceptLanguageHeader(\"en-US,en;q=0.5\")");
    lines.push("    .userAgentHeader(\"Mozilla/5.0\")");
    lines.push("");

    // Generate scenario(s)
    for (const transaction of transactions) {
      const txnName = this.formatTransactionName(transaction.name);
      lines.push(`  val ${txnName} = scenario("${transaction.name}")`);

      for (const block of transaction.blocks) {
        for (const request of block.requests) {
          lines.push(`    .exec(http("${request.method} ${request.url}")`);
          lines.push(`      .${request.method.toLowerCase()}("${request.url}")`);
          
          if (request.payload) {
            lines.push(`      .body(StringBody(\"\"\"${this.escapeString(request.payload)}\"\"\"))`);
          }
          
          lines.push(`      .check(status.is(200)))`);
        }

        // Add think time
        if ('thinkTimes' in block && Object.keys(block.thinkTimes).length > 0) {
          const thinkTime = Object.values(block.thinkTimes)[0] || 0;
          if (thinkTime > 0) {
            lines.push(`    .pause(${this.msToSeconds(thinkTime)} seconds)`);
          }
        }
      }

      lines.push("");
    }

    // Setup simulation
    lines.push("  setUp(");

    const scenarioSetups: string[] = [];
    for (const transaction of transactions) {
      const txnName = this.formatTransactionName(transaction.name);
      scenarioSetups.push(
        `    ${txnName}.inject(rampUsers(${loadConfig.threadCount}) during (${loadConfig.rampUpTime} seconds))`
      );
    }

    lines.push(scenarioSetups.join(",\n"));
    lines.push(`  ).protocols(httpProtocol)`);
    lines.push(`   .maxDuration(${loadConfig.duration} seconds)`);
    lines.push("}");

    return lines.join("\n");
  }
}

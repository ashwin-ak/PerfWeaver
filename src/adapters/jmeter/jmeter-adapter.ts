import { Transaction, LoadModelConfig } from '../../types';
import { BaseToolAdapter } from '../base-adapter';

/**
 * JMeter Adapter
 * Converts behavior model to JMeter JMX format
 */
export class JMeterAdapter extends BaseToolAdapter {
  readonly toolName = 'jmeter';
  readonly fileExtension = '.jmx';

  /**
   * Generate JMeter test plan XML
   */
  public generate(transactions: Transaction[], loadConfig: LoadModelConfig): string {
    const lines: string[] = [];

    // XML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.5">');
    lines.push('  <hashTree>');
    lines.push('    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="PerfWeaver Test Plan" enabled="true">');
    lines.push('      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">');
    lines.push('        <collectionProp name="Arguments.arguments"/>');
    lines.push('      </elementProp>');
    lines.push('      <stringProp name="TestPlan.user_define_classpath"></stringProp>');
    lines.push('      <boolProp name="TestPlan.functional_mode">false</boolProp>');
    lines.push('      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>');
    lines.push('      <elementProp name="TestPlan.javascript_classname" elementType="ClassNameProperty"/>');
    lines.push('      <stringProp name="TestPlan.comments"></stringProp>');
    lines.push('    </TestPlan>');
    lines.push('    <hashTree>');

    // Thread Group
    lines.push(this.generateThreadGroup(loadConfig));

    // Add transaction controllers
    for (const transaction of transactions) {
      lines.push(this.generateTransactionController(transaction));
    }

    // Close thread group hash tree
    lines.push('    </hashTree>');

    // Close test plan hash tree
    lines.push('    </hashTree>');

    // Close test plan
    lines.push('  </hashTree>');
    lines.push('</jmeterTestPlan>');

    return lines.join('\n');
  }

  /**
   * Generate thread group
   */
  private generateThreadGroup(config: LoadModelConfig): string {
    const lines: string[] = [];

    lines.push('      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Thread Group" enabled="true">');
    lines.push('        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">');
    lines.push(`          <boolProp name="LoopController.continue_forever">false</boolProp>`);
    lines.push(`          <stringProp name="LoopController.loops">${config.iterations}</stringProp>`);
    lines.push('        </elementProp>');
    lines.push(`        <stringProp name="ThreadGroup.num_threads">${config.threadCount}</stringProp>`);
    lines.push(`        <stringProp name="ThreadGroup.ramp_time">${config.rampUpTime}</stringProp>`);
    lines.push('        <elementProp name="ThreadGroup.duration_assertion" elementType="DurationAssertion" guiclass="DurationAssertionGui" testclass="DurationAssertion" testname="Duration Assertion" enabled="false">');
    lines.push(`          <stringProp name="DurationAssertion.failure_message">Test duration too long</stringProp>`);
    lines.push(`          <stringProp name="DurationAssertion.duration">${config.duration * 1000}</stringProp>`);
    lines.push('        </elementProp>');
    lines.push('        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>');
    lines.push('        <boolProp name="ThreadGroup.scheduler">true</boolProp>');
    lines.push(`        <stringProp name="ThreadGroup.delay"></stringProp>`);
    lines.push(`        <stringProp name="ThreadGroup.duration">${config.duration}</stringProp>`);
    lines.push('      </ThreadGroup>');
    lines.push('      <hashTree>');

    return lines.join('\n');
  }

  /**
   * Generate transaction controller
   */
  private generateTransactionController(transaction: Transaction): string {
    const lines: string[] = [];
    const txnName = this.formatTransactionName(transaction.name);

    lines.push(`        <TransactionController guiclass="TransactionControllerGui" testclass="TransactionController" testname="${transaction.name}" enabled="true">`);
    lines.push('          <elementProp name="TransactionController.parent" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="Arguments" enabled="true">');
    lines.push('            <collectionProp name="Arguments.arguments"/>');
    lines.push('          </elementProp>');
    lines.push('          <boolProp name="TransactionController.parent">true</boolProp>');
    lines.push('          <boolProp name="TransactionController.includeTimers">false</boolProp>');
    lines.push('        </TransactionController>');
    lines.push('        <hashTree>');

    // Add HTTP samplers for each request
    for (const block of transaction.blocks) {
      for (const request of block.requests) {
        lines.push(this.generateHTTPSampler(request));
      }

      // Add think time between blocks if available
      if ('thinkTimes' in block && Object.keys(block.thinkTimes).length > 0) {
        const thinkTime = Object.values(block.thinkTimes)[0] || 0;
        if (thinkTime > 0) {
          lines.push(this.generateThinkTime(thinkTime));
        }
      }
    }

    lines.push('        </hashTree>');

    return lines.join('\n');
  }

  /**
   * Generate HTTP sampler
   */
  private generateHTTPSampler(request: any): string {
    const lines: string[] = [];

    lines.push('          <HTTPSamplerorHTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${request.method} ${request.url}" enabled="true">');
    lines.push('            <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">');
    lines.push('              <collectionProp name="Arguments.arguments"/>');
    lines.push('            </elementProp>');
    lines.push('            <stringProp name="HTTPSampler.domain">${HOST}</stringProp>');
    lines.push('            <stringProp name="HTTPSampler.port">${PORT}</stringProp>');
    lines.push('            <stringProp name="HTTPSampler.protocol">https</stringProp>');
    lines.push(`            <stringProp name="HTTPSampler.path">${request.url}</stringProp>`);
    lines.push(`            <stringProp name="HTTPSampler.method">${request.method}</stringProp>`);
    lines.push('            <boolProp name="HTTPSampler.follow_redirects">true</boolProp>');
    lines.push('            <boolProp name="HTTPSampler.auto_redirects">false</boolProp>');
    lines.push('            <boolProp name="HTTPSampler.use_keepalive">true</boolProp>');
    lines.push('            <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>');
    lines.push('            <stringProp name="HTTPSampler.embedded_url_re"></stringProp>');
    lines.push('            <stringProp name="HTTPSampler.connect_timeout"></stringProp>');
    lines.push('            <stringProp name="HTTPSampler.response_timeout"></stringProp>');
    lines.push('          </HTTPSamplerProxy>');
    lines.push('          <hashTree/>\n');

    return lines.join('\n');
  }

  /**
   * Generate think time (constant timer)
   */
  private generateThinkTime(thinkTimeMs: number): string {
    const lines: string[] = [];

    lines.push(`          <ConstantTimer guiclass="ConstantTimerGui" testclass="ConstantTimer" testname="Think Time" enabled="true">`);
    lines.push(`            <stringProp name="ConstantTimer.delay">${thinkTimeMs}</stringProp>`);
    lines.push(`          </ConstantTimer>`);
    lines.push(`          <hashTree/>\n`);

    return lines.join('\n');
  }
}

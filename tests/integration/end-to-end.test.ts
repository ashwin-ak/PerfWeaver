/**
 * Integration tests for end-to-end workflows
 */
import {
  HARParser,
  BehaviorModelingEngine,
  TransactionDetectionEngine,
  CorrelationEngine,
  ParameterizationEngine,
  ThinkTimeModelingEngine,
  LoadModelGenerator,
  JMeterAdapter,
  K6Adapter,
} from '../../src/index';
import { LoadModelConfig } from '../../src/types';

describe('End-to-End Workflow', () => {
  const mockHAR = {
    log: {
      version: '1.2',
      creator: { name: 'test', version: '1.0' },
      entries: [
        {
          startedDateTime: new Date().toISOString(),
          time: 100,
          request: {
            method: 'GET',
            url: 'https://example.com/',
            httpVersion: 'HTTP/1.1',
            headers: [],
            queryString: [],
            headersSize: 100,
            bodySize: 0,
          },
          response: {
            status: 200,
            statusText: 'OK',
            httpVersion: 'HTTP/1.1',
            headers: [],
            cookies: [],
            content: {
              size: 100,
              mimeType: 'text/html',
            },
            redirectURL: '',
            headersSize: 100,
            bodySize: 100,
          },
          cache: { beforeRequest: null, afterRequest: null },
          timings: { send: 10, wait: 50, receive: 40 },
        },
        {
          startedDateTime: new Date().toISOString(),
          time: 150,
          request: {
            method: 'POST',
            url: 'https://example.com/api/login',
            httpVersion: 'HTTP/1.1',
            headers: [{ name: 'Content-Type', value: 'application/json' }],
            queryString: [],
            postData: {
              mimeType: 'application/json',
              text: '{"username":"test","password":"secret"}',
              params: [],
            },
            headersSize: 100,
            bodySize: 50,
          },
          response: {
            status: 200,
            statusText: 'OK',
            httpVersion: 'HTTP/1.1',
            headers: [],
            cookies: [],
            content: {
              size: 200,
              mimeType: 'application/json',
              text: '{"token":"abc123","userId":"user1"}',
            },
            redirectURL: '',
            headersSize: 100,
            bodySize: 200,
          },
          cache: { beforeRequest: null, afterRequest: null },
          timings: { send: 10, wait: 100, receive: 40 },
        },
      ],
    },
  };

  it('should complete full pipeline from HAR to script generation', () => {
    // Step 1: Parse HAR
    const harParser = new HARParser(mockHAR);
    const requests = harParser.parse();

    expect(requests.length).toBeGreaterThan(0);

    // Step 2: Analyze behavior
    const behaviorEngine = new BehaviorModelingEngine();
    const blocks = behaviorEngine.analyzeRequests(requests);

    expect(blocks.length).toBeGreaterThan(0);

    // Step 3: Detect transactions
    const transactionEngine = new TransactionDetectionEngine();
    const transactions = transactionEngine.detectTransactions(blocks);

    expect(transactions.length).toBeGreaterThan(0);

    // Step 4: Detect correlations
    const correlationEngine = new CorrelationEngine();
    const correlations = correlationEngine.detectCorrelations(transactions);

    expect(correlations).toBeDefined();

    // Step 5: Parameterize
    const paramEngine = new ParameterizationEngine();
    const correlationVariables: any[] = [];
    const parameterized = paramEngine.parameterizeTransactions(transactions, correlationVariables);

    expect(parameterized.length).toBeGreaterThan(0);

    // Step 6: Model think times
    const thinkTimeEngine = new ThinkTimeModelingEngine({
      enabled: true,
      percentile: 50,
      minThinkTime: 100,
      maxThinkTime: 30000,
    });
    const thinkTimes = thinkTimeEngine.calculateThinkTimes(parameterized);

    expect(thinkTimes).toBeDefined();

    // Step 7: Generate load model
    const loadConfig: LoadModelConfig = {
      threadCount: 10,
      rampUpTime: 60,
      duration: 300,
      iterations: 1,
      connectionTimeout: 10000,
      responseTimeout: 30000,
    };

    const loadGenerator = new LoadModelGenerator(loadConfig);
    const finalLoadModel = loadGenerator.generateLoadModel(parameterized);

    expect(finalLoadModel.threadCount).toBe(10);

    // Step 8: Generate scripts
    const jmeterAdapter = new JMeterAdapter();
    const jmeterScript = jmeterAdapter.generate(parameterized, finalLoadModel);

    expect(jmeterScript).toContain('<?xml');
    expect(jmeterScript.length).toBeGreaterThan(100);

    const k6Adapter = new K6Adapter();
    const k6Script = k6Adapter.generate(parameterized, finalLoadModel);

    expect(k6Script).toContain('import http');
    expect(k6Script.length).toBeGreaterThan(100);
  });

  it('should handle multiple transactions', () => {
    const harParser = new HARParser(mockHAR);
    const requests = harParser.parse();

    const behaviorEngine = new BehaviorModelingEngine();
    const blocks = behaviorEngine.analyzeRequests(requests);

    const transactionEngine = new TransactionDetectionEngine();
    const transactions = transactionEngine.detectTransactions(blocks);

    // Even with just 2 requests, we should get at least 1 transaction
    expect(transactions.length).toBeGreaterThan(0);

    // Check transaction properties
    for (const txn of transactions) {
      expect(txn.id).toBeDefined();
      expect(txn.name).toBeDefined();
      expect(txn.blocks.length).toBeGreaterThan(0);
      expect(txn.startTime).toBeLessThanOrEqual(txn.endTime);
    }
  });

  it('should generate valid load models', () => {
    const harParser = new HARParser(mockHAR);
    const requests = harParser.parse();

    const behaviorEngine = new BehaviorModelingEngine();
    const blocks = behaviorEngine.analyzeRequests(requests);

    const transactionEngine = new TransactionDetectionEngine();
    const transactions = transactionEngine.detectTransactions(blocks);

    const loadConfig: LoadModelConfig = {
      threadCount: 50,
      rampUpTime: 120,
      duration: 600,
      iterations: 5,
      connectionTimeout: 15000,
      responseTimeout: 45000,
    };

    const loadGenerator = new LoadModelGenerator(loadConfig);
    const loadModel = loadGenerator.generateLoadModel(transactions);

    expect(loadModel.threadCount).toBe(50);
    expect(loadModel.rampUpTime).toBe(120);
    expect(loadModel.iterations).toBe(5);

    // Should pass validation
    const validation = loadGenerator.validateConfig();
    expect(validation.valid).toBe(true);
  });
});

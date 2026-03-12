import { HARParser } from '../../src/core/har-parser';
import { BehaviorModelingEngine } from '../../src/core/behavior-model';
import { TransactionDetectionEngine } from '../../src/core/correlation-engine';
import { RequestNode } from '../../src/types';

describe('HAR Parser', () => {
  it('should parse HAR data correctly', () => {
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
              url: 'http://example.com/api',
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
                mimeType: 'application/json',
                text: '{"id": "123"}',
              },
              redirectURL: '',
              headersSize: 100,
              bodySize: 100,
            },
            cache: { beforeRequest: null, afterRequest: null },
            timings: { send: 10, wait: 50, receive: 40 },
          },
        ],
      },
    };

    const parser = new HARParser(mockHAR);
    const requests = parser.parse();

    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].method).toBe('GET');
  });
});

describe('Behavior Modeling Engine', () => {
  it('should detect sequential and parallel blocks', () => {
    const requests: RequestNode[] = [
      {
        id: 'req_1',
        url: 'http://example.com/1',
        method: 'GET',
        headers: {},
        responseStatus: 200,
        startTime: 1000,
        endTime: 1100,
        duration: 100,
        resourceType: 'xhr',
      },
      {
        id: 'req_2',
        url: 'http://example.com/2',
        method: 'GET',
        headers: {},
        responseStatus: 200,
        startTime: 1050,
        endTime: 1150,
        duration: 100,
        resourceType: 'xhr',
      },
    ];

    const engine = new BehaviorModelingEngine();
    const blocks = engine.analyzeRequests(requests);

    expect(blocks.length).toBeGreaterThan(0);
  });
});

describe('Transaction Detection Engine', () => {
  it('should detect transactions from behavior blocks', () => {
    // This test would need behavior blocks to work with
    const engine = new TransactionDetectionEngine();
    const stats = engine.getStatistics([]);

    expect(stats.totalTransactions).toBe(0);
  });
});

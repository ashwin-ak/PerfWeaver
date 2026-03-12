import {
  JMeterAdapter,
  K6Adapter,
  GatlingAdapter,
  LocustAdapter,
  PlaywrightAdapter,
} from '../../src/adapters';
import { Transaction, LoadModelConfig } from '../../src/types';

const mockTransaction: Transaction = {
  id: 'txn_1',
  name: 'Login',
  blocks: [
    {
      id: 'block_1',
      requests: [
        {
          id: 'req_1',
          url: 'https://example.com/login',
          method: 'POST',
          headers: {},
          payload: '{"username":"test","password":"pass"}',
          responseStatus: 200,
          startTime: 1000,
          endTime: 1100,
          duration: 100,
          resourceType: 'xhr',
        },
      ],
      startTime: 1000,
      endTime: 1100,
      thinkTimes: {},
    },
  ],
  correlationVariables: [],
  parameterizedVariables: [],
  startTime: 1000,
  endTime: 1100,
  duration: 100,
};

const mockLoadConfig: LoadModelConfig = {
  threadCount: 10,
  rampUpTime: 60,
  duration: 300,
  iterations: 1,
  connectionTimeout: 10000,
  responseTimeout: 30000,
};

describe('Tool Adapters', () => {
  it('should generate JMeter script', () => {
    const adapter = new JMeterAdapter();
    const script = adapter.generate([mockTransaction], mockLoadConfig);

    expect(script).toContain('<?xml');
    expect(script).toContain('TestPlan');
    expect(script).toContain('ThreadGroup');
  });

  it('should generate k6 script', () => {
    const adapter = new K6Adapter();
    const script = adapter.generate([mockTransaction], mockLoadConfig);

    expect(script).toContain('import http');
    expect(script).toContain('export const options');
  });

  it('should generate Gatling script', () => {
    const adapter = new GatlingAdapter();
    const script = adapter.generate([mockTransaction], mockLoadConfig);

    expect(script).toContain('scala');
    expect(script).toContain('Simulation');
  });

  it('should generate Locust script', () => {
    const adapter = new LocustAdapter();
    const script = adapter.generate([mockTransaction], mockLoadConfig);

    expect(script).toContain('from locust');
    expect(script).toContain('HttpUser');
  });

  it('should generate Playwright script', () => {
    const adapter = new PlaywrightAdapter();
    const script = adapter.generate([mockTransaction], mockLoadConfig);

    expect(script).toContain('@playwright/test');
    expect(script).toContain('test.describe');
  });
});

import { ConfigurationManager } from '../../src/config';
import * as fs from 'fs';
import * as path from 'path';

describe('Configuration Manager', () => {
  it('should load default configuration', () => {
    const manager = new ConfigurationManager();
    const config = manager.getConfig();

    expect(config.loadModel.threadCount).toBeGreaterThan(0);
    expect(config.tools.enabled).toContain('jmeter');
  });

  it('should validate configuration', () => {
    const manager = new ConfigurationManager();
    const validation = manager.validate();

    expect(validation.valid).toBe(true);
  });

  it('should update configuration', () => {
    const manager = new ConfigurationManager();
    manager.updateConfig({
      loadModel: { ...manager.getConfig().loadModel, threadCount: 50 },
    });

    const config = manager.getConfig();
    expect(config.loadModel.threadCount).toBe(50);
  });
});

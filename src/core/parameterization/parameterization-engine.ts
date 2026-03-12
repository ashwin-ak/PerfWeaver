import { ParameterizationVariable, Transaction, RequestNode, CorrelationVariable } from '../../types';

/**
 * Parameterization Engine
 * Replaces environment-specific values with variables
 */
export class ParameterizationEngine {
  private variables: ParameterizationVariable[] = [];
  private variableReplacements: Map<string, string> = new Map();

  constructor(variables?: ParameterizationVariable[]) {
    if (variables) {
      this.variables = variables;
    }
  }

  /**
   * Parameterize transactions based on correlation variables
   */
  public parameterizeTransactions(
    transactions: Transaction[],
    correlationVariables: CorrelationVariable[],
    envVars: string[] = []
  ): Transaction[] {
    const parameterizedTransactions: Transaction[] = [];

    for (const transaction of transactions) {
      const parameterized = this.parameterizeTransaction(
        transaction,
        correlationVariables,
        envVars
      );
      parameterizedTransactions.push(parameterized);
    }

    return parameterizedTransactions;
  }

  /**
   * Parameterize a single transaction
   */
  public parameterizeTransaction(
    transaction: Transaction,
    correlationVariables: CorrelationVariable[] = [],
    envVars: string[] = []
  ): Transaction {
    const parameterizedBlocks = transaction.blocks.map(block => ({
      ...block,
      requests: block.requests.map(req => 
        this.parameterizeRequest(req, correlationVariables, envVars)
      ),
    }));

    const usedVariables = new Set<string>();

    // Collect all used variable names
    for (const corr of correlationVariables) {
      for (const block of parameterizedBlocks) {
        for (const req of block.requests) {
          if (corr.referencedInRequests.includes(req.id)) {
            usedVariables.add(corr.name);
          }
        }
      }
    }

    for (const envVar of envVars) {
      // Check if any request uses this env var
      for (const block of parameterizedBlocks) {
        for (const req of block.requests) {
          if (this.usesVariable(req, envVar)) {
            usedVariables.add(envVar);
          }
        }
      }
    }

    return {
      ...transaction,
      blocks: parameterizedBlocks,
      parameterizedVariables: Array.from(usedVariables),
    };
  }

  /**
   * Parameterize a single request
   */
  public parameterizeRequest(
    request: RequestNode,
    correlationVariables: CorrelationVariable[] = [],
    envVars: string[] = []
  ): RequestNode {
    const parameterized = { ...request };

    // Replace correlation variables in headers and payload
    for (const corr of correlationVariables) {
      if (corr.extractedValue) {
        const replacement = `\${${corr.name}}`;
        
        // Replace in headers
        const newHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(parameterized.headers)) {
          newHeaders[key] = value.replace(corr.extractedValue, replacement);
        }
        parameterized.headers = newHeaders;

        // Replace in payload
        if (parameterized.payload) {
          parameterized.payload = parameterized.payload.replace(
            corr.extractedValue,
            replacement
          );
        }

        // Replace in URL
        parameterized.url = parameterized.url.replace(corr.extractedValue, replacement);
      }
    }

    // Replace environment variables (hardcoded URLs, etc.)
    for (const envVar of envVars) {
      // For simple case, look for variable name in URL/headers
      const pattern = new RegExp(`(https?://[^/]+|${envVar})`, 'gi');
      
      if (parameterized.url.includes('://')) {
        try {
          const url = new URL(parameterized.url);
          parameterized.url = parameterized.url.replace(
            url.origin,
            `\${${envVar}}`
          );
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }

    return parameterized;
  }

  /**
   * Check if a request uses a variable
   */
  private usesVariable(request: RequestNode, variableName: string): boolean {
    const varRef = `${variableName}`;
    
    const headersCheck = Object.values(request.headers).some(h => (h || '').includes(varRef));
    const payloadCheck = request.payload ? request.payload.includes(varRef) : false;
    
    return (
      request.url.includes(varRef) ||
      headersCheck ||
      payloadCheck
    );
  }

  /**
   * Add a variable
   */
  public addVariable(variable: ParameterizationVariable): void {
    this.variables.push(variable);
  }

  /**
   * Remove a variable
   */
  public removeVariable(name: string): void {
    this.variables = this.variables.filter(v => v.name !== name);
  }

  /**
   * Get a variable by name
   */
  public getVariable(name: string): ParameterizationVariable | undefined {
    return this.variables.find(v => v.name === name);
  }

  /**
   * Get all variables
   */
  public getVariables(): ParameterizationVariable[] {
    return [...this.variables];
  }

  /**
   * Generate parameterization script content
   */
  public generateParamScript(format: 'env' | 'json' | 'csv' = 'json'): string {
    switch (format) {
      case 'env':
        return this.generateEnvFile();
      case 'csv':
        return this.generateCSVFile();
      case 'json':
      default:
        return this.generateJSONFile();
    }
  }

  /**
   * Generate .env file format
   */
  private generateEnvFile(): string {
    const lines: string[] = [];

    for (const variable of this.variables) {
      if (variable.defaultValue) {
        lines.push(`${variable.name}=${variable.defaultValue}`);
      } else {
        lines.push(`${variable.name}=`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate JSON format
   */
  private generateJSONFile(): string {
    const config: Record<string, any> = {};

    for (const variable of this.variables) {
      config[variable.name] = variable.defaultValue || '';
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Generate CSV format
   */
  private generateCSVFile(): string {
    if (this.variables.length === 0) {
      return '';
    }

    const headers = this.variables.map(v => v.name).join(',');
    const values = this.variables.map(v => v.defaultValue || '').join(',');

    return `${headers}\n${values}`;
  }

  /**
   * Get parameterization statistics
   */
  public getStatistics(): {
    totalVariables: number;
    variablesByType: Record<string, number>;
    variablesWithDefaults: number;
  } {
    const variablesByType: Record<string, number> = {};
    let variablesWithDefaults = 0;

    for (const variable of this.variables) {
      variablesByType[variable.type] = (variablesByType[variable.type] || 0) + 1;

      if (variable.defaultValue) {
        variablesWithDefaults++;
      }
    }

    return {
      totalVariables: this.variables.length,
      variablesByType,
      variablesWithDefaults,
    };
  }

  /**
   * Create common variables for load testing
   */
  public static createCommonVariables(): ParameterizationVariable[] {
    return [
      {
        name: 'BASE_URL',
        type: 'env',
        defaultValue: 'https://localhost:8080',
      },
      {
        name: 'API_BASE_URL',
        type: 'env',
        defaultValue: 'https://api.localhost:8080',
      },
      {
        name: 'AUTH_TOKEN',
        type: 'env',
        defaultValue: '',
      },
      {
        name: 'USER_ID',
        type: 'env',
        defaultValue: '',
      },
      {
        name: 'TENANT_ID',
        type: 'env',
        defaultValue: '',
      },
      {
        name: 'SESSION_ID',
        type: 'env',
        defaultValue: '',
      },
    ];
  }
}

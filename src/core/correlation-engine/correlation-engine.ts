import { RequestNode, CorrelationVariable, Transaction } from '../../types';

/**
 * Extraction methods for correlation variables
 */
export interface Extractor {
  type: 'json' | 'regex' | 'xpath';
  extract(responseBody: string, pattern: string): string | null;
}

/**
 * JSON Extractor
 */
export class JSONExtractor implements Extractor {
  type: 'json' = 'json';

  extract(responseBody: string, jsonPath: string): string | null {
    try {
      const json = JSON.parse(responseBody);
      return this.extractByPath(json, jsonPath);
    } catch (e) {
      return null;
    }
  }

  private extractByPath(obj: any, path: string): string | null {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }

    return current !== null && current !== undefined ? String(current) : null;
  }
}

/**
 * Regex Extractor
 */
export class RegexExtractor implements Extractor {
  type: 'regex' = 'regex';

  extract(responseBody: string, pattern: string): string | null {
    try {
      const regex = new RegExp(pattern);
      const match = responseBody.match(regex);
      return match ? match[1] || match[0] : null;
    } catch (e) {
      return null;
    }
  }
}

/**
 * XPath Extractor
 */
export class XPathExtractor implements Extractor {
  type: 'xpath' = 'xpath';

  extract(responseBody: string, xpathExpression: string): string | null {
    // Basic XPath support for XML responses
    // A full implementation would use a proper XML/DOM parser
    try {
      const parser = require('fast-xml-parser');
      
      if (parser && parser.parse) {
        const json = parser.parse(responseBody);
        // For now, do a simple key lookup
        const keys = xpathExpression.split('/').filter(k => k.length > 0);
        let current = json;
        
        for (const key of keys) {
          current = current[key];
          if (!current) return null;
        }
        
        return String(current);
      }
    } catch (e) {
      // XPath parser not available
    }

    return null;
  }
}

/**
 * Correlation Detection Engine
 */
export class CorrelationEngine {
  private extractors: Map<string, Extractor> = new Map([
    ['json', new JSONExtractor() as Extractor],
    ['regex', new RegexExtractor() as Extractor],
    ['xpath', new XPathExtractor() as Extractor],
  ]);

  private commonPatterns: Record<string, Record<string, string>> = {
    json: {
      sessionId: 'session[Ii]d|sessionID|JSESSIONID|phpsessid',
      csrfToken: 'csrf[Tt]oken|_token|__RequestVerificationToken',
      jwtToken: 'token|jwt|authorization|access_token',
      authToken: 'auth[Tt]oken|x-auth-token|authorization',
      userId: 'user[Ii]d|uid|userid',
      requestId: 'request[Ii]d|trace[Ii]d|correlation[Ii]d',
    },
    regex: {
      sessionId: '[Ss]ession[Ii]d["\']\\s*[:=]\\s*["\']?([a-zA-Z0-9]+)',
      csrfToken: '[Cc]srf["\']\\s*[:=]\\s*["\']?([a-zA-Z0-9\\-_]+)',
      jwtToken: '[Tt]oken["\']\\s*[:=]\\s*["\']?(eyJ[a-zA-Z0-9_\\-\\.]+)',
    },
  };

  /**
   * Detect correlations in transactions
   */
  public detectCorrelations(transactions: Transaction[]): CorrelationVariable[] {
    const variables: CorrelationVariable[] = [];
    const variableSet = new Map<string, CorrelationVariable>();

    // Detect within each transaction
    for (const transaction of transactions) {
      const txnVariables = this.detectTransactionCorrelations(transaction);
      for (const variable of txnVariables) {
        variableSet.set(variable.name, variable);
      }
    }

    return Array.from(variableSet.values());
  }

  /**
   * Detect correlations within a single transaction
   */
  public detectTransactionCorrelations(transaction: Transaction): CorrelationVariable[] {
    const variables: CorrelationVariable[] = [];
    const requests = transaction.blocks.flatMap(b => b.requests);

    // For each request, try to extract values from response
    for (let i = 0; i < requests.length; i++) {
      const currentRequest = requests[i];

      if (!currentRequest.responseBody) {
        continue;
      }

      // Try to extract common values
      const extracted = this.extractCommonValues(currentRequest);

      // Check if extracted values are reused in subsequent requests
      for (const [varName, varValue] of Object.entries(extracted)) {
        const referencedIn = this.findUsageInRequests(requests, varValue, i + 1);

        if (referencedIn.length > 0) {
          const variable: CorrelationVariable = {
            id: `corr_${varName}_${currentRequest.id}`,
            name: varName,
            sourceRequestId: currentRequest.id,
            extractionMethod: 'json',
            extractionPath: varName,
            extractedValue: varValue,
            referencedInRequests: referencedIn,
          };

          variables.push(variable);
        }
      }
    }

    return variables;
  }

  /**
   * Extract common dynamic values from a response
   */
  private extractCommonValues(request: RequestNode): Record<string, string> {
    const values: Record<string, string> = {};

    if (!request.responseBody) {
      return values;
    }

    // Try JSON extraction first
    try {
      const json = JSON.parse(request.responseBody);

      for (const [varType, patterns] of Object.entries(this.commonPatterns.json)) {
        const keys = Object.keys(json).filter(key =>
          new RegExp(patterns, 'i').test(key)
        );

        for (const key of keys) {
          if (json[key] && typeof json[key] === 'string') {
            const value = String(json[key]);
            if (value.length > 0 && value.length < 1000) {
              values[key] = value;
            }
          }
        }
      }
    } catch (e) {
      // Not JSON, try regex
    }

    return values;
  }

  /**
   * Find where a value is used in subsequent requests
   */
  private findUsageInRequests(
    requests: RequestNode[],
    value: string,
    startIndex: number
  ): string[] {
    const usageInIds: string[] = [];

    for (let i = startIndex; i < requests.length; i++) {
      const request = requests[i];

      // Check in headers
      for (const header of Object.values(request.headers)) {
        if (header.includes(value)) {
          usageInIds.push(request.id);
          break;
        }
      }

      // Check in payload
      if (request.payload && request.payload.includes(value)) {
        usageInIds.push(request.id);
      }

      // Check in URL
      if (request.url.includes(value)) {
        usageInIds.push(request.id);
      }
    }

    return usageInIds;
  }

  /**
   * Extract value using a specific extractor
   */
  public extractValue(
    responseBody: string,
    extractorType: 'json' | 'regex' | 'xpath',
    pattern: string
  ): string | null {
    const extractor = this.extractors.get(extractorType);
    return extractor ? extractor.extract(responseBody, pattern) : null;
  }

  /**
   * Add custom extractor
   */
  public addExtractor(type: string, extractor: Extractor): void {
    this.extractors.set(type, extractor);
  }

  /**
   * Get correlation statistics
   */
  public getStatistics(variables: CorrelationVariable[]): {
    totalVariables: number;
    variablesByType: Record<string, number>;
    averageReferences: number;
    mostReferencedVariables: Array<{ name: string; references: number }>;
  } {
    const variablesByType: Record<string, number> = {};
    let totalReferences = 0;
    const varReferenceCounts: Array<{ name: string; references: number }> = [];

    for (const variable of variables) {
      variablesByType[variable.extractionMethod] = 
        (variablesByType[variable.extractionMethod] || 0) + 1;
      
      totalReferences += variable.referencedInRequests.length;
      varReferenceCounts.push({
        name: variable.name,
        references: variable.referencedInRequests.length,
      });
    }

    // Sort by references descending
    varReferenceCounts.sort((a, b) => b.references - a.references);

    return {
      totalVariables: variables.length,
      variablesByType,
      averageReferences: variables.length > 0 ? totalReferences / variables.length : 0,
      mostReferencedVariables: varReferenceCounts.slice(0, 10),
    };
  }
}

import * as fs from 'fs';
import { HAR } from './har-types';

/**
 * Utility functions for working with HAR files
 */

/**
 * Load and parse a HAR file from disk
 */
export function loadHARFile(filePath: string): HAR {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save HAR data to a file
 */
export function saveHARFile(filePath: string, har: HAR): void {
  fs.writeFileSync(filePath, JSON.stringify(har, null, 2), 'utf-8');
}

/**
 * Validate HAR structure
 */
export function validateHAR(har: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!har.log) {
    errors.push('HAR must contain a log property');
  } else {
    if (!har.log.version) {
      errors.push('HAR log must contain a version property');
    }
    if (!har.log.creator) {
      errors.push('HAR log must contain a creator property');
    }
    if (!Array.isArray(har.log.entries)) {
      errors.push('HAR log must contain an entries array');
    } else if (har.log.entries.length === 0) {
      errors.push('HAR log entries array is empty');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge multiple HAR files into one
 */
export function mergeHARFiles(harFiles: HAR[]): HAR {
  if (harFiles.length === 0) {
    throw new Error('At least one HAR file is required for merging');
  }

  const merged: HAR = {
    log: {
      version: harFiles[0].log.version,
      creator: harFiles[0].log.creator,
      entries: [],
      pages: [],
    },
  };

  for (const har of harFiles) {
    merged.log.entries.push(...har.log.entries);
    if (har.log.pages) {
      merged.log.pages!.push(...har.log.pages);
    }
  }

  return merged;
}

/**
 * Filter HAR entries by URL pattern
 */
export function filterHARByURL(har: HAR, pattern: RegExp | string): HAR {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  return {
    log: {
      ...har.log,
      entries: har.log.entries.filter(entry => regex.test(entry.request.url)),
    },
  };
}

/**
 * Filter HAR entries by status code
 */
export function filterHARByStatus(har: HAR, statusCode: number): HAR {
  return {
    log: {
      ...har.log,
      entries: har.log.entries.filter(entry => entry.response.status === statusCode),
    },
  };
}

/**
 * Get unique domains from HAR
 */
export function getDomainsFromHAR(har: HAR): string[] {
  const domains = new Set<string>();
  
  for (const entry of har.log.entries) {
    try {
      const url = new URL(entry.request.url);
      domains.add(url.hostname);
    } catch (e) {
      // Invalid URL, skip
    }
  }

  return Array.from(domains).sort();
}

/**
 * Calculate total HAR size in bytes
 */
export function calculateHARSize(har: HAR): { headerSize: number; bodySize: number; totalSize: number } {
  let headerSize = 0;
  let bodySize = 0;

  for (const entry of har.log.entries) {
    headerSize += entry.request.headersSize + entry.response.headersSize;
    bodySize += entry.response.bodySize;
  }

  return {
    headerSize,
    bodySize,
    totalSize: headerSize + bodySize,
  };
}

/**
 * Get timing statistics from HAR
 */
export function getHARTimingStats(har: HAR): {
  minRequestTime: number;
  maxRequestTime: number;
  averageRequestTime: number;
  totalTime: number;
} {
  const times = har.log.entries.map(e => e.time);
  
  return {
    minRequestTime: Math.min(...times),
    maxRequestTime: Math.max(...times),
    averageRequestTime: times.reduce((a, b) => a + b, 0) / times.length,
    totalTime: times.reduce((a, b) => a + b, 0),
  };
}

import { BehaviorBlock, RequestNode } from '../../types';

/**
 * Utility functions for behavior model analysis
 */

/**
 * Visualize behavior blocks as a timeline
 */
export function visualizeBehaviorBlocks(blocks: BehaviorBlock[]): string {
  const lines: string[] = [];
  let currentTime = 0;

  for (const block of blocks) {
    const isParallel = block.id.startsWith('parallel');
    const marker = isParallel ? '║' : '→';
    const duration = block.endTime - block.startTime;
    const bars = Math.ceil(duration / 100);

    lines.push(`${marker} ${block.id}: ${bars > 0 ? '█'.repeat(Math.min(bars, 40)) : '▌'}`);

    for (const req of block.requests) {
      lines.push(`  ├─ ${req.method.padEnd(6)} ${req.url.substring(0, 60)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Calculate think time between blocks
 */
export function calculateThinkTimesBetweenBlocks(blocks: BehaviorBlock[]): Record<string, number> {
  const thinkTimes: Record<string, number> = {};

  for (let i = 0; i < blocks.length - 1; i++) {
    const currentBlock = blocks[i];
    const nextBlock = blocks[i + 1];
    const thinkTime = nextBlock.startTime - currentBlock.endTime;

    if (thinkTime > 0) {
      thinkTimes[`${currentBlock.id}_to_${nextBlock.id}`] = thinkTime;
    }
  }

  return thinkTimes;
}

/**
 * Find requests by resource type in blocks
 */
export function findRequestsByResourceType(
  blocks: BehaviorBlock[],
  resourceType: string
): RequestNode[] {
  const results: RequestNode[] = [];

  for (const block of blocks) {
    for (const req of block.requests) {
      if (req.resourceType === resourceType) {
        results.push(req);
      }
    }
  }

  return results;
}

/**
 * Find requests by URL pattern in blocks
 */
export function findRequestsByURLPattern(
  blocks: BehaviorBlock[],
  pattern: RegExp | string
): RequestNode[] {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const results: RequestNode[] = [];

  for (const block of blocks) {
    for (const req of block.requests) {
      if (regex.test(req.url)) {
        results.push(req);
      }
    }
  }

  return results;
}

/**
 * Calculate concurrency level over time
 */
export function calculateConcurrencyLevel(blocks: BehaviorBlock[]): {
  maxConcurrency: number;
  averageConcurrency: number;
  timeline: Array<{ time: number; concurrency: number }>;
} {
  if (blocks.length === 0) {
    return { maxConcurrency: 0, averageConcurrency: 0, timeline: [] };
  }

  const timeline: Map<number, number> = new Map();
  let maxConcurrency = 0;
  let totalConcurrency = 0;
  let timePoints = 0;

  for (const block of blocks) {
    for (const req of block.requests) {
      // Start time
      const startCount = (timeline.get(req.startTime) || 0) + 1;
      timeline.set(req.startTime, startCount);
      maxConcurrency = Math.max(maxConcurrency, startCount);

      // End time
      const endCount = (timeline.get(req.endTime) || 0) - 1;
      timeline.set(req.endTime, endCount);
    }
  }

  // Sort timeline and calculate average
  const sortedTimeline = Array.from(timeline.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, concurrency]) => ({ time, concurrency: Math.max(0, concurrency) }));

  for (const entry of sortedTimeline) {
    totalConcurrency += entry.concurrency;
    timePoints++;
  }

  return {
    maxConcurrency,
    averageConcurrency: timePoints > 0 ? totalConcurrency / timePoints : 0,
    timeline: sortedTimeline,
  };
}

/**
 * Export behavior blocks as JSON for analysis
 */
export function exportBlocksAsJSON(blocks: BehaviorBlock[]): string {
  const data = {
    blockCount: blocks.length,
    blocks: blocks.map(block => ({
      id: block.id,
      type: block.id.startsWith('parallel') ? 'parallel' : 'sequential',
      requestCount: block.requests.length,
      startTime: block.startTime,
      endTime: block.endTime,
      duration: block.endTime - block.startTime,
      requests: block.requests.map(req => ({
        id: req.id,
        method: req.method,
        url: req.url,
        statusCode: req.responseStatus,
      })),
    })),
    statistics: {
      totalRequests: blocks.reduce((sum, b) => sum + b.requests.length, 0),
      parallelBlocks: blocks.filter(b => b.id.startsWith('parallel')).length,
      sequentialBlocks: blocks.filter(b => b.id.startsWith('seq')).length,
    },
  };

  return JSON.stringify(data, null, 2);
}

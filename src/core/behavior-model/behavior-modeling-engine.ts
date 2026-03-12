import { RequestNode, SequentialBlock, ParallelBlock, BehaviorBlock } from '../../types';

/**
 * Behavior Modeling Engine
 * Detects sequential and parallel request patterns
 */
export class BehaviorModelingEngine {
  private overlapThresholdMs: number;
  private minParallelRequests: number;

  constructor(overlapThresholdMs: number = 40, minParallelRequests: number = 2) {
    this.overlapThresholdMs = overlapThresholdMs;
    this.minParallelRequests = minParallelRequests;
  }

  /**
   * Analyze requests and build behavior blocks
   */
  public analyzeRequests(requests: RequestNode[]): BehaviorBlock[] {
    if (requests.length === 0) {
      return [];
    }

    const blocks: BehaviorBlock[] = [];
    let i = 0;

    while (i < requests.length) {
      // Check if current request starts a parallel block
      const parallelBlock = this.detectParallelBlock(requests, i);

      if (parallelBlock && parallelBlock.requests.length >= this.minParallelRequests) {
        blocks.push(parallelBlock);
        i += parallelBlock.requests.length;
      } else {
        // Otherwise, create a sequential block starting from this request
        const sequentialBlock = this.createSequentialBlock(requests, i, blocks.length);
        blocks.push(sequentialBlock);
        i++;
      }
    }

    return blocks;
  }

  /**
   * Detect if a parallel block starts at the given index
   */
  private detectParallelBlock(requests: RequestNode[], startIndex: number): ParallelBlock | null {
    const startRequest = requests[startIndex];
    const parallelRequests: RequestNode[] = [startRequest];

    // Look ahead for overlapping requests
    for (let i = startIndex + 1; i < requests.length; i++) {
      const currentRequest = requests[i];

      // Check if this request overlaps with any request in the parallel group
      const overlapsWithAny = parallelRequests.some(req =>
        this.requestsOverlap(req, currentRequest)
      );

      if (overlapsWithAny) {
        parallelRequests.push(currentRequest);
      } else {
        // Stop when we find a request that doesn't overlap
        break;
      }
    }

    if (parallelRequests.length < this.minParallelRequests) {
      return null;
    }

    const startTime = Math.min(...parallelRequests.map(r => r.startTime));
    const endTime = Math.max(...parallelRequests.map(r => r.endTime));

    return {
      id: `parallel_block_${Date.now()}`,
      requests: parallelRequests,
      startTime,
      endTime,
    };
  }

  /**
   * Check if two requests overlap in time
   */
  private requestsOverlap(req1: RequestNode, req2: RequestNode): boolean {
    // Allow a small threshold for sequential requests that appear parallel
    return req1.endTime + this.overlapThresholdMs >= req2.startTime;
  }

  /**
   * Create a sequential block starting at the given index
   */
  private createSequentialBlock(
    requests: RequestNode[],
    startIndex: number,
    blockIndex: number
  ): SequentialBlock {
    const request = requests[startIndex];
    const thinkTimes: Record<string, number> = {};

    // Calculate think time to next request if it exists
    if (startIndex + 1 < requests.length) {
      const nextRequest = requests[startIndex + 1];
      const thinkTime = Math.max(0, nextRequest.startTime - request.endTime);
      thinkTimes[request.id] = thinkTime;
    }

    return {
      id: `seq_block_${blockIndex}`,
      requests: [request],
      startTime: request.startTime,
      endTime: request.endTime,
      thinkTimes,
    };
  }

  /**
   * Merge sequential blocks with small think times
   * Useful for grouping related requests
   */
  public mergeSequentialBlocks(
    blocks: BehaviorBlock[],
    maxThinkTime: number = 1000
  ): BehaviorBlock[] {
    const merged: BehaviorBlock[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (block instanceof Array || block.id.startsWith('parallel')) {
        merged.push(block);
      } else if ('thinkTimes' in block) {
        // It's a sequential block
        const seqBlock = block as SequentialBlock;
        let currentGroup: RequestNode[] = [...seqBlock.requests];
        let currentThinkTimes = { ...seqBlock.thinkTimes };

        // Check if we can merge with next sequential blocks
        let j = i + 1;
        while (j < blocks.length) {
          const nextBlock = blocks[j];

          if ('thinkTimes' in nextBlock && nextBlock.id.startsWith('seq')) {
            const nextSeqBlock = nextBlock as SequentialBlock;
            const lastRequest = currentGroup[currentGroup.length - 1];
            const nextRequest = nextSeqBlock.requests[0];
            const thinkTime = nextRequest.startTime - lastRequest.endTime;

            if (thinkTime <= maxThinkTime) {
              currentGroup.push(...nextSeqBlock.requests);
              Object.assign(currentThinkTimes, nextSeqBlock.thinkTimes);
              j++;
              i++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        merged.push({
          ...block,
          requests: currentGroup,
          thinkTimes: currentThinkTimes,
          endTime: currentGroup[currentGroup.length - 1].endTime,
        });
      }
    }

    return merged;
  }

  /**
   * Get behavior model statistics
   */
  public getStatistics(blocks: BehaviorBlock[]): {
    totalBlocks: number;
    sequentialBlocks: number;
    parallelBlocks: number;
    totalRequests: number;
    averageRequestsPerBlock: number;
    parallelismFactor: number;
  } {
    const sequentialCount = blocks.filter(b => b.id.startsWith('seq')).length;
    const parallelCount = blocks.filter(b => b.id.startsWith('parallel')).length;
    const totalRequests = blocks.reduce((sum, b) => sum + b.requests.length, 0);

    return {
      totalBlocks: blocks.length,
      sequentialBlocks: sequentialCount,
      parallelBlocks: parallelCount,
      totalRequests,
      averageRequestsPerBlock: totalRequests / blocks.length,
      parallelismFactor: parallelCount > 0 ? parallelCount / blocks.length : 0,
    };
  }

  /**
   * Detect navigation boundaries (page loads)
   */
  public detectNavigationBoundaries(requests: RequestNode[]): BehaviorBlock[][] {
    const boundaries: BehaviorBlock[][] = [];
    const blocks = this.analyzeRequests(requests);

    let currentNavigation: BehaviorBlock[] = [];
    let lastNavigationTime = 0;

    for (const block of blocks) {
      // A navigation typically starts with a document request
      if (this.isNavigationStart(block)) {
        if (currentNavigation.length > 0) {
          boundaries.push(currentNavigation);
        }
        currentNavigation = [block];
        lastNavigationTime = block.startTime;
      } else {
        currentNavigation.push(block);
      }
    }

    if (currentNavigation.length > 0) {
      boundaries.push(currentNavigation);
    }

    return boundaries;
  }

  /**
   * Check if a block starts a new navigation
   */
  private isNavigationStart(block: BehaviorBlock): boolean {
    // A navigation typically starts with a document or xhr request to the main page
    const firstRequest = block.requests[0];

    return (
      firstRequest.method === 'GET' &&
      (firstRequest.resourceType === 'document' || 
       firstRequest.resourceType === 'xhr' ||
       firstRequest.url.endsWith('/') ||
       firstRequest.url.endsWith('.html'))
    );
  }

  /**
   * Set overlap threshold
   */
  public setOverlapThreshold(thresholdMs: number): void {
    this.overlapThresholdMs = thresholdMs;
  }

  /**
   * Set minimum parallel requests threshold
   */
  public setMinParallelRequests(count: number): void {
    this.minParallelRequests = count;
  }
}

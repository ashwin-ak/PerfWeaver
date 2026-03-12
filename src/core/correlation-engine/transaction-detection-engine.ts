import { BehaviorBlock, Transaction, RequestNode } from '../../types';

/**
 * Transaction Detection Engine
 * Groups behavior blocks into logical user transactions
 */
export class TransactionDetectionEngine {
  private transactionPatterns: Map<string, RegExp> = new Map([
    ['login', /login|signin|auth|password/i],
    ['logout', /logout|signout|exit/i],
    ['search', /search|query|find/i],
    ['checkout', /checkout|purchase|pay|cart/i],
    ['navigation', /\/(?!.*(?:api|ajax|xhr))/i],
    ['profile', /profile|account|settings|user/i],
  ]);

  private minBlocksPerTransaction: number = 1;
  private maxThinkTimeBetweenBlocks: number = 5000;

  constructor(
    minBlocksPerTransaction: number = 1,
    maxThinkTime: number = 5000
  ) {
    this.minBlocksPerTransaction = minBlocksPerTransaction;
    this.maxThinkTimeBetweenBlocks = maxThinkTime;
  }

  /**
   * Detect transactions from behavior blocks
   */
  public detectTransactions(blocks: BehaviorBlock[]): Transaction[] {
    const transactions: Transaction[] = [];
    let blockIndex = 0;

    while (blockIndex < blocks.length) {
      const transaction = this.buildTransaction(blocks, blockIndex);
      transactions.push(transaction);
      blockIndex += transaction.blocks.length;
    }

    return transactions;
  }

  /**
   * Build a single transaction starting from the given block index
   */
  private buildTransaction(blocks: BehaviorBlock[], startIndex: number): Transaction {
    const transactionBlocks: BehaviorBlock[] = [];
    let currentIndex = startIndex;

    // Start with the first block
    transactionBlocks.push(blocks[currentIndex]);
    currentIndex++;

    // Check if there's a clear transaction name from the first block
    const transactionName = this.inferTransactionName(blocks[startIndex]);

    // Group subsequent blocks that belong to the same transaction
    while (currentIndex < blocks.length) {
      const currentBlock = blocks[currentIndex];
      const previousBlock = blocks[currentIndex - 1];
      const thinkTime = currentBlock.startTime - previousBlock.endTime;

      // Check if this block belongs to the same transaction
      if (this.belongsToSameTransaction(previousBlock, currentBlock, thinkTime, transactionName)) {
        transactionBlocks.push(currentBlock);
        currentIndex++;
      } else {
        break;
      }
    }

    // Extract all requests and correlation variables from blocks
    const allRequests = this.extractRequestsFromBlocks(transactionBlocks);
    const startTime = Math.min(...transactionBlocks.map(b => b.startTime));
    const endTime = Math.max(...transactionBlocks.map(b => b.endTime));

    return {
      id: `txn_${startIndex}_${Date.now()}`,
      name: transactionName,
      blocks: transactionBlocks,
      correlationVariables: [],
      parameterizedVariables: [],
      startTime,
      endTime,
      duration: endTime - startTime,
    };
  }

  /**
   * Infer transaction name from the first block
   */
  private inferTransactionName(block: BehaviorBlock): string {
    const firstRequest = block.requests[0];

    // Check against pattern map
    for (const [name, pattern] of this.transactionPatterns) {
      if (pattern.test(firstRequest.url)) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }

    // Extract from URL if no pattern matches
    try {
      const url = new URL(firstRequest.url);
      const pathParts = url.pathname.split('/').filter(p => p.length > 0);
      if (pathParts.length > 0) {
        return pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
      }
    } catch (e) {
      // Invalid URL
    }

    return 'Transaction';
  }

  /**
   * Determine if a block belongs to the same transaction
   */
  private belongsToSameTransaction(
    previousBlock: BehaviorBlock,
    currentBlock: BehaviorBlock,
    thinkTime: number,
    transactionName: string
  ): boolean {
    // If think time is too large, it's a new transaction
    if (thinkTime > this.maxThinkTimeBetweenBlocks) {
      return false;
    }

    // Check if the first request in current block belongs to similar action
    const currentFirstRequest = currentBlock.requests[0];

    // If it's a navigation starting with document/page load, it's a new transaction
    if (currentFirstRequest.resourceType === 'document' && 
        currentFirstRequest.method === 'GET' &&
        !currentFirstRequest.url.includes('ajax') &&
        !currentFirstRequest.url.includes('api')) {
      return false;
    }

    return true;
  }

  /**
   * Extract all requests from transaction blocks
   */
  private extractRequestsFromBlocks(blocks: BehaviorBlock[]): RequestNode[] {
    const requests: RequestNode[] = [];

    for (const block of blocks) {
      requests.push(...block.requests);
    }

    return requests;
  }

  /**
   * Merge transactions based on similarity
   */
  public mergeTransactions(
    transactions: Transaction[],
    similarityThreshold: number = 0.7
  ): Transaction[] {
    if (transactions.length <= 1) {
      return transactions;
    }

    const merged: Transaction[] = [];
    let covered = new Set<number>();

    for (let i = 0; i < transactions.length; i++) {
      if (covered.has(i)) {
        continue;
      }

      let mergedTransaction = transactions[i];

      // Look for similar transactions to merge
      for (let j = i + 1; j < transactions.length; j++) {
        if (covered.has(j)) {
          continue;
        }

        const similarity = this.calculateSimilarity(mergedTransaction, transactions[j]);

        if (similarity >= similarityThreshold) {
          mergedTransaction = this.mergeTwoTransactions(mergedTransaction, transactions[j]);
          covered.add(j);
        }
      }

      merged.push(mergedTransaction);
      covered.add(i);
    }

    return merged;
  }

  /**
   * Calculate similarity between two transactions
   */
  private calculateSimilarity(txn1: Transaction, txn2: Transaction): number {
    // Simple similarity based on URL patterns in requests
    const urls1 = new Set(txn1.blocks.flatMap(b => b.requests.map(r => r.url)));
    const urls2 = new Set(txn2.blocks.flatMap(b => b.requests.map(r => r.url)));

    const intersection = Array.from(urls1).filter(u => urls2.has(u)).length;
    const union = new Set([...urls1, ...urls2]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Merge two transactions
   */
  private mergeTwoTransactions(txn1: Transaction, txn2: Transaction): Transaction {
    const mergedBlocks = [...txn1.blocks, ...txn2.blocks];
    const startTime = Math.min(txn1.startTime, txn2.startTime);
    const endTime = Math.max(txn1.endTime, txn2.endTime);

    return {
      ...txn1,
      blocks: mergedBlocks,
      startTime,
      endTime,
      duration: endTime - startTime,
      parameterizedVariables: Array.from(
        new Set([...txn1.parameterizedVariables, ...txn2.parameterizedVariables])
      ),
    };
  }

  /**
   * Get transaction statistics
   */
  public getStatistics(transactions: Transaction[]): {
    totalTransactions: number;
    totalBlocks: number;
    totalRequests: number;
    averageBlocksPerTransaction: number;
    averageRequestsPerTransaction: number;
    transactionsByName: Record<string, number>;
  } {
    const transactionsByName: Record<string, number> = {};

    for (const txn of transactions) {
      transactionsByName[txn.name] = (transactionsByName[txn.name] || 0) + 1;
    }

    const totalBlocks = transactions.reduce((sum, t) => sum + t.blocks.length, 0);
    const totalRequests = transactions.reduce(
      (sum, t) => sum + t.blocks.reduce((s, b) => s + b.requests.length, 0),
      0
    );

    return {
      totalTransactions: transactions.length,
      totalBlocks,
      totalRequests,
      averageBlocksPerTransaction: transactions.length > 0 ? totalBlocks / transactions.length : 0,
      averageRequestsPerTransaction: transactions.length > 0 ? totalRequests / transactions.length : 0,
      transactionsByName,
    };
  }

  /**
   * Add custom transaction name pattern
   */
  public addTransactionPattern(name: string, pattern: RegExp): void {
    this.transactionPatterns.set(name.toLowerCase(), pattern);
  }

  /**
   * Get all transaction patterns
   */
  public getTransactionPatterns(): Map<string, RegExp> {
    return new Map(this.transactionPatterns);
  }

  /**
   * Set max think time between blocks
   */
  public setMaxThinkTime(timeMs: number): void {
    this.maxThinkTimeBetweenBlocks = timeMs;
  }
}

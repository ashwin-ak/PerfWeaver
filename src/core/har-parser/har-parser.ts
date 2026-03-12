import { RequestNode, FilterConfig } from '../../types';
import { HAR, HAREntry } from './har-types';

/**
 * Main HAR Parser class
 * Converts HAR format to internal RequestNode representation
 */
export class HARParser {
  private har: HAR;
  private filterConfig: FilterConfig;
  private requestNodes: RequestNode[] = [];

  constructor(harData: HAR, filterConfig?: FilterConfig) {
    this.har = harData;
    this.filterConfig = filterConfig || this.getDefaultFilterConfig();
  }

  /**
   * Parse the HAR and return a timeline of RequestNodes
   */
  public parse(): RequestNode[] {
    this.requestNodes = [];

    const entries = this.har.log.entries;
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Check if request should be filtered
      if (this.shouldFilter(entry)) {
        continue;
      }

      const requestNode = this.entryToRequestNode(entry, i);
      this.requestNodes.push(requestNode);
    }

    // Sort by start time to maintain timeline
    this.requestNodes.sort((a, b) => a.startTime - b.startTime);

    return this.requestNodes;
  }

  /**
   * Convert a HAR entry to a RequestNode
   */
  private entryToRequestNode(entry: HAREntry, index: number): RequestNode {
    const startTime = new Date(entry.startedDateTime).getTime();
    const endTime = startTime + entry.time;

    const headers = this.extractHeaders(entry.request.headers);
    const responseHeaders = this.extractHeaders(entry.response.headers);

    const payload = this.extractPayload(entry.request);
    const responseBody = entry.response.content.text;

    return {
      id: `req_${index}`,
      url: entry.request.url,
      method: entry.request.method.toUpperCase() as any,
      headers,
      payload,
      responseBody,
      responseHeaders,
      responseStatus: entry.response.status,
      startTime,
      endTime,
      duration: entry.time,
      initiator: this.extractInitiator(entry),
      resourceType: this.getResourceType(entry),
      priority: this.extractPriority(entry),
    };
  }

  /**
   * Check if a request should be filtered out
   */
  private shouldFilter(entry: HAREntry): boolean {
    const url = entry.request.url.toLowerCase();
    const resourceType = this.getResourceType(entry).toLowerCase();

    // Check ignored extensions
    for (const ext of this.filterConfig.ignoreExtensions) {
      if (url.includes(`.${ext.toLowerCase()}`)) {
        return true;
      }
    }

    // Check ignored resource types
    for (const type of this.filterConfig.ignoreResourceTypes) {
      if (resourceType.includes(type.toLowerCase())) {
        return true;
      }
    }

    // Check ignore patterns (regex)
    for (const pattern of this.filterConfig.ignorePatterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(url)) {
          return true;
        }
      } catch (e) {
        // Invalid regex, skip
      }
    }

    return false;
  }

  /**
   * Extract request headers as key-value pairs
   */
  private extractHeaders(harHeaders: Array<{ name: string; value: string }>): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const header of harHeaders) {
      headers[header.name] = header.value;
    }
    return headers;
  }

  /**
   * Extract request payload (POST body)
   */
  private extractPayload(request: any): string | undefined {
    if (request.postData) {
      if (request.postData.text) {
        return request.postData.text;
      }
      // Handle form data
      if (request.postData.params && request.postData.params.length > 0) {
        return JSON.stringify(request.postData.params);
      }
    }
    return undefined;
  }

  /**
   * Extract initiator information
   */
  private extractInitiator(entry: HAREntry): { type: string; url?: string } | undefined {
    // Try to infer from HAR structure
    // Most HAR files don't include explicit initiator info
    // This is a basic implementation
    return undefined;
  }

  /**
   * Determine resource type from URL or headers
   */
  private getResourceType(entry: HAREntry): string {
    const url = entry.request.url.toLowerCase();
    const contentType = entry.response.content.mimeType.toLowerCase();

    // Check by MIME type first
    if (contentType.includes('image')) return 'image';
    if (contentType.includes('font') || contentType.includes('woff') || contentType.includes('ttf')) return 'font';
    if (contentType.includes('stylesheet') || contentType.includes('css')) return 'stylesheet';
    if (contentType.includes('video') || contentType.includes('audio')) return 'media';
    if (contentType.includes('manifest')) return 'manifest';
    
    // Check by URL patterns
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.gif') || url.includes('.svg') || url.includes('.webp')) return 'image';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.woff') || url.includes('.ttf') || url.includes('.otf')) return 'font';
    if (url.includes('xhr') || url.includes('api') || contentType.includes('json')) return 'xhr';
    if (contentType.includes('text/html')) return 'document';

    return 'xhr'; // Default to XHR for uncertain requests
  }

  /**
   * Extract priority if available (not standard in HAR)
   */
  private extractPriority(entry: HAREntry): string | undefined {
    // This would be parsed from non-standard HAR extensions
    return undefined;
  }

  /**
   * Get default filter configuration
   */
  private getDefaultFilterConfig(): FilterConfig {
    return {
      ignoreExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'css', 'woff', 'woff2', 'ttf', 'otf', 'eot'],
      ignoreResourceTypes: ['image', 'stylesheet', 'font', 'media', 'manifest'],
      ignorePatterns: ['.*analytics.*', '.*tracking.*', '.*beacon.*'],
    };
  }

  /**
   * Get parsed request nodes
   */
  public getRequestNodes(): RequestNode[] {
    return this.requestNodes;
  }

  /**
   * Get request by ID
   */
  public getRequestById(id: string): RequestNode | undefined {
    return this.requestNodes.find(r => r.id === id);
  }

  /**
   * Get all requests in a time range
   */
  public getRequestsInTimeRange(startTime: number, endTime: number): RequestNode[] {
    return this.requestNodes.filter(r => r.startTime >= startTime && r.startTime <= endTime);
  }

  /**
   * Get statistics about parsed requests
   */
  public getStatistics() {
    return {
      totalRequests: this.requestNodes.length,
      totalDuration: this.requestNodes.length > 0 
        ? this.requestNodes[this.requestNodes.length - 1].endTime - this.requestNodes[0].startTime
        : 0,
      averageRequestDuration: this.requestNodes.length > 0
        ? this.requestNodes.reduce((sum, r) => sum + r.duration, 0) / this.requestNodes.length
        : 0,
      requestsByMethod: this.groupByMethod(),
      requestsByResourceType: this.groupByResourceType(),
    };
  }

  /**
   * Group requests by HTTP method
   */
  private groupByMethod(): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const req of this.requestNodes) {
      grouped[req.method] = (grouped[req.method] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Group requests by resource type
   */
  private groupByResourceType(): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const req of this.requestNodes) {
      const type = req.resourceType || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    }
    return grouped;
  }
}

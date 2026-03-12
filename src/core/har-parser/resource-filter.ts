import { RequestNode, FilterConfig } from '../../types';

/**
 * Resource Filtering Engine
 * Filters out requests based on extension, resource type, and patterns
 */
export class ResourceFilter {
  private filterConfig: FilterConfig;

  constructor(filterConfig: FilterConfig) {
    this.filterConfig = filterConfig;
  }

  /**
   * Filter a list of request nodes
   */
  public filter(requests: RequestNode[]): RequestNode[] {
    return requests.filter(req => !this.shouldFilter(req));
  }

  /**
   * Check if a single request should be filtered out
   */
  public shouldFilter(request: RequestNode): boolean {
    return (
      this.matchesExtension(request) ||
      this.matchesResourceType(request) ||
      this.matchesPattern(request)
    );
  }

  /**
   * Check if URL matches ignored extensions
   */
  private matchesExtension(request: RequestNode): boolean {
    const url = request.url.toLowerCase();

    for (const ext of this.filterConfig.ignoreExtensions) {
      if (url.includes(`.${ext.toLowerCase()}`)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if resource type matches ignored types
   */
  private matchesResourceType(request: RequestNode): boolean {
    if (!request.resourceType) {
      return false;
    }

    const resourceType = request.resourceType.toLowerCase();

    for (const type of this.filterConfig.ignoreResourceTypes) {
      if (resourceType.includes(type.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if URL matches any ignore patterns (regex)
   */
  private matchesPattern(request: RequestNode): boolean {
    const url = request.url.toLowerCase();

    for (const pattern of this.filterConfig.ignorePatterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(url)) {
          return true;
        }
      } catch (e) {
        // Invalid regex pattern, skip
        console.warn(`Invalid regex pattern: ${pattern}`);
      }
    }

    return false;
  }

  /**
   * Get filter statistics
   */
  public getFilterStats(originalRequests: RequestNode[], filteredRequests: RequestNode[]): {
    originalCount: number;
    filteredCount: number;
    removedCount: number;
    removalPercentage: number;
    removedByExtension: Record<string, number>;
    removedByType: Record<string, number>;
  } {
    const removed = this.findRemovedRequests(originalRequests, filteredRequests);

    return {
      originalCount: originalRequests.length,
      filteredCount: filteredRequests.length,
      removedCount: removed.length,
      removalPercentage: originalRequests.length > 0 
        ? (removed.length / originalRequests.length) * 100
        : 0,
      removedByExtension: this.countRemovedByExtension(removed),
      removedByType: this.countRemovedByType(removed),
    };
  }

  /**
   * Find which requests were removed
   */
  private findRemovedRequests(original: RequestNode[], filtered: RequestNode[]): RequestNode[] {
    const filteredIds = new Set(filtered.map(r => r.id));
    return original.filter(r => !filteredIds.has(r.id));
  }

  /**
   * Count removed requests by extension
   */
  private countRemovedByExtension(removed: RequestNode[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const req of removed) {
      if (this.matchesExtension(req)) {
        const ext = this.extractExtension(req.url);
        counts[ext] = (counts[ext] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Count removed requests by resource type
   */
  private countRemovedByType(removed: RequestNode[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const req of removed) {
      if (this.matchesResourceType(req) && req.resourceType) {
        counts[req.resourceType] = (counts[req.resourceType] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Extract file extension from URL
   */
  private extractExtension(url: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  /**
   * Update filter configuration
   */
  public updateFilterConfig(config: Partial<FilterConfig>): void {
    this.filterConfig = {
      ...this.filterConfig,
      ...config,
    };
  }

  /**
   * Get current filter configuration
   */
  public getFilterConfig(): FilterConfig {
    return this.filterConfig;
  }

  /**
   * Create a filter from a template
   */
  public static createFromTemplate(template: 'strict' | 'moderate' | 'lenient'): ResourceFilter {
    const templates: Record<string, FilterConfig> = {
      strict: {
        ignoreExtensions: [
          'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico',
          'css', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'scss', 'sass', 'less'
        ],
        ignoreResourceTypes: [
          'image', 'stylesheet', 'font', 'media', 'manifest', 'fetch',
          'xhr'
        ],
        ignorePatterns: [
          '.*analytics.*', '.*tracking.*', '.*beacon.*', '.*ga\\.js.*',
          '.*google.*tag.*', '.*facebook.*pixel.*'
        ],
      },
      moderate: {
        ignoreExtensions: [
          'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
          'css', 'woff', 'woff2', 'ttf', 'eot'
        ],
        ignoreResourceTypes: ['image', 'stylesheet', 'font', 'media'],
        ignorePatterns: ['.*analytics.*', '.*tracking.*', '.*beacon.*'],
      },
      lenient: {
        ignoreExtensions: ['png', 'jpg', 'gif'],
        ignoreResourceTypes: ['image'],
        ignorePatterns: [],
      },
    };

    return new ResourceFilter(templates[template] || templates.moderate);
  }
}

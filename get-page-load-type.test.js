import getPageLoadType from ".";
import { jest } from '@jest/globals';

describe('getPageLoadType', () => {
  // Helper function to create mock dependencies
  function createMocks({
    sxgUsed = false,
    browserCached = false,
    fromSxgCache = false,
    cfCacheUsed = false,
    earlyHintsUsed = false,
    resolveSxgStatusShouldResolve = true,
    prefetched = undefined
  } = {}) {
    return {
      sxgUsed: jest.fn().mockReturnValue(sxgUsed),
      browserCached: jest.fn().mockReturnValue(browserCached),
      fromSxgCache: jest.fn().mockReturnValue(fromSxgCache),
      cfCacheUsed: jest.fn().mockReturnValue(cfCacheUsed),
      earlyHintsUsed: jest.fn().mockReturnValue(earlyHintsUsed),
      resolveSxgStatus: jest.fn().mockImplementation(() => {
        return resolveSxgStatusShouldResolve ?
          Promise.resolve() :
          Promise.reject();
      }),
      prefetched
    };
  }

  // SXG path tests
  describe('SXG path (sxgUsed = true)', () => {
    test('returns "sxg_complete_prefetch" when SXG is used, browser cached, and SXG status resolves', async () => {
      const mocks = createMocks({
        sxgUsed: true,
        browserCached: true,
        resolveSxgStatusShouldResolve: true
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('sxg_complete_prefetch');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
      expect(mocks.resolveSxgStatus).toHaveBeenCalled();
    });

    test('returns "sxg_document_prefetch" when SXG is used, browser cached, but SXG status rejects', async () => {
      const mocks = createMocks({
        sxgUsed: true,
        browserCached: true,
        resolveSxgStatusShouldResolve: false
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('sxg_document_prefetch');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
      expect(mocks.resolveSxgStatus).toHaveBeenCalled();
    });

    test('returns "sxg_document_on_demand" when SXG is used but not browser cached', async () => {
      const mocks = createMocks({
        sxgUsed: true,
        browserCached: false
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('sxg_document_on_demand');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
      expect(mocks.resolveSxgStatus).not.toHaveBeenCalled();
    });
  });

  // SXG fallback path tests (fromSxgCache = true)
  describe('SXG fallback path (sxgUsed = false, fromSxgCache = true)', () => {
    test('returns "sxg_fallback_on_demand_edge" when from SXG cache and CF cache used', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: true,
        cfCacheUsed: true
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('sxg_fallback_on_demand_edge');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.cfCacheUsed).toHaveBeenCalled();
      expect(mocks.earlyHintsUsed).not.toHaveBeenCalled();
    });

    test('returns "sxg_fallback_on_demand_hints" when from SXG cache, CF cache not used, but early hints used', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: true,
        cfCacheUsed: false,
        earlyHintsUsed: true
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('sxg_fallback_on_demand_hints');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.cfCacheUsed).toHaveBeenCalled();
      expect(mocks.earlyHintsUsed).toHaveBeenCalled();
    });

    test('returns "sxg_fallback_on_demand_origin" when from SXG cache, CF cache not used, early hints not used', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: true,
        cfCacheUsed: false,
        earlyHintsUsed: false
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('sxg_fallback_on_demand_origin');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.cfCacheUsed).toHaveBeenCalled();
      expect(mocks.earlyHintsUsed).toHaveBeenCalled();
    });
  });

  // Regular document path tests (sxgUsed = false, fromSxgCache = false)
  describe('Regular document path (sxgUsed = false, fromSxgCache = false)', () => {
    // Browser cached cases
    test('returns "document_prefetch/browser_cache" when browser cached and prefetched is undefined', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: false,
        browserCached: true,
        prefetched: undefined
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('document_prefetch/browser_cache');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
    });

    test('returns "document_prefetch" when browser cached and prefetched is true', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: false,
        browserCached: true,
        prefetched: true
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('document_prefetch');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
    });

    test('returns "browser_cache" when browser cached and prefetched is false', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: false,
        browserCached: true,
        prefetched: false
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('browser_cache');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
    });

    // Not browser cached cases
    test('returns "document_on_demand_edge" when not browser cached and CF cache used', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: false,
        browserCached: false,
        cfCacheUsed: true
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('document_on_demand_edge');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
      expect(mocks.cfCacheUsed).toHaveBeenCalled();
    });

    test('returns "document_on_demand_hints" when not browser cached, CF cache not used, but early hints used', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: false,
        browserCached: false,
        cfCacheUsed: false,
        earlyHintsUsed: true
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('document_on_demand_hints');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
      expect(mocks.cfCacheUsed).toHaveBeenCalled();
      expect(mocks.earlyHintsUsed).toHaveBeenCalled();
    });

    test('returns "document_on_demand_origin" when not browser cached, CF cache not used, early hints not used', async () => {
      const mocks = createMocks({
        sxgUsed: false,
        fromSxgCache: false,
        browserCached: false,
        cfCacheUsed: false,
        earlyHintsUsed: false
      });

      const result = await getPageLoadType(mocks);

      expect(result).toBe('document_on_demand_origin');
      expect(mocks.sxgUsed).toHaveBeenCalled();
      expect(mocks.fromSxgCache).toHaveBeenCalled();
      expect(mocks.browserCached).toHaveBeenCalled();
      expect(mocks.cfCacheUsed).toHaveBeenCalled();
      expect(mocks.earlyHintsUsed).toHaveBeenCalled();
    });
  });

  // Custom SXG status config
  test('passes custom SXG status config to resolveSxgStatus', async () => {
    const customSxgStatusConfig = {
      scriptPath: '/custom/path.js',
      eventName: 'CustomEvent',
      eventProperty: 'customProperty'
    };

    const mocks = createMocks({
      sxgUsed: true,
      browserCached: true,
      resolveSxgStatusShouldResolve: true
    });

    await getPageLoadType({
      ...mocks,
      sxgStatusConfig: customSxgStatusConfig
    });

    expect(mocks.resolveSxgStatus).toHaveBeenCalledWith({
      sxgStatusConfig: customSxgStatusConfig
    });
  });
});

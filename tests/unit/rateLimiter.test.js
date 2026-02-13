const { 
  checkRateLimit, 
  clearRateLimit, 
  clearAllRateLimits, 
  getRequestCount,
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX_REQUESTS
} = require('../../src/lib/rateLimiter');

describe('Rate Limiter Module', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
  });

  describe('checkRateLimit', () => {
    test('should allow first request for a new API key', () => {
      const result = checkRateLimit('api-key-1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(DEFAULT_MAX_REQUESTS - 1);
      expect(result.retryAfter).toBeNull();
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    test('should track multiple requests from the same API key', () => {
      const apiKey = 'api-key-tracking';
      
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(apiKey);
      }
      
      const result = checkRateLimit(apiKey);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(DEFAULT_MAX_REQUESTS - 6);
    });

    test('should use default configuration values', () => {
      expect(DEFAULT_WINDOW_MS).toBe(60000);
      expect(DEFAULT_MAX_REQUESTS).toBe(100);
    });

    test('should allow custom window size', () => {
      const apiKey = 'api-key-custom-window';
      const customWindowMs = 1000;
      
      const result = checkRateLimit(apiKey, { windowMs: customWindowMs });
      
      expect(result.allowed).toBe(true);
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + customWindowMs);
    });

    test('should allow custom max requests limit', () => {
      const apiKey = 'api-key-custom-limit';
      const customMaxRequests = 5;
      
      // Make exactly 5 requests (should all be allowed)
      for (let i = 0; i < customMaxRequests; i++) {
        const result = checkRateLimit(apiKey, { maxRequests: customMaxRequests });
        expect(result.allowed).toBe(true);
      }
      
      // 6th request should be blocked
      const blockedResult = checkRateLimit(apiKey, { maxRequests: customMaxRequests });
      expect(blockedResult.allowed).toBe(false);
    });
  });

  describe('Sliding Window Behavior', () => {
    test('should expire old requests outside the sliding window', () => {
      const apiKey = 'api-key-sliding';
      const windowMs = 1000;
      const maxRequests = 2;
      
      // Time at start of test
      const startTime = 1000000;
      
      // Make 2 requests at startTime
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime });
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime });
      
      // Third request at startTime should be blocked
      let result = checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime });
      expect(result.allowed).toBe(false);
      
      // After window expires, request should be allowed
      const afterWindow = startTime + windowMs + 1;
      result = checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: afterWindow });
      expect(result.allowed).toBe(true);
    });

    test('should correctly calculate retryAfter based on oldest request', () => {
      const apiKey = 'api-key-retry';
      const windowMs = 10000;
      const maxRequests = 2;
      const startTime = 1000000;
      
      // Make 2 requests
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime });
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime + 1000 });
      
      // Third request should be blocked with correct retryAfter
      const result = checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime + 2000 });
      
      expect(result.allowed).toBe(false);
      // Retry after should be approximately 8 seconds (first request expires at startTime + 10000)
      expect(result.retryAfter).toBe(8);
    });

    test('should properly slide window as time passes', () => {
      const apiKey = 'api-key-sliding-2';
      const windowMs = 5000;
      const maxRequests = 3;
      let currentTime = 1000000;
      
      // Make 3 requests at different times within the window
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime });
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: currentTime + 1000 });
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: currentTime + 2000 });
      
      // 4th request should be blocked
      let result = checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: currentTime + 3000 });
      expect(result.allowed).toBe(false);
      
      // After first request expires, should allow new request
      currentTime = currentTime + 5001; // Just after first request expires
      result = checkRateLimit(apiKey, { windowMs, maxRequests, currentTime });
      expect(result.allowed).toBe(true);
    });

    test('should reset window correctly when all requests expire', () => {
      const apiKey = 'api-key-reset';
      const windowMs = 1000;
      const maxRequests = 2;
      const startTime = 1000000;
      
      // Fill up the limit
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime });
      checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: startTime });
      
      // Move time far beyond window
      const farFuture = startTime + windowMs * 10;
      const result = checkRateLimit(apiKey, { windowMs, maxRequests, currentTime: farFuture });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(maxRequests - 1);
    });
  });

  describe('Per-Key Independent Tracking', () => {
    test('should track different API keys independently', () => {
      const apiKey1 = 'api-key-a';
      const apiKey2 = 'api-key-b';
      const maxRequests = 3;
      
      // Fill up limit for key1
      for (let i = 0; i < maxRequests; i++) {
        checkRateLimit(apiKey1, { maxRequests });
      }
      
      // Key1 should be blocked
      expect(checkRateLimit(apiKey1, { maxRequests }).allowed).toBe(false);
      
      // Key2 should still be allowed
      expect(checkRateLimit(apiKey2, { maxRequests }).allowed).toBe(true);
    });

    test('should maintain separate counts for each API key', () => {
      const apiKey1 = 'api-key-count-1';
      const apiKey2 = 'api-key-count-2';
      
      // Make different number of requests for each key
      checkRateLimit(apiKey1);
      checkRateLimit(apiKey1);
      checkRateLimit(apiKey1);
      
      checkRateLimit(apiKey2);
      
      expect(getRequestCount(apiKey1)).toBe(3);
      expect(getRequestCount(apiKey2)).toBe(1);
    });

    test('should not affect other keys when one key is cleared', () => {
      const apiKey1 = 'api-key-clear-1';
      const apiKey2 = 'api-key-clear-2';
      
      // Make requests for both keys
      checkRateLimit(apiKey1);
      checkRateLimit(apiKey1);
      checkRateLimit(apiKey2);
      
      // Clear only key1
      clearRateLimit(apiKey1);
      
      expect(getRequestCount(apiKey1)).toBe(0);
      expect(getRequestCount(apiKey2)).toBe(1);
    });

    test('should handle many concurrent API keys', () => {
      const numKeys = 50;
      const maxRequests = 5;
      
      // Create many API keys and make requests
      for (let i = 0; i < numKeys; i++) {
        const apiKey = `api-key-concurrent-${i}`;
        for (let j = 0; j < 3; j++) {
          checkRateLimit(apiKey, { maxRequests });
        }
      }
      
      // Verify each key has correct count
      for (let i = 0; i < numKeys; i++) {
        const apiKey = `api-key-concurrent-${i}`;
        expect(getRequestCount(apiKey)).toBe(3);
      }
    });
  });

  describe('Rate Limit Exceeded Response', () => {
    test('should return allowed=false when limit is exceeded', () => {
      const apiKey = 'api-key-exceeded';
      const maxRequests = 2;
      
      // Exhaust the limit
      checkRateLimit(apiKey, { maxRequests });
      checkRateLimit(apiKey, { maxRequests });
      
      const result = checkRateLimit(apiKey, { maxRequests });
      
      expect(result.allowed).toBe(false);
    });

    test('should return remaining=0 when limit is exceeded', () => {
      const apiKey = 'api-key-remaining';
      const maxRequests = 2;
      
      checkRateLimit(apiKey, { maxRequests });
      checkRateLimit(apiKey, { maxRequests });
      
      const result = checkRateLimit(apiKey, { maxRequests });
      
      expect(result.remaining).toBe(0);
    });

    test('should return positive retryAfter value when limit is exceeded', () => {
      const apiKey = 'api-key-retry-after';
      const maxRequests = 2;
      const windowMs = 60000;
      
      checkRateLimit(apiKey, { maxRequests, windowMs });
      checkRateLimit(apiKey, { maxRequests, windowMs });
      
      const result = checkRateLimit(apiKey, { maxRequests, windowMs });
      
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    test('should return minimum retryAfter of 1 second', () => {
      const apiKey = 'api-key-min-retry';
      const maxRequests = 2;
      const windowMs = 500;
      const currentTime = 1000000;
      
      checkRateLimit(apiKey, { maxRequests, windowMs, currentTime });
      checkRateLimit(apiKey, { maxRequests, windowMs, currentTime });
      
      // Request just before window expires
      const result = checkRateLimit(apiKey, { maxRequests, windowMs, currentTime: currentTime + 450 });
      
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    });

    test('should include resetTime in response', () => {
      const apiKey = 'api-key-reset-time';
      const maxRequests = 2;
      const windowMs = 60000;
      
      checkRateLimit(apiKey, { maxRequests, windowMs });
      checkRateLimit(apiKey, { maxRequests, windowMs });
      
      const result = checkRateLimit(apiKey, { maxRequests, windowMs });
      
      expect(result.resetTime).toBeDefined();
      expect(typeof result.resetTime).toBe('number');
    });
  });

  describe('clearRateLimit', () => {
    test('should return true when clearing existing key', () => {
      const apiKey = 'api-key-clear-exists';
      checkRateLimit(apiKey);
      
      const result = clearRateLimit(apiKey);
      
      expect(result).toBe(true);
    });

    test('should return false when clearing non-existent key', () => {
      const result = clearRateLimit('non-existent-key');
      
      expect(result).toBe(false);
    });

    test('should reset request count to zero', () => {
      const apiKey = 'api-key-clear-reset';
      
      checkRateLimit(apiKey);
      checkRateLimit(apiKey);
      expect(getRequestCount(apiKey)).toBe(2);
      
      clearRateLimit(apiKey);
      expect(getRequestCount(apiKey)).toBe(0);
    });
  });

  describe('clearAllRateLimits', () => {
    test('should clear all API keys', () => {
      const apiKey1 = 'api-key-all-1';
      const apiKey2 = 'api-key-all-2';
      
      checkRateLimit(apiKey1);
      checkRateLimit(apiKey2);
      
      clearAllRateLimits();
      
      expect(getRequestCount(apiKey1)).toBe(0);
      expect(getRequestCount(apiKey2)).toBe(0);
    });
  });

  describe('getRequestCount', () => {
    test('should return 0 for new API key', () => {
      expect(getRequestCount('new-key')).toBe(0);
    });

    test('should return correct count after requests', () => {
      const apiKey = 'api-key-count';
      
      checkRateLimit(apiKey);
      checkRateLimit(apiKey);
      checkRateLimit(apiKey);
      
      expect(getRequestCount(apiKey)).toBe(3);
    });

    test('should not count expired requests', () => {
      const apiKey = 'api-key-expired';
      const windowMs = 1000;
      const startTime = 1000000;
      
      // Make requests at startTime
      checkRateLimit(apiKey, { windowMs, currentTime: startTime });
      checkRateLimit(apiKey, { windowMs, currentTime: startTime });
      
      // After window expires, count should be 0
      expect(getRequestCount(apiKey, { windowMs, currentTime: startTime + windowMs + 1 })).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string API key', () => {
      const result = checkRateLimit('');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(DEFAULT_MAX_REQUESTS - 1);
    });

    test('should handle very long API key', () => {
      const longKey = 'a'.repeat(1000);
      const result = checkRateLimit(longKey);
      
      expect(result.allowed).toBe(true);
    });

    test('should handle special characters in API key', () => {
      const specialKey = 'api-key-!@#$%^&*()_+{}[]|\\:";\'<>?,./~`';
      const result = checkRateLimit(specialKey);
      
      expect(result.allowed).toBe(true);
    });

    test('should handle unicode characters in API key', () => {
      const unicodeKey = 'api-key-日本語-한국어-العربية-🔑';
      const result = checkRateLimit(unicodeKey);
      
      expect(result.allowed).toBe(true);
    });

    test('should handle maxRequests of 1', () => {
      const apiKey = 'api-key-one-request';
      
      const first = checkRateLimit(apiKey, { maxRequests: 1 });
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(0);
      
      const second = checkRateLimit(apiKey, { maxRequests: 1 });
      expect(second.allowed).toBe(false);
    });

    test('should handle very short window', () => {
      const apiKey = 'api-key-short-window';
      const windowMs = 1;
      const currentTime = 1000000;
      
      checkRateLimit(apiKey, { windowMs, maxRequests: 1, currentTime });
      
      // Immediately after window expires
      const result = checkRateLimit(apiKey, { windowMs, maxRequests: 1, currentTime: currentTime + 2 });
      expect(result.allowed).toBe(true);
    });

    test('should handle very large window', () => {
      const apiKey = 'api-key-large-window';
      const windowMs = 24 * 60 * 60 * 1000; // 24 hours
      
      const result = checkRateLimit(apiKey, { windowMs });
      
      expect(result.allowed).toBe(true);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    test('should not add request to store when limit exceeded', () => {
      const apiKey = 'api-key-no-add';
      const maxRequests = 2;
      
      checkRateLimit(apiKey, { maxRequests });
      checkRateLimit(apiKey, { maxRequests });
      
      // This should not increase the count
      checkRateLimit(apiKey, { maxRequests });
      checkRateLimit(apiKey, { maxRequests });
      
      expect(getRequestCount(apiKey)).toBe(2);
    });

    test('should handle rapid sequential requests', () => {
      const apiKey = 'api-key-rapid';
      const maxRequests = 100;
      
      // Make 100 rapid requests
      for (let i = 0; i < maxRequests; i++) {
        checkRateLimit(apiKey, { maxRequests });
      }
      
      expect(getRequestCount(apiKey)).toBe(maxRequests);
      
      // Next request should be blocked
      const result = checkRateLimit(apiKey, { maxRequests });
      expect(result.allowed).toBe(false);
    });

    test('should handle undefined options gracefully', () => {
      const result = checkRateLimit('api-key-undefined', undefined);
      
      expect(result.allowed).toBe(true);
    });

    test('should handle partial options object', () => {
      const result = checkRateLimit('api-key-partial', { maxRequests: 50 });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49);
    });
  });
});

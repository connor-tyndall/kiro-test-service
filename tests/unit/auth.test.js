const { validateApiKey } = require('../../src/lib/auth');

describe('Auth Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key-12345';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateApiKey', () => {
    test('should return null for valid API key in lowercase header', () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key-12345'
        }
      };
      const result = validateApiKey(event);
      expect(result).toBeNull();
    });

    test('should return null for valid API key in mixed case header', () => {
      const event = {
        headers: {
          'X-Api-Key': 'test-api-key-12345'
        }
      };
      const result = validateApiKey(event);
      expect(result).toBeNull();
    });

    test('should return 401 for missing API key', () => {
      const event = {
        headers: {}
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toBe('Missing API key');
    });

    test('should return 401 for missing headers object', () => {
      const event = {};
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toBe('Missing API key');
    });

    test('should return 401 for invalid API key', () => {
      const event = {
        headers: {
          'x-api-key': 'wrong-key'
        }
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toBe('Invalid API key');
    });

    test('should return 401 for empty API key', () => {
      const event = {
        headers: {
          'x-api-key': ''
        }
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toBe('Missing API key');
    });

    test('should return 500 if API_KEY environment variable is not set', () => {
      delete process.env.API_KEY;
      const event = {
        headers: {
          'x-api-key': 'some-key'
        }
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe('Internal server error');
    });

    test('should return 500 if API_KEY environment variable is empty', () => {
      process.env.API_KEY = '';
      const event = {
        headers: {
          'x-api-key': 'some-key'
        }
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe('Internal server error');
    });

    test('should handle null headers', () => {
      const event = {
        headers: null
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toBe('Missing API key');
    });
  });

  describe('Request ID Tracking', () => {
    test('should include x-request-id header in 401 error response when requestId is provided', () => {
      const requestId = 'test-request-id-401';
      const event = {
        headers: {}
      };
      const result = validateApiKey(event, requestId);
      expect(result.statusCode).toBe(401);
      expect(result.headers['x-request-id']).toBe(requestId);
    });

    test('should include requestId in 401 error response body when requestId is provided', () => {
      const requestId = 'test-request-id-body';
      const event = {
        headers: {
          'x-api-key': 'wrong-key'
        }
      };
      const result = validateApiKey(event, requestId);
      const body = JSON.parse(result.body);
      expect(result.statusCode).toBe(401);
      expect(body.requestId).toBe(requestId);
    });

    test('should include x-request-id header in 500 error response when requestId is provided', () => {
      delete process.env.API_KEY;
      const requestId = 'test-request-id-500';
      const event = {
        headers: {
          'x-api-key': 'some-key'
        }
      };
      const result = validateApiKey(event, requestId);
      expect(result.statusCode).toBe(500);
      expect(result.headers['x-request-id']).toBe(requestId);
    });

    test('should include requestId in 500 error response body when requestId is provided', () => {
      delete process.env.API_KEY;
      const requestId = 'test-request-id-500-body';
      const event = {
        headers: {
          'x-api-key': 'some-key'
        }
      };
      const result = validateApiKey(event, requestId);
      const body = JSON.parse(result.body);
      expect(result.statusCode).toBe(500);
      expect(body.requestId).toBe(requestId);
    });

    test('should not include x-request-id header when requestId is not provided', () => {
      const event = {
        headers: {}
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(401);
      expect(result.headers['x-request-id']).toBeUndefined();
    });

    test('should not include requestId in response body when requestId is not provided', () => {
      const event = {
        headers: {}
      };
      const result = validateApiKey(event);
      const body = JSON.parse(result.body);
      expect(body.requestId).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined event', () => {
      const result = validateApiKey(undefined);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toBe('Missing API key');
    });

    test('should handle null event', () => {
      const result = validateApiKey(null);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error).toBe('Missing API key');
    });

    test('should handle whitespace-only API key', () => {
      const event = {
        headers: {
          'x-api-key': '   '
        }
      };
      const result = validateApiKey(event);
      expect(result.statusCode).toBe(401);
    });

    test('should handle undefined event with requestId', () => {
      const requestId = 'test-request-id-undefined';
      const result = validateApiKey(undefined, requestId);
      expect(result.statusCode).toBe(401);
      expect(result.headers['x-request-id']).toBe(requestId);
      expect(JSON.parse(result.body).requestId).toBe(requestId);
    });

    test('should handle null event with requestId', () => {
      const requestId = 'test-request-id-null';
      const result = validateApiKey(null, requestId);
      expect(result.statusCode).toBe(401);
      expect(result.headers['x-request-id']).toBe(requestId);
      expect(JSON.parse(result.body).requestId).toBe(requestId);
    });
  });
});

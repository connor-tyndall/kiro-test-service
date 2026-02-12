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
});

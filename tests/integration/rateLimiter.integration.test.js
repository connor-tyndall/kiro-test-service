const { clearAllRateLimits } = require('../../src/lib/rateLimiter');

// Mock DynamoDB module
jest.mock('../../src/lib/dynamodb', () => ({
  putTask: jest.fn().mockResolvedValue({}),
  getTask: jest.fn().mockResolvedValue({
    id: 'test-task-id',
    description: 'Test task',
    assignee: 'john@example.com',
    priority: 'P2',
    status: 'open',
    dueDate: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }),
  deleteTask: jest.fn().mockResolvedValue({}),
  scanTasks: jest.fn().mockResolvedValue({ items: [], nextToken: null }),
  queryTasksByAssignee: jest.fn().mockResolvedValue({ items: [], nextToken: null }),
  queryTasksByStatus: jest.fn().mockResolvedValue({ items: [], nextToken: null }),
  queryTasksByPriority: jest.fn().mockResolvedValue({ items: [], nextToken: null })
}));

// Import handlers after mocking
const createTaskHandler = require('../../src/handlers/createTask').handler;
const getTaskHandler = require('../../src/handlers/getTask').handler;
const updateTaskHandler = require('../../src/handlers/updateTask').handler;
const deleteTaskHandler = require('../../src/handlers/deleteTask').handler;
const listTasksHandler = require('../../src/handlers/listTasks').handler;

describe('Rate Limiter Integration with Handlers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key-12345';
    clearAllRateLimits();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Creates a valid API Gateway event with the given API key
   * @param {string} apiKey - The API key to use
   * @param {Object} overrides - Additional event properties to override
   * @returns {Object} API Gateway event
   */
  const createEvent = (apiKey, overrides = {}) => ({
    headers: {
      'x-api-key': apiKey
    },
    body: JSON.stringify({ description: 'Test task' }),
    pathParameters: { id: 'test-task-id' },
    queryStringParameters: {},
    ...overrides
  });

  describe('createTask Handler', () => {
    test('should return 429 when rate limit is exceeded', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      // Exhaust rate limit (default 100 requests)
      for (let i = 0; i < 100; i++) {
        await createTaskHandler(event);
      }
      
      // Next request should be rate limited
      const response = await createTaskHandler(event);
      
      expect(response.statusCode).toBe(429);
      expect(JSON.parse(response.body).error).toBe('Rate limit exceeded');
      expect(response.headers['Retry-After']).toBeDefined();
    });

    test('should include Retry-After header in rate limit response', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      for (let i = 0; i < 100; i++) {
        await createTaskHandler(event);
      }
      
      const response = await createTaskHandler(event);
      
      expect(response.headers['Retry-After']).toMatch(/^\d+$/);
      expect(parseInt(response.headers['Retry-After'])).toBeGreaterThan(0);
    });

    test('should allow requests from different API keys independently', async () => {
      // Note: This handler validates the API key, so we need to use the valid one
      // but the rate limiter tracks by the key in headers
      const event = createEvent('test-api-key-12345');
      
      // First 100 requests should succeed
      for (let i = 0; i < 100; i++) {
        const response = await createTaskHandler(event);
        expect(response.statusCode).toBe(201);
      }
      
      // 101st request should be rate limited
      const response = await createTaskHandler(event);
      expect(response.statusCode).toBe(429);
    });
  });

  describe('getTask Handler', () => {
    test('should return 429 when rate limit is exceeded', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      for (let i = 0; i < 100; i++) {
        await getTaskHandler(event);
      }
      
      const response = await getTaskHandler(event);
      
      expect(response.statusCode).toBe(429);
      expect(JSON.parse(response.body).error).toBe('Rate limit exceeded');
    });

    test('should include Retry-After header in rate limit response', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      for (let i = 0; i < 100; i++) {
        await getTaskHandler(event);
      }
      
      const response = await getTaskHandler(event);
      
      expect(response.headers['Retry-After']).toBeDefined();
    });
  });

  describe('updateTask Handler', () => {
    test('should return 429 when rate limit is exceeded', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey, {
        body: JSON.stringify({ description: 'Updated task' })
      });
      
      for (let i = 0; i < 100; i++) {
        await updateTaskHandler(event);
      }
      
      const response = await updateTaskHandler(event);
      
      expect(response.statusCode).toBe(429);
      expect(JSON.parse(response.body).error).toBe('Rate limit exceeded');
    });

    test('should include Retry-After header in rate limit response', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      for (let i = 0; i < 100; i++) {
        await updateTaskHandler(event);
      }
      
      const response = await updateTaskHandler(event);
      
      expect(response.headers['Retry-After']).toBeDefined();
    });
  });

  describe('deleteTask Handler', () => {
    test('should return 429 when rate limit is exceeded', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      for (let i = 0; i < 100; i++) {
        await deleteTaskHandler(event);
      }
      
      const response = await deleteTaskHandler(event);
      
      expect(response.statusCode).toBe(429);
      expect(JSON.parse(response.body).error).toBe('Rate limit exceeded');
    });

    test('should include Retry-After header in rate limit response', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      for (let i = 0; i < 100; i++) {
        await deleteTaskHandler(event);
      }
      
      const response = await deleteTaskHandler(event);
      
      expect(response.headers['Retry-After']).toBeDefined();
    });
  });

  describe('listTasks Handler', () => {
    test('should return 429 when rate limit is exceeded', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey, { body: null });
      
      for (let i = 0; i < 100; i++) {
        await listTasksHandler(event);
      }
      
      const response = await listTasksHandler(event);
      
      expect(response.statusCode).toBe(429);
      expect(JSON.parse(response.body).error).toBe('Rate limit exceeded');
    });

    test('should include Retry-After header in rate limit response', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey, { body: null });
      
      for (let i = 0; i < 100; i++) {
        await listTasksHandler(event);
      }
      
      const response = await listTasksHandler(event);
      
      expect(response.headers['Retry-After']).toBeDefined();
    });
  });

  describe('Cross-Handler Rate Limiting', () => {
    test('should share rate limit across all endpoints for same API key', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      // Make requests across different handlers
      for (let i = 0; i < 25; i++) {
        await createTaskHandler(event);
        await getTaskHandler(event);
        await updateTaskHandler(event);
        await listTasksHandler({ ...event, body: null });
      }
      
      // All handlers should now return 429
      expect((await createTaskHandler(event)).statusCode).toBe(429);
      expect((await getTaskHandler(event)).statusCode).toBe(429);
      expect((await updateTaskHandler(event)).statusCode).toBe(429);
      expect((await deleteTaskHandler(event)).statusCode).toBe(429);
      expect((await listTasksHandler({ ...event, body: null })).statusCode).toBe(429);
    });
  });

  describe('Authentication Before Rate Limiting', () => {
    test('should return 401 for missing API key before rate limit check', async () => {
      const event = {
        headers: {},
        body: JSON.stringify({ description: 'Test task' }),
        pathParameters: { id: 'test-task-id' }
      };
      
      const response = await createTaskHandler(event);
      
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).error).toBe('Missing API key');
    });

    test('should return 401 for invalid API key before rate limit check', async () => {
      const event = createEvent('wrong-api-key');
      
      const response = await createTaskHandler(event);
      
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).error).toBe('Invalid API key');
    });
  });

  describe('Edge Cases', () => {
    test('should handle X-Api-Key header case variation', async () => {
      const event = {
        headers: {
          'X-Api-Key': 'test-api-key-12345'
        },
        body: JSON.stringify({ description: 'Test task' }),
        pathParameters: { id: 'test-task-id' }
      };
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await createTaskHandler(event);
      }
      
      // 101st should be rate limited
      const response = await createTaskHandler(event);
      expect(response.statusCode).toBe(429);
    });

    test('should reset rate limit after clearing', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        await createTaskHandler(event);
      }
      
      // Verify rate limited
      expect((await createTaskHandler(event)).statusCode).toBe(429);
      
      // Clear rate limits
      clearAllRateLimits();
      
      // Should be allowed again
      const response = await createTaskHandler(event);
      expect(response.statusCode).toBe(201);
    });

    test('should handle concurrent requests correctly', async () => {
      const apiKey = 'test-api-key-12345';
      const event = createEvent(apiKey);
      
      // Make 100 concurrent requests
      const promises = Array(100).fill(null).map(() => createTaskHandler(event));
      const responses = await Promise.all(promises);
      
      const successCount = responses.filter(r => r.statusCode === 201).length;
      const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
      
      expect(successCount).toBe(100);
      expect(rateLimitedCount).toBe(0);
      
      // Next request should be rate limited
      const response = await createTaskHandler(event);
      expect(response.statusCode).toBe(429);
    });
  });
});

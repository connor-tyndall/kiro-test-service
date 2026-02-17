const { handler } = require('../../../src/handlers/taskStats');
const { getTaskStats } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('taskStats handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should return stats with all statuses', async () => {
    getTaskStats.mockResolvedValue({
      total: 42,
      byStatus: {
        'open': 18,
        'in-progress': 15,
        'done': 9
      }
    });

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(42);
    expect(body.byStatus.open).toBe(18);
    expect(body.byStatus['in-progress']).toBe(15);
    expect(body.byStatus.done).toBe(9);
    expect(getTaskStats).toHaveBeenCalledWith(null);
  });

  test('should filter stats by assignee query parameter', async () => {
    getTaskStats.mockResolvedValue({
      total: 10,
      byStatus: {
        'open': 5,
        'in-progress': 3,
        'done': 2
      }
    });

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        assignee: 'user@example.com'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(10);
    expect(body.byStatus.open).toBe(5);
    expect(body.byStatus['in-progress']).toBe(3);
    expect(body.byStatus.done).toBe(2);
    expect(getTaskStats).toHaveBeenCalledWith('user@example.com');
  });

  test('should return 401 for missing API key', async () => {
    const event = {
      headers: {},
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Missing API key');
    expect(getTaskStats).not.toHaveBeenCalled();
  });

  test('should return 401 for invalid API key', async () => {
    const event = {
      headers: {
        'x-api-key': 'wrong-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Invalid API key');
    expect(getTaskStats).not.toHaveBeenCalled();
  });

  test('should handle DynamoDB errors', async () => {
    getTaskStats.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.error).toBe('Internal server error: getting task stats');
  });

  test('should return zero counts for empty results', async () => {
    getTaskStats.mockResolvedValue({
      total: 0,
      byStatus: {
        'open': 0,
        'in-progress': 0,
        'done': 0
      }
    });

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(0);
    expect(body.byStatus.open).toBe(0);
    expect(body.byStatus['in-progress']).toBe(0);
    expect(body.byStatus.done).toBe(0);
  });

  describe('Edge Cases', () => {
    test('should handle empty queryStringParameters object', async () => {
      getTaskStats.mockResolvedValue({
        total: 5,
        byStatus: {
          'open': 2,
          'in-progress': 2,
          'done': 1
        }
      });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {}
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.total).toBe(5);
      expect(getTaskStats).toHaveBeenCalledWith(null);
    });

    test('should handle assignee with special characters', async () => {
      getTaskStats.mockResolvedValue({
        total: 3,
        byStatus: {
          'open': 1,
          'in-progress': 1,
          'done': 1
        }
      });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          assignee: 'user+test@example.com'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(getTaskStats).toHaveBeenCalledWith('user+test@example.com');
    });

    test('should handle case-sensitive X-Api-Key header', async () => {
      getTaskStats.mockResolvedValue({
        total: 1,
        byStatus: {
          'open': 1,
          'in-progress': 0,
          'done': 0
        }
      });

      const event = {
        headers: {
          'X-Api-Key': 'test-api-key'
        },
        queryStringParameters: null
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });

    test('should return 500 for API_KEY env not configured', async () => {
      delete process.env.API_KEY;

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('Internal server error');
    });

    test('should handle empty assignee value', async () => {
      getTaskStats.mockResolvedValue({
        total: 5,
        byStatus: {
          'open': 2,
          'in-progress': 2,
          'done': 1
        }
      });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          assignee: ''
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(getTaskStats).toHaveBeenCalledWith(null);
    });
  });
});

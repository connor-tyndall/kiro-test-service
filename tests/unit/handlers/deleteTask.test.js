const { handler } = require('../../../src/handlers/deleteTask');
const { getTask, deleteTask } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('deleteTask handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should delete existing task', async () => {
    const mockTask = {
      id: '123',
      description: 'Test task'
    };

    getTask.mockResolvedValue(mockTask);
    deleteTask.mockResolvedValue();

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(deleteTask).toHaveBeenCalledWith('123');
  });

  test('should return 404 for non-existent task', async () => {
    getTask.mockResolvedValue(null);

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: 'nonexistent' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.error).toBe('Task not found');
    expect(deleteTask).not.toHaveBeenCalled();
  });

  test('should return 400 for missing task ID', async () => {
    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.error).toBe('Task ID is required');
  });

  test('should handle DynamoDB errors', async () => {
    getTask.mockResolvedValue({ id: '123' });
    deleteTask.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.error).toBe('Internal server error: deleting task');
  });

  test('should return 401 for missing API key', async () => {
    const event = {
      headers: {},
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Missing API key');
  });

  test('should return 401 for invalid API key', async () => {
    const event = {
      headers: {
        'x-api-key': 'wrong-key'
      },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Invalid API key');
  });

  describe('Edge Cases', () => {
    test('should handle null pathParameters', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Task ID is required');
    });

    test('should handle missing headers object', async () => {
      const event = {
        pathParameters: { id: '123' }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(401);
      expect(body.error).toBe('Missing API key');
    });

    test('should handle empty string task ID', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '' }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Task ID is required');
    });

    test('should handle getTask error during existence check', async () => {
      getTask.mockRejectedValue(new Error('DynamoDB error'));

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('Internal server error: deleting task');
    });
  });
});

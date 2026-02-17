const { handler } = require('../../../src/handlers/restoreTask');
const { getTask, putTask } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('restoreTask handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should restore archived task', async () => {
    const mockTask = {
      id: '123',
      description: 'Test task',
      status: 'archived',
      priority: 'P1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    getTask.mockResolvedValue(mockTask);
    putTask.mockResolvedValue();

    const event = {
      headers: { 'x-api-key': 'test-api-key' },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe('open');
    expect(putTask).toHaveBeenCalledWith(expect.objectContaining({
      id: '123',
      status: 'open'
    }));
  });

  test('should return 404 for non-existent task', async () => {
    getTask.mockResolvedValue(null);

    const event = {
      headers: { 'x-api-key': 'test-api-key' },
      pathParameters: { id: 'nonexistent' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.error).toBe('Task not found');
  });

  test('should return 409 when restoring non-archived task', async () => {
    const mockTask = {
      id: '123',
      description: 'Test task',
      status: 'open',
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    getTask.mockResolvedValue(mockTask);

    const event = {
      headers: { 'x-api-key': 'test-api-key' },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(409);
    expect(body.error).toBe('Task is not archived');
    expect(putTask).not.toHaveBeenCalled();
  });

  test('should return 400 for missing task ID', async () => {
    const event = {
      headers: { 'x-api-key': 'test-api-key' },
      pathParameters: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.error).toBe('Task ID is required');
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
      headers: { 'x-api-key': 'wrong-key' },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Invalid API key');
  });

  test('should handle DynamoDB errors', async () => {
    getTask.mockResolvedValue({ id: '123', status: 'archived' });
    putTask.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      headers: { 'x-api-key': 'test-api-key' },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.error).toBe('Internal server error: restoring task');
  });

  describe('Edge Cases', () => {
    test('should handle null pathParameters', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        pathParameters: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Task ID is required');
    });

    test('should update updatedAt timestamp when restoring', async () => {
      const mockTask = {
        id: '123',
        description: 'Test task',
        status: 'archived',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      getTask.mockResolvedValue(mockTask);
      putTask.mockResolvedValue();

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        pathParameters: { id: '123' }
      };

      await handler(event);

      const savedTask = putTask.mock.calls[0][0];
      expect(savedTask.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
    });

    test('should not restore tasks with other statuses', async () => {
      const statuses = ['open', 'in-progress', 'blocked', 'done'];
      
      for (const status of statuses) {
        jest.clearAllMocks();
        
        getTask.mockResolvedValue({
          id: '123',
          description: 'Test task',
          status: status
        });

        const event = {
          headers: { 'x-api-key': 'test-api-key' },
          pathParameters: { id: '123' }
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(409);
        expect(putTask).not.toHaveBeenCalled();
      }
    });
  });
});

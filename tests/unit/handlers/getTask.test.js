const { handler } = require('../../../src/handlers/getTask');
const { getTask } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('getTask handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should retrieve existing task', async () => {
    const mockTask = {
      id: '123',
      description: 'Test task',
      assignee: 'user@example.com',
      priority: 'P1',
      status: 'open',
      dueDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    getTask.mockResolvedValue(mockTask);

    const event = {
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.id).toBe('123');
    expect(body.description).toBe('Test task');
  });

  test('should return 404 for non-existent task', async () => {
    getTask.mockResolvedValue(null);

    const event = {
      pathParameters: { id: 'nonexistent' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.error).toBe('Task not found');
  });

  test('should return 400 for missing task ID', async () => {
    const event = {
      pathParameters: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.error).toBe('Task ID is required');
  });

  test('should handle DynamoDB errors', async () => {
    getTask.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(503);
    expect(body.error).toBe('Service temporarily unavailable');
  });
});

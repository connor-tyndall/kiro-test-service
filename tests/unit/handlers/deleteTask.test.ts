import { handler } from '../../../src/handlers/deleteTask';
import { getTask, deleteTask } from '../../../src/lib/dynamodb';
import { APIGatewayEvent, TaskItem } from '../../../src/types';

jest.mock('../../../src/lib/dynamodb');

const mockedGetTask = getTask as jest.MockedFunction<typeof getTask>;
const mockedDeleteTask = deleteTask as jest.MockedFunction<typeof deleteTask>;

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
    const mockTask: TaskItem = {
      PK: 'TASK#123',
      SK: 'TASK#123',
      id: '123',
      description: 'Test task',
      assignee: null,
      priority: 'P2',
      status: 'open',
      dueDate: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    mockedGetTask.mockResolvedValue(mockTask);
    mockedDeleteTask.mockResolvedValue();

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(mockedDeleteTask).toHaveBeenCalledWith('123');
  });

  test('should return 404 for non-existent task', async () => {
    mockedGetTask.mockResolvedValue(null);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: 'nonexistent' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.error).toBe('Task not found');
    expect(mockedDeleteTask).not.toHaveBeenCalled();
  });

  test('should return 400 for missing task ID', async () => {
    const event: APIGatewayEvent = {
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
    mockedGetTask.mockResolvedValue({
      PK: 'TASK#123',
      SK: 'TASK#123',
      id: '123',
      description: 'Test task',
      assignee: null,
      priority: 'P2',
      status: 'open',
      dueDate: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    });
    mockedDeleteTask.mockRejectedValue(new Error('DynamoDB error'));

    const event: APIGatewayEvent = {
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
    const event: APIGatewayEvent = {
      headers: {},
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Missing API key');
  });

  test('should return 401 for invalid API key', async () => {
    const event: APIGatewayEvent = {
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
      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Task ID is required');
    });
  });
});

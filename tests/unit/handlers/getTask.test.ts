import { handler } from '../../../src/handlers/getTask';
import { getTask } from '../../../src/lib/dynamodb';
import { APIGatewayEvent, TaskItem } from '../../../src/types';

jest.mock('../../../src/lib/dynamodb');

const mockedGetTask = getTask as jest.MockedFunction<typeof getTask>;

describe('getTask handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should retrieve existing task', async () => {
    const mockTask: TaskItem = {
      PK: 'TASK#123',
      SK: 'TASK#123',
      id: '123',
      description: 'Test task',
      assignee: 'user@example.com',
      priority: 'P1',
      status: 'open',
      dueDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    mockedGetTask.mockResolvedValue(mockTask);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.id).toBe('123');
    expect(body.description).toBe('Test task');
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
    mockedGetTask.mockRejectedValue(new Error('DynamoDB error'));

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(503);
    expect(body.error).toBe('Service temporarily unavailable');
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
});

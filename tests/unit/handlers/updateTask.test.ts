import { handler } from '../../../src/handlers/updateTask';
import { getTask, putTask } from '../../../src/lib/dynamodb';
import { APIGatewayEvent, TaskItem } from '../../../src/types';

jest.mock('../../../src/lib/dynamodb');

const mockedGetTask = getTask as jest.MockedFunction<typeof getTask>;
const mockedPutTask = putTask as jest.MockedFunction<typeof putTask>;

describe('updateTask handler', () => {
  const originalEnv = process.env;
  const mockExistingTask: TaskItem = {
    PK: 'TASK#123',
    SK: 'TASK#123',
    id: '123',
    description: 'Original task',
    assignee: 'user1@example.com',
    priority: 'P2',
    status: 'open',
    dueDate: '2024-12-31',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should update task fields', async () => {
    mockedGetTask.mockResolvedValue(mockExistingTask);
    mockedPutTask.mockResolvedValue({} as never);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' },
      body: JSON.stringify({
        description: 'Updated task',
        priority: 'P1'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.description).toBe('Updated task');
    expect(body.priority).toBe('P1');
    expect(body.status).toBe('open'); // Unchanged
  });

  test('should preserve immutable fields', async () => {
    mockedGetTask.mockResolvedValue(mockExistingTask);
    mockedPutTask.mockResolvedValue({} as never);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' },
      body: JSON.stringify({
        id: 'new-id',
        createdAt: '2025-01-01T00:00:00.000Z',
        description: 'Updated'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(body.id).toBe('123'); // Original ID preserved
    expect(body.createdAt).toBe('2024-01-01T00:00:00.000Z'); // Original createdAt preserved
  });

  test('should update updatedAt timestamp', async () => {
    mockedGetTask.mockResolvedValue(mockExistingTask);
    mockedPutTask.mockResolvedValue({} as never);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' },
      body: JSON.stringify({
        description: 'Updated'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(body.updatedAt).not.toBe(mockExistingTask.updatedAt);
  });

  test('should return 404 for non-existent task', async () => {
    mockedGetTask.mockResolvedValue(null);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: 'nonexistent' },
      body: JSON.stringify({ description: 'Updated' })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.error).toBe('Task not found');
  });

  test('should reject invalid updates', async () => {
    mockedGetTask.mockResolvedValue(mockExistingTask);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' },
      body: JSON.stringify({
        priority: 'invalid'
      })
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  test('should handle assignee clearing', async () => {
    mockedGetTask.mockResolvedValue(mockExistingTask);
    mockedPutTask.mockResolvedValue({} as never);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      pathParameters: { id: '123' },
      body: JSON.stringify({
        assignee: null
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.assignee).toBeNull();
  });

  test('should return 401 for missing API key', async () => {
    const event: APIGatewayEvent = {
      headers: {},
      pathParameters: { id: '123' },
      body: JSON.stringify({ description: 'Updated' })
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
      pathParameters: { id: '123' },
      body: JSON.stringify({ description: 'Updated' })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Invalid API key');
  });
});

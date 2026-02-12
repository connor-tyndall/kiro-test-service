import { handler } from '../../../src/handlers/createTask';
import { putTask } from '../../../src/lib/dynamodb';
import { APIGatewayEvent } from '../../../src/types';

jest.mock('../../../src/lib/dynamodb');

const mockedPutTask = putTask as jest.MockedFunction<typeof putTask>;

describe('createTask handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should create task with all fields', async () => {
    mockedPutTask.mockResolvedValue({} as never);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        description: 'Test task',
        assignee: 'user@example.com',
        priority: 'P1',
        status: 'in-progress',
        dueDate: '2024-12-31'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.description).toBe('Test task');
    expect(body.assignee).toBe('user@example.com');
    expect(body.priority).toBe('P1');
    expect(body.status).toBe('in-progress');
    expect(body.dueDate).toBe('2024-12-31');
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  test('should create task with defaults', async () => {
    mockedPutTask.mockResolvedValue({} as never);

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        description: 'Minimal task'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(201);
    expect(body.priority).toBe('P2');
    expect(body.status).toBe('open');
    expect(body.assignee).toBeNull();
    expect(body.dueDate).toBeNull();
  });

  test('should reject missing description', async () => {
    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        priority: 'P1'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.error).toContain('Description is required');
  });

  test('should reject invalid priority', async () => {
    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        description: 'Test',
        priority: 'P5'
      })
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  test('should reject invalid JSON', async () => {
    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      body: 'invalid json'
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(400);
    expect(body.error).toBe('Invalid JSON in request body');
  });

  test('should handle DynamoDB errors', async () => {
    mockedPutTask.mockRejectedValue(new Error('DynamoDB error'));

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        description: 'Test task'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(503);
    expect(body.error).toBe('Service temporarily unavailable');
  });

  test('should return 401 for missing API key', async () => {
    const event: APIGatewayEvent = {
      headers: {},
      body: JSON.stringify({
        description: 'Test task'
      })
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
      body: JSON.stringify({
        description: 'Test task'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Invalid API key');
  });
});

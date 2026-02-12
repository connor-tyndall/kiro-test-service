const { handler } = require('../../../src/handlers/updateTask');
const { getTask, putTask } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('updateTask handler', () => {
  const mockExistingTask = {
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
  });

  test('should update task fields', async () => {
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
    getTask.mockResolvedValue(null);

    const event = {
      pathParameters: { id: 'nonexistent' },
      body: JSON.stringify({ description: 'Updated' })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(404);
    expect(body.error).toBe('Task not found');
  });

  test('should reject invalid updates', async () => {
    getTask.mockResolvedValue(mockExistingTask);

    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        priority: 'invalid'
      })
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  test('should handle assignee clearing', async () => {
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
});

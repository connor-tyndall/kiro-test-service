const { handler } = require('../../../src/handlers/listTasks');
const {
  scanTasks,
  queryTasksByAssignee,
  queryTasksByStatus,
  queryTasksByPriority
} = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('listTasks handler', () => {
  const mockTasks = [
    {
      id: '1',
      description: 'Task 1',
      assignee: 'user1@example.com',
      priority: 'P1',
      status: 'open',
      dueDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      id: '2',
      description: 'Task 2',
      assignee: 'user2@example.com',
      priority: 'P2',
      status: 'in-progress',
      dueDate: '2024-11-30',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should list all tasks without filters', async () => {
    scanTasks.mockResolvedValue(mockTasks);

    const event = {
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(2);
    expect(scanTasks).toHaveBeenCalled();
  });

  test('should filter by assignee', async () => {
    queryTasksByAssignee.mockResolvedValue([mockTasks[0]]);

    const event = {
      queryStringParameters: {
        assignee: 'user1@example.com'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].assignee).toBe('user1@example.com');
    expect(queryTasksByAssignee).toHaveBeenCalledWith('user1@example.com');
  });

  test('should filter by status', async () => {
    queryTasksByStatus.mockResolvedValue([mockTasks[1]]);

    const event = {
      queryStringParameters: {
        status: 'in-progress'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].status).toBe('in-progress');
  });

  test('should filter by priority', async () => {
    queryTasksByPriority.mockResolvedValue([mockTasks[0]]);

    const event = {
      queryStringParameters: {
        priority: 'P1'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].priority).toBe('P1');
  });

  test('should filter by due date', async () => {
    scanTasks.mockResolvedValue(mockTasks);

    const event = {
      queryStringParameters: {
        dueDateBefore: '2024-12-01'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].dueDate).toBe('2024-11-30');
  });

  test('should apply multiple filters', async () => {
    queryTasksByAssignee.mockResolvedValue(mockTasks);

    const event = {
      queryStringParameters: {
        assignee: 'user1@example.com',
        status: 'open'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].assignee).toBe('user1@example.com');
    expect(body.tasks[0].status).toBe('open');
  });

  test('should return empty array when no matches', async () => {
    scanTasks.mockResolvedValue([]);

    const event = {
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(0);
  });

  test('should reject invalid priority', async () => {
    const event = {
      queryStringParameters: {
        priority: 'invalid'
      }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  test('should reject invalid status', async () => {
    const event = {
      queryStringParameters: {
        status: 'invalid'
      }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  test('should handle DynamoDB errors', async () => {
    scanTasks.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(503);
    expect(body.error).toBe('Service temporarily unavailable');
  });
});

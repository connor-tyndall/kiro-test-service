const { handler } = require('../../../src/handlers/batchUpdateTasks');
const { getTask, putTask } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('batchUpdateTasks handler', () => {
  const originalEnv = process.env;
  const mockTask1 = {
    id: 'task-1',
    description: 'Task 1',
    assignee: 'user1@example.com',
    priority: 'P2',
    status: 'open',
    dueDate: '2024-12-31',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const mockTask2 = {
    id: 'task-2',
    description: 'Task 2',
    assignee: 'user2@example.com',
    priority: 'P1',
    status: 'open',
    dueDate: '2024-12-31',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z'
  };

  const mockTask3 = {
    id: 'task-3',
    description: 'Task 3',
    assignee: null,
    priority: 'P3',
    status: 'in-progress',
    dueDate: null,
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('successful batch updates', () => {
    test('should update a single task status', async () => {
      getTask.mockResolvedValue(mockTask1);
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.updated).toBe(1);
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0].status).toBe('done');
    });

    test('should update multiple task statuses', async () => {
      getTask
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2)
        .mockResolvedValueOnce(mockTask3);
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1', 'task-2', 'task-3'],
          status: 'blocked'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.updated).toBe(3);
      expect(body.tasks).toHaveLength(3);
      body.tasks.forEach(task => {
        expect(task.status).toBe('blocked');
      });
    });

    test('should update updatedAt timestamp on all tasks', async () => {
      getTask.mockResolvedValueOnce(mockTask1).mockResolvedValueOnce(mockTask2);
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1', 'task-2'],
          status: 'in-progress'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      body.tasks.forEach(task => {
        expect(task.updatedAt).not.toBe(mockTask1.updatedAt);
        expect(task.updatedAt).not.toBe(mockTask2.updatedAt);
      });
    });

    test('should update with all valid statuses', async () => {
      const validStatuses = ['open', 'in-progress', 'blocked', 'done'];

      for (const status of validStatuses) {
        getTask.mockResolvedValue(mockTask1);
        putTask.mockResolvedValue({});

        const event = {
          headers: { 'x-api-key': 'test-api-key' },
          body: JSON.stringify({
            taskIds: ['task-1'],
            status
          })
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(body.tasks[0].status).toBe(status);
      }
    });

    test('should call putTask with updated task data', async () => {
      getTask.mockResolvedValue(mockTask1);
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      await handler(event);

      expect(putTask).toHaveBeenCalledTimes(1);
      const calledTask = putTask.mock.calls[0][0];
      expect(calledTask.id).toBe('task-1');
      expect(calledTask.status).toBe('done');
      expect(calledTask.description).toBe('Task 1');
    });
  });

  describe('authentication validation', () => {
    test('should return 401 for missing API key', async () => {
      const event = {
        headers: {},
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(401);
      expect(body.error).toBe('Missing API key');
    });

    test('should return 401 for invalid API key', async () => {
      const event = {
        headers: { 'x-api-key': 'wrong-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(401);
      expect(body.error).toBe('Invalid API key');
    });

    test('should accept X-Api-Key header (uppercase)', async () => {
      getTask.mockResolvedValue(mockTask1);
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'X-Api-Key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('taskIds validation', () => {
    test('should return 400 for empty taskIds array', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: [],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('taskIds array cannot be empty');
    });

    test('should return 400 for taskIds exceeding 25 items', async () => {
      const taskIds = Array(26).fill(null).map((_, i) => `task-${i}`);

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds,
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('taskIds array cannot exceed 25 items');
    });

    test('should return 400 for missing taskIds', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('taskIds must be an array');
    });

    test('should return 400 for non-array taskIds', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: 'task-1',
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('taskIds must be an array');
    });

    test('should return 400 for non-string taskId', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: [123],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Each taskId must be a non-empty string');
    });

    test('should return 400 for empty string taskId', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: [''],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Each taskId must be a non-empty string');
    });

    test('should return 400 for whitespace-only taskId', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['   '],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Each taskId must be a non-empty string');
    });

    test('should accept exactly 25 taskIds', async () => {
      const taskIds = Array(25).fill(null).map((_, i) => `task-${i}`);
      const mockTasks = taskIds.map(id => ({
        ...mockTask1,
        id
      }));

      mockTasks.forEach((task, index) => {
        getTask.mockResolvedValueOnce(task);
      });
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds,
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.updated).toBe(25);
    });
  });

  describe('status validation', () => {
    test('should return 400 for invalid status', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'invalid-status'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('status must be one of: open, in-progress, blocked, done');
    });

    test('should return 400 for missing status', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('status is required');
    });

    test('should return 400 for null status', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: null
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('status is required');
    });

    test('should return 400 for non-string status', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 123
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('status must be a string');
    });
  });

  describe('task existence validation', () => {
    test('should return 404 when first task does not exist', async () => {
      getTask.mockResolvedValue(null);

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['nonexistent-task'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toBe('Task not found: nonexistent-task');
    });

    test('should return 404 when any task in batch does not exist', async () => {
      getTask
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(null);

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1', 'nonexistent-task'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toBe('Task not found: nonexistent-task');
      expect(putTask).not.toHaveBeenCalled();
    });

    test('should not update any tasks if one does not exist (atomic operation)', async () => {
      getTask
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2)
        .mockResolvedValueOnce(null);

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1', 'task-2', 'nonexistent-task'],
          status: 'done'
        })
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
      expect(putTask).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid JSON body', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: 'invalid json'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid JSON in request body');
    });

    test('should handle empty body', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('taskIds must be an array');
    });

    test('should handle DynamoDB getTask error', async () => {
      getTask.mockRejectedValue(new Error('DynamoDB connection error'));

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('Internal server error: batch updating tasks');
    });

    test('should handle DynamoDB putTask error', async () => {
      getTask.mockResolvedValue(mockTask1);
      putTask.mockRejectedValue(new Error('DynamoDB write error'));

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('Internal server error: batch updating tasks');
    });

    test('should handle null headers', async () => {
      const event = {
        headers: null,
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(401);
      expect(body.error).toBe('Missing API key');
    });

    test('should handle undefined headers', async () => {
      const event = {
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(401);
      expect(body.error).toBe('Missing API key');
    });

    test('should handle taskIds with mixed valid and invalid elements', async () => {
      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1', null, 'task-2'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Each taskId must be a non-empty string');
    });

    test('should preserve all task fields except status and updatedAt', async () => {
      getTask.mockResolvedValue(mockTask1);
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(body.tasks[0].id).toBe(mockTask1.id);
      expect(body.tasks[0].description).toBe(mockTask1.description);
      expect(body.tasks[0].assignee).toBe(mockTask1.assignee);
      expect(body.tasks[0].priority).toBe(mockTask1.priority);
      expect(body.tasks[0].dueDate).toBe(mockTask1.dueDate);
      expect(body.tasks[0].createdAt).toBe(mockTask1.createdAt);
    });

    test('should handle API_KEY environment variable not configured', async () => {
      delete process.env.API_KEY;

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('Internal server error');
    });

    test('should return correct response format with all expected fields', async () => {
      getTask.mockResolvedValue(mockTask1);
      putTask.mockResolvedValue({});

      const event = {
        headers: { 'x-api-key': 'test-api-key' },
        body: JSON.stringify({
          taskIds: ['task-1'],
          status: 'done'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.headers['Content-Type']).toBe('application/json');
      expect(typeof body.updated).toBe('number');
      expect(Array.isArray(body.tasks)).toBe(true);
      expect(body.tasks[0]).toHaveProperty('id');
      expect(body.tasks[0]).toHaveProperty('description');
      expect(body.tasks[0]).toHaveProperty('assignee');
      expect(body.tasks[0]).toHaveProperty('priority');
      expect(body.tasks[0]).toHaveProperty('status');
      expect(body.tasks[0]).toHaveProperty('dueDate');
      expect(body.tasks[0]).toHaveProperty('createdAt');
      expect(body.tasks[0]).toHaveProperty('updatedAt');
    });
  });
});

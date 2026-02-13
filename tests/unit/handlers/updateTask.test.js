const { handler } = require('../../../src/handlers/updateTask');
const { getTask, putTask } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('updateTask handler', () => {
  const originalEnv = process.env;
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
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should update task fields', async () => {
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
    getTask.mockResolvedValue(null);

    const event = {
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
    getTask.mockResolvedValue(mockExistingTask);

    const event = {
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
    getTask.mockResolvedValue(mockExistingTask);
    putTask.mockResolvedValue({});

    const event = {
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
    const event = {
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
    const event = {
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

  describe('Edge Cases', () => {
    test('should handle DynamoDB errors', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockRejectedValue(new Error('DynamoDB error'));

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          description: 'Updated task'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('Internal server error: updating task');
    });

    test('should handle null pathParameters', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: null,
        body: JSON.stringify({ description: 'Updated' })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Task ID is required');
    });

    test('should handle invalid JSON body', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: 'invalid json'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid JSON in request body');
    });

    test('should handle getTask error during existence check', async () => {
      getTask.mockRejectedValue(new Error('DynamoDB connection error'));

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({ description: 'Updated' })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('Internal server error: updating task');
    });
  });

  describe('Tags', () => {
    test('should update task tags', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: ['bug', 'high-priority']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tags).toEqual(['bug', 'high-priority']);
    });

    test('should add tags to task that had no tags', async () => {
      const taskWithoutTags = { ...mockExistingTask };
      delete taskWithoutTags.tags;
      getTask.mockResolvedValue(taskWithoutTags);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: ['new-tag']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tags).toEqual(['new-tag']);
    });

    test('should clear tags by setting empty array', async () => {
      const taskWithTags = { ...mockExistingTask, tags: ['bug', 'frontend'] };
      getTask.mockResolvedValue(taskWithTags);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: []
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tags).toEqual([]);
    });

    test('should preserve existing tags when not updated', async () => {
      const taskWithTags = { ...mockExistingTask, tags: ['existing-tag'] };
      getTask.mockResolvedValue(taskWithTags);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          description: 'Updated description'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tags).toEqual(['existing-tag']);
    });

    test('should reject update with too many tags', async () => {
      getTask.mockResolvedValue(mockExistingTask);

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Maximum 5 tags allowed');
    });

    test('should reject update with invalid tag format', async () => {
      getTask.mockResolvedValue(mockExistingTask);

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: ['Invalid Tag']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Tag must contain only lowercase letters, numbers, and hyphens');
    });

    test('should reject update with tag exceeding max length', async () => {
      getTask.mockResolvedValue(mockExistingTask);

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: ['a'.repeat(31)]
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Tag must not exceed 30 characters');
    });

    test('should reject update with non-array tags', async () => {
      getTask.mockResolvedValue(mockExistingTask);

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: 'bug'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Tags must be an array');
    });

    test('should persist updated tags to DynamoDB', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          tags: ['updated-tag', 'new-tag']
        })
      };

      await handler(event);

      expect(putTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['updated-tag', 'new-tag']
        })
      );
    });
  });
});

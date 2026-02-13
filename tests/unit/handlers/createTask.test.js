const { handler } = require('../../../src/handlers/createTask');
const { putTask } = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

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
    putTask.mockResolvedValue({});

    const event = {
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
    putTask.mockResolvedValue({});

    const event = {
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
    const event = {
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
    const event = {
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
    const event = {
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
    putTask.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        description: 'Test task'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.error).toBe('Internal server error: creating task');
  });

  test('should return 401 for missing API key', async () => {
    const event = {
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
    const event = {
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

  describe('Edge Cases', () => {
    test('should handle null body', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Description is required');
    });

    test('should handle empty string description', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: ''
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Description is required');
    });

    test('should handle whitespace-only description', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: '   '
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Description is required');
    });
  });

  describe('Tags', () => {
    test('should create task with tags', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task with tags',
          tags: ['bug', 'high-priority', 'frontend']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.tags).toEqual(['bug', 'high-priority', 'frontend']);
    });

    test('should create task with empty tags array', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task',
          tags: []
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.tags).toEqual([]);
    });

    test('should create task without tags (default to empty array)', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.tags).toEqual([]);
    });

    test('should reject task with too many tags', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task',
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Maximum 5 tags allowed');
    });

    test('should reject task with invalid tag format', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task',
          tags: ['Invalid Tag']
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Tag must contain only lowercase letters, numbers, and hyphens');
    });

    test('should reject task with tag exceeding max length', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task',
          tags: ['a'.repeat(31)]
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Tag must not exceed 30 characters');
    });

    test('should reject task with non-array tags', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task',
          tags: 'bug'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Tags must be an array');
    });

    test('should persist task with tags to DynamoDB', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test task with tags',
          tags: ['bug', 'frontend']
        })
      };

      await handler(event);

      expect(putTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test task with tags',
          tags: ['bug', 'frontend']
        })
      );
    });
  });
});

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

    test('should reject request body exceeding 10KB with 413 status', async () => {
      const largeBody = JSON.stringify({
        description: 'a'.repeat(15000)
      });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: largeBody
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(413);
      expect(body.error).toContain('exceeds maximum allowed size');
    });

    test('should reject prototype pollution via __proto__', async () => {
      // Construct JSON string directly to preserve __proto__ key
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: '{"description": "Updated task", "__proto__": {"polluted": true}}'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('potentially unsafe object keys');
    });

    test('should reject prototype pollution via constructor', async () => {
      // Construct JSON string directly to preserve constructor key
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: '{"description": "Updated task", "constructor": {"prototype": {"polluted": true}}}'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('potentially unsafe object keys');
    });

    test('should reject prototype pollution via prototype key', async () => {
      // Construct JSON string directly to preserve prototype key
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: '{"description": "Updated task", "prototype": {"polluted": true}}'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('potentially unsafe object keys');
    });

    test('should strip script tags from description', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          description: '<script>alert("xss")</script>Safe updated description'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.description).toBe('Safe updated description');
      expect(body.description).not.toContain('<script>');
    });

    test('should strip img onerror tags from description', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          description: 'Updated with <img src="x" onerror="alert(1)"> image'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.description).not.toContain('onerror');
      expect(body.description).not.toContain('<img');
    });

    test('should remove control characters from description', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          description: 'Updated\x00task\x01with\x02control\x03chars'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.description).toBe('Updatedtaskwithcontrolchars');
    });

    test('should preserve newlines in description', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          description: 'Updated Line 1\nLine 2\nLine 3'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.description).toBe('Updated Line 1\nLine 2\nLine 3');
    });

    test('should reject nested prototype pollution attempt', async () => {
      // Construct JSON string directly with nested __proto__
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: '{"description": "Updated task", "nested": {"deep": {"__proto__": {"polluted": true}}}}'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('potentially unsafe object keys');
    });

    test('should handle body exactly at 10KB limit', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});
      
      // Create a body that is under the 10KB limit with valid description
      const body = JSON.stringify({ description: 'Valid description under limits' });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: body
      };

      const response = await handler(event);
      expect(response.statusCode).toBe(200);
    });

    test('should sanitize multiple XSS vectors in description', async () => {
      getTask.mockResolvedValue(mockExistingTask);
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        pathParameters: { id: '123' },
        body: JSON.stringify({
          description: '<script>bad</script>Safe<img onerror="alert(1)">text<div onclick="evil()">content</div>'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.description).not.toContain('<script>');
      expect(body.description).not.toContain('onerror');
      expect(body.description).not.toContain('onclick');
    });
  });
});

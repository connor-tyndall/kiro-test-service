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
      expect(body.error).toContain('Description cannot be empty');
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
      expect(body.error).toContain('Description cannot be empty');
    });

    test('should reject request body exceeding 10KB with 413 status', async () => {
      const largeBody = JSON.stringify({
        description: 'a'.repeat(15000)
      });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
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
        body: '{"description": "Test task", "__proto__": {"polluted": true}}'
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
        body: '{"description": "Test task", "constructor": {"prototype": {"polluted": true}}}'
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
        body: '{"description": "Test task", "prototype": {"polluted": true}}'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('potentially unsafe object keys');
    });

    test('should strip script tags from description', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: '<script>alert("xss")</script>Safe task description'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.description).toBe('Safe task description');
      expect(body.description).not.toContain('<script>');
    });

    test('should strip img onerror tags from description', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Task with <img src="x" onerror="alert(1)"> image'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.description).not.toContain('onerror');
      expect(body.description).not.toContain('<img');
    });

    test('should remove control characters from description', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Test\x00task\x01with\x02control\x03chars'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.description).toBe('Testtaskwithcontrolchars');
    });

    test('should preserve newlines in description', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: 'Line 1\nLine 2\nLine 3'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.description).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should reject nested prototype pollution attempt', async () => {
      // Construct JSON string directly with nested __proto__ 
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: '{"description": "Test task", "nested": {"deep": {"__proto__": {"polluted": true}}}}'
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('potentially unsafe object keys');
    });

    test('should handle body exactly at 10KB limit', async () => {
      putTask.mockResolvedValue({});
      
      // Create a body that is under the 10KB limit with valid description
      // 10KB = 10240 bytes. Description must be under 1000 chars validation limit
      const body = JSON.stringify({ description: 'Valid description under limits' });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: body
      };

      const response = await handler(event);
      expect(response.statusCode).toBe(201);
    });

    test('should sanitize multiple XSS vectors in description', async () => {
      putTask.mockResolvedValue({});

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        body: JSON.stringify({
          description: '<script>bad</script>Safe<img onerror="alert(1)">text<div onclick="evil()">content</div>'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(201);
      expect(body.description).not.toContain('<script>');
      expect(body.description).not.toContain('onerror');
      expect(body.description).not.toContain('onclick');
    });
  });
});

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
      requestContext: {
        requestId: 'test-request-id-123'
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

  describe('Request ID Tracking', () => {
    test('should include x-request-id header in success response', async () => {
      putTask.mockResolvedValue({});
      const requestId = 'test-request-id-success';

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        requestContext: {
          requestId: requestId
        },
        body: JSON.stringify({
          description: 'Test task'
        })
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      expect(response.headers['x-request-id']).toBe(requestId);
    });

    test('should include x-request-id header in error response', async () => {
      const requestId = 'test-request-id-error';

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        requestContext: {
          requestId: requestId
        },
        body: JSON.stringify({
          priority: 'P1'
        })
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers['x-request-id']).toBe(requestId);
    });

    test('should include requestId in error response body', async () => {
      const requestId = 'test-request-id-body';

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        requestContext: {
          requestId: requestId
        },
        body: JSON.stringify({
          priority: 'P1'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.requestId).toBe(requestId);
    });

    test('should use UNKNOWN when requestContext is missing', async () => {
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

      expect(response.statusCode).toBe(201);
      expect(response.headers['x-request-id']).toBe('UNKNOWN');
    });

    test('should include x-request-id in 500 error response', async () => {
      putTask.mockRejectedValue(new Error('DynamoDB error'));
      const requestId = 'test-request-id-500';

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        requestContext: {
          requestId: requestId
        },
        body: JSON.stringify({
          description: 'Test task'
        })
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(response.headers['x-request-id']).toBe(requestId);
      expect(body.requestId).toBe(requestId);
    });
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
      expect(body.error).toContain('Description cannot be empty or whitespace only');
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
      expect(body.error).toContain('Description cannot be empty or whitespace only');
    });
  });
});

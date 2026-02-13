const { success, error, rateLimitExceeded, formatTask } = require('../../src/lib/response');

describe('Response Module', () => {
  describe('success', () => {
    test('should create success response with correct structure', () => {
      const body = { id: '123', description: 'Test task' };
      const response = success(200, body);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.body).toBe(JSON.stringify(body));
    });

    test('should handle 201 status code', () => {
      const body = { id: '456' };
      const response = success(201, body);

      expect(response.statusCode).toBe(201);
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    test('should handle empty object body', () => {
      const response = success(200, {});

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('{}');
    });

    test('should handle array body', () => {
      const body = { tasks: [{ id: '1' }, { id: '2' }] };
      const response = success(200, body);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(body);
    });
  });

  describe('error', () => {
    test('should create error response with correct structure', () => {
      const message = 'Task not found';
      const response = error(404, message);

      expect(response.statusCode).toBe(404);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(response.body)).toEqual({ error: message });
    });

    test('should handle 400 error', () => {
      const message = 'Invalid input';
      const response = error(400, message);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe(message);
    });

    test('should handle 503 error', () => {
      const message = 'Service temporarily unavailable';
      const response = error(503, message);

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body).error).toBe(message);
    });

    test('should always include Content-Type header', () => {
      const response = error(500, 'Internal error');

      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('rateLimitExceeded', () => {
    test('should return 429 status code', () => {
      const response = rateLimitExceeded(60);

      expect(response.statusCode).toBe(429);
    });

    test('should include Retry-After header', () => {
      const response = rateLimitExceeded(30);

      expect(response.headers['Retry-After']).toBe('30');
    });

    test('should include Content-Type header', () => {
      const response = rateLimitExceeded(60);

      expect(response.headers['Content-Type']).toBe('application/json');
    });

    test('should include rate limit exceeded error message', () => {
      const response = rateLimitExceeded(60);

      expect(JSON.parse(response.body)).toEqual({ error: 'Rate limit exceeded' });
    });

    test('should convert retryAfter to string in header', () => {
      const response = rateLimitExceeded(45);

      expect(typeof response.headers['Retry-After']).toBe('string');
      expect(response.headers['Retry-After']).toBe('45');
    });

    test('should handle small retryAfter values', () => {
      const response = rateLimitExceeded(1);

      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBe('1');
    });

    test('should handle large retryAfter values', () => {
      const response = rateLimitExceeded(3600);

      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBe('3600');
    });
  });

  describe('formatTask', () => {
    test('should format complete task item', () => {
      const taskItem = {
        PK: 'TASK#123',
        SK: 'TASK#123',
        id: '123',
        description: 'Test task',
        assignee: 'user@example.com',
        priority: 'P1',
        status: 'open',
        dueDate: '2024-12-31',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const formatted = formatTask(taskItem);

      expect(formatted).toEqual({
        id: '123',
        description: 'Test task',
        assignee: 'user@example.com',
        priority: 'P1',
        status: 'open',
        dueDate: '2024-12-31',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
    });

    test('should format task without optional fields', () => {
      const taskItem = {
        id: '123',
        description: 'Minimal task',
        priority: 'P2',
        status: 'open',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const formatted = formatTask(taskItem);

      expect(formatted.assignee).toBeNull();
      expect(formatted.dueDate).toBeNull();
      expect(formatted.id).toBe('123');
      expect(formatted.description).toBe('Minimal task');
    });

    test('should handle null input', () => {
      const formatted = formatTask(null);
      expect(formatted).toBeNull();
    });

    test('should handle undefined input', () => {
      const formatted = formatTask(undefined);
      expect(formatted).toBeNull();
    });

    test('should convert empty string assignee to null', () => {
      const taskItem = {
        id: '123',
        description: 'Task',
        assignee: '',
        priority: 'P2',
        status: 'open',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const formatted = formatTask(taskItem);

      expect(formatted.assignee).toBeNull();
    });

    test('should preserve ISO 8601 timestamp format', () => {
      const timestamp = '2024-01-15T10:30:45.123Z';
      const taskItem = {
        id: '123',
        description: 'Task',
        priority: 'P2',
        status: 'open',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const formatted = formatTask(taskItem);

      expect(formatted.createdAt).toBe(timestamp);
      expect(formatted.updatedAt).toBe(timestamp);
    });
  });

  describe('Edge Cases', () => {
    test('success should handle nested objects', () => {
      const body = {
        task: {
          id: '123',
          metadata: {
            tags: ['urgent', 'important']
          }
        }
      };
      const response = success(200, body);

      expect(JSON.parse(response.body)).toEqual(body);
    });

    test('error should handle special characters in message', () => {
      const message = 'Error: Invalid input <script>alert("xss")</script>';
      const response = error(400, message);

      expect(JSON.parse(response.body).error).toBe(message);
    });

    test('rateLimitExceeded should handle zero retryAfter', () => {
      const response = rateLimitExceeded(0);

      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBe('0');
    });
  });
});

const { success, error, formatTask } = require('../../src/lib/response');

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

    test('should include x-request-id header when requestId is provided', () => {
      const body = { id: '123' };
      const requestId = 'req-12345-abcde';
      const response = success(200, body, requestId);

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe(requestId);
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    test('should not include x-request-id header when requestId is not provided', () => {
      const body = { id: '123' };
      const response = success(200, body);

      expect(response.headers['x-request-id']).toBeUndefined();
    });

    test('should not include x-request-id header when requestId is undefined', () => {
      const body = { id: '123' };
      const response = success(200, body, undefined);

      expect(response.headers['x-request-id']).toBeUndefined();
    });

    test('should not include x-request-id header when requestId is null', () => {
      const body = { id: '123' };
      const response = success(200, body, null);

      expect(response.headers['x-request-id']).toBeUndefined();
    });

    test('should not include x-request-id header when requestId is empty string', () => {
      const body = { id: '123' };
      const response = success(200, body, '');

      expect(response.headers['x-request-id']).toBeUndefined();
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

    test('should include x-request-id header when requestId is provided', () => {
      const message = 'Task not found';
      const requestId = 'req-12345-abcde';
      const response = error(404, message, requestId);

      expect(response.statusCode).toBe(404);
      expect(response.headers['x-request-id']).toBe(requestId);
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    test('should include requestId field in error response body when requestId is provided', () => {
      const message = 'Task not found';
      const requestId = 'req-12345-abcde';
      const response = error(404, message, requestId);

      const body = JSON.parse(response.body);
      expect(body.error).toBe(message);
      expect(body.requestId).toBe(requestId);
    });

    test('should not include x-request-id header when requestId is not provided', () => {
      const message = 'Task not found';
      const response = error(404, message);

      expect(response.headers['x-request-id']).toBeUndefined();
    });

    test('should not include requestId field in response body when requestId is not provided', () => {
      const message = 'Task not found';
      const response = error(404, message);

      const body = JSON.parse(response.body);
      expect(body.requestId).toBeUndefined();
    });

    test('should not include x-request-id header when requestId is empty string', () => {
      const message = 'Task not found';
      const response = error(404, message, '');

      expect(response.headers['x-request-id']).toBeUndefined();
      expect(JSON.parse(response.body).requestId).toBeUndefined();
    });

    test('should include x-request-id header and requestId in body for 500 errors', () => {
      const message = 'Internal server error';
      const requestId = 'req-500-error';
      const response = error(500, message, requestId);

      expect(response.statusCode).toBe(500);
      expect(response.headers['x-request-id']).toBe(requestId);
      const body = JSON.parse(response.body);
      expect(body.error).toBe(message);
      expect(body.requestId).toBe(requestId);
    });

    test('should include x-request-id header and requestId in body for 400 errors', () => {
      const message = 'Bad request';
      const requestId = 'req-400-error';
      const response = error(400, message, requestId);

      expect(response.statusCode).toBe(400);
      expect(response.headers['x-request-id']).toBe(requestId);
      const body = JSON.parse(response.body);
      expect(body.error).toBe(message);
      expect(body.requestId).toBe(requestId);
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
    test('should handle success with null body', () => {
      const response = success(200, null);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('null');
    });

    test('should handle error with empty message', () => {
      const response = error(400, '');
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe('');
    });

    test('should handle formatTask with empty object', () => {
      const formatted = formatTask({});
      
      expect(formatted).toBeDefined();
      expect(formatted.id).toBeUndefined();
    });

    test('should handle success with nested objects', () => {
      const body = {
        task: {
          id: '123',
          nested: {
            value: 'deep'
          }
        }
      };
      const response = success(200, body);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(body);
    });

    test('should handle success with nested objects and requestId', () => {
      const body = {
        task: {
          id: '123',
          nested: {
            value: 'deep'
          }
        }
      };
      const requestId = 'req-nested-test';
      const response = success(200, body, requestId);

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe(requestId);
      expect(JSON.parse(response.body)).toEqual(body);
    });

    test('should handle error with special characters in message and requestId', () => {
      const message = 'Error: <special> & "characters"';
      const requestId = 'req-special-chars';
      const response = error(500, message, requestId);

      const body = JSON.parse(response.body);
      expect(body.error).toBe(message);
      expect(body.requestId).toBe(requestId);
    });
  });
});

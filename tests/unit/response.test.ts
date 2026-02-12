import { success, error, formatTask } from '../../src/lib/response';
import { TaskItem } from '../../src/types';

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

  describe('formatTask', () => {
    test('should format complete task item', () => {
      const taskItem: TaskItem = {
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
      const taskItem: TaskItem = {
        PK: 'TASK#123',
        SK: 'TASK#123',
        id: '123',
        description: 'Minimal task',
        assignee: null,
        priority: 'P2',
        status: 'open',
        dueDate: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const formatted = formatTask(taskItem);

      expect(formatted!.assignee).toBeNull();
      expect(formatted!.dueDate).toBeNull();
      expect(formatted!.id).toBe('123');
      expect(formatted!.description).toBe('Minimal task');
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
      const taskItem: TaskItem = {
        PK: 'TASK#123',
        SK: 'TASK#123',
        id: '123',
        description: 'Task',
        assignee: '' as unknown as null,
        priority: 'P2',
        status: 'open',
        dueDate: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const formatted = formatTask(taskItem);

      expect(formatted!.assignee).toBeNull();
    });

    test('should preserve ISO 8601 timestamp format', () => {
      const timestamp = '2024-01-15T10:30:45.123Z';
      const taskItem: TaskItem = {
        PK: 'TASK#123',
        SK: 'TASK#123',
        id: '123',
        description: 'Task',
        assignee: null,
        priority: 'P2',
        status: 'open',
        dueDate: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const formatted = formatTask(taskItem);

      expect(formatted!.createdAt).toBe(timestamp);
      expect(formatted!.updatedAt).toBe(timestamp);
    });
  });

  describe('Edge Cases', () => {
    test('should handle deeply nested body in success response', () => {
      const body = { data: { nested: { value: 'test' } } };
      const response = success(200, body);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(body);
    });

    test('should handle special characters in error message', () => {
      const message = 'Error: Special chars <>&"\'';
      const response = error(400, message);

      expect(JSON.parse(response.body).error).toBe(message);
    });
  });
});

// Mock AWS SDK before importing the module
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn()
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend
    }))
  },
  PutCommand: jest.fn((params: unknown) => params),
  GetCommand: jest.fn((params: unknown) => params),
  DeleteCommand: jest.fn((params: unknown) => params),
  ScanCommand: jest.fn((params: unknown) => params),
  QueryCommand: jest.fn((params: unknown) => params)
}));

import {
  putTask,
  getTask,
  deleteTask,
  scanTasks,
  queryTasksByAssignee,
  queryTasksByStatus,
  queryTasksByPriority
} from '../../src/lib/dynamodb';
import { Task } from '../../src/types';

describe('DynamoDB Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('putTask', () => {
    test('should put task to DynamoDB', async () => {
      mockSend.mockResolvedValue({});

      const task: Task = {
        id: '123',
        description: 'Test task',
        assignee: null,
        priority: 'P1',
        status: 'open',
        dueDate: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const result = await putTask(task);

      expect(result).toEqual(task);
      expect(mockSend).toHaveBeenCalled();
    });

    test('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      const task: Task = {
        id: '123',
        description: 'Test',
        assignee: null,
        priority: 'P1',
        status: 'open',
        dueDate: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      await expect(putTask(task)).rejects.toThrow('Internal server error: putting task');
    });
  });

  describe('getTask', () => {
    test('should get task from DynamoDB', async () => {
      const mockTask = {
        id: '123',
        description: 'Test task'
      };

      mockSend.mockResolvedValue({ Item: mockTask });

      const result = await getTask('123');

      expect(result).toEqual(mockTask);
      expect(mockSend).toHaveBeenCalled();
    });

    test('should return null when task not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await getTask('nonexistent');

      expect(result).toBeNull();
    });

    test('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(getTask('123')).rejects.toThrow('Internal server error: getting task');
    });
  });

  describe('deleteTask', () => {
    test('should delete task from DynamoDB', async () => {
      mockSend.mockResolvedValue({});

      await deleteTask('123');

      expect(mockSend).toHaveBeenCalled();
    });

    test('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(deleteTask('123')).rejects.toThrow('Internal server error: deleting task');
    });
  });

  describe('scanTasks', () => {
    test('should scan all tasks', async () => {
      const mockTasks = [
        { id: '1', description: 'Task 1' },
        { id: '2', description: 'Task 2' }
      ];

      mockSend.mockResolvedValue({ Items: mockTasks });

      const result = await scanTasks();

      expect(result).toEqual({ items: mockTasks, nextToken: null });
      expect(mockSend).toHaveBeenCalled();
    });

    test('should return empty array when no items', async () => {
      mockSend.mockResolvedValue({});

      const result = await scanTasks();

      expect(result).toEqual({ items: [], nextToken: null });
    });

    test('should return nextToken when available', async () => {
      const mockTasks = [{ id: '1', description: 'Task 1' }];
      const lastKey = { PK: 'TASK#1', SK: 'TASK#1' };
      
      mockSend.mockResolvedValue({ Items: mockTasks, LastEvaluatedKey: lastKey });

      const result = await scanTasks();

      expect(result.items).toEqual(mockTasks);
      expect(result.nextToken).toBeTruthy();
    });

    test('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(scanTasks()).rejects.toThrow('Internal server error: scanning tasks');
    });
  });

  describe('queryTasksByAssignee', () => {
    test('should query tasks by assignee', async () => {
      const mockTasks = [{ id: '1', assignee: 'user@example.com' }];

      mockSend.mockResolvedValue({ Items: mockTasks });

      const result = await queryTasksByAssignee('user@example.com');

      expect(result).toEqual({ items: mockTasks, nextToken: null });
      expect(mockSend).toHaveBeenCalled();
    });

    test('should return empty array when no matches', async () => {
      mockSend.mockResolvedValue({});

      const result = await queryTasksByAssignee('user@example.com');

      expect(result).toEqual({ items: [], nextToken: null });
    });

    test('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(queryTasksByAssignee('user@example.com')).rejects.toThrow('Internal server error: querying tasks by assignee');
    });
  });

  describe('queryTasksByStatus', () => {
    test('should query tasks by status', async () => {
      const mockTasks = [{ id: '1', status: 'open' }];

      mockSend.mockResolvedValue({ Items: mockTasks });

      const result = await queryTasksByStatus('open');

      expect(result).toEqual({ items: mockTasks, nextToken: null });
      expect(mockSend).toHaveBeenCalled();
    });

    test('should return empty array when no matches', async () => {
      mockSend.mockResolvedValue({});

      const result = await queryTasksByStatus('open');

      expect(result).toEqual({ items: [], nextToken: null });
    });

    test('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(queryTasksByStatus('open')).rejects.toThrow('Internal server error: querying tasks by status');
    });
  });

  describe('queryTasksByPriority', () => {
    test('should query tasks by priority', async () => {
      const mockTasks = [{ id: '1', priority: 'P1' }];

      mockSend.mockResolvedValue({ Items: mockTasks });

      const result = await queryTasksByPriority('P1');

      expect(result).toEqual({ items: mockTasks, nextToken: null });
      expect(mockSend).toHaveBeenCalled();
    });

    test('should return empty array when no matches', async () => {
      mockSend.mockResolvedValue({});

      const result = await queryTasksByPriority('P1');

      expect(result).toEqual({ items: [], nextToken: null });
    });

    test('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(queryTasksByPriority('P1')).rejects.toThrow('Internal server error: querying tasks by priority');
    });
  });

  describe('Edge Cases', () => {
    test('should handle pagination parameters', async () => {
      const mockTasks = [{ id: '1', description: 'Task 1' }];
      const validToken = Buffer.from(JSON.stringify({ PK: 'TASK#1', SK: 'TASK#1' })).toString('base64');
      
      mockSend.mockResolvedValue({ Items: mockTasks });

      const result = await scanTasks(10, validToken);

      expect(result.items).toEqual(mockTasks);
      expect(mockSend).toHaveBeenCalled();
    });
  });
});

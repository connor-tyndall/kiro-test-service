import { handler } from '../../../src/handlers/listTasks';
import {
  scanTasks,
  queryTasksByAssignee,
  queryTasksByStatus,
  queryTasksByPriority
} from '../../../src/lib/dynamodb';
import { APIGatewayEvent, TaskItem } from '../../../src/types';

jest.mock('../../../src/lib/dynamodb');

const mockedScanTasks = scanTasks as jest.MockedFunction<typeof scanTasks>;
const mockedQueryTasksByAssignee = queryTasksByAssignee as jest.MockedFunction<typeof queryTasksByAssignee>;
const mockedQueryTasksByStatus = queryTasksByStatus as jest.MockedFunction<typeof queryTasksByStatus>;
const mockedQueryTasksByPriority = queryTasksByPriority as jest.MockedFunction<typeof queryTasksByPriority>;

describe('listTasks handler', () => {
  const originalEnv = process.env;
  const mockTasks: TaskItem[] = [
    {
      PK: 'TASK#1',
      SK: 'TASK#1',
      id: '1',
      description: 'Task 1',
      assignee: 'user1@example.com',
      priority: 'P1',
      status: 'open',
      dueDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      PK: 'TASK#2',
      SK: 'TASK#2',
      id: '2',
      description: 'Task 2',
      assignee: 'user2@example.com',
      priority: 'P2',
      status: 'in-progress',
      dueDate: '2024-11-30',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should list all tasks without filters', async () => {
    mockedScanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(2);
    expect(mockedScanTasks).toHaveBeenCalledWith(20, undefined);
  });

  test('should filter by assignee', async () => {
    mockedQueryTasksByAssignee.mockResolvedValue({ items: [mockTasks[0]], nextToken: null });

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        assignee: 'user1@example.com'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].assignee).toBe('user1@example.com');
    expect(mockedQueryTasksByAssignee).toHaveBeenCalledWith('user1@example.com', 20, undefined);
  });

  test('should filter by status', async () => {
    mockedQueryTasksByStatus.mockResolvedValue({ items: [mockTasks[1]], nextToken: null });

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        status: 'in-progress'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].status).toBe('in-progress');
  });

  test('should filter by priority', async () => {
    mockedQueryTasksByPriority.mockResolvedValue({ items: [mockTasks[0]], nextToken: null });

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        priority: 'P1'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].priority).toBe('P1');
  });

  test('should filter by due date', async () => {
    mockedScanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        dueDateBefore: '2024-12-01'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].dueDate).toBe('2024-11-30');
  });

  test('should apply multiple filters', async () => {
    mockedQueryTasksByAssignee.mockResolvedValue({ items: mockTasks, nextToken: null });

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        assignee: 'user1@example.com',
        status: 'open'
      }
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].assignee).toBe('user1@example.com');
    expect(body.tasks[0].status).toBe('open');
  });

  test('should return empty array when no matches', async () => {
    mockedScanTasks.mockResolvedValue({ items: [], nextToken: null });

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(0);
  });

  test('should reject invalid priority', async () => {
    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        priority: 'invalid'
      }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  test('should reject invalid status', async () => {
    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: {
        status: 'invalid'
      }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  test('should handle DynamoDB errors', async () => {
    mockedScanTasks.mockRejectedValue(new Error('DynamoDB error'));

    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.error).toBe('Internal server error: listing tasks');
  });

  test('should return 401 for missing API key', async () => {
    const event: APIGatewayEvent = {
      headers: {},
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Missing API key');
  });

  test('should return 401 for invalid API key', async () => {
    const event: APIGatewayEvent = {
      headers: {
        'x-api-key': 'wrong-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Invalid API key');
  });

  describe('Pagination', () => {
    test('should use default limit of 20', async () => {
      mockedScanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: null
      };

      await handler(event);

      expect(mockedScanTasks).toHaveBeenCalledWith(20, undefined);
    });

    test('should accept custom limit', async () => {
      mockedScanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          limit: '50'
        }
      };

      await handler(event);

      expect(mockedScanTasks).toHaveBeenCalledWith(50, undefined);
    });

    test('should pass nextToken to DynamoDB', async () => {
      const token = 'test-token';
      mockedScanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          nextToken: token
        }
      };

      await handler(event);

      expect(mockedScanTasks).toHaveBeenCalledWith(20, token);
    });

    test('should return nextToken when more results available', async () => {
      const nextToken = 'next-page-token';
      mockedScanTasks.mockResolvedValue({ items: mockTasks, nextToken });

      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(body.nextToken).toBe(nextToken);
    });

    test('should not return nextToken when no more results', async () => {
      mockedScanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(body.nextToken).toBeUndefined();
    });

    test('should reject limit below minimum', async () => {
      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          limit: '0'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Limit must be at least 1');
    });

    test('should reject limit above maximum', async () => {
      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          limit: '101'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Limit must not exceed 100');
    });

    test('should reject non-numeric limit', async () => {
      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          limit: 'abc'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Limit must be a number');
    });

    test('should work with pagination and filters', async () => {
      const nextToken = 'next-page-token';
      mockedQueryTasksByAssignee.mockResolvedValue({ items: [mockTasks[0]], nextToken });

      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          assignee: 'user1@example.com',
          limit: '10',
          nextToken: 'prev-token'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks).toHaveLength(1);
      expect(body.nextToken).toBe(nextToken);
      expect(mockedQueryTasksByAssignee).toHaveBeenCalledWith('user1@example.com', 10, 'prev-token');
    });
  });

  describe('Edge Cases', () => {
    test('should handle decimal limit', async () => {
      const event: APIGatewayEvent = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          limit: '20.5'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Limit must be an integer');
    });
  });
});

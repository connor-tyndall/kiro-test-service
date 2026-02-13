const { handler } = require('../../../src/handlers/listTasks');
const {
  scanTasks,
  queryTasksByAssignee,
  queryTasksByStatus,
  queryTasksByPriority
} = require('../../../src/lib/dynamodb');

jest.mock('../../../src/lib/dynamodb');

describe('listTasks handler', () => {
  const originalEnv = process.env;
  const mockTasks = [
    {
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
    scanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

    const event = {
      headers: {
        'x-api-key': 'test-api-key'
      },
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.tasks).toHaveLength(2);
    expect(scanTasks).toHaveBeenCalledWith(20, undefined);
  });

  test('should filter by assignee', async () => {
    queryTasksByAssignee.mockResolvedValue({ items: [mockTasks[0]], nextToken: null });

    const event = {
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
    expect(queryTasksByAssignee).toHaveBeenCalledWith('user1@example.com', 20, undefined);
  });

  test('should filter by status', async () => {
    queryTasksByStatus.mockResolvedValue({ items: [mockTasks[1]], nextToken: null });

    const event = {
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
    queryTasksByPriority.mockResolvedValue({ items: [mockTasks[0]], nextToken: null });

    const event = {
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
    scanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

    const event = {
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
    queryTasksByAssignee.mockResolvedValue({ items: mockTasks, nextToken: null });

    const event = {
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
    scanTasks.mockResolvedValue({ items: [], nextToken: null });

    const event = {
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
    const event = {
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
    const event = {
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
    scanTasks.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
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
    const event = {
      headers: {},
      queryStringParameters: null
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
      queryStringParameters: null
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Invalid API key');
  });

  describe('Pagination', () => {
    test('should use default limit of 20', async () => {
      scanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: null
      };

      await handler(event);

      expect(scanTasks).toHaveBeenCalledWith(20, undefined);
    });

    test('should accept custom limit', async () => {
      scanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          limit: '50'
        }
      };

      await handler(event);

      expect(scanTasks).toHaveBeenCalledWith(50, undefined);
    });

    test('should pass nextToken to DynamoDB', async () => {
      const token = 'test-token';
      scanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          nextToken: token
        }
      };

      await handler(event);

      expect(scanTasks).toHaveBeenCalledWith(20, token);
    });

    test('should return nextToken when more results available', async () => {
      const nextToken = 'next-page-token';
      scanTasks.mockResolvedValue({ items: mockTasks, nextToken });

      const event = {
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
      scanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event = {
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
      const event = {
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
      const event = {
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
      const event = {
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
      queryTasksByAssignee.mockResolvedValue({ items: [mockTasks[0]], nextToken });

      const event = {
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
      expect(queryTasksByAssignee).toHaveBeenCalledWith('user1@example.com', 10, 'prev-token');
    });
  });

  describe('Edge Cases', () => {
    test('should handle decimal limit', async () => {
      const event = {
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

    test('should return 400 for invalid base64 nextToken', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          nextToken: 'not-valid-base64!!!'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid nextToken parameter');
    });

    test('should return 400 for malformed base64 nextToken', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          nextToken: '@#$%^&*'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid nextToken parameter');
    });

    test('should return 400 for base64 nextToken that decodes to non-JSON', async () => {
      const nonJsonToken = Buffer.from('not a json string').toString('base64');
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          nextToken: nonJsonToken
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid nextToken parameter');
    });

    test('should return 400 for empty nextToken', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          nextToken: ''
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid nextToken parameter');
    });

    test('should accept valid base64-encoded JSON nextToken', async () => {
      const validKey = { PK: 'TASK#123', SK: 'TASK#123' };
      const validToken = Buffer.from(JSON.stringify(validKey)).toString('base64');
      scanTasks.mockResolvedValue({ items: mockTasks, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          nextToken: validToken
        }
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(scanTasks).toHaveBeenCalledWith(20, validToken);
    });

    test('should return 400 for invalid nextToken with filters', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          assignee: 'user@example.com',
          nextToken: 'invalid!!!'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid nextToken parameter');
    });
  });

  describe('Tag Filtering', () => {
    const mockTasksWithTags = [
      {
        id: '1',
        description: 'Task 1',
        assignee: 'user1@example.com',
        priority: 'P1',
        status: 'open',
        tags: ['bug', 'frontend'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: '2',
        description: 'Task 2',
        assignee: 'user2@example.com',
        priority: 'P2',
        status: 'in-progress',
        tags: ['bug', 'backend'],
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      },
      {
        id: '3',
        description: 'Task 3',
        assignee: 'user1@example.com',
        priority: 'P1',
        status: 'open',
        tags: ['feature'],
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z'
      },
      {
        id: '4',
        description: 'Task 4',
        assignee: 'user2@example.com',
        priority: 'P3',
        status: 'done',
        tags: [],
        createdAt: '2024-01-04T00:00:00.000Z',
        updatedAt: '2024-01-04T00:00:00.000Z'
      }
    ];

    test('should filter tasks by tag', async () => {
      scanTasks.mockResolvedValue({ items: mockTasksWithTags, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'bug'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks).toHaveLength(2);
      expect(body.tasks.every(t => t.tags.includes('bug'))).toBe(true);
    });

    test('should filter tasks by unique tag', async () => {
      scanTasks.mockResolvedValue({ items: mockTasksWithTags, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'feature'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0].id).toBe('3');
    });

    test('should return empty array when no tasks match tag', async () => {
      scanTasks.mockResolvedValue({ items: mockTasksWithTags, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'nonexistent-tag'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks).toHaveLength(0);
    });

    test('should exclude tasks with empty tags array', async () => {
      scanTasks.mockResolvedValue({ items: mockTasksWithTags, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'bug'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks.find(t => t.id === '4')).toBeUndefined();
    });

    test('should exclude tasks without tags field', async () => {
      const tasksWithMissingTags = [
        { ...mockTasksWithTags[0] },
        { id: '5', description: 'Task without tags', priority: 'P1', status: 'open', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
      ];
      scanTasks.mockResolvedValue({ items: tasksWithMissingTags, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'bug'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0].id).toBe('1');
    });

    test('should combine tag filter with other filters', async () => {
      queryTasksByAssignee.mockResolvedValue({ items: [mockTasksWithTags[0], mockTasksWithTags[2]], nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          assignee: 'user1@example.com',
          tag: 'bug'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0].id).toBe('1');
    });

    test('should combine tag filter with status filter', async () => {
      queryTasksByStatus.mockResolvedValue({ items: [mockTasksWithTags[0], mockTasksWithTags[2]], nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          status: 'open',
          tag: 'frontend'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0].id).toBe('1');
    });

    test('should reject invalid tag format with uppercase', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'Bug'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Tag must contain only lowercase letters, numbers, and hyphens');
    });

    test('should reject tag with spaces', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'high priority'
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Tag must contain only lowercase letters, numbers, and hyphens');
    });

    test('should reject empty tag parameter', async () => {
      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: ''
        }
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Tag filter must be a non-empty string');
    });

    test('should accept valid tag with numbers', async () => {
      scanTasks.mockResolvedValue({ items: mockTasksWithTags, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: {
          tag: 'sprint-15'
        }
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });

    test('should include tags in response', async () => {
      scanTasks.mockResolvedValue({ items: mockTasksWithTags, nextToken: null });

      const event = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        queryStringParameters: null
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.tasks[0].tags).toBeDefined();
      expect(Array.isArray(body.tasks[0].tags)).toBe(true);
    });
  });
});

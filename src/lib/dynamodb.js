const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'engineering-tasks';

/**
 * Puts a task in DynamoDB (create or update)
 * @param {Object} task - Task object to store
 * @returns {Promise<Object>} The stored task
 */
async function putTask(task) {
  try {
    const item = {
      PK: `TASK#${task.id}`,
      SK: `TASK#${task.id}`,
      ...task
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return task;
  } catch (error) {
    console.error('DynamoDB putTask error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Gets a task by ID from DynamoDB
 * @param {string} id - Task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
async function getTask(id) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `TASK#${id}`,
        SK: `TASK#${id}`
      }
    }));

    return result.Item || null;
  } catch (error) {
    console.error('DynamoDB getTask error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Deletes a task from DynamoDB
 * @param {string} id - Task ID
 * @returns {Promise<void>}
 */
async function deleteTask(id) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `TASK#${id}`,
        SK: `TASK#${id}`
      }
    }));
  } catch (error) {
    console.error('DynamoDB deleteTask error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Scans all tasks from DynamoDB
 * @param {number} limit - Maximum number of items to return
 * @param {string} nextToken - Pagination token
 * @returns {Promise<Object>} Object with items and nextToken
 */
async function scanTasks(limit, nextToken) {
  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'TASK#'
      }
    };

    if (limit) {
      params.Limit = limit;
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const result = await docClient.send(new ScanCommand(params));

    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (error) {
    console.error('DynamoDB scanTasks error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by assignee using GSI1
 * @param {string} assignee - Assignee identifier
 * @param {number} limit - Maximum number of items to return
 * @param {string} nextToken - Pagination token
 * @returns {Promise<Object>} Object with items and nextToken
 */
async function queryTasksByAssignee(assignee, limit, nextToken) {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'assignee = :assignee',
      ExpressionAttributeValues: {
        ':assignee': assignee
      }
    };

    if (limit) {
      params.Limit = limit;
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const result = await docClient.send(new QueryCommand(params));

    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (error) {
    console.error('DynamoDB queryTasksByAssignee error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by status using GSI2
 * @param {string} status - Task status
 * @param {number} limit - Maximum number of items to return
 * @param {string} nextToken - Pagination token
 * @returns {Promise<Object>} Object with items and nextToken
 */
async function queryTasksByStatus(status, limit, nextToken) {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      }
    };

    if (limit) {
      params.Limit = limit;
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const result = await docClient.send(new QueryCommand(params));

    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (error) {
    console.error('DynamoDB queryTasksByStatus error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by priority using GSI3
 * @param {string} priority - Task priority
 * @param {number} limit - Maximum number of items to return
 * @param {string} nextToken - Pagination token
 * @returns {Promise<Object>} Object with items and nextToken
 */
async function queryTasksByPriority(priority, limit, nextToken) {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'priority = :priority',
      ExpressionAttributeValues: {
        ':priority': priority
      }
    };

    if (limit) {
      params.Limit = limit;
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const result = await docClient.send(new QueryCommand(params));

    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (error) {
    console.error('DynamoDB queryTasksByPriority error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Scans all tasks to aggregate status counts
 * @param {string|null} assignee - Optional assignee filter
 * @returns {Promise<Object>} Object with total count and counts by status
 */
async function getTaskStats(assignee) {
  try {
    const stats = {
      total: 0,
      byStatus: {
        'open': 0,
        'in-progress': 0,
        'done': 0
      }
    };

    let lastEvaluatedKey = null;

    do {
      const params = {
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': 'TASK#'
        }
      };

      if (assignee) {
        params.FilterExpression += ' AND assignee = :assignee';
        params.ExpressionAttributeValues[':assignee'] = assignee;
      }

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.send(new ScanCommand(params));
      
      for (const item of (result.Items || [])) {
        stats.total++;
        if (item.status && stats.byStatus.hasOwnProperty(item.status)) {
          stats.byStatus[item.status]++;
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return stats;
  } catch (error) {
    console.error('DynamoDB getTaskStats error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

module.exports = {
  putTask,
  getTask,
  deleteTask,
  scanTasks,
  queryTasksByAssignee,
  queryTasksByStatus,
  queryTasksByPriority,
  getTaskStats
};

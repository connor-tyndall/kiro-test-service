import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Task, TaskItem, QueryResult } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'engineering-tasks';

/**
 * Puts a task in DynamoDB (create or update)
 * @param task - Task object to store
 * @returns The stored task
 */
export async function putTask(task: Task): Promise<Task> {
  try {
    const item: TaskItem = {
      PK: `TASK#${task.id}`,
      SK: `TASK#${task.id}`,
      ...task
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return task;
  } catch (err) {
    console.error('DynamoDB putTask error:', err);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Gets a task by ID from DynamoDB
 * @param id - Task ID
 * @returns Task object or null if not found
 */
export async function getTask(id: string): Promise<TaskItem | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `TASK#${id}`,
        SK: `TASK#${id}`
      }
    }));

    return (result.Item as TaskItem) || null;
  } catch (err) {
    console.error('DynamoDB getTask error:', err);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Deletes a task from DynamoDB
 * @param id - Task ID
 * @returns void
 */
export async function deleteTask(id: string): Promise<void> {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `TASK#${id}`,
        SK: `TASK#${id}`
      }
    }));
  } catch (err) {
    console.error('DynamoDB deleteTask error:', err);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Scans all tasks from DynamoDB
 * @param limit - Maximum number of items to return
 * @param nextToken - Pagination token
 * @returns Object with items and nextToken
 */
export async function scanTasks(limit?: number, nextToken?: string): Promise<QueryResult> {
  try {
    const params: {
      TableName: string;
      FilterExpression: string;
      ExpressionAttributeValues: Record<string, string>;
      Limit?: number;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
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
      items: (result.Items as TaskItem[]) || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (err) {
    console.error('DynamoDB scanTasks error:', err);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by assignee using GSI1
 * @param assignee - Assignee identifier
 * @param limit - Maximum number of items to return
 * @param nextToken - Pagination token
 * @returns Object with items and nextToken
 */
export async function queryTasksByAssignee(assignee: string, limit?: number, nextToken?: string): Promise<QueryResult> {
  try {
    const params: {
      TableName: string;
      IndexName: string;
      KeyConditionExpression: string;
      ExpressionAttributeValues: Record<string, string>;
      Limit?: number;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
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
      items: (result.Items as TaskItem[]) || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (err) {
    console.error('DynamoDB queryTasksByAssignee error:', err);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by status using GSI2
 * @param status - Task status
 * @param limit - Maximum number of items to return
 * @param nextToken - Pagination token
 * @returns Object with items and nextToken
 */
export async function queryTasksByStatus(status: string, limit?: number, nextToken?: string): Promise<QueryResult> {
  try {
    const params: {
      TableName: string;
      IndexName: string;
      KeyConditionExpression: string;
      ExpressionAttributeNames: Record<string, string>;
      ExpressionAttributeValues: Record<string, string>;
      Limit?: number;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
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
      items: (result.Items as TaskItem[]) || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (err) {
    console.error('DynamoDB queryTasksByStatus error:', err);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by priority using GSI3
 * @param priority - Task priority
 * @param limit - Maximum number of items to return
 * @param nextToken - Pagination token
 * @returns Object with items and nextToken
 */
export async function queryTasksByPriority(priority: string, limit?: number, nextToken?: string): Promise<QueryResult> {
  try {
    const params: {
      TableName: string;
      IndexName: string;
      KeyConditionExpression: string;
      ExpressionAttributeValues: Record<string, string>;
      Limit?: number;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
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
      items: (result.Items as TaskItem[]) || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  } catch (err) {
    console.error('DynamoDB queryTasksByPriority error:', err);
    throw new Error('Service temporarily unavailable');
  }
}

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
 * @returns {Promise<Array>} Array of task objects
 */
async function scanTasks() {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'TASK#'
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('DynamoDB scanTasks error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by assignee using GSI1
 * @param {string} assignee - Assignee identifier
 * @returns {Promise<Array>} Array of task objects
 */
async function queryTasksByAssignee(assignee) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'assignee = :assignee',
      ExpressionAttributeValues: {
        ':assignee': assignee
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('DynamoDB queryTasksByAssignee error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by status using GSI2
 * @param {string} status - Task status
 * @returns {Promise<Array>} Array of task objects
 */
async function queryTasksByStatus(status) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('DynamoDB queryTasksByStatus error:', error);
    throw new Error('Service temporarily unavailable');
  }
}

/**
 * Queries tasks by priority using GSI3
 * @param {string} priority - Task priority
 * @returns {Promise<Array>} Array of task objects
 */
async function queryTasksByPriority(priority) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'priority = :priority',
      ExpressionAttributeValues: {
        ':priority': priority
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('DynamoDB queryTasksByPriority error:', error);
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
  queryTasksByPriority
};

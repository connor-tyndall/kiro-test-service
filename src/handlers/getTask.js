const { error, success } = require('../lib/response');
const { getTask } = require('../lib/dynamodb');
const { formatTask } = require('../lib/response');
const { validateApiKey } = require('../lib/auth');
const {
  TASK_NOT_FOUND,
  TASK_ID_REQUIRED,
  INTERNAL_ERROR_RETRIEVING_TASK
} = require('../lib/errors');

/**
 * @typedef {import('../lib/validation').TaskStatus} TaskStatus
 * @typedef {import('../lib/validation').TaskPriority} TaskPriority
 */

/**
 * Lambda handler for retrieving a task by ID
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 *   - 200: { id: string, description: string, assignee: string|null, priority: TaskPriority, status: TaskStatus, dueDate: string|null, createdAt: string, updatedAt: string }
 *   - 400: { error: string } - Missing task ID
 *   - 401: { error: string } - Missing or invalid API key
 *   - 404: { error: string } - Task not found
 *   - 500: { error: string } - Internal server error
 */
exports.handler = async (event) => {
  // Validate API key
  const authError = validateApiKey(event);
  if (authError) {
    return authError;
  }

  try {
    // Extract task ID from path parameters
    const taskId = event.pathParameters?.id;
    
    if (!taskId) {
      return error(400, TASK_ID_REQUIRED);
    }

    // Retrieve task from DynamoDB
    const task = await getTask(taskId);

    if (!task) {
      return error(404, TASK_NOT_FOUND);
    }

    // Format and return task
    const formattedTask = formatTask(task);
    return success(200, formattedTask);
  } catch (err) {
    console.error('Error retrieving task:', err);
    return error(500, INTERNAL_ERROR_RETRIEVING_TASK);
  }
};

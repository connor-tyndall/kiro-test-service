const { error, success } = require('../lib/response');
const { getTask } = require('../lib/dynamodb');
const { formatTask } = require('../lib/response');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for retrieving a task by ID
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'UNKNOWN';

  // Validate API key
  const authError = validateApiKey(event, requestId);
  if (authError) {
    return authError;
  }

  try {
    // Extract task ID from path parameters
    const taskId = event.pathParameters?.id;
    
    if (!taskId) {
      return error(400, 'Task ID is required', requestId);
    }

    // Retrieve task from DynamoDB
    const task = await getTask(taskId);

    if (!task) {
      return error(404, 'Task not found', requestId);
    }

    // Format and return task
    const formattedTask = formatTask(task);
    return success(200, formattedTask, requestId);
  } catch (err) {
    console.error(`[${requestId}] Error retrieving task:`, err);
    return error(500, 'Internal server error: retrieving task', requestId);
  }
};

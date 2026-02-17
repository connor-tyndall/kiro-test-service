const { error } = require('../lib/response');
const { getTask, deleteTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for deleting a task
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

    // Check if task exists
    const existingTask = await getTask(taskId);
    if (!existingTask) {
      return error(404, 'Task not found', requestId);
    }

    // Delete task from DynamoDB
    await deleteTask(taskId);

    // Return 204 No Content
    return {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId
      },
      body: ''
    };
  } catch (err) {
    console.error(`[${requestId}] Error deleting task:`, err);
    return error(500, 'Internal server error: deleting task', requestId);
  }
};

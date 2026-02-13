const { error, rateLimitExceeded } = require('../lib/response');
const { getTask, deleteTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');
const { checkRateLimit } = require('../lib/rateLimiter');

/**
 * Lambda handler for deleting a task
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 */
exports.handler = async (event) => {
  // Validate API key
  const authError = validateApiKey(event);
  if (authError) {
    return authError;
  }

  // Check rate limit
  const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];
  const rateLimitResult = checkRateLimit(apiKey);
  if (!rateLimitResult.allowed) {
    return rateLimitExceeded(rateLimitResult.retryAfter);
  }

  try {
    // Extract task ID from path parameters
    const taskId = event.pathParameters?.id;
    
    if (!taskId) {
      return error(400, 'Task ID is required');
    }

    // Check if task exists
    const existingTask = await getTask(taskId);
    if (!existingTask) {
      return error(404, 'Task not found');
    }

    // Delete task from DynamoDB
    await deleteTask(taskId);

    // Return 204 No Content
    return {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json'
      },
      body: ''
    };
  } catch (err) {
    console.error('Error deleting task:', err);
    return error(500, 'Internal server error: deleting task');
  }
};

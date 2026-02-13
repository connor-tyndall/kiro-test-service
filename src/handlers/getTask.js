const { error, success, rateLimitExceeded } = require('../lib/response');
const { getTask } = require('../lib/dynamodb');
const { formatTask } = require('../lib/response');
const { validateApiKey } = require('../lib/auth');
const { checkRateLimit } = require('../lib/rateLimiter');

/**
 * Lambda handler for retrieving a task by ID
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

    // Retrieve task from DynamoDB
    const task = await getTask(taskId);

    if (!task) {
      return error(404, 'Task not found');
    }

    // Format and return task
    const formattedTask = formatTask(task);
    return success(200, formattedTask);
  } catch (err) {
    console.error('Error retrieving task:', err);
    return error(500, 'Internal server error: retrieving task');
  }
};

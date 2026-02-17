const { error, success } = require('../lib/response');
const { getTask } = require('../lib/dynamodb');
const { formatTask } = require('../lib/response');
const { validateApiKey } = require('../lib/auth');
const { validateTaskId } = require('../lib/validation');

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

  try {
    // Extract task ID from path parameters with null safety
    const taskId = event.pathParameters?.id;
    
    // Validate task ID
    const taskIdError = validateTaskId(taskId);
    if (taskIdError) {
      return error(400, taskIdError);
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

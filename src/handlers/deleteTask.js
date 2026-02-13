const { error } = require('../lib/response');
const { getTask, deleteTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');
const {
  TASK_NOT_FOUND,
  TASK_ID_REQUIRED,
  INTERNAL_ERROR_DELETING_TASK
} = require('../lib/errors');

/**
 * Lambda handler for deleting a task
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 *   - 204: Empty body - Task successfully deleted
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

    // Check if task exists
    const existingTask = await getTask(taskId);
    if (!existingTask) {
      return error(404, TASK_NOT_FOUND);
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
    return error(500, INTERNAL_ERROR_DELETING_TASK);
  }
};

const { error, success, formatTask } = require('../lib/response');
const { getTask, putTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for restoring an archived task
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

    // Check if task is archived
    if (existingTask.status !== 'archived') {
      return error(409, 'Task is not archived');
    }

    // Restore task by setting status back to 'open'
    const restoredTask = {
      ...existingTask,
      status: 'open',
      updatedAt: new Date().toISOString()
    };

    await putTask(restoredTask);

    // Return the restored task
    const formattedTask = formatTask(restoredTask);
    return success(200, formattedTask);
  } catch (err) {
    console.error('Error restoring task:', err);
    return error(500, 'Internal server error: restoring task');
  }
};

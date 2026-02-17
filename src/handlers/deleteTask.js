const { error, success, formatTask } = require('../lib/response');
const { getTask, putTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for archiving a task (soft delete)
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

    // Check if task is already archived
    if (existingTask.status === 'archived') {
      return error(409, 'Task is already archived');
    }

    // Archive task by setting status to 'archived'
    const archivedTask = {
      ...existingTask,
      status: 'archived',
      updatedAt: new Date().toISOString()
    };

    await putTask(archivedTask);

    // Return the archived task
    return success(200, formatTask(archivedTask));
  } catch (err) {
    console.error('Error archiving task:', err);
    return error(500, 'Internal server error: archiving task');
  }
};

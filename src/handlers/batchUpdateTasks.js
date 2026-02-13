const { error, success, formatTask } = require('../lib/response');
const { getTask, putTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');
const { VALID_STATUSES } = require('../lib/validation');

const MAX_BATCH_SIZE = 25;

/**
 * Lambda handler for batch updating task statuses
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
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return error(400, 'Invalid JSON in request body');
    }

    const { taskIds, status } = requestBody;

    // Validate taskIds array
    const taskIdsError = validateTaskIds(taskIds);
    if (taskIdsError) {
      return error(400, taskIdsError);
    }

    // Validate status
    const statusError = validateBatchStatus(status);
    if (statusError) {
      return error(400, statusError);
    }

    // Fetch all tasks to verify they exist (atomic check)
    const existingTasks = [];
    for (const taskId of taskIds) {
      const task = await getTask(taskId);
      if (!task) {
        return error(404, `Task not found: ${taskId}`);
      }
      existingTasks.push(task);
    }

    // Update all tasks with new status
    const now = new Date().toISOString();
    const updatedTasks = [];

    for (const task of existingTasks) {
      const updatedTask = {
        ...task,
        status,
        updatedAt: now
      };
      await putTask(updatedTask);
      updatedTasks.push(formatTask(updatedTask));
    }

    return success(200, {
      updated: updatedTasks.length,
      tasks: updatedTasks
    });
  } catch (err) {
    console.error('Error batch updating tasks:', err);
    return error(500, 'Internal server error: batch updating tasks');
  }
};

/**
 * Validates taskIds array
 * @param {Array} taskIds - Array of task IDs to validate
 * @returns {string|null} Error message or null if valid
 */
function validateTaskIds(taskIds) {
  if (!Array.isArray(taskIds)) {
    return 'taskIds must be an array';
  }

  if (taskIds.length === 0) {
    return 'taskIds array cannot be empty';
  }

  if (taskIds.length > MAX_BATCH_SIZE) {
    return `taskIds array cannot exceed ${MAX_BATCH_SIZE} items`;
  }

  for (const id of taskIds) {
    if (typeof id !== 'string' || id.trim() === '') {
      return 'Each taskId must be a non-empty string';
    }
  }

  return null;
}

/**
 * Validates status for batch update
 * @param {string} status - Status value to validate
 * @returns {string|null} Error message or null if valid
 */
function validateBatchStatus(status) {
  if (status === undefined || status === null) {
    return 'status is required';
  }

  if (typeof status !== 'string') {
    return 'status must be a string';
  }

  if (!VALID_STATUSES.includes(status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  return null;
}

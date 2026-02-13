const { validateTaskInput } = require('../lib/validation');
const { error, success, formatTask } = require('../lib/response');
const { getTask, putTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');
const {
  INVALID_JSON,
  TASK_NOT_FOUND,
  TASK_ID_REQUIRED,
  INTERNAL_ERROR_UPDATING_TASK
} = require('../lib/errors');

/**
 * @typedef {import('../lib/validation').TaskStatus} TaskStatus
 * @typedef {import('../lib/validation').TaskPriority} TaskPriority
 */

/**
 * Lambda handler for updating a task
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 *   - 200: { id: string, description: string, assignee: string|null, priority: TaskPriority, status: TaskStatus, dueDate: string|null, createdAt: string, updatedAt: string }
 *   - 400: { error: string } - Missing task ID, invalid JSON, or validation errors
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

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return error(400, INVALID_JSON);
    }

    // Check if task exists
    const existingTask = await getTask(taskId);
    if (!existingTask) {
      return error(404, TASK_NOT_FOUND);
    }

    // Validate update data (description not required for updates)
    const dataToValidate = {
      description: requestBody.description !== undefined ? requestBody.description : existingTask.description,
      ...requestBody
    };
    
    const validation = validateTaskInput(dataToValidate);
    if (!validation.valid) {
      return error(400, validation.errors.join(', '));
    }

    // Build updated task (preserve immutable fields)
    const updatedTask = {
      ...existingTask,
      id: existingTask.id, // Immutable
      createdAt: existingTask.createdAt, // Immutable
      updatedAt: new Date().toISOString() // Auto-update
    };

    // Apply updates for mutable fields only
    if (requestBody.description !== undefined) {
      updatedTask.description = requestBody.description;
    }
    if (requestBody.assignee !== undefined) {
      updatedTask.assignee = requestBody.assignee;
    }
    if (requestBody.priority !== undefined) {
      updatedTask.priority = /** @type {TaskPriority} */ (requestBody.priority);
    }
    if (requestBody.status !== undefined) {
      updatedTask.status = /** @type {TaskStatus} */ (requestBody.status);
    }
    if (requestBody.dueDate !== undefined) {
      updatedTask.dueDate = requestBody.dueDate;
    }

    // Persist to DynamoDB
    await putTask(updatedTask);

    // Return updated task
    const formattedTask = formatTask(updatedTask);
    return success(200, formattedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    return error(500, INTERNAL_ERROR_UPDATING_TASK);
  }
};

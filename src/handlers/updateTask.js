const { validateTaskInput, validateTaskId } = require('../lib/validation');
const { error, success, formatTask } = require('../lib/response');
const { getTask, putTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for updating a task
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

    // Parse request body
    let requestBody;
    try {
      const bodyString = event.body;
      if (bodyString === null || bodyString === undefined) {
        requestBody = {};
      } else if (typeof bodyString !== 'string') {
        return error(400, 'Request body must be a string');
      } else {
        requestBody = JSON.parse(bodyString || '{}');
      }
    } catch (parseError) {
      return error(400, 'Invalid JSON in request body');
    }

    // Check if task exists
    const existingTask = await getTask(taskId);
    if (!existingTask) {
      return error(404, 'Task not found');
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
      updatedTask.priority = requestBody.priority;
    }
    if (requestBody.status !== undefined) {
      updatedTask.status = requestBody.status;
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
    return error(500, 'Internal server error: updating task');
  }
};

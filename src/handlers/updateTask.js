const { 
  validateTaskInput, 
  stripHtmlTags, 
  sanitizeStringFields, 
  containsPrototypePollutionKeys,
  validateRequestBodySize 
} = require('../lib/validation');
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
    // Extract task ID from path parameters
    const taskId = event.pathParameters?.id;
    
    if (!taskId) {
      return error(400, 'Task ID is required');
    }

    // Check request body size limit
    const bodySizeError = validateRequestBodySize(event.body);
    if (bodySizeError) {
      return error(413, bodySizeError);
    }

    // Check for prototype pollution attempts in raw JSON before parsing
    if (containsPrototypePollutionKeys(event.body)) {
      return error(400, 'Invalid request body: potentially unsafe object keys detected');
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return error(400, 'Invalid JSON in request body');
    }

    // Sanitize string fields (remove control characters)
    requestBody = sanitizeStringFields(requestBody);

    // Sanitize description field (strip HTML tags)
    if (requestBody.description !== undefined && requestBody.description !== null) {
      requestBody.description = stripHtmlTags(requestBody.description);
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

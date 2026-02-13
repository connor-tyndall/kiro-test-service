const { v4: uuidv4 } = require('uuid');
const { 
  validateTaskInput, 
  stripHtmlTags, 
  sanitizeStringFields, 
  containsPrototypePollutionKeys,
  validateRequestBodySize 
} = require('../lib/validation');
const { success, error } = require('../lib/response');
const { putTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for creating a new task
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

    // Validate input
    const validation = validateTaskInput(requestBody);
    if (!validation.valid) {
      return error(400, validation.errors.join(', '));
    }

    // Generate unique ID and timestamps
    const now = new Date().toISOString();
    const task = {
      id: uuidv4(),
      description: requestBody.description,
      assignee: requestBody.assignee || null,
      priority: requestBody.priority || 'P2',
      status: requestBody.status || 'open',
      dueDate: requestBody.dueDate || null,
      createdAt: now,
      updatedAt: now
    };

    // Persist to DynamoDB
    await putTask(task);

    // Return created task
    return success(201, task);
  } catch (err) {
    console.error('Error creating task:', err);
    return error(500, 'Internal server error: creating task');
  }
};

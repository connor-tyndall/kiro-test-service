const { v4: uuidv4 } = require('uuid');
const { validateTaskInput } = require('../lib/validation');
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
    // Parse request body with enhanced edge case handling
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

    // Ensure requestBody is an object
    if (typeof requestBody !== 'object' || requestBody === null || Array.isArray(requestBody)) {
      return error(400, 'Request body must be a JSON object');
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

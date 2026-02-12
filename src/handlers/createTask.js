const { v4: uuidv4 } = require('uuid');
const { validateTaskInput } = require('../lib/validation');
const { success, error } = require('../lib/response');
const { putTask } = require('../lib/dynamodb');

/**
 * Lambda handler for creating a new task
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 */
exports.handler = async (event) => {
  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return error(400, 'Invalid JSON in request body');
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
    return error(503, 'Service temporarily unavailable');
  }
};

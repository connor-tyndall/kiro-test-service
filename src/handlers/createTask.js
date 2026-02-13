const { v4: uuidv4 } = require('uuid');
const { validateTaskInput } = require('../lib/validation');
const { success, error } = require('../lib/response');
const { putTask } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');
const {
  INVALID_JSON,
  INTERNAL_ERROR_CREATING_TASK
} = require('../lib/errors');

/**
 * @typedef {import('../lib/validation').TaskStatus} TaskStatus
 * @typedef {import('../lib/validation').TaskPriority} TaskPriority
 */

/**
 * Lambda handler for creating a new task
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 *   - 201: { id: string, description: string, assignee: string|null, priority: TaskPriority, status: TaskStatus, dueDate: string|null, createdAt: string, updatedAt: string }
 *   - 400: { error: string } - Invalid JSON or validation errors
 *   - 401: { error: string } - Missing or invalid API key
 *   - 500: { error: string } - Internal server error
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
      return error(400, INVALID_JSON);
    }

    // Validate input
    const validation = validateTaskInput(requestBody);
    if (!validation.valid) {
      return error(400, validation.errors.join(', '));
    }

    // Generate unique ID and timestamps
    const now = new Date().toISOString();
    /** @type {{ id: string, description: string, assignee: string|null, priority: TaskPriority, status: TaskStatus, dueDate: string|null, createdAt: string, updatedAt: string }} */
    const task = {
      id: uuidv4(),
      description: requestBody.description,
      assignee: requestBody.assignee || null,
      priority: /** @type {TaskPriority} */ (requestBody.priority || 'P2'),
      status: /** @type {TaskStatus} */ (requestBody.status || 'open'),
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
    return error(500, INTERNAL_ERROR_CREATING_TASK);
  }
};

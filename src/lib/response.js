/**
 * Creates a success response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} Lambda response object
 */
function success(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Creates an error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @returns {Object} Lambda response object
 */
function error(statusCode, message) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: message
    })
  };
}

/**
 * Creates a rate limit exceeded response with Retry-After header
 * @param {number} retryAfter - Seconds until the client can retry
 * @returns {Object} Lambda response object with 429 status
 */
function rateLimitExceeded(retryAfter) {
  return {
    statusCode: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter)
    },
    body: JSON.stringify({
      error: 'Rate limit exceeded'
    })
  };
}

/**
 * Formats a DynamoDB item to API task format
 * @param {Object} taskItem - DynamoDB item
 * @returns {Object} Formatted task object
 */
function formatTask(taskItem) {
  if (!taskItem) {
    return null;
  }

  return {
    id: taskItem.id,
    description: taskItem.description,
    assignee: taskItem.assignee || null,
    priority: taskItem.priority,
    status: taskItem.status,
    dueDate: taskItem.dueDate || null,
    createdAt: taskItem.createdAt,
    updatedAt: taskItem.updatedAt
  };
}

module.exports = {
  success,
  error,
  rateLimitExceeded,
  formatTask
};

/**
 * Creates a success response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @param {string} [requestId] - Optional request ID for x-request-id header
 * @returns {Object} Lambda response object
 */
function success(statusCode, body, requestId) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (requestId) {
    headers['x-request-id'] = requestId;
  }
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

/**
 * Creates an error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} [requestId] - Optional request ID for x-request-id header and response body
 * @returns {Object} Lambda response object
 */
function error(statusCode, message, requestId) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (requestId) {
    headers['x-request-id'] = requestId;
  }
  const responseBody = {
    error: message
  };
  if (requestId) {
    responseBody.requestId = requestId;
  }
  return {
    statusCode,
    headers,
    body: JSON.stringify(responseBody)
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
  formatTask
};

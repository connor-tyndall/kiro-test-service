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
    tags: taskItem.tags || [],
    createdAt: taskItem.createdAt,
    updatedAt: taskItem.updatedAt
  };
}

module.exports = {
  success,
  error,
  formatTask
};

const { error, success } = require('../lib/response');
const { getTaskStats } = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for retrieving task statistics
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response with task stats
 */
exports.handler = async (event) => {
  // Validate API key
  const authError = validateApiKey(event);
  if (authError) {
    return authError;
  }

  try {
    // Extract optional assignee filter from query parameters
    const queryParams = event.queryStringParameters || {};
    const { assignee } = queryParams;

    // Get task statistics from DynamoDB (convert empty string to null)
    const stats = await getTaskStats(assignee || null);

    return success(200, stats);
  } catch (err) {
    console.error('Error getting task stats:', err);
    return error(500, 'Internal server error: getting task stats');
  }
};

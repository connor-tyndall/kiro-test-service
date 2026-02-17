// Health check endpoint - no auth required
const { success } = require('../lib/response');

/**
 * Health check handler
 * @param {Object} event - API Gateway event
 * @returns {Object} API Gateway response
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'UNKNOWN';

  return success(200, {
    status: 'healthy',
    timestamp: new Date().toISOString()
  }, requestId);
};

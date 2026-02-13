// Health check endpoint - no auth required
const { success } = require('../lib/response');
const { withLogging } = require('../lib/logger');

/**
 * Health check handler
 * @param {Object} event - API Gateway event
 * @returns {Object} API Gateway response
 */
const healthHandler = async (event) => {
  return success(200, {
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
};

exports.handler = withLogging(healthHandler);

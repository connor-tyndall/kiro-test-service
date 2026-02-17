const { error } = require('./response');

/**
 * Validates API key from request headers
 * @param {Object} event - Lambda event object
 * @param {string} [requestId] - Optional request ID for error responses
 * @returns {Object|null} Error response if invalid, null if valid
 */
function validateApiKey(event, requestId) {
  const apiKey = event?.headers?.['x-api-key'] || event?.headers?.['X-Api-Key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    console.error(`[${requestId || 'UNKNOWN'}] API_KEY environment variable not configured`);
    return error(500, 'Internal server error', requestId);
  }

  if (!apiKey) {
    return error(401, 'Missing API key', requestId);
  }

  if (apiKey !== expectedKey) {
    return error(401, 'Invalid API key', requestId);
  }

  return null;
}

module.exports = {
  validateApiKey
};

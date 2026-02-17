const { error } = require('./response');

/**
 * Validates API key from request headers
 * @param {Object} event - Lambda event object
 * @returns {Object|null} Error response if invalid, null if valid
 */
function validateApiKey(event) {
  // Handle null/undefined event
  if (!event) {
    return error(400, 'Invalid request: missing event');
  }

  // Handle missing or invalid headers object
  if (!event.headers || typeof event.headers !== 'object') {
    return error(401, 'Missing API key');
  }

  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    console.error('API_KEY environment variable not configured');
    return error(500, 'Internal server error');
  }

  if (!apiKey) {
    return error(401, 'Missing API key');
  }

  if (apiKey !== expectedKey) {
    return error(401, 'Invalid API key');
  }

  return null;
}

module.exports = {
  validateApiKey
};

/**
 * Creates a logging middleware wrapper for Lambda handlers
 * @param {Function} handler - The Lambda handler function to wrap
 * @returns {Function} Wrapped handler that logs requests and responses
 */
function withLogging(handler) {
  return async (event, context) => {
    const timestamp = new Date().toISOString();
    const method = event.httpMethod || event.requestContext?.http?.method || 'UNKNOWN';
    const path = event.path || event.rawPath || 'UNKNOWN';

    const response = await handler(event, context);

    const logEntry = {
      timestamp,
      method,
      path,
      statusCode: response.statusCode
    };

    process.stdout.write(JSON.stringify(logEntry) + '\n');

    return response;
  };
}

module.exports = {
  withLogging
};

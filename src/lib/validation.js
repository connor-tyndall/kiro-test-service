const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'];
const VALID_STATUSES = ['open', 'in-progress', 'blocked', 'done'];
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ASSIGNEE_LENGTH = 255;
const MAX_REQUEST_BODY_SIZE = 10240; // 10KB

/**
 * Strips or escapes HTML tags and potentially dangerous script content from a string
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string with HTML tags stripped
 */
function stripHtmlTags(str) {
  if (typeof str !== 'string') {
    return str;
  }

  let result = str;

  // Remove script tags and their content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove various dangerous tags and patterns
  // img tags with onerror, onload, or javascript: src
  result = result.replace(/<img[^>]*(?:onerror|onload|src\s*=\s*["']?\s*javascript:)[^>]*>/gi, '');

  // Remove event handlers from any remaining tags
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  result = result.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: URLs in href attributes
  result = result.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href=""');

  // Strip remaining HTML tags (but preserve content)
  result = result.replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, '');

  // Remove any remaining HTML entities that could be used for encoding attacks
  result = result.replace(/&#x?[0-9a-f]+;?/gi, '');

  return result;
}

/**
 * Strips ASCII control characters from a string, preserving newlines (0x0A)
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string with control characters removed
 */
function stripControlCharacters(str) {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove control characters 0x00-0x1F except 0x0A (newline)
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x09\x0B-\x1F]/g, '');
}

/**
 * Sanitizes all string fields in an object by stripping control characters
 * @param {Object} obj - The object to sanitize
 * @returns {Object} The sanitized object
 */
function sanitizeStringFields(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = stripControlCharacters(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeStringFields(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Checks if a parsed object contains prototype pollution attempts
 * @param {any} obj - The object to check
 * @param {Set} visited - Set of visited objects to prevent circular reference issues
 * @returns {boolean} True if prototype pollution attempt detected
 */
function hasPrototypePollution(obj, visited = new Set()) {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  // Prevent circular reference infinite loops
  if (visited.has(obj)) {
    return false;
  }
  visited.add(obj);

  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  // Use Object.getOwnPropertyNames to get all properties including non-enumerable ones
  const keys = Object.getOwnPropertyNames(obj);
  
  for (const key of keys) {
    if (dangerousKeys.includes(key)) {
      return true;
    }

    // Recursively check nested objects and arrays
    try {
      const value = obj[key];
      if (value !== null && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (hasPrototypePollution(item, visited)) {
              return true;
            }
          }
        } else if (hasPrototypePollution(value, visited)) {
          return true;
        }
      }
    } catch (e) {
      // Skip any properties that throw when accessed
    }
  }

  return false;
}

/**
 * Checks if a JSON string contains prototype pollution attempts before parsing
 * @param {string} jsonString - The raw JSON string to check
 * @returns {boolean} True if prototype pollution attempt detected
 */
function containsPrototypePollutionKeys(jsonString) {
  if (typeof jsonString !== 'string') {
    return false;
  }

  // Check for dangerous keys in the raw JSON string
  const dangerousPatterns = [
    /"__proto__"\s*:/i,
    /"constructor"\s*:/i,
    /"prototype"\s*:/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(jsonString)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates request body size against maximum allowed size
 * @param {string} body - The raw request body string
 * @returns {string|null} Error message if body exceeds limit, null otherwise
 */
function validateRequestBodySize(body) {
  if (body === null || body === undefined) {
    return null;
  }

  const bodyLength = Buffer.byteLength(body, 'utf8');
  if (bodyLength > MAX_REQUEST_BODY_SIZE) {
    return `Request body exceeds maximum allowed size of ${MAX_REQUEST_BODY_SIZE} bytes`;
  }

  return null;
}

/**
 * Validates task input data
 * @param {Object} data - Task data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateTaskInput(data) {
  const errors = [];

  // Validate description
  const descError = validateDescription(data.description);
  if (descError) {
    errors.push(descError);
  }

  // Validate priority if provided
  if (data.priority !== undefined && data.priority !== null) {
    const priorityError = validatePriority(data.priority);
    if (priorityError) {
      errors.push(priorityError);
    }
  }

  // Validate status if provided
  if (data.status !== undefined && data.status !== null) {
    const statusError = validateStatus(data.status);
    if (statusError) {
      errors.push(statusError);
    }
  }

  // Validate dueDate if provided
  if (data.dueDate !== undefined && data.dueDate !== null) {
    const dateError = validateDateFormat(data.dueDate);
    if (dateError) {
      errors.push(dateError);
    }
  }

  // Validate assignee if provided
  if (data.assignee !== undefined && data.assignee !== null) {
    const assigneeError = validateAssignee(data.assignee);
    if (assigneeError) {
      errors.push(assigneeError);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates priority value
 * @param {string} priority - Priority to validate
 * @returns {string|null} Error message or null if valid
 */
function validatePriority(priority) {
  if (!VALID_PRIORITIES.includes(priority)) {
    return `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  return null;
}

/**
 * Validates status value
 * @param {string} status - Status to validate
 * @returns {string|null} Error message or null if valid
 */
function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    return `Status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  return null;
}

/**
 * Validates ISO 8601 date format
 * @param {string} date - Date string to validate
 * @returns {string|null} Error message or null if valid
 */
function validateDateFormat(date) {
  if (typeof date !== 'string') {
    return 'Date must be a string';
  }

  // ISO 8601 date format regex (YYYY-MM-DD or full timestamp)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  
  if (!iso8601Regex.test(date)) {
    return 'Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)';
  }

  // Validate that it's a valid date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return 'Invalid date value';
  }

  // Check if the date string matches the parsed date (prevents rollover like 2024-02-30)
  const isoString = parsedDate.toISOString();
  const datePrefix = date.includes('T') ? date.split('T')[0] : date;
  const parsedPrefix = isoString.split('T')[0];
  
  if (datePrefix !== parsedPrefix) {
    return 'Invalid date value';
  }

  return null;
}

/**
 * Validates description field
 * @param {string} description - Description to validate
 * @returns {string|null} Error message or null if valid
 */
function validateDescription(description) {
  if (description === undefined || description === null) {
    return 'Description is required';
  }

  if (typeof description !== 'string') {
    return 'Description must be a string';
  }

  if (description.trim().length === 0) {
    return 'Description cannot be empty or whitespace only';
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }

  return null;
}

/**
 * Validates assignee field (email format)
 * @param {string} assignee - Assignee email to validate
 * @returns {string|null} Error message or null if valid
 */
function validateAssignee(assignee) {
  if (typeof assignee !== 'string') {
    return 'Assignee must be a string';
  }

  if (assignee.length > MAX_ASSIGNEE_LENGTH) {
    return `Assignee must not exceed ${MAX_ASSIGNEE_LENGTH} characters`;
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(assignee)) {
    return 'Assignee must be a valid email address';
  }

  return null;
}

/**
 * Validates pagination limit parameter
 * @param {string|number} limit - Limit value to validate
 * @returns {string|null} Error message or null if valid
 */
function validateLimit(limit) {
  const numLimit = Number(limit);
  
  if (isNaN(numLimit)) {
    return 'Limit must be a number';
  }
  
  if (!Number.isInteger(numLimit)) {
    return 'Limit must be an integer';
  }
  
  if (numLimit < 1) {
    return 'Limit must be at least 1';
  }
  
  if (numLimit > 100) {
    return 'Limit must not exceed 100';
  }
  
  return null;
}

/**
 * Validates pagination nextToken parameter
 * @param {string} nextToken - Base64-encoded pagination token to validate
 * @returns {string|null} Error message or null if valid
 */
function validateNextToken(nextToken) {
  if (typeof nextToken !== 'string') {
    return 'Invalid nextToken parameter';
  }

  if (nextToken.trim().length === 0) {
    return 'Invalid nextToken parameter';
  }

  try {
    const decoded = Buffer.from(nextToken, 'base64').toString();
    
    // Check if the input is valid base64 by re-encoding and comparing
    const reEncoded = Buffer.from(decoded).toString('base64');
    if (reEncoded !== nextToken) {
      return 'Invalid nextToken parameter';
    }

    // Try to parse as JSON
    JSON.parse(decoded);
    
    return null;
  } catch (err) {
    return 'Invalid nextToken parameter';
  }
}

module.exports = {
  validateTaskInput,
  validatePriority,
  validateStatus,
  validateDateFormat,
  validateDescription,
  validateAssignee,
  validateLimit,
  validateNextToken,
  stripHtmlTags,
  stripControlCharacters,
  sanitizeStringFields,
  hasPrototypePollution,
  containsPrototypePollutionKeys,
  validateRequestBodySize,
  VALID_PRIORITIES,
  VALID_STATUSES,
  MAX_REQUEST_BODY_SIZE
};

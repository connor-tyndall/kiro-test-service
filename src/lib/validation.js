/**
 * @typedef {'open' | 'in-progress' | 'blocked' | 'done'} TaskStatus
 */

/**
 * @typedef {'P0' | 'P1' | 'P2' | 'P3' | 'P4'} TaskPriority
 */

const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'];
const VALID_STATUSES = ['open', 'in-progress', 'blocked', 'done'];
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ASSIGNEE_LENGTH = 255;

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
  VALID_PRIORITIES,
  VALID_STATUSES
};

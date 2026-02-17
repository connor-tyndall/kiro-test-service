const { error, success, formatTask } = require('../lib/response');
const { validatePriority, validateStatus, validateDateFormat, validateLimit, validateNextToken, validateQueryStringParameters } = require('../lib/validation');
const { 
  scanTasks, 
  queryTasksByAssignee, 
  queryTasksByStatus, 
  queryTasksByPriority 
} = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Lambda handler for listing and filtering tasks
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 */
exports.handler = async (event) => {
  // Validate API key
  const authError = validateApiKey(event);
  if (authError) {
    return authError;
  }

  try {
    // Validate and sanitize query parameters
    const rawQueryParams = event.queryStringParameters;
    const { sanitized: queryParams, errors: queryParamErrors } = validateQueryStringParameters(rawQueryParams);
    
    if (queryParamErrors.length > 0) {
      return error(400, queryParamErrors.join(', '));
    }

    const { assignee, priority, status, dueDateBefore, limit, nextToken } = queryParams;

    // Validate filter parameters
    if (priority && validatePriority(priority)) {
      return error(400, validatePriority(priority));
    }
    if (status && validateStatus(status)) {
      return error(400, validateStatus(status));
    }
    if (dueDateBefore && validateDateFormat(dueDateBefore)) {
      return error(400, validateDateFormat(dueDateBefore));
    }

    // Validate assignee - reject empty or whitespace-only values
    if (assignee !== undefined && assignee !== null) {
      if (typeof assignee === 'string' && assignee.trim().length === 0) {
        return error(400, 'Assignee filter cannot be empty');
      }
    }

    // Validate and parse limit
    const parsedLimit = limit ? Number(limit) : 20;
    if (limit) {
      const limitError = validateLimit(limit);
      if (limitError) {
        return error(400, limitError);
      }
    }

    // Validate nextToken parameter - check for empty or whitespace-only values
    if (nextToken !== undefined && nextToken !== null) {
      if (typeof nextToken === 'string' && nextToken.trim().length === 0) {
        return error(400, 'Invalid nextToken parameter');
      }
      const nextTokenError = validateNextToken(nextToken);
      if (nextTokenError) {
        return error(400, nextTokenError);
      }
    }

    let result;

    // Determine which query strategy to use based on filters
    const filterCount = [assignee, priority, status].filter(f => f).length;

    if (filterCount === 0) {
      // No filters - scan all tasks
      result = await scanTasks(parsedLimit, nextToken);
    } else if (filterCount === 1) {
      // Single filter - use appropriate GSI
      if (assignee) {
        result = await queryTasksByAssignee(assignee, parsedLimit, nextToken);
      } else if (status) {
        result = await queryTasksByStatus(status, parsedLimit, nextToken);
      } else if (priority) {
        result = await queryTasksByPriority(priority, parsedLimit, nextToken);
      }
    } else {
      // Multiple filters - use most selective GSI and filter in code
      // Priority: assignee > status > priority (assignee typically most selective)
      if (assignee) {
        result = await queryTasksByAssignee(assignee, parsedLimit, nextToken);
        
        // Apply additional filters in code
        if (status) {
          result.items = result.items.filter(task => task.status === status);
        }
        if (priority) {
          result.items = result.items.filter(task => task.priority === priority);
        }
      } else if (status) {
        result = await queryTasksByStatus(status, parsedLimit, nextToken);
        
        // Apply priority filter in code
        if (priority) {
          result.items = result.items.filter(task => task.priority === priority);
        }
      } else {
        // Only priority filter remains
        result = await queryTasksByPriority(priority, parsedLimit, nextToken);
      }
    }

    // Handle edge case where result is null/undefined
    if (!result || !result.items) {
      result = { items: [], nextToken: null };
    }

    // Apply due date filter in application code
    if (dueDateBefore) {
      const filterDate = new Date(dueDateBefore);
      result.items = result.items.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate <= filterDate;
      });
    }

    // Format tasks
    const formattedTasks = result.items.map(task => formatTask(task));

    // Build response
    const responseBody = { tasks: formattedTasks };
    if (result.nextToken) {
      responseBody.nextToken = result.nextToken;
    }

    return success(200, responseBody);
  } catch (err) {
    console.error('Error listing tasks:', err);
    return error(500, 'Internal server error: listing tasks');
  }
};

const { error, success, formatTask } = require('../lib/response');
const { validatePriority, validateStatus, validateDateFormat, validateLimit, validateNextToken } = require('../lib/validation');
const { 
  scanTasks, 
  queryTasksByAssignee, 
  queryTasksByStatus, 
  queryTasksByPriority 
} = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');
const { INTERNAL_ERROR_LISTING_TASKS } = require('../lib/errors');

/**
 * @typedef {import('../lib/validation').TaskStatus} TaskStatus
 * @typedef {import('../lib/validation').TaskPriority} TaskPriority
 */

/**
 * Lambda handler for listing and filtering tasks
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 *   - 200: { tasks: Array<{ id: string, description: string, assignee: string|null, priority: TaskPriority, status: TaskStatus, dueDate: string|null, createdAt: string, updatedAt: string }>, nextToken?: string }
 *   - 400: { error: string } - Invalid filter parameters (priority, status, dueDateBefore, limit, nextToken)
 *   - 401: { error: string } - Missing or invalid API key
 *   - 500: { error: string } - Internal server error
 */
exports.handler = async (event) => {
  // Validate API key
  const authError = validateApiKey(event);
  if (authError) {
    return authError;
  }

  try {
    // Extract query parameters
    const queryParams = event.queryStringParameters || {};
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

    // Validate and parse limit
    const parsedLimit = limit ? Number(limit) : 20;
    if (limit) {
      const limitError = validateLimit(limit);
      if (limitError) {
        return error(400, limitError);
      }
    }

    // Validate nextToken parameter
    if (nextToken) {
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
        result = await queryTasksByStatus(/** @type {TaskStatus} */ (status), parsedLimit, nextToken);
      } else if (priority) {
        result = await queryTasksByPriority(/** @type {TaskPriority} */ (priority), parsedLimit, nextToken);
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
        result = await queryTasksByStatus(/** @type {TaskStatus} */ (status), parsedLimit, nextToken);
        
        // Apply priority filter in code
        if (priority) {
          result.items = result.items.filter(task => task.priority === priority);
        }
      } else {
        // Only priority filter remains
        result = await queryTasksByPriority(/** @type {TaskPriority} */ (priority), parsedLimit, nextToken);
      }
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
    return error(500, INTERNAL_ERROR_LISTING_TASKS);
  }
};

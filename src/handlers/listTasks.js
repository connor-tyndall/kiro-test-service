const { error, success, formatTask } = require('../lib/response');
const { validatePriority, validateStatus, validateDateFormat, validateLimit, validateNextToken } = require('../lib/validation');
const { 
  scanTasks, 
  queryTasksByAssignee, 
  queryTasksByStatus, 
  queryTasksByPriority 
} = require('../lib/dynamodb');
const { validateApiKey } = require('../lib/auth');

/**
 * Accumulates filtered results from DynamoDB until the limit is reached or no more items
 * @param {Function} queryFn - DynamoDB query function to call
 * @param {Function} filterFn - Filter function to apply to items
 * @param {number} limit - Target number of items to accumulate
 * @param {string|null} startToken - Initial pagination token
 * @returns {Promise<Object>} Object with items array and nextToken
 */
async function accumulateFilteredResults(queryFn, filterFn, limit, startToken) {
  const accumulatedItems = [];
  let currentToken = startToken;
  let lastProcessedToken = null;
  
  while (accumulatedItems.length < limit) {
    const result = await queryFn(currentToken);
    const filteredBatch = result.items.filter(filterFn);
    
    for (const item of filteredBatch) {
      if (accumulatedItems.length < limit) {
        accumulatedItems.push(item);
      } else {
        break;
      }
    }
    
    lastProcessedToken = result.nextToken;
    
    if (!result.nextToken) {
      break;
    }
    
    currentToken = result.nextToken;
  }
  
  const hasMoreResults = accumulatedItems.length >= limit && lastProcessedToken !== null;
  
  return {
    items: accumulatedItems,
    nextToken: hasMoreResults ? lastProcessedToken : null
  };
}

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
    if (nextToken !== undefined && nextToken !== null) {
      const nextTokenError = validateNextToken(nextToken);
      if (nextTokenError) {
        return error(400, nextTokenError);
      }
    }

    let result;

    // Determine which query strategy to use based on filters
    const filterCount = [assignee, priority, status].filter(f => f).length;
    const needsPostFiltering = filterCount > 1 || dueDateBefore;

    if (filterCount === 0 && !dueDateBefore) {
      // No filters - scan all tasks
      result = await scanTasks(parsedLimit, nextToken);
    } else if (filterCount === 1 && !dueDateBefore) {
      // Single filter without dueDateBefore - use appropriate GSI directly
      if (assignee) {
        result = await queryTasksByAssignee(assignee, parsedLimit, nextToken);
      } else if (status) {
        result = await queryTasksByStatus(status, parsedLimit, nextToken);
      } else if (priority) {
        result = await queryTasksByPriority(priority, parsedLimit, nextToken);
      }
    } else if (needsPostFiltering) {
      // Multiple filters or dueDateBefore - need to accumulate filtered results
      const filterDate = dueDateBefore ? new Date(dueDateBefore) : null;
      
      const buildFilterFn = () => {
        return (task) => {
          if (status && task.status !== status) return false;
          if (priority && task.priority !== priority) return false;
          if (filterDate) {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            if (taskDate > filterDate) return false;
          }
          return true;
        };
      };
      
      const filterFn = buildFilterFn();
      
      if (assignee) {
        const queryFn = (token) => queryTasksByAssignee(assignee, parsedLimit, token);
        result = await accumulateFilteredResults(queryFn, filterFn, parsedLimit, nextToken);
      } else if (status) {
        const queryFn = (token) => queryTasksByStatus(status, parsedLimit, token);
        const statusFilterFn = (task) => {
          if (priority && task.priority !== priority) return false;
          if (filterDate) {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            if (taskDate > filterDate) return false;
          }
          return true;
        };
        result = await accumulateFilteredResults(queryFn, statusFilterFn, parsedLimit, nextToken);
      } else if (priority) {
        const queryFn = (token) => queryTasksByPriority(priority, parsedLimit, token);
        const priorityFilterFn = (task) => {
          if (filterDate) {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            if (taskDate > filterDate) return false;
          }
          return true;
        };
        result = await accumulateFilteredResults(queryFn, priorityFilterFn, parsedLimit, nextToken);
      } else {
        // Only dueDateBefore filter - scan and filter
        const queryFn = (token) => scanTasks(parsedLimit, token);
        const dueDateFilterFn = (task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate <= filterDate;
        };
        result = await accumulateFilteredResults(queryFn, dueDateFilterFn, parsedLimit, nextToken);
      }
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

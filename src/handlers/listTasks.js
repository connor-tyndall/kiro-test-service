const { error, success, formatTask } = require('../lib/response');
const { validatePriority, validateStatus, validateDateFormat } = require('../lib/validation');
const { 
  scanTasks, 
  queryTasksByAssignee, 
  queryTasksByStatus, 
  queryTasksByPriority 
} = require('../lib/dynamodb');

/**
 * Lambda handler for listing and filtering tasks
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 */
exports.handler = async (event) => {
  try {
    // Extract query parameters
    const queryParams = event.queryStringParameters || {};
    const { assignee, priority, status, dueDateBefore } = queryParams;

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

    let tasks = [];

    // Determine which query strategy to use based on filters
    const filterCount = [assignee, priority, status].filter(f => f).length;

    if (filterCount === 0) {
      // No filters - scan all tasks
      tasks = await scanTasks();
    } else if (filterCount === 1) {
      // Single filter - use appropriate GSI
      if (assignee) {
        tasks = await queryTasksByAssignee(assignee);
      } else if (status) {
        tasks = await queryTasksByStatus(status);
      } else if (priority) {
        tasks = await queryTasksByPriority(priority);
      }
    } else {
      // Multiple filters - use most selective GSI and filter in code
      // Priority: assignee > status > priority (assignee typically most selective)
      if (assignee) {
        tasks = await queryTasksByAssignee(assignee);
        
        // Apply additional filters in code
        if (status) {
          tasks = tasks.filter(task => task.status === status);
        }
        if (priority) {
          tasks = tasks.filter(task => task.priority === priority);
        }
      } else if (status) {
        tasks = await queryTasksByStatus(status);
        
        // Apply priority filter in code
        if (priority) {
          tasks = tasks.filter(task => task.priority === priority);
        }
      } else {
        // Only priority filter remains
        tasks = await queryTasksByPriority(priority);
      }
    }

    // Apply due date filter in application code
    if (dueDateBefore) {
      const filterDate = new Date(dueDateBefore);
      tasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate <= filterDate;
      });
    }

    // Format tasks
    const formattedTasks = tasks.map(task => formatTask(task));

    // Return tasks array
    return success(200, { tasks: formattedTasks });
  } catch (err) {
    console.error('Error listing tasks:', err);
    return error(503, 'Service temporarily unavailable');
  }
};

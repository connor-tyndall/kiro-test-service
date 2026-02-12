import { error, success, formatTask } from '../lib/response';
import { validatePriority, validateStatus, validateDateFormat, validateLimit } from '../lib/validation';
import { 
  scanTasks, 
  queryTasksByAssignee, 
  queryTasksByStatus, 
  queryTasksByPriority 
} from '../lib/dynamodb';
import { validateApiKey } from '../lib/auth';
import { APIGatewayEvent, LambdaResponse, QueryResult, TaskItem, FormattedTask } from '../types';

/**
 * Lambda handler for listing and filtering tasks
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
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
      return error(400, validatePriority(priority)!);
    }
    if (status && validateStatus(status)) {
      return error(400, validateStatus(status)!);
    }
    if (dueDateBefore && validateDateFormat(dueDateBefore)) {
      return error(400, validateDateFormat(dueDateBefore)!);
    }

    // Validate and parse limit
    const parsedLimit = limit ? Number(limit) : 20;
    if (limit) {
      const limitError = validateLimit(limit);
      if (limitError) {
        return error(400, limitError);
      }
    }

    let result: QueryResult;

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
      } else {
        result = { items: [], nextToken: null };
      }
    } else {
      // Multiple filters - use most selective GSI and filter in code
      // Priority: assignee > status > priority (assignee typically most selective)
      if (assignee) {
        result = await queryTasksByAssignee(assignee, parsedLimit, nextToken);
        
        // Apply additional filters in code
        if (status) {
          result.items = result.items.filter((task: TaskItem) => task.status === status);
        }
        if (priority) {
          result.items = result.items.filter((task: TaskItem) => task.priority === priority);
        }
      } else if (status) {
        result = await queryTasksByStatus(status, parsedLimit, nextToken);
        
        // Apply priority filter in code
        if (priority) {
          result.items = result.items.filter((task: TaskItem) => task.priority === priority);
        }
      } else {
        // Only priority filter remains
        result = await queryTasksByPriority(priority!, parsedLimit, nextToken);
      }
    }

    // Apply due date filter in application code
    if (dueDateBefore) {
      const filterDate = new Date(dueDateBefore);
      result.items = result.items.filter((task: TaskItem) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate <= filterDate;
      });
    }

    // Format tasks
    const formattedTasks: FormattedTask[] = result.items
      .map((task: TaskItem) => formatTask(task))
      .filter((task): task is FormattedTask => task !== null);

    // Build response
    const responseBody: { tasks: FormattedTask[]; nextToken?: string } = { tasks: formattedTasks };
    if (result.nextToken) {
      responseBody.nextToken = result.nextToken;
    }

    return success(200, responseBody);
  } catch (err) {
    console.error('Error listing tasks:', err);
    return error(500, 'Internal server error: listing tasks');
  }
};

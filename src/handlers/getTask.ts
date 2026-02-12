import { error, success, formatTask } from '../lib/response';
import { getTask } from '../lib/dynamodb';
import { validateApiKey } from '../lib/auth';
import { APIGatewayEvent, LambdaResponse } from '../types';

/**
 * Lambda handler for retrieving a task by ID
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
    // Extract task ID from path parameters
    const taskId = event.pathParameters?.id;
    
    if (!taskId) {
      return error(400, 'Task ID is required');
    }

    // Retrieve task from DynamoDB
    const task = await getTask(taskId);

    if (!task) {
      return error(404, 'Task not found');
    }

    // Format and return task
    const formattedTask = formatTask(task);
    return success(200, formattedTask!);
  } catch (err) {
    console.error('Error retrieving task:', err);
    return error(503, 'Service temporarily unavailable');
  }
};

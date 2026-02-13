import { validateTaskInput } from '../lib/validation';
import { error, success, formatTask } from '../lib/response';
import { getTask, putTask } from '../lib/dynamodb';
import { validateApiKey } from '../lib/auth';
import { APIGatewayEvent, LambdaResponse, Task, TaskInput, TaskItem, Priority, Status } from '../types';

/**
 * Lambda handler for updating a task
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

    // Parse request body
    let requestBody: TaskInput;
    try {
      requestBody = JSON.parse(event.body || '{}') as TaskInput;
    } catch (_parseError) {
      return error(400, 'Invalid JSON in request body');
    }

    // Check if task exists
    const existingTask = await getTask(taskId);
    if (!existingTask) {
      return error(404, 'Task not found');
    }

    // Validate update data (description not required for updates)
    const dataToValidate: TaskInput = {
      description: requestBody.description !== undefined ? requestBody.description : existingTask.description,
      ...requestBody
    };
    
    const validation = validateTaskInput(dataToValidate);
    if (!validation.valid) {
      return error(400, validation.errors.join(', '));
    }

    // Build updated task (preserve immutable fields)
    const updatedTask: Task = {
      ...existingTask,
      id: existingTask.id, // Immutable
      createdAt: existingTask.createdAt, // Immutable
      updatedAt: new Date().toISOString() // Auto-update
    };

    // Apply updates for mutable fields only
    if (requestBody.description !== undefined) {
      updatedTask.description = requestBody.description as string;
    }
    if (requestBody.assignee !== undefined) {
      updatedTask.assignee = requestBody.assignee;
    }
    if (requestBody.priority !== undefined) {
      updatedTask.priority = requestBody.priority as Priority;
    }
    if (requestBody.status !== undefined) {
      updatedTask.status = requestBody.status as Status;
    }
    if (requestBody.dueDate !== undefined) {
      updatedTask.dueDate = requestBody.dueDate;
    }

    // Persist to DynamoDB
    await putTask(updatedTask);

    // Return updated task
    return success(200, formatTask(updatedTask as TaskItem));
  } catch (err) {
    console.error('Error updating task:', err);
    return error(500, 'Internal server error: updating task');
  }
};

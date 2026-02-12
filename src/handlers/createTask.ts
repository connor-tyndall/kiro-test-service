import { v4 as uuidv4 } from 'uuid';
import { validateTaskInput } from '../lib/validation';
import { success, error } from '../lib/response';
import { putTask } from '../lib/dynamodb';
import { validateApiKey } from '../lib/auth';
import { APIGatewayEvent, LambdaResponse, Task, TaskInput, Priority, Status } from '../types';

/**
 * Lambda handler for creating a new task
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
    // Parse request body
    let requestBody: TaskInput;
    try {
      requestBody = JSON.parse(event.body || '{}') as TaskInput;
    } catch (_parseError) {
      return error(400, 'Invalid JSON in request body');
    }

    // Validate input
    const validation = validateTaskInput(requestBody);
    if (!validation.valid) {
      return error(400, validation.errors.join(', '));
    }

    // Generate unique ID and timestamps
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      description: requestBody.description!,
      assignee: requestBody.assignee || null,
      priority: (requestBody.priority as Priority) || 'P2',
      status: (requestBody.status as Status) || 'open',
      dueDate: requestBody.dueDate || null,
      createdAt: now,
      updatedAt: now
    };

    // Persist to DynamoDB
    await putTask(task);

    // Return created task
    return success(201, task);
  } catch (err) {
    console.error('Error creating task:', err);
    return error(500, 'Internal server error: creating task');
  }
};

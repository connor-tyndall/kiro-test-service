import { v4 as uuidv4 } from 'uuid';
import { validateTaskInput } from '../lib/validation';
import { success, error } from '../lib/response';
import { putTask } from '../lib/dynamodb';
import { validateApiKey } from '../lib/auth';
import { APIGatewayEvent, LambdaResponse, Task, TaskInput, Priority, Status } from '../types';

/**
 * Type guard that validates a parsed value has the expected shape for TaskInput
 * @param value - The value to validate (typically from JSON.parse)
 * @returns True if the value conforms to the TaskInput interface shape
 */
function isValidTaskInputShape(value: unknown): value is TaskInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Validate description: must be string if present
  if ('description' in obj && typeof obj.description !== 'string') {
    return false;
  }

  // Validate assignee: must be string or null if present
  if ('assignee' in obj && obj.assignee !== null && typeof obj.assignee !== 'string') {
    return false;
  }

  // Validate priority: must be string or null if present
  if ('priority' in obj && obj.priority !== null && typeof obj.priority !== 'string') {
    return false;
  }

  // Validate status: must be string or null if present
  if ('status' in obj && obj.status !== null && typeof obj.status !== 'string') {
    return false;
  }

  // Validate dueDate: must be string or null if present
  if ('dueDate' in obj && obj.dueDate !== null && typeof obj.dueDate !== 'string') {
    return false;
  }

  return true;
}

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
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.body || '{}');
    } catch (_parseError) {
      return error(400, 'Invalid JSON in request body');
    }

    // Validate that parsed body has the expected shape for TaskInput
    if (!isValidTaskInputShape(parsed)) {
      return error(400, 'Invalid request body format');
    }

    const requestBody: TaskInput = parsed;

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

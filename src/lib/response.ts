import { LambdaResponse, TaskItem, FormattedTask } from '../types';

/**
 * Creates a success response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns Lambda response object
 */
export function success(statusCode: number, body: object): LambdaResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Creates an error response
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @returns Lambda response object
 */
export function error(statusCode: number, message: string): LambdaResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: message
    })
  };
}

/**
 * Formats a DynamoDB item to API task format
 * @param taskItem - DynamoDB item
 * @returns Formatted task object
 */
export function formatTask(taskItem: TaskItem | null | undefined): FormattedTask | null {
  if (!taskItem) {
    return null;
  }

  return {
    id: taskItem.id,
    description: taskItem.description,
    assignee: taskItem.assignee || null,
    priority: taskItem.priority,
    status: taskItem.status,
    dueDate: taskItem.dueDate || null,
    createdAt: taskItem.createdAt,
    updatedAt: taskItem.updatedAt
  };
}

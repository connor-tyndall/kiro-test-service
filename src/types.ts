/**
 * Task entity representing an engineering task
 */
export interface Task {
  id: string;
  description: string;
  assignee: string | null;
  priority: Priority;
  status: Status;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DynamoDB task item with partition and sort keys
 */
export interface TaskItem extends Task {
  PK: string;
  SK: string;
}

/**
 * Valid priority values
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

/**
 * Valid status values
 */
export type Status = 'open' | 'in-progress' | 'blocked' | 'done';

/**
 * Task input data for create/update operations
 */
export interface TaskInput {
  description?: string;
  assignee?: string | null;
  priority?: string | null;
  status?: string | null;
  dueDate?: string | null;
}

/**
 * Validation result from input validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Lambda API Gateway response
 */
export interface LambdaResponse {
  statusCode: number;
  headers: {
    'Content-Type': string;
  };
  body: string;
}

/**
 * API Gateway event headers
 */
export interface EventHeaders {
  'x-api-key'?: string;
  'X-Api-Key'?: string;
  [key: string]: string | undefined;
}

/**
 * API Gateway path parameters
 */
export interface PathParameters {
  id?: string;
  [key: string]: string | undefined;
}

/**
 * API Gateway query string parameters
 */
export interface QueryStringParameters {
  assignee?: string;
  priority?: string;
  status?: string;
  dueDateBefore?: string;
  limit?: string;
  nextToken?: string;
  [key: string]: string | undefined;
}

/**
 * API Gateway Lambda event
 */
export interface APIGatewayEvent {
  headers?: EventHeaders | null;
  pathParameters?: PathParameters | null;
  queryStringParameters?: QueryStringParameters | null;
  body?: string | null;
}

/**
 * DynamoDB query/scan result
 */
export interface QueryResult {
  items: TaskItem[];
  nextToken: string | null;
}

/**
 * Formatted task for API response (without DynamoDB keys)
 */
export interface FormattedTask {
  id: string;
  description: string;
  assignee: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

import { TaskInput, ValidationResult, Priority, Status } from '../types';

export const VALID_PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3', 'P4'];
export const VALID_STATUSES: Status[] = ['open', 'in-progress', 'blocked', 'done'];
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ASSIGNEE_LENGTH = 255;

/**
 * Validates task input data
 * @param data - Task data to validate
 * @returns Object containing valid flag and array of errors
 */
export function validateTaskInput(data: TaskInput): ValidationResult {
  const errors: string[] = [];

  // Validate description
  const descError = validateDescription(data.description);
  if (descError) {
    errors.push(descError);
  }

  // Validate priority if provided
  if (data.priority !== undefined && data.priority !== null) {
    const priorityError = validatePriority(data.priority);
    if (priorityError) {
      errors.push(priorityError);
    }
  }

  // Validate status if provided
  if (data.status !== undefined && data.status !== null) {
    const statusError = validateStatus(data.status);
    if (statusError) {
      errors.push(statusError);
    }
  }

  // Validate dueDate if provided
  if (data.dueDate !== undefined && data.dueDate !== null) {
    const dateError = validateDateFormat(data.dueDate);
    if (dateError) {
      errors.push(dateError);
    }
  }

  // Validate assignee if provided
  if (data.assignee !== undefined && data.assignee !== null) {
    const assigneeError = validateAssignee(data.assignee);
    if (assigneeError) {
      errors.push(assigneeError);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates priority value
 * @param priority - Priority to validate
 * @returns Error message or null if valid
 */
export function validatePriority(priority: string | number): string | null {
  if (!VALID_PRIORITIES.includes(priority as Priority)) {
    return `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  return null;
}

/**
 * Validates status value
 * @param status - Status to validate
 * @returns Error message or null if valid
 */
export function validateStatus(status: string | number): string | null {
  if (!VALID_STATUSES.includes(status as Status)) {
    return `Status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  return null;
}

/**
 * Validates ISO 8601 date format
 * @param date - Date string to validate
 * @returns Error message or null if valid
 */
export function validateDateFormat(date: string | number): string | null {
  if (typeof date !== 'string') {
    return 'Date must be a string';
  }

  // ISO 8601 date format regex (YYYY-MM-DD or full timestamp)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  
  if (!iso8601Regex.test(date)) {
    return 'Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)';
  }

  // Validate that it's a valid date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return 'Invalid date value';
  }

  // Check if the date string matches the parsed date (prevents rollover like 2024-02-30)
  const isoString = parsedDate.toISOString();
  const datePrefix = date.includes('T') ? date.split('T')[0] : date;
  const parsedPrefix = isoString.split('T')[0];
  
  if (datePrefix !== parsedPrefix) {
    return 'Invalid date value';
  }

  return null;
}

/**
 * Validates description field
 * @param description - Description to validate
 * @returns Error message or null if valid
 */
export function validateDescription(description: string | number | undefined | null): string | null {
  if (description === undefined || description === null) {
    return 'Description is required';
  }

  if (typeof description !== 'string') {
    return 'Description must be a string';
  }

  if (description.trim().length === 0) {
    return 'Description cannot be empty or whitespace only';
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }

  return null;
}

/**
 * Validates assignee field (email format)
 * @param assignee - Assignee email to validate
 * @returns Error message or null if valid
 */
export function validateAssignee(assignee: string | number): string | null {
  if (typeof assignee !== 'string') {
    return 'Assignee must be a string';
  }

  if (assignee.length > MAX_ASSIGNEE_LENGTH) {
    return `Assignee must not exceed ${MAX_ASSIGNEE_LENGTH} characters`;
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(assignee)) {
    return 'Assignee must be a valid email address';
  }

  return null;
}

/**
 * Validates pagination limit parameter
 * @param limit - Limit value to validate
 * @returns Error message or null if valid
 */
export function validateLimit(limit: string | number | null): string | null {
  const numLimit = Number(limit);
  
  if (isNaN(numLimit)) {
    return 'Limit must be a number';
  }
  
  if (!Number.isInteger(numLimit)) {
    return 'Limit must be an integer';
  }
  
  if (numLimit < 1) {
    return 'Limit must be at least 1';
  }
  
  if (numLimit > 100) {
    return 'Limit must not exceed 100';
  }
  
  return null;
}

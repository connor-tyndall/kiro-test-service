/**
 * Error message constants for API handlers
 * 
 * Note: This TypeScript source file compiles to JavaScript in the dist/ folder.
 * For runtime, handlers import from errors.js which contains the same constants.
 */

/** Error message for invalid JSON in request body */
export const INVALID_JSON = 'Invalid JSON in request body';

/** Error message for task not found */
export const TASK_NOT_FOUND = 'Task not found';

/** Error message for missing task ID */
export const TASK_ID_REQUIRED = 'Task ID is required';

/** Generic internal server error message */
export const INTERNAL_SERVER_ERROR = 'Internal server error';

/** Error message for task creation failure */
export const INTERNAL_ERROR_CREATING_TASK = 'Internal server error: creating task';

/** Error message for task update failure */
export const INTERNAL_ERROR_UPDATING_TASK = 'Internal server error: updating task';

/** Error message for task deletion failure */
export const INTERNAL_ERROR_DELETING_TASK = 'Internal server error: deleting task';

/** Error message for task retrieval failure */
export const INTERNAL_ERROR_RETRIEVING_TASK = 'Internal server error: retrieving task';

/** Error message for task listing failure */
export const INTERNAL_ERROR_LISTING_TASKS = 'Internal server error: listing tasks';

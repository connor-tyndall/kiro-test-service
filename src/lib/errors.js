/**
 * Error message constants for API handlers
 */

/** Error message for invalid JSON in request body */
const INVALID_JSON = 'Invalid JSON in request body';

/** Error message for task not found */
const TASK_NOT_FOUND = 'Task not found';

/** Error message for missing task ID */
const TASK_ID_REQUIRED = 'Task ID is required';

/** Generic internal server error message */
const INTERNAL_SERVER_ERROR = 'Internal server error';

/** Error message for task creation failure */
const INTERNAL_ERROR_CREATING_TASK = 'Internal server error: creating task';

/** Error message for task update failure */
const INTERNAL_ERROR_UPDATING_TASK = 'Internal server error: updating task';

/** Error message for task deletion failure */
const INTERNAL_ERROR_DELETING_TASK = 'Internal server error: deleting task';

/** Error message for task retrieval failure */
const INTERNAL_ERROR_RETRIEVING_TASK = 'Internal server error: retrieving task';

/** Error message for task listing failure */
const INTERNAL_ERROR_LISTING_TASKS = 'Internal server error: listing tasks';

module.exports = {
  INVALID_JSON,
  TASK_NOT_FOUND,
  TASK_ID_REQUIRED,
  INTERNAL_SERVER_ERROR,
  INTERNAL_ERROR_CREATING_TASK,
  INTERNAL_ERROR_UPDATING_TASK,
  INTERNAL_ERROR_DELETING_TASK,
  INTERNAL_ERROR_RETRIEVING_TASK,
  INTERNAL_ERROR_LISTING_TASKS
};

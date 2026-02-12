# Implementation Plan: Engineering Task API

## Overview

This implementation plan breaks down the Engineering Task API into discrete coding tasks. The approach follows an incremental development pattern: infrastructure setup, shared modules, core CRUD operations, filtering capabilities, and comprehensive testing. Each task builds on previous work, ensuring no orphaned code.

## Tasks

- [x] 1. Set up project structure and infrastructure
  - Create project directory structure (src/, tests/, terraform/)
  - Initialize package.json with dependencies (aws-sdk, uuid, jest, fast-check)
  - Create Terraform configuration for DynamoDB table with GSIs
  - Create Terraform configuration for Lambda functions and API Gateway
  - Set up Jest configuration for unit and property tests
  - _Requirements: 9.4_

- [x] 2. Implement shared validation module
  - [x] 2.1 Create validation.js with input validation functions
    - Implement validateTaskInput(data) for task field validation
    - Implement validatePriority(priority) for P0-P4 validation
    - Implement validateStatus(status) for status enum validation
    - Implement validateDateFormat(date) for ISO 8601 validation
    - Implement validateDescription(description) for required non-empty string
    - _Requirements: 1.2, 1.6, 3.6, 7.1, 8.1_
  
  - [ ]* 2.2 Write property test for priority enumeration
    - **Property 21: Priority Enumeration**
    - **Validates: Requirements 7.1**
  
  - [ ]* 2.3 Write property test for status enumeration
    - **Property 22: Status Enumeration**
    - **Validates: Requirements 8.1**
  
  - [x]* 2.4 Write unit tests for validation edge cases
    - Test empty/whitespace descriptions
    - Test invalid date formats
    - Test boundary cases for string lengths
    - _Requirements: 1.2, 1.6_

- [x] 3. Implement shared response module
  - [x] 3.1 Create response.js with response formatting functions
    - Implement success(statusCode, body) for success responses
    - Implement error(statusCode, message) for error responses
    - Implement formatTask(taskItem) to convert DynamoDB item to API format
    - Ensure all responses include Content-Type: application/json header
    - Ensure timestamps are formatted as ISO 8601
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 3.2 Write property test for Content-Type header
    - **Property 25: Content-Type Header**
    - **Validates: Requirements 10.4**
  
  - [ ]* 3.3 Write property test for ISO 8601 timestamps
    - **Property 26: ISO 8601 Timestamps**
    - **Validates: Requirements 10.5**
  
  - [ ]* 3.4 Write property test for error response format
    - **Property 24: Error Response Format**
    - **Validates: Requirements 10.3**

- [x] 4. Implement DynamoDB interaction module
  - [x] 4.1 Create dynamodb.js with data access functions
    - Implement putTask(task) for creating/updating tasks
    - Implement getTask(id) for retrieving tasks by ID
    - Implement deleteTask(id) for deleting tasks
    - Implement scanTasks() for listing all tasks
    - Implement queryTasksByAssignee(assignee) using GSI1
    - Implement queryTasksByStatus(status) using GSI2
    - Implement queryTasksByPriority(priority) using GSI3
    - Handle DynamoDB errors and return appropriate error codes
    - _Requirements: 9.1, 9.3_
  
  - [ ]* 4.2 Write unit tests for DynamoDB error handling
    - Test behavior when DynamoDB is unavailable (503 errors)
    - Mock DynamoDB client failures
    - _Requirements: 9.3_

- [x] 5. Implement Create Task endpoint
  - [x] 5.1 Create createTask Lambda handler
    - Parse and validate request body
    - Generate unique UUID for task ID
    - Apply default values (priority: P2, status: open)
    - Set createdAt and updatedAt timestamps
    - Call putTask() to persist to DynamoDB
    - Return 201 with created task object
    - Handle validation errors (400) and service errors (503)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [ ]* 5.2 Write property test for task creation with unique ID
    - **Property 1: Task Creation with Unique ID**
    - **Validates: Requirements 1.1**
  
  - [ ]* 5.3 Write property test for description required
    - **Property 2: Description Required**
    - **Validates: Requirements 1.2**
  
  - [ ]* 5.4 Write property test for optional fields accepted
    - **Property 3: Optional Fields Accepted**
    - **Validates: Requirements 1.3**
  
  - [ ]* 5.5 Write property test for priority default
    - **Property 4: Priority Default**
    - **Validates: Requirements 1.4**
  
  - [ ]* 5.6 Write property test for status default
    - **Property 5: Status Default**
    - **Validates: Requirements 1.5**
  
  - [ ]* 5.7 Write property test for invalid input rejection
    - **Property 6: Invalid Input Rejection**
    - **Validates: Requirements 1.6**

- [x] 6. Checkpoint - Ensure create endpoint works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Get Task endpoint
  - [x] 7.1 Create getTask Lambda handler
    - Parse task ID from path parameters
    - Call getTask() to retrieve from DynamoDB
    - Return 404 if task not found
    - Return 200 with task object if found
    - Ensure all task fields are included in response
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 7.2 Write property test for task retrieval round-trip
    - **Property 7: Task Retrieval Round-Trip**
    - **Validates: Requirements 2.1, 2.3**
  
  - [ ]* 7.3 Write property test for non-existent task returns 404
    - **Property 8: Non-Existent Task Returns 404**
    - **Validates: Requirements 2.2**

- [x] 8. Implement Update Task endpoint
  - [x] 8.1 Create updateTask Lambda handler
    - Parse task ID from path parameters
    - Parse and validate request body
    - Verify task exists (return 404 if not)
    - Prevent modification of id and createdAt fields
    - Update only provided fields
    - Automatically update updatedAt timestamp
    - Call putTask() to persist changes
    - Return 200 with updated task object
    - Handle validation errors (400) and not found errors (404)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 8.2 Write property test for task update modifies fields
    - **Property 9: Task Update Modifies Fields**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ]* 8.3 Write property test for immutable fields
    - **Property 10: Immutable Fields**
    - **Validates: Requirements 3.3**
  
  - [ ]* 8.4 Write property test for automatic timestamp update
    - **Property 11: Automatic Timestamp Update**
    - **Validates: Requirements 3.4**
  
  - [ ]* 8.5 Write property test for persistence round-trip
    - **Property 23: Persistence Round-Trip**
    - **Validates: Requirements 9.1**
  
  - [ ]* 8.6 Write property test for task reassignment
    - **Property 19: Task Reassignment**
    - **Validates: Requirements 6.3**
  
  - [ ]* 8.7 Write property test for assignee clearing
    - **Property 20: Assignee Clearing**
    - **Validates: Requirements 6.4**

- [x] 9. Implement Delete Task endpoint
  - [x] 9.1 Create deleteTask Lambda handler
    - Parse task ID from path parameters
    - Verify task exists (return 404 if not)
    - Call deleteTask() to remove from DynamoDB
    - Return 204 with no content
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 9.2 Write property test for task deletion removes task
    - **Property 12: Task Deletion Removes Task**
    - **Validates: Requirements 4.1, 4.4**

- [x] 10. Checkpoint - Ensure CRUD operations work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement List Tasks endpoint with filtering
  - [x] 11.1 Create listTasks Lambda handler
    - Parse query parameters (assignee, priority, status, dueDateBefore)
    - Implement no-filter case using scanTasks()
    - Implement single-filter cases using appropriate GSI queries
    - Implement multi-filter logic (use most selective GSI, filter in code)
    - Implement due date filtering in application code
    - Return 200 with tasks array in response body
    - Handle empty results (return empty array)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ]* 11.2 Write property test for list without filters returns all
    - **Property 13: List Without Filters Returns All**
    - **Validates: Requirements 5.1**
  
  - [ ]* 11.3 Write property test for assignee filter precision
    - **Property 14: Assignee Filter Precision**
    - **Validates: Requirements 5.2**
  
  - [ ]* 11.4 Write property test for priority filter precision
    - **Property 15: Priority Filter Precision**
    - **Validates: Requirements 5.3**
  
  - [ ]* 11.5 Write property test for status filter precision
    - **Property 16: Status Filter Precision**
    - **Validates: Requirements 5.4**
  
  - [ ]* 11.6 Write property test for due date filter precision
    - **Property 17: Due Date Filter Precision**
    - **Validates: Requirements 5.5**
  
  - [ ]* 11.7 Write property test for multiple filter conjunction
    - **Property 18: Multiple Filter Conjunction**
    - **Validates: Requirements 5.6**
  
  - [ ]* 11.8 Write unit tests for empty filter results
    - Test that no matches returns empty array with 200 status
    - _Requirements: 5.8_

- [x] 12. Wire API Gateway to Lambda functions
  - [x] 12.1 Configure API Gateway routes and integrations
    - Create POST /tasks route → createTask Lambda
    - Create GET /tasks/{id} route → getTask Lambda
    - Create PUT /tasks/{id} route → updateTask Lambda
    - Create DELETE /tasks/{id} route → deleteTask Lambda
    - Create GET /tasks route → listTasks Lambda
    - Configure request/response mappings
    - Enable CORS if needed
    - _Requirements: All API requirements_
  
  - [ ]* 12.2 Write integration tests for all endpoints
    - Test end-to-end flows through API Gateway
    - Test error propagation through the stack
    - _Requirements: All API requirements_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify test coverage meets goals (>80% line coverage)
  - Ensure all 26 correctness properties are implemented
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with minimum 100 iterations
- Unit tests use Jest for specific examples and edge cases
- Infrastructure is provisioned via Terraform before Lambda development
- All Lambda functions use Node.js 20 runtime

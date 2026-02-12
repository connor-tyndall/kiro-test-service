# Pagination Implementation

## Overview
Added cursor-based pagination to the GET /tasks endpoint to efficiently handle large result sets.

## Changes

### 1. Validation Module (`src/lib/validation.js`)
- Added `validateLimit()` function to validate pagination limit parameter
- Validates limit is a number between 1 and 100
- Rejects non-numeric, decimal, and out-of-range values

### 2. DynamoDB Module (`src/lib/dynamodb.js`)
Updated all query/scan functions to support pagination:
- `scanTasks(limit, nextToken)` - Returns `{ items, nextToken }`
- `queryTasksByAssignee(assignee, limit, nextToken)` - Returns `{ items, nextToken }`
- `queryTasksByStatus(status, limit, nextToken)` - Returns `{ items, nextToken }`
- `queryTasksByPriority(priority, limit, nextToken)` - Returns `{ items, nextToken }`

**Token Format**: Base64-encoded JSON of DynamoDB's LastEvaluatedKey

### 3. List Tasks Handler (`src/handlers/listTasks.js`)
- Accepts `limit` query parameter (default: 20, max: 100)
- Accepts `nextToken` query parameter (opaque cursor)
- Returns `nextToken` in response when more results are available
- Validates limit parameter and returns 400 on invalid input
- Works with all existing filters (assignee, priority, status, dueDateBefore)

## API Usage

### Basic Request
```bash
GET /tasks
```
Returns up to 20 tasks (default limit).

### Custom Limit
```bash
GET /tasks?limit=50
```
Returns up to 50 tasks.

### Pagination
```bash
GET /tasks?limit=20&nextToken=eyJQSyI6IlRBU0sjMTIzIiwiU0siOiJUQVNLIzEyMyJ9
```
Returns next page of results.

### With Filters
```bash
GET /tasks?assignee=user@example.com&limit=10&nextToken=...
```
Pagination works with all existing filters.

## Response Format

### With More Results
```json
{
  "tasks": [...],
  "nextToken": "eyJQSyI6IlRBU0sjMTIzIiwiU0siOiJUQVNLIzEyMyJ9"
}
```

### Last Page
```json
{
  "tasks": [...]
}
```
No `nextToken` field when no more results.

## Validation

### Valid Limits
- Minimum: 1
- Maximum: 100
- Must be an integer

### Error Responses
- `400 Bad Request` - Invalid limit parameter
  - "Limit must be a number"
  - "Limit must be an integer"
  - "Limit must be at least 1"
  - "Limit must not exceed 100"

## Tests

### Validation Tests (9 new tests)
- Valid limits (number, string, min, max)
- Invalid limits (non-numeric, decimal, out of range)
- Edge cases (empty string, null)

### Handler Tests (11 new tests)
- Default limit behavior
- Custom limit
- nextToken handling
- Response includes/excludes nextToken
- Limit validation errors
- Pagination with filters
- Edge cases

### DynamoDB Tests (1 new test)
- Pagination parameter handling

**Total New Tests**: 21
**All Tests Passing**: 150/150

## Implementation Notes

1. **Opaque Tokens**: nextToken is base64-encoded to hide internal DynamoDB structure
2. **Default Limit**: 20 items per page balances performance and usability
3. **Max Limit**: 100 items prevents excessive memory usage
4. **Filter Compatibility**: Pagination works seamlessly with all existing filters
5. **Error Handling**: Follows project convention (HTTP 500 for errors)

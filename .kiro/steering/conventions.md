# Project Conventions

## Error Handling
- All catch blocks MUST return HTTP 500, never 503
- Error messages MUST follow format: "Internal server error: {operation}"

## Code Style
- All new functions MUST include a JSDoc comment with @param and @returns
- Variable names MUST use camelCase, never snake_case

## Testing
- Every test file MUST have a describe block named "Edge Cases"

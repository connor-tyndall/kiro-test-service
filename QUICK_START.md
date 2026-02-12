# Quick Start Guide

## Prerequisites

- Node.js 20+
- AWS CLI configured
- Terraform installed

## Installation

```bash
npm install
```

## Run Tests

```bash
npm test
```

## Deploy to AWS

```bash
./scripts/deploy.sh
```

## API Usage Examples

### Create a Task

```bash
curl -X POST https://your-api-endpoint/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "Implement user authentication",
    "assignee": "dev@example.com",
    "priority": "P1",
    "status": "open",
    "dueDate": "2024-12-31"
  }'
```

### Get a Task

```bash
curl https://your-api-endpoint/tasks/{task-id}
```

### Update a Task

```bash
curl -X PUT https://your-api-endpoint/tasks/{task-id} \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "in-progress",
    "priority": "P0"
  }'
```

### Delete a Task

```bash
curl -X DELETE https://your-api-endpoint/tasks/{task-id}
```

### List All Tasks

```bash
curl https://your-api-endpoint/tasks
```

### Filter Tasks

```bash
# By assignee
curl https://your-api-endpoint/tasks?assignee=dev@example.com

# By status
curl https://your-api-endpoint/tasks?status=open

# By priority
curl https://your-api-endpoint/tasks?priority=P1

# By due date
curl https://your-api-endpoint/tasks?dueDateBefore=2024-12-31

# Multiple filters
curl https://your-api-endpoint/tasks?assignee=dev@example.com&status=open
```

## Task Fields

| Field | Type | Required | Default | Values |
|-------|------|----------|---------|--------|
| description | string | Yes | - | Max 1000 chars |
| assignee | string | No | null | Max 255 chars |
| priority | string | No | P2 | P0, P1, P2, P3, P4 |
| status | string | No | open | open, in-progress, blocked, done |
| dueDate | string | No | null | ISO 8601 date |

## Response Codes

- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid input
- `404 Not Found` - Task not found
- `503 Service Unavailable` - DynamoDB error

## Development

```bash
# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/unit/validation.test.js

# Check coverage
npm test -- --coverage
```

## Project Structure

```
.
├── src/
│   ├── handlers/          # Lambda handlers
│   │   ├── createTask.js
│   │   ├── getTask.js
│   │   ├── updateTask.js
│   │   ├── deleteTask.js
│   │   └── listTasks.js
│   └── lib/              # Shared modules
│       ├── validation.js
│       ├── response.js
│       └── dynamodb.js
├── tests/
│   └── unit/             # Unit tests
├── terraform/            # Infrastructure
└── scripts/              # Deployment scripts
```

## Troubleshooting

### Tests Failing
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose
```

### Deployment Issues
```bash
# Validate Terraform
cd terraform
terraform validate

# Check AWS credentials
aws sts get-caller-identity
```

### API Errors
- Check CloudWatch Logs for Lambda function errors
- Verify DynamoDB table exists
- Check IAM permissions

## Support

See full documentation in:
- `README.md` - Complete documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `.kiro/specs/engineering-task-api/` - Detailed specifications

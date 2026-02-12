# Engineering Task API

REST API for tracking engineering tasks built with AWS Lambda, API Gateway, and DynamoDB.

## Features

- CRUD operations for tasks
- Task assignment to team members
- Priority levels (P0-P4)
- Status tracking (open, in-progress, blocked, done)
- Filtering by assignee, priority, status, and due date

## Tech Stack

- **Runtime**: Node.js 20
- **Compute**: AWS Lambda
- **API**: AWS API Gateway
- **Database**: DynamoDB (single-table design)
- **Infrastructure**: Terraform
- **Testing**: Jest + fast-check

## Project Structure

```
.
├── src/
│   ├── handlers/          # Lambda function handlers
│   ├── lib/              # Shared modules
│   │   ├── validation.js
│   │   ├── response.js
│   │   └── dynamodb.js
│   └── index.js
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── terraform/            # Infrastructure as Code
│   ├── main.tf
│   ├── lambda.tf
│   ├── api_gateway.tf
│   ├── variables.tf
│   └── outputs.tf
├── package.json
└── jest.config.js
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test

# With coverage report
npm test -- --coverage
```

3. Deploy to AWS:
```bash
# Make sure AWS credentials are configured
aws configure

# Run deployment script
./scripts/deploy.sh
```

Or deploy manually:
```bash
# Package Lambda functions
cd src
zip -r ../terraform/lambda-functions.zip handlers/ lib/
cd ..

# Package Lambda layer
mkdir -p layer/nodejs
cp package.json layer/nodejs/
cd layer/nodejs && npm install --production && cd ../..
cd layer && zip -r ../terraform/lambda-layer.zip nodejs/ && cd ..

# Deploy with Terraform
cd terraform
terraform init
terraform plan
terraform apply
```

## API Endpoints

### Create Task
```bash
POST /tasks
Content-Type: application/json

{
  "description": "Implement user authentication",
  "assignee": "user@example.com",
  "priority": "P1",
  "status": "open",
  "dueDate": "2024-12-31"
}

Response: 201 Created
{
  "id": "uuid",
  "description": "Implement user authentication",
  "assignee": "user@example.com",
  "priority": "P1",
  "status": "open",
  "dueDate": "2024-12-31",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Task
```bash
GET /tasks/{id}

Response: 200 OK
{
  "id": "uuid",
  "description": "Implement user authentication",
  ...
}
```

### Update Task
```bash
PUT /tasks/{id}
Content-Type: application/json

{
  "status": "in-progress",
  "priority": "P0"
}

Response: 200 OK
```

### Delete Task
```bash
DELETE /tasks/{id}

Response: 204 No Content
```

### List Tasks
```bash
GET /tasks
GET /tasks?assignee=user@example.com
GET /tasks?status=open
GET /tasks?priority=P1
GET /tasks?dueDateBefore=2024-12-31
GET /tasks?assignee=user@example.com&status=open

Response: 200 OK
{
  "tasks": [...]
}
```

## Development

See `.kiro/specs/engineering-task-api/` for detailed requirements, design, and implementation tasks.


## Testing

The project includes comprehensive unit tests with >90% coverage:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/validation.test.js

# Run tests in watch mode
npm test -- --watch
```

Test suites:
- Validation module (31 tests)
- Response module (14 tests)
- DynamoDB module (19 tests)
- Handler tests (30 tests)

## Architecture

The API follows serverless best practices:

- **Handlers**: Lambda function handlers for each endpoint
- **Shared Libraries**: Reusable validation, response formatting, and DynamoDB access
- **Single-Table Design**: DynamoDB table with GSIs for efficient filtering
- **Infrastructure as Code**: Complete Terraform configuration

## Project Status

✅ All core functionality implemented
✅ 94 unit tests passing
✅ 92.79% code coverage
✅ Ready for deployment

## Next Steps

1. Deploy to AWS using the deployment script
2. Test endpoints with real data
3. Optional: Add authentication (API keys, Cognito, etc.)
4. Optional: Add pagination for list endpoint
5. Optional: Add CloudWatch alarms and monitoring

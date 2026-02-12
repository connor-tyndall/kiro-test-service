#!/bin/bash
set -e

echo "🚀 Deploying Engineering Task API..."

# Run tests
echo "📋 Running tests..."
npm test -- --silent

# Package Lambda functions
echo "📦 Packaging Lambda functions..."
mkdir -p dist
cd src
zip -r ../dist/lambda-functions.zip handlers/ lib/ -q
cd ..

# Package Lambda layer (node_modules)
echo "📦 Packaging Lambda layer..."
mkdir -p dist/nodejs
cp package.json dist/nodejs/
cd dist/nodejs
npm install --production --silent
cd ..
zip -r lambda-layer.zip nodejs/ -q
cd ..

# Copy deployment packages to terraform directory
cp dist/lambda-functions.zip terraform/
cp dist/lambda-layer.zip terraform/

# Deploy infrastructure
echo "🏗️  Deploying infrastructure with Terraform..."
cd terraform
terraform init -input=false
terraform plan -out=tfplan
terraform apply tfplan

# Get API endpoint
API_ENDPOINT=$(terraform output -raw api_endpoint)

echo "✅ Deployment complete!"
echo "📍 API Endpoint: $API_ENDPOINT"
echo ""
echo "Example usage:"
echo "  curl -X POST $API_ENDPOINT \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"description\": \"My first task\", \"priority\": \"P1\"}'"

# Use AWS ECR public Node.js image
FROM public.ecr.aws/docker/library/node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency files first (for layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for testing)
RUN npm install

# Copy application code
COPY . .

# Run tests by default
CMD ["npm", "test"]

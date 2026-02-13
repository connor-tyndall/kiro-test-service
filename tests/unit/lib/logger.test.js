const { withLogging } = require('../../../src/lib/logger');

describe('Logger Module', () => {
  let originalWrite;
  let logOutput;

  beforeEach(() => {
    logOutput = [];
    originalWrite = process.stdout.write;
    process.stdout.write = jest.fn((output) => {
      logOutput.push(output);
    });
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
  });

  describe('withLogging', () => {
    test('should wrap handler and return response', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ message: 'success' })
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/tasks'
      };

      const response = await wrappedHandler(event, {});

      expect(response.statusCode).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(event, {});
    });

    test('should log request with timestamp in ISO format', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'POST',
        path: '/tasks'
      };

      await wrappedHandler(event, {});

      expect(process.stdout.write).toHaveBeenCalled();
      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    test('should log HTTP method', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 201,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'POST',
        path: '/tasks'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.method).toBe('POST');
    });

    test('should log request path', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/tasks/123'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.path).toBe('/tasks/123');
    });

    test('should log response status code', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/tasks/nonexistent'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.statusCode).toBe(404);
    });

    test('should output log in JSON format', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/health'
      };

      await wrappedHandler(event, {});

      expect(() => JSON.parse(logOutput[0].trim())).not.toThrow();
      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('method');
      expect(logEntry).toHaveProperty('path');
      expect(logEntry).toHaveProperty('statusCode');
    });

    test('should write log to stdout with newline', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/tasks'
      };

      await wrappedHandler(event, {});

      expect(logOutput[0]).toMatch(/\n$/);
    });

    test('should handle HTTP 2.0 event format with requestContext', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        requestContext: {
          http: {
            method: 'PUT'
          }
        },
        rawPath: '/tasks/456'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.method).toBe('PUT');
      expect(logEntry.path).toBe('/tasks/456');
    });

    test('should preserve original response', async () => {
      const expectedResponse = {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '123', name: 'Test' })
      };
      const mockHandler = jest.fn().mockResolvedValue(expectedResponse);
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'POST',
        path: '/tasks'
      };

      const response = await wrappedHandler(event, {});

      expect(response).toEqual(expectedResponse);
    });

    test('should pass context to wrapped handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = { httpMethod: 'GET', path: '/tasks' };
      const context = { functionName: 'testFunction', awsRequestId: '12345' };

      await wrappedHandler(event, context);

      expect(mockHandler).toHaveBeenCalledWith(event, context);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing httpMethod with UNKNOWN', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        path: '/tasks'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.method).toBe('UNKNOWN');
    });

    test('should handle missing path with UNKNOWN', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.path).toBe('UNKNOWN');
    });

    test('should handle empty event object', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      await wrappedHandler({}, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.method).toBe('UNKNOWN');
      expect(logEntry.path).toBe('UNKNOWN');
    });

    test('should handle handler errors by propagating them', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/tasks'
      };

      await expect(wrappedHandler(event, {})).rejects.toThrow('Handler error');
    });

    test('should log all HTTP methods correctly', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        logOutput = [];
        const mockHandler = jest.fn().mockResolvedValue({
          statusCode: 200,
          body: '{}'
        });
        const wrappedHandler = withLogging(mockHandler);

        await wrappedHandler({ httpMethod: method, path: '/test' }, {});

        const logEntry = JSON.parse(logOutput[0].trim());
        expect(logEntry.method).toBe(method);
      }
    });

    test('should log various status codes correctly', async () => {
      const statusCodes = [200, 201, 204, 400, 401, 403, 404, 500, 503];
      
      for (const statusCode of statusCodes) {
        logOutput = [];
        const mockHandler = jest.fn().mockResolvedValue({
          statusCode,
          body: '{}'
        });
        const wrappedHandler = withLogging(mockHandler);

        await wrappedHandler({ httpMethod: 'GET', path: '/test' }, {});

        const logEntry = JSON.parse(logOutput[0].trim());
        expect(logEntry.statusCode).toBe(statusCode);
      }
    });

    test('should handle undefined context', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/tasks'
      };

      const response = await wrappedHandler(event, undefined);

      expect(response.statusCode).toBe(200);
    });

    test('should prefer httpMethod over requestContext.http.method', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'POST',
        requestContext: {
          http: {
            method: 'GET'
          }
        },
        path: '/tasks'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.method).toBe('POST');
    });

    test('should prefer path over rawPath', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      });
      const wrappedHandler = withLogging(mockHandler);

      const event = {
        httpMethod: 'GET',
        path: '/api/tasks',
        rawPath: '/tasks'
      };

      await wrappedHandler(event, {});

      const logEntry = JSON.parse(logOutput[0].trim());
      expect(logEntry.path).toBe('/api/tasks');
    });
  });
});

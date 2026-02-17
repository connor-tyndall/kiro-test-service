const { handler } = require('../../src/handlers/health');

describe('Health Handler', () => {
  it('should return healthy status', async () => {
    const result = await handler({});
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  describe('Request ID Tracking', () => {
    it('should include x-request-id header when requestContext is provided', async () => {
      const requestId = 'test-request-id-health';
      const event = {
        requestContext: {
          requestId: requestId
        }
      };
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['x-request-id']).toBe(requestId);
    });

    it('should use UNKNOWN when requestContext is missing', async () => {
      const result = await handler({});
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['x-request-id']).toBe('UNKNOWN');
    });

    it('should use UNKNOWN when requestId is not in requestContext', async () => {
      const event = {
        requestContext: {}
      };
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['x-request-id']).toBe('UNKNOWN');
    });
  });

  describe('Edge Cases', () => {
    it('should return valid ISO timestamp', async () => {
      const result = await handler({});
      const body = JSON.parse(result.body);
      const timestamp = new Date(body.timestamp);
      expect(timestamp.toISOString()).toBe(body.timestamp);
    });
  });
});

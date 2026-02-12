const { handler } = require('../../src/handlers/health');

describe('Health Handler', () => {
  it('should return healthy status', async () => {
    const result = await handler({});
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
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

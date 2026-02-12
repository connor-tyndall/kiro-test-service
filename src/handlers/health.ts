// Health check endpoint - no auth required
import { success } from '../lib/response';
import { APIGatewayEvent, LambdaResponse } from '../types';

/**
 * Health check handler
 * @param _event - API Gateway event
 * @returns API Gateway response
 */
export const handler = async (_event: APIGatewayEvent): Promise<LambdaResponse> => {
  return success(200, {
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
};

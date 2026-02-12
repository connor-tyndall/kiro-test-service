import { error } from './response';
import { APIGatewayEvent, LambdaResponse } from '../types';

/**
 * Validates API key from request headers
 * @param event - Lambda event object
 * @returns Error response if invalid, null if valid
 */
export function validateApiKey(event: APIGatewayEvent): LambdaResponse | null {
  const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    console.error('API_KEY environment variable not configured');
    return error(500, 'Internal server error');
  }

  if (!apiKey) {
    return error(401, 'Missing API key');
  }

  if (apiKey !== expectedKey) {
    return error(401, 'Invalid API key');
  }

  return null;
}

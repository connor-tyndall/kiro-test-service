/**
 * In-memory rate limiting module for per-API-key request tracking.
 * Uses a sliding window algorithm with configurable limits.
 */

// In-memory storage for request timestamps per API key
const requestStore = new Map();

// Default configuration
const DEFAULT_WINDOW_MS = 60 * 1000; // 60 seconds
const DEFAULT_MAX_REQUESTS = 100; // 100 requests per window

/**
 * Removes expired timestamps from the request array
 * @param {number[]} timestamps - Array of request timestamps
 * @param {number} windowStart - Start of the current sliding window
 * @returns {number[]} Filtered array with only valid timestamps
 */
function removeExpiredTimestamps(timestamps, windowStart) {
  return timestamps.filter(ts => ts >= windowStart);
}

/**
 * Checks and updates rate limit status for a given API key.
 * Implements a sliding window algorithm.
 * @param {string} apiKey - The API key to check
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Sliding window duration in milliseconds (default: 60000)
 * @param {number} options.maxRequests - Maximum requests allowed per window (default: 100)
 * @param {number} options.currentTime - Current timestamp for testing (default: Date.now())
 * @returns {Object} Rate limit status object
 * @returns {boolean} returns.allowed - Whether the request is allowed
 * @returns {number} returns.remaining - Number of remaining requests in the window
 * @returns {number} returns.resetTime - Unix timestamp when the window resets
 * @returns {number|null} returns.retryAfter - Seconds until retry is allowed (null if allowed)
 */
function checkRateLimit(apiKey, options = {}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests || DEFAULT_MAX_REQUESTS;
  const currentTime = options.currentTime || Date.now();
  
  const windowStart = currentTime - windowMs;
  
  // Get existing timestamps for this API key
  let timestamps = requestStore.get(apiKey) || [];
  
  // Remove expired timestamps (outside the sliding window)
  timestamps = removeExpiredTimestamps(timestamps, windowStart);
  
  // Calculate the reset time (when the oldest request in window expires)
  let resetTime;
  if (timestamps.length > 0) {
    resetTime = timestamps[0] + windowMs;
  } else {
    resetTime = currentTime + windowMs;
  }
  
  // Check if rate limit is exceeded
  if (timestamps.length >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((timestamps[0] + windowMs - currentTime) / 1000);
    
    // Update store with cleaned timestamps (don't add new one)
    requestStore.set(apiKey, timestamps);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.max(1, retryAfter) // Minimum 1 second
    };
  }
  
  // Request allowed, add current timestamp
  timestamps.push(currentTime);
  requestStore.set(apiKey, timestamps);
  
  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetTime,
    retryAfter: null
  };
}

/**
 * Clears rate limit data for a specific API key.
 * Useful for testing or administrative purposes.
 * @param {string} apiKey - The API key to clear
 * @returns {boolean} True if the key was found and cleared, false otherwise
 */
function clearRateLimit(apiKey) {
  return requestStore.delete(apiKey);
}

/**
 * Clears all rate limit data.
 * Useful for testing or system reset.
 * @returns {void}
 */
function clearAllRateLimits() {
  requestStore.clear();
}

/**
 * Gets the current request count for an API key.
 * @param {string} apiKey - The API key to check
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Sliding window duration in milliseconds (default: 60000)
 * @param {number} options.currentTime - Current timestamp for testing (default: Date.now())
 * @returns {number} Current request count within the sliding window
 */
function getRequestCount(apiKey, options = {}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const currentTime = options.currentTime || Date.now();
  const windowStart = currentTime - windowMs;
  
  const timestamps = requestStore.get(apiKey) || [];
  return removeExpiredTimestamps(timestamps, windowStart).length;
}

module.exports = {
  checkRateLimit,
  clearRateLimit,
  clearAllRateLimits,
  getRequestCount,
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX_REQUESTS
};

export class McpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export const ErrorCodes = {
  ResourceNotFound: 'resource_not_found',
  RateLimitExceeded: 'rate_limit_exceeded',
  InvalidRequest: 'invalid_request',
  ServiceUnavailable: 'service_unavailable',
  ParseError: 'parse_error',
} as const;

import { parseOpenAPI, validateSchema } from '../utils/parseOpenAPI';
import { formatSnippets } from '../utils/formatSnippets';
import { splitContext } from '../utils/splitContext';

describe('parseOpenAPI', () => {
  const validSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {
      '/users': {
        get: {
          summary: 'List users',
          operationId: 'listUsers',
          responses: {
            '200': {
              description: 'Success'
            }
          }
        }
      }
    }
  };

  test('should parse valid OpenAPI spec', () => {
    const result = parseOpenAPI(validSpec);
    expect(result).toHaveProperty('endpoints');
    expect(result.endpoints.length).toBeGreaterThan(0);
  });

  test('should extract endpoint information', () => {
    const result = parseOpenAPI(validSpec);
    expect(result.endpoints[0]).toHaveProperty('path');
    expect(result.endpoints[0]).toHaveProperty('method');
    expect(result.endpoints[0].path).toBe('/users');
    expect(result.endpoints[0].method).toBe('get');
  });

  test('should handle missing info gracefully', () => {
    const spec = {
      openapi: '3.0.0',
      paths: { '/test': { get: { responses: {} } } }
    };
    expect(() => parseOpenAPI(spec)).not.toThrow();
  });

  test('should return empty endpoints for empty paths', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {}
    };
    const result = parseOpenAPI(spec);
    expect(result.endpoints).toEqual([]);
  });
});

describe('formatSnippets', () => {
  test('should format JSON snippets correctly', () => {
    const input = { test: 'data', nested: { value: 123 } };
    const result = formatSnippets(JSON.stringify(input), 'json');
    expect(result).toContain('test');
    expect(result).toContain('data');
  });

  test('should format JavaScript snippets', () => {
    const code = 'const test = () => { return true; };';
    const result = formatSnippets(code, 'javascript');
    expect(result).toContain('const');
    expect(result).toContain('test');
  });

  test('should handle empty snippets', () => {
    const result = formatSnippets('', 'json');
    expect(result).toBe('');
  });

  test('should preserve code structure', () => {
    const code = 'function test() {\n  return true;\n}';
    const result = formatSnippets(code, 'javascript');
    expect(result).toContain('function');
  });
});

describe('splitContext', () => {
  const longContext = 'A'.repeat(5000);
  const shortContext = 'Short text';

  test('should split long context into chunks', () => {
    const result = splitContext(longContext, 1000);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1);
  });

  test('should handle short context', () => {
    const result = splitContext(shortContext, 1000);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toBe(shortContext);
  });

  test('should respect chunk size', () => {
    const result = splitContext(longContext, 1000);
    result.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1000);
    });
  });

  test('should handle empty context', () => {
    const result = splitContext('', 1000);
    expect(Array.isArray(result)).toBe(true);
  });

  test('should not lose content during split', () => {
    const result = splitContext(longContext, 1000);
    const joined = result.join('');
    expect(joined).toBe(longContext);
  });
});

describe('Validation', () => {
  test('validateSchema should identify valid OpenAPI', () => {
    const valid = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {}
    };
    expect(validateSchema(valid)).toBe(true);
  });

  test('validateSchema should reject invalid OpenAPI', () => {
    const invalid = {
      info: { title: 'Test' }
    };
    expect(validateSchema(invalid)).toBe(false);
  });

  test('should validate endpoint structure', () => {
    const endpoint = {
      path: '/test',
      method: 'get',
      description: 'Test endpoint'
    };
    expect(endpoint.path).toBeDefined();
    expect(endpoint.method).toBeDefined();
  });
});

describe('Error Handling', () => {
  test('parseOpenAPI should handle null input gracefully', () => {
    expect(() => parseOpenAPI(null)).not.toThrow();
  });

  test('formatSnippets should handle undefined language', () => {
    expect(() => formatSnippets('test code', undefined)).not.toThrow();
  });

  test('splitContext should handle invalid chunk size', () => {
    expect(() => splitContext('test', 0)).not.toThrow();
    expect(() => splitContext('test', -1)).not.toThrow();
  });
});

describe('Edge Cases', () => {
  test('should handle Swagger 2.0 specs', () => {
    const swagger2Spec = {
      swagger: '2.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: { '200': { description: 'Success' } }
          }
        }
      }
    };
    expect(() => parseOpenAPI(swagger2Spec)).not.toThrow();
  });

  test('should handle deeply nested objects', () => {
    const deepSpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/deep': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      nested: {
                        type: 'object',
                        properties: {
                          deep: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            responses: { '200': { description: 'Success' } }
          }
        }
      }
    };
    expect(() => parseOpenAPI(deepSpec)).not.toThrow();
  });

  test('should handle multiple content types', () => {
    const multiContentSpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/content': {
          post: {
            requestBody: {
              content: {
                'application/json': { schema: { type: 'object' } },
                'application/xml': { schema: { type: 'object' } }
              }
            },
            responses: { '200': { description: 'Success' } }
          }
        }
      }
    };
    expect(() => parseOpenAPI(multiContentSpec)).not.toThrow();
  });
});

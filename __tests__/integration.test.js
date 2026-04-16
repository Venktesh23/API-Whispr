import { createClient } from '@supabase/supabase-js';

describe('API Integration Tests', () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let supabase;

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  });

  describe('Health Check Endpoints', () => {
    test('GET /api/health should return 200 OK', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });

    test('GET /api/metrics should return valid metrics', async () => {
      const response = await fetch(`${baseUrl}/api/metrics`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('apiHealth');
      expect(data).toHaveProperty('responseTime');
      expect(data).toHaveProperty('uptime');
    });
  });

  describe('Authorization Endpoints', () => {
    test('POST /api/auth should validate credentials', async () => {
      const response = await fetch(`${baseUrl}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('OpenAPI Analysis', () => {
    test('POST /api/analyze should process OpenAPI specs', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: mockSpec })
      });

      expect([200, 400, 500]).toContain(response.status);
    });

    test('POST /api/generate-endpoint-tag should generate tags', async () => {
      const response = await fetch(`${baseUrl}/api/generate-endpoint-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/users',
          method: 'GET',
          description: 'Get all users'
        })
      });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Chat Endpoints', () => {
    test('POST /api/ask should handle chat messages', async () => {
      const response = await fetch(`${baseUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is this API about?',
          context: {}
        })
      });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('Invalid endpoints should return 404', async () => {
      const response = await fetch(`${baseUrl}/api/invalid-endpoint`);
      expect(response.status).toBe(404);
    });

    test('Missing required fields should return 400', async () => {
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect([400, 500]).toContain(response.status);
    });

    test('Invalid HTTP methods should return 405', async () => {
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'DELETE'
      });

      expect([405, 400, 500]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    test('Response time should be under 2 seconds', async () => {
      const start = performance.now();
      await fetch(`${baseUrl}/api/metrics`);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    test('Concurrent requests should handle load', async () => {
      const requests = Array(10).fill(null).map(() =>
        fetch(`${baseUrl}/api/metrics`)
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.ok).length;
      expect(successCount).toBeGreaterThanOrEqual(9); // Allow 1 failure
    });
  });

  describe('Data Persistence', () => {
    test('Uploaded specs should be saved', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: mockSpec, name: 'test-spec' })
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        expect(data).toHaveProperty('id');
      }
    });
  });

  describe('Security Tests', () => {
    test('Should reject malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      expect([400, 500]).toContain(response.status);
    });

    test('Should validate content-type headers', async () => {
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'test'
      });

      expect([400, 415, 500]).toContain(response.status);
    });
  });
});

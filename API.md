# API-Whispr API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://api-whispr.com/api
```

## Authentication
All authenticated endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### Health Check
Check if the API is running and healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "0.1.0"
}
```

---

### Metrics
Get current API metrics and health data.

**Endpoint:** `GET /metrics`

**Response:**
```json
{
  "apiHealth": 100,
  "responseTime": 245,
  "uptime": 99.99,
  "activeUsers": 42,
  "totalRequests": 15230,
  "errorRate": 0.05
}
```

---

### Authentication

#### Sign Up
Create a new user account.

**Endpoint:** `POST /auth`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

**Errors:**
- `400` - Invalid input or user already exists
- `500` - Server error

---

### Upload API Specification

Upload an OpenAPI or Swagger specification file.

**Endpoint:** `POST /upload`

**Request (multipart/form-data):**
```
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

file: <OpenAPI spec file>
fileName: my-api-spec
description: Optional description
```

**Response (200):**
```json
{
  "id": "spec_123",
  "fileName": "my-api-spec",
  "uploadedAt": "2024-01-15T10:30:00Z",
  "endpoints": 15,
  "summary": "REST API with 15 endpoints"
}
```

**Errors:**
- `400` - Invalid file or spec format
- `401` - Unauthorized
- `413` - File too large (max 50MB)
- `415` - Unsupported file format

---

### Analyze API Specification

Analyze an OpenAPI spec and generate insights.

**Endpoint:** `POST /analyze`

**Request:**
```json
{
  "specId": "spec_123",
  "includeFlowchart": true,
  "includeMetrics": true
}
```

**Response (200):**
```json
{
  "analysisId": "analysis_456",
  "specId": "spec_123",
  "endpoints": [
    {
      "path": "/users",
      "method": "GET",
      "summary": "List all users",
      "tags": ["users"],
      "parameters": ["limit", "offset"],
      "responses": ["200", "401", "500"]
    }
  ],
  "metrics": {
    "totalEndpoints": 15,
    "methodDistribution": {
      "GET": 8,
      "POST": 4,
      "PUT": 2,
      "DELETE": 1
    },
    "averageResponseTime": 245
  },
  "issues": [
    {
      "severity": "warning",
      "message": "Endpoint missing authentication",
      "endpoint": "/public"
    }
  ],
  "flowchart": {
    "type": "mermaid",
    "diagram": "graph TD; ..."
  }
}
```

**Errors:**
- `400` - Invalid spec ID or parameters
- `401` - Unauthorized
- `404` - Spec not found
- `500` - Analysis failed

---

### Generate Endpoint Tag

Generate a descriptive tag for an API endpoint.

**Endpoint:** `POST /generate-endpoint-tag`

**Request:**
```json
{
  "endpoint": "/users/{id}/posts",
  "method": "GET",
  "description": "Retrieve all posts by a specific user",
  "parameters": [
    { "name": "id", "type": "string", "description": "User ID" }
  ]
}
```

**Response (200):**
```json
{
  "tag": "UserPosts",
  "category": "User Management",
  "confidence": 0.95,
  "alternatives": ["Posts", "GetUserPosts"]
}
```

---

### Apply Endpoint Tag

Apply a tag to an endpoint in the specification.

**Endpoint:** `POST /apply-endpoint-tag`

**Request:**
```json
{
  "specId": "spec_123",
  "endpoint": "/users/{id}/posts",
  "method": "GET",
  "tag": "UserPosts"
}
```

**Response (200):**
```json
{
  "success": true,
  "specId": "spec_123",
  "appliedTags": 1
}
```

---

### Generate Endpoint Fixes

Generate fixes for API specification issues.

**Endpoint:** `POST /generate-spec-fix`

**Request:**
```json
{
  "specId": "spec_123",
  "issueType": "missing-authentication",
  "endpoint": "/users",
  "severity": "warning"
}
```

**Response (200):**
```json
{
  "fixes": [
    {
      "type": "add-security-scheme",
      "endpoint": "/users",
      "suggestion": "Add Bearer token authentication",
      "implementation": {
        "security": ["bearerAuth"],
        "securitySchemes": {
          "bearerAuth": {
            "type": "http",
            "scheme": "bearer"
          }
        }
      }
    }
  ]
}
```

---

### Apply Spec Fix

Apply a suggested fix to the specification.

**Endpoint:** `POST /apply-spec-fix`

**Request:**
```json
{
  "specId": "spec_123",
  "fixId": "fix_789",
  "endpoint": "/users",
  "fix": { /* fix object */ }
}
```

**Response (200):**
```json
{
  "success": true,
  "specId": "spec_123",
  "changes": 1
}
```

---

### Compare Specifications

Compare two API specifications and highlight differences.

**Endpoint:** `POST /compare-specs`

**Request:**
```json
{
  "spec1Id": "spec_123",
  "spec2Id": "spec_456"
}
```

**Response (200):**
```json
{
  "comparison": {
    "added": [
      {
        "type": "endpoint",
        "path": "/new-endpoint",
        "method": "POST"
      }
    ],
    "removed": [
      {
        "type": "endpoint",
        "path": "/deprecated",
        "method": "GET"
      }
    ],
    "modified": [
      {
        "type": "parameter",
        "endpoint": "/users",
        "change": "Added 'filter' parameter"
      }
    ],
    "compatibility": "breaking"
  }
}
```

---

### Generate Flowchart

Generate a visual flowchart of the API.

**Endpoint:** `POST /generate-diagram`

**Request:**
```json
{
  "specId": "spec_123",
  "format": "mermaid",
  "includeAuthentication": true
}
```

**Response (200):**
```json
{
  "diagram": "graph TD; A[Client] -->|GET| B[/users]; B -->|Response| C[User List]; ...",
  "format": "mermaid",
  "nodes": 12,
  "edges": 15
}
```

---

### Generate Questions

Generate common questions about an API specification.

**Endpoint:** `POST /generate-questions`

**Request:**
```json
{
  "specId": "spec_123",
  "count": 5,
  "difficulty": "intermediate"
}
```

**Response (200):**
```json
{
  "questions": [
    {
      "id": "q_1",
      "question": "What authentication method is used?",
      "difficulty": "easy",
      "category": "Authentication"
    },
    {
      "id": "q_2",
      "question": "How do you paginate through large result sets?",
      "difficulty": "intermediate",
      "category": "Pagination"
    }
  ]
}
```

---

### Chat with API

Ask questions about an API specification using AI.

**Endpoint:** `POST /ask`

**Request:**
```json
{
  "message": "How do I authenticate with this API?",
  "specId": "spec_123",
  "context": ["authentication", "oauth"]
}
```

**Response (200):**
```json
{
  "answer": "The API uses OAuth 2.0 for authentication. You need to...",
  "sources": ["#/components/securitySchemes/oauth2"],
  "relatedQuestions": [
    "How do I refresh tokens?",
    "What scopes are available?"
  ]
}
```

---

### Get History

Retrieve user's analysis history.

**Endpoint:** `GET /history`

**Query Parameters:**
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `specId`: Filter by spec ID (optional)

**Response (200):**
```json
{
  "history": [
    {
      "id": "analysis_456",
      "specId": "spec_123",
      "fileName": "my-api-spec",
      "timestamp": "2024-01-15T10:30:00Z",
      "type": "analysis",
      "status": "completed"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

### Paste Specification

Paste an OpenAPI specification as text instead of uploading a file.

**Endpoint:** `POST /paste`

**Request:**
```json
{
  "content": "openapi: 3.0.0\ninfo:\n  title: My API\n  version: 1.0.0\n...",
  "format": "yaml",
  "fileName": "my-api-spec"
}
```

**Response (200):**
```json
{
  "id": "spec_789",
  "fileName": "my-api-spec",
  "format": "yaml",
  "endpoints": 10,
  "summary": "REST API with 10 endpoints"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "field_name",
      "issue": "Specific issue description"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `INVALID_INPUT` - Request validation failed
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

---

## Rate Limiting

API rate limits:
- Anonymous: 10 requests/minute
- Authenticated: 100 requests/minute
- Premium: 1000 requests/minute

Rate limit info in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705320600
```

---

## Webhooks (Coming Soon)

Subscribe to events:
- Spec uploaded
- Analysis completed
- Fix applied
- Comparison generated

---

## Examples

### Complete Analysis Workflow

```bash
# 1. Upload specification
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer jwt_token" \
  -F "file=@openapi.yaml" \
  -F "fileName=my-api"

# 2. Analyze specification
curl -X POST http://localhost:3000/api/analyze \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "specId": "spec_123",
    "includeFlowchart": true
  }'

# 3. Generate endpoint tags
curl -X POST http://localhost:3000/api/generate-endpoint-tag \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/users",
    "method": "GET",
    "description": "Get all users"
  }'
```

---

## Support

For API issues or questions:
- Check this documentation
- Review GitHub issues
- Contact support team

**Last Updated**: January 2024

import YAML from 'js-yaml'
import SwaggerParser from '@apidevtools/swagger-parser'

export async function parseOpenAPIFile(file) {
  try {
    const text = await file.text()
    let spec

    // Parse based on file extension
    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      spec = YAML.load(text)
    } else if (file.name.endsWith('.json')) {
      spec = JSON.parse(text)
    } else {
      throw new Error('Unsupported file format')
    }

    // Validate OpenAPI spec
    const api = await SwaggerParser.validate(spec)
    
    return {
      success: true,
      spec: api,
      endpoints: extractEndpoints(api),
      info: api.info || {},
      servers: api.servers || []
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      spec: null
    }
  }
}

export async function parsePDFFile(file) {
  try {
    // This would be handled server-side with pdf-parse
    // For now, return a mock response
    return {
      success: true,
      rawText: 'PDF parsing will be implemented server-side',
      filename: file.name,
      size: file.size
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function extractEndpoints(spec) {
  const endpoints = []
  
  if (spec.paths) {
    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          endpoints.push({
            method: method.toUpperCase(),
            path: path,
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            tags: operation.tags || [],
            parameters: operation.parameters || [],
            security: operation.security || spec.security || []
          })
        }
      })
    })
  }
  
  return endpoints
}

export function validateFileType(file) {
  const allowedTypes = ['.yaml', '.yml', '.json', '.pdf']
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
  
  return allowedTypes.includes(fileExtension)
} 
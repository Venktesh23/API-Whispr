/**
 * Request logging and monitoring utility
 * Logs all API requests with timing and error information
 */

const logStore = []
const MAX_LOGS = 10000 // Keep last 10k logs in memory

/**
 * Log an API request
 * @param {Object} logData - Log information
 */
export function logRequest(logData) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...logData,
  }

  logStore.push(entry)

  // Keep only last MAX_LOGS entries
  if (logStore.length > MAX_LOGS) {
    logStore.shift()
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${entry.timestamp}] ${entry.method} ${entry.route} - ${entry.status} (${entry.duration}ms)`)
    if (entry.error) {
      console.error('Error:', entry.error)
    }
  }

  // TODO: Send to external service (Datadog, LogRocket, etc.)
  // if (process.env.LOG_SERVICE_KEY) {
  //   sendToExternalLoggingService(entry)
  // }

  return entry
}

/**
 * Middleware to automatically log API requests
 * Usage: await logAPIRequest(req, res, 'endpoint-name', async () => { ... })
 */
export async function logAPIRequest(req, res, endpoint, handler) {
  const startTime = Date.now()
  let statusCode = 200
  let errorMessage = null

  try {
    // Patch res.status to capture status code
    const originalStatus = res.status.bind(res)
    res.status = function (code) {
      statusCode = code
      return originalStatus(code)
    }

    // Execute the handler
    await handler()

    // Log successful request
    logRequest({
      method: req.method,
      route: `${req.url}`,
      endpoint,
      status: statusCode,
      duration: Date.now() - startTime,
      userId: req.userId || 'anonymous',
      userAgent: req.headers['user-agent'],
    })
  } catch (error) {
    statusCode = 500
    errorMessage = error.message
    
    // Log error request
    logRequest({
      method: req.method,
      route: req.url,
      endpoint,
      status: statusCode,
      duration: Date.now() - startTime,
      userId: req.userId || 'anonymous',
      error: errorMessage,
      userAgent: req.headers['user-agent'],
    })

    throw error
  }
}

/**
 * Get all logs
 * @param {Object} options - { limit, startTime, endTime, endpoint, status }
 * @returns {Array} - Log entries filtered by options
 */
export function getLogs(options = {}) {
  let logs = [...logStore]

  if (options.endpoint) {
    logs = logs.filter(log => log.endpoint === options.endpoint)
  }

  if (options.status) {
    logs = logs.filter(log => log.status === options.status)
  }

  if (options.startTime) {
    const startTs = new Date(options.startTime).getTime()
    logs = logs.filter(log => new Date(log.timestamp).getTime() >= startTs)
  }

  if (options.endTime) {
    const endTs = new Date(options.endTime).getTime()
    logs = logs.filter(log => new Date(log.timestamp).getTime() <= endTs)
  }

  // Return most recent first
  logs.reverse()

  if (options.limit) {
    logs = logs.slice(0, options.limit)
  }

  return logs
}

/**
 * Get monitoring statistics
 */
export function getMonitoringStats() {
  if (logStore.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorCount: 0,
      errorRate: 0,
      requestsByStatus: {},
      requestsByEndpoint: {},
    }
  }

  const totalRequests = logStore.length
  const errors = logStore.filter(log => log.status >= 400)
  const errorCount = errors.length
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : 0

  const avgDuration = logStore.reduce((sum, log) => sum + (log.duration || 0), 0) / totalRequests
  const averageResponseTime = Math.round(avgDuration)

  // Group by status
  const requestsByStatus = {}
  logStore.forEach(log => {
    const status = log.status || 500
    requestsByStatus[status] = (requestsByStatus[status] || 0) + 1
  })

  // Group by endpoint
  const requestsByEndpoint = {}
  logStore.forEach(log => {
    const endpoint = log.endpoint || 'unknown'
    requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1
  })

  return {
    totalRequests,
    averageResponseTime,
    errorCount,
    errorRate: `${errorRate}%`,
    requestsByStatus,
    requestsByEndpoint,
    logsStored: logStore.length,
    oldestLog: logStore[0]?.timestamp,
    newestLog: logStore[logStore.length - 1]?.timestamp,
  }
}

/**
 * Clear logs (for testing or manual cleanup)
 */
export function clearLogs() {
  logStore.length = 0
}

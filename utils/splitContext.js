export function splitOpenAPIForGPT(spec, maxTokens = 3000) {
  // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
  const estimateTokens = (text) => Math.ceil(text.length / 4)
  
  const chunks = []
  const specString = JSON.stringify(spec, null, 2)
  
  if (estimateTokens(specString) <= maxTokens) {
    return [spec]
  }
  
  // Split by paths if too large
  if (spec.paths) {
    const baseSpec = { ...spec }
    delete baseSpec.paths
    
    const pathChunks = []
    let currentChunk = {}
    let currentSize = estimateTokens(JSON.stringify(baseSpec))
    
    Object.entries(spec.paths).forEach(([path, methods]) => {
      const pathString = JSON.stringify({ [path]: methods })
      const pathTokens = estimateTokens(pathString)
      
      if (currentSize + pathTokens > maxTokens && Object.keys(currentChunk).length > 0) {
        pathChunks.push({ ...baseSpec, paths: currentChunk })
        currentChunk = {}
        currentSize = estimateTokens(JSON.stringify(baseSpec))
      }
      
      currentChunk[path] = methods
      currentSize += pathTokens
    })
    
    if (Object.keys(currentChunk).length > 0) {
      pathChunks.push({ ...baseSpec, paths: currentChunk })
    }
    
    return pathChunks
  }
  
  return [spec]
}

export function findRelevantChunk(chunks, question) {
  // Simple keyword matching to find most relevant chunk
  const questionLower = question.toLowerCase()
  const keywords = questionLower.split(' ').filter(word => word.length > 2)
  
  let bestChunk = chunks[0]
  let bestScore = 0
  
  chunks.forEach(chunk => {
    const chunkText = JSON.stringify(chunk).toLowerCase()
    let score = 0
    
    keywords.forEach(keyword => {
      const matches = (chunkText.match(new RegExp(keyword, 'g')) || []).length
      score += matches
    })
    
    if (score > bestScore) {
      bestScore = score
      bestChunk = chunk
    }
  })
  
  return bestChunk
} 
import { parseStreamResponse } from '../../lib/streaming'

/**
 * Updated chat page example showing proper streaming integration
 * This demonstrates how to use the improved streaming utilities
 */

export async function sendMessageWithStreaming(
  question,
  currentSpec,
  user,
  onChunkReceived
) {
  const streamingOptions = {
    chunkType: 'semantic', // or 'fixed', 'wordBoundary'
    chunkSize: 256,
    delayMs: 15,
  }

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        spec: currentSpec.parsed_spec || currentSpec.raw_text,
        specType: currentSpec.filetype,
        specId: currentSpec.id,
        userId: user.id,
        streamingOptions,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to get response`)
    }

    // Use the streaming parser utility
    let fullText = ''
    let metadata = null

    await parseStreamResponse(response, {
      onMetadata: (data) => {
        metadata = data
        console.log('Stream metadata:', data)
      },
      onText: (text) => {
        fullText += text
        onChunkReceived?.(text, fullText)
      },
      onChunk: (data) => {
        // Detailed chunk info if needed
        console.debug('Chunk received:', data.index + 1, 'of', data.total)
      },
      onDone: (data) => {
        console.log('Stream complete:', data)
      },
      onError: (error) => {
        console.error('Stream error:', error)
        throw new Error(error)
      },
    })

    return {
      success: true,
      answer: fullText,
      metadata,
    }
  } catch (error) {
    console.error('Chat streaming error:', error)
    throw error
  }
}

/**
 * Example React hook for streaming chat
 */
export function useStreamingChat() {
  const [messages, setMessages] = useState([])
  const [currentStream, setCurrentStream] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const sendMessage = async (
    question,
    currentSpec,
    user
  ) => {
    if (!currentSpec) return

    setIsStreaming(true)
    setCurrentStream('')

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      },
    ])

    // Add empty assistant message that will be filled
    const assistantMsg = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const result = await sendMessageWithStreaming(
        question,
        currentSpec,
        user,
        (chunk, fullText) => {
          setCurrentStream(fullText)
          // Update the assistant message as streaming happens
          setMessages((prev) => {
            const updated = [...prev]
            const lastIdx = updated.length - 1
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: fullText,
              }
            }
            return updated
          })
        }
      )

      // Mark as no longer streaming
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            streaming: false,
          }
        }
        return updated
      })

      // Save to database
      if (user?.id && currentSpec?.id) {
        await fetch('/api/chat-rls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            specId: currentSpec.id,
            question,
            answer: result.answer,
          }),
        })
      }

      return result
    } catch (error) {
      console.error('Error in streaming chat:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
          streaming: false,
        },
      ])
      throw error
    } finally {
      setIsStreaming(false)
      setCurrentStream('')
    }
  }

  return {
    messages,
    isStreaming,
    currentStream,
    sendMessage,
  }
}

/**
 * Usage example in a React component:
 * 
 * export default function ChatComponent() {
 *   const { messages, isStreaming, sendMessage } = useStreamingChat()
 *   const { user } = useSupabase()
 *   const [currentSpec, setCurrentSpec] = useState(null)
 * 
 *   const handleSendMessage = async (question) => {
 *     try {
 *       await sendMessage(question, currentSpec, user)
 *     } catch (error) {
 *       console.error('Failed to send message:', error)
 *     }
 *   }
 * 
 *   return (
 *     <div>
 *       <MessageList messages={messages} isStreaming={isStreaming} />
 *       <MessageInput onSend={handleSendMessage} disabled={isStreaming} />
 *     </div>
 *   )
 * }
 */

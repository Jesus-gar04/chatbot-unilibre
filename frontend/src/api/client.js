import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE_URL, timeout: 30000 })

// Attach Bearer token when present
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

/**
 * Stream a chat query via SSE-over-fetch (POST).
 * onToken(str) — called for each streamed token
 * onDone(sources[]) — called with source list when stream ends
 * onError(msg) — called on network / parse errors
 */
export async function streamChat(query, history, onToken, onDone, onError) {
  try {
    const resp = await fetch(`${BASE_URL}/chat/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history }),
    })

    if (!resp.ok) {
      onError('Error al conectar con el servidor.')
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.done) {
            onDone(data.sources || [])
          } else if (data.token) {
            onToken(data.token)
          }
        } catch {
          // malformed SSE line — skip
        }
      }
    }
  } catch (err) {
    onError('No se pudo conectar con el servidor. Intente de nuevo.')
  }
}

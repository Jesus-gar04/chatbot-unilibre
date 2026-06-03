import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Timeout general para peticiones normales (login, listar docs, etc.)
export const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 })

// Instancia separada para uploads: el backend necesita despertar en Render,
// descargar el modelo de embeddings y procesar el documento — puede tardar
// hasta 5 minutos en el primer uso o con PDFs grandes.
export const uploadApi = axios.create({ baseURL: BASE_URL, timeout: 300_000 })

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    uploadApi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
    delete uploadApi.defaults.headers.common['Authorization']
  }
}

/**
 * Stream chat via SSE-over-fetch (POST).
 * onToken(str)            — token a token mientras el LLM genera
 * onDone(formats)         — cuando termina, con lista de formatos descargables
 * onError(msg)            — ante cualquier fallo de red
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
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.done) {
            onDone(data.formats || [])
          } else if (data.token) {
            onToken(data.token)
          }
        } catch {
          // línea SSE malformada — ignorar
        }
      }
    }
  } catch {
    onError('No se pudo conectar con el servidor. Intente de nuevo.')
  }
}

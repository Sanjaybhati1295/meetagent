import 'dotenv/config'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  transcribeWithGroq,
  generateMoMWithGroq,
  generateMoMWithGemini
} from './services.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')
const PORT = process.env.PORT || 3000

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.mp3': 'audio/mpeg',
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message })
}

async function collectRequestBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  // --- API Endpoints ---
  if (pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    })
  }

  if (pathname === '/api/transcribe' && req.method === 'POST') {
    try {
      const contentType = req.headers['content-type'] || 'audio/webm'
      const rawBody = await collectRequestBody(req)

      if (!rawBody || rawBody.length === 0) {
        return sendError(res, 400, 'No audio data received')
      }

      let audioBuffer = rawBody
      let filename = url.searchParams.get('filename') || 'audio.webm'

      if (contentType.includes('application/json')) {
        const bodyJson = JSON.parse(rawBody.toString('utf-8'))
        if (!bodyJson.audio) {
          return sendError(res, 400, 'Missing "audio" base64 property in JSON payload')
        }
        audioBuffer = Buffer.from(bodyJson.audio, 'base64')
        if (bodyJson.filename) filename = bodyJson.filename
      }

      const result = await transcribeWithGroq(audioBuffer, filename)
      return sendJson(res, 200, result)
    } catch (err) {
      console.error('Transcription error:', err)
      return sendError(res, 500, err.message || 'Failed to transcribe audio')
    }
  }

  if (pathname === '/api/mom' && req.method === 'POST') {
    try {
      const rawBody = await collectRequestBody(req)
      const { transcript, provider = 'groq' } = JSON.parse(rawBody.toString('utf-8') || '{}')

      if (!transcript || !transcript.trim()) {
        return sendError(res, 400, 'Transcript is required to generate MoM')
      }

      let result
      if (provider === 'gemini') {
        result = await generateMoMWithGemini(transcript)
      } else if (provider === 'groq') {
        result = await generateMoMWithGroq(transcript)
      } else {
        return sendError(res, 400, `Unsupported provider "${provider}". Use "groq" or "gemini".`)
      }

      return sendJson(res, 200, {
        mom: result.text,
        latencyMs: result.latencyMs,
        provider,
      })
    } catch (err) {
      console.error('MoM generation error:', err)
      return sendError(res, 500, err.message || 'Failed to generate MoM')
    }
  }

  // --- Static File Serving ---
  if (req.method === 'GET' || req.method === 'HEAD') {
    let filePath = pathname === '/' ? 'index.html' : pathname
    const safePath = normalize(filePath).replace(/^(\.\.[/\\])+/, '')
    const targetFile = join(PUBLIC_DIR, safePath)

    if (existsSync(targetFile)) {
      try {
        const ext = extname(targetFile).toLowerCase()
        const mime = MIME_TYPES[ext] || 'application/octet-stream'
        const content = await readFile(targetFile)
        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': content.length,
          'Cache-Control': 'no-cache',
        })
        if (req.method === 'HEAD') {
          res.end()
        } else {
          res.end(content)
        }
        return
      } catch (err) {
        console.error('Error reading static file:', err)
        res.writeHead(500)
        res.end('Server error reading file')
        return
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
    return
  }

  sendError(res, 405, 'Method Not Allowed')
})

server.listen(PORT, () => {
  console.log(`\n🚀 MeetAgent UI running at: http://localhost:${PORT}`)
  console.log(`   Audio STT Provider : Groq Whisper (large-v3-turbo)`)
  console.log(`   MoM LLM Providers  : Groq (Llama 3.3 / GPT-OSS) & Gemini (3.6-flash)\n`)
})

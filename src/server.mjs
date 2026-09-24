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
import {
  registerUser,
  loginUser,
  getUserByToken,
  invalidateSession,
  saveMeeting,
  getUserMeetings,
  getMeetingById,
  deleteMeeting,
  IS_SUPABASE_CONFIGURED,
  SUPABASE_URL
} from './db.mjs'
import {
  sendMeetingEmail,
  isEmailConfigured,
  getEmailProviderName
} from './email.mjs'

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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function extractToken(req) {
  const authHeader = req.headers['authorization'] || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  // Check cookie fallback
  const cookies = req.headers['cookie'] || ''
  const match = cookies.match(/meetagent_token=([^;]+)/)
  return match ? match[1] : null
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return
  }

  // --- Auth & Meeting Middleware Helper ---
  const token = extractToken(req)
  let user = null
  try {
    user = token ? await getUserByToken(token) : null
  } catch (err) {
    console.warn('Auth token verification error:', err.message)
  }

  // --- API Endpoints ---
  if (pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      emailConfigured: isEmailConfigured(),
      emailProvider: getEmailProviderName(),
    })
  }

  // --- Authentication Routes ---
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const rawBody = await collectRequestBody(req)
      const { name, email, password } = JSON.parse(rawBody.toString('utf-8') || '{}')
      const result = await registerUser(name, email, password)
      return sendJson(res, 201, result)
    } catch (err) {
      return sendError(res, 400, err.message)
    }
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const rawBody = await collectRequestBody(req)
      const { email, password } = JSON.parse(rawBody.toString('utf-8') || '{}')
      const result = await loginUser(email, password)
      return sendJson(res, 200, result)
    } catch (err) {
      return sendError(res, 401, err.message)
    }
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    if (token) {
      try {
        await invalidateSession(token)
      } catch {}
    }
    return sendJson(res, 200, { success: true })
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    return sendJson(res, 200, { user })
  }

  // --- Meetings Database Routes ---
  if (pathname === '/api/meetings' && req.method === 'GET') {
    if (!user || !user.id) return sendError(res, 401, 'Please sign in to access your meeting history')
    try {
      const meetings = await getUserMeetings(user.id)
      return sendJson(res, 200, { meetings })
    } catch (err) {
      return sendError(res, 500, err.message)
    }
  }

  if (pathname === '/api/meetings' && req.method === 'POST') {
    if (!user || !user.id) return sendError(res, 401, 'Please sign in to save meetings')
    try {
      const rawBody = await collectRequestBody(req)
      const meetingData = JSON.parse(rawBody.toString('utf-8') || '{}')
      const saved = await saveMeeting(user.id, meetingData)
      return sendJson(res, 201, { meeting: saved })
    } catch (err) {
      return sendError(res, 400, err.message)
    }
  }

  if (pathname.startsWith('/api/meetings/') && req.method === 'GET') {
    if (!user || !user.id) return sendError(res, 401, 'Unauthorized')
    try {
      const meetingId = pathname.replace('/api/meetings/', '')
      const meeting = await getMeetingById(meetingId, user.id)
      if (!meeting) return sendError(res, 404, 'Meeting not found')
      return sendJson(res, 200, { meeting })
    } catch (err) {
      return sendError(res, 500, err.message)
    }
  }

  if (pathname.startsWith('/api/meetings/') && req.method === 'DELETE') {
    if (!user || !user.id) return sendError(res, 401, 'Unauthorized')
    try {
      const meetingId = pathname.replace('/api/meetings/', '')
      await deleteMeeting(meetingId, user.id)
      return sendJson(res, 200, { success: true })
    } catch (err) {
      return sendError(res, 500, err.message)
    }
  }

  // --- AI Transcription Route ---
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

  // --- AI MoM Generation Route ---
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

  // --- Email MoM Routes ---
  if (pathname === '/api/email/status' && req.method === 'GET') {
    return sendJson(res, 200, {
      configured: isEmailConfigured(),
      provider: getEmailProviderName(),
    })
  }

  if (pathname === '/api/email/send' && req.method === 'POST') {
    if (!user || !user.id) {
      return sendError(res, 401, 'Please sign in to send meeting minutes via email')
    }

    try {
      const rawBody = await collectRequestBody(req)
      const {
        to,
        subject,
        note,
        meetingTitle,
        mom,
        transcript,
      } = JSON.parse(rawBody.toString('utf-8') || '{}')

      if (!to || !to.trim()) {
        return sendError(res, 400, 'Recipient email address is required')
      }

      if (!mom || !mom.trim()) {
        return sendError(res, 400, 'Minutes of Meeting content is required')
      }

      const result = await sendMeetingEmail({
        to,
        subject,
        note,
        meetingTitle: meetingTitle || 'Executive Meeting Sync',
        momText: mom,
        transcriptText: transcript || '',
        senderName: user.name || 'MeetAgent User',
        senderEmail: user.email || null,
      })

      return sendJson(res, 200, {
        success: true,
        provider: result.provider,
        recipients: result.recipients,
        message: `Minutes of Meeting successfully emailed to ${result.recipients.join(', ')}`,
      })
    } catch (err) {
      console.error('Email sending error:', err)
      return sendError(res, 500, err.message || 'Failed to dispatch email')
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
  const dbEngine = IS_SUPABASE_CONFIGURED
    ? `Supabase Cloud (${SUPABASE_URL})`
    : 'SQLite (data/meetagent.db)'
  const emailService = isEmailConfigured()
    ? `Configured (${getEmailProviderName()})`
    : 'Client Mailto Fallback (Set SMTP_HOST or RESEND_API_KEY in .env to enable direct dispatch)'
  console.log(`\n🚀 MeetAgent running at: http://localhost:${PORT}`)
  console.log(`   Database Engine    : ${dbEngine}`)
  console.log(`   Audio STT Provider : Groq Whisper (large-v3-turbo)`)
  console.log(`   MoM LLM Providers  : Groq & Gemini`)
  console.log(`   Email Service      : ${emailService}\n`)
})

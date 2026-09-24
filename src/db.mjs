import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')

export const SUPABASE_URL = process.env.SUPABASE_URL
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
export const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY)

let supabase = null
let localDb = null

if (IS_SUPABASE_CONFIGURED) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log(`📦 Database: Connected to Supabase Cloud (${SUPABASE_URL})`)
} else {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  const DB_PATH = join(DATA_DIR, 'meetagent.db')
  localDb = new DatabaseSync(DB_PATH)

  // Initialize SQLite Schema
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      audio_source TEXT DEFAULT 'mic',
      duration_sec REAL DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      transcript TEXT NOT NULL,
      mom_raw TEXT NOT NULL,
      summary TEXT,
      decisions TEXT,
      actions TEXT,
      ai_model TEXT DEFAULT 'groq',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
  console.log(`📦 Database: Using SQLite (data/meetagent.db). Set SUPABASE_URL & SUPABASE_ANON_KEY in .env to use Supabase.`)
}

// Password Helpers
function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

function verifyPassword(password, hash, salt) {
  try {
    const testHash = scryptSync(password, salt, 64).toString('hex')
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'))
  } catch {
    return false
  }
}

// ============================================================================
// User & Auth Operations
// ============================================================================
export async function registerUser(name, email, password) {
  email = (email || '').toLowerCase().trim()
  name = (name || '').trim() || email.split('@')[0]

  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address')
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }

  const userId = `usr_${randomUUID()}`
  const { hash, salt } = hashPassword(password)
  const now = new Date().toISOString()

  if (IS_SUPABASE_CONFIGURED) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
    if (existing) throw new Error('An account with this email already exists')

    const { error } = await supabase.from('users').insert({
      id: userId,
      name,
      email,
      password_hash: hash,
      salt,
      created_at: now
    })
    if (error) throw new Error(error.message)
  } else {
    const checkStmt = localDb.prepare('SELECT id FROM users WHERE email = ?')
    if (checkStmt.get(email)) throw new Error('An account with this email already exists')

    const insertStmt = localDb.prepare(`
      INSERT INTO users (id, name, email, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertStmt.run(userId, name, email, hash, salt, now)
  }

  const token = await createSession(userId)
  return {
    user: { id: userId, name, email, createdAt: now },
    token
  }
}

export async function loginUser(email, password) {
  email = (email || '').toLowerCase().trim()
  if (!email || !password) throw new Error('Email and password are required')

  let user = null
  if (IS_SUPABASE_CONFIGURED) {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle()
    if (error || !data) throw new Error('Invalid email or password')
    user = data
  } else {
    const stmt = localDb.prepare('SELECT id, name, email, password_hash, salt, created_at FROM users WHERE email = ?')
    user = stmt.get(email)
  }

  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    throw new Error('Invalid email or password')
  }

  const token = await createSession(user.id)
  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    token
  }
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  if (IS_SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('sessions').insert({
      token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expiresAt
    })
    if (error) throw new Error(error.message)
  } else {
    const stmt = localDb.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(token, userId, now.toISOString(), expiresAt)
  }

  return token
}

export async function getUserByToken(token) {
  if (!token) return null

  if (IS_SUPABASE_CONFIGURED) {
    const { data: session } = await supabase.from('sessions').select('user_id, expires_at').eq('token', token).maybeSingle()
    if (!session) return null
    if (new Date(session.expires_at) < new Date()) {
      await invalidateSession(token)
      return null
    }

    const { data: user } = await supabase.from('users').select('id, name, email, created_at').eq('id', session.user_id).maybeSingle()
    return user ? { id: user.id, name: user.name, email: user.email, createdAt: user.created_at } : null
  } else {
    const stmt = localDb.prepare(`
      SELECT u.id, u.name, u.email, u.created_at, s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `)
    const result = stmt.get(token)
    if (!result) return null

    if (new Date(result.expires_at) < new Date()) {
      await invalidateSession(token)
      return null
    }

    return {
      id: result.id,
      name: result.name,
      email: result.email,
      createdAt: result.created_at
    }
  }
}

export async function invalidateSession(token) {
  if (!token) return
  if (IS_SUPABASE_CONFIGURED) {
    await supabase.from('sessions').delete().eq('token', token)
  } else {
    const stmt = localDb.prepare('DELETE FROM sessions WHERE token = ?')
    stmt.run(token)
  }
}

// ============================================================================
// Meeting Operations
// ============================================================================
export async function saveMeeting(userId, meeting) {
  if (!userId) {
    throw new Error('User ID is required to save a meeting')
  }
  const id = `meet_${randomUUID()}`
  const now = new Date().toISOString()
  const title = (meeting.title || '').trim() || `Meeting on ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`

  const payload = {
    id,
    user_id: userId,
    title,
    audio_source: meeting.audioSource || 'mic',
    duration_sec: meeting.durationSec || 0,
    word_count: meeting.wordCount || 0,
    transcript: meeting.transcript || '',
    mom_raw: meeting.momRaw || '',
    summary: typeof meeting.summary === 'string' ? meeting.summary : JSON.stringify(meeting.summary || ''),
    decisions: typeof meeting.decisions === 'object' ? JSON.stringify(meeting.decisions) : String(meeting.decisions || ''),
    actions: typeof meeting.actions === 'object' ? JSON.stringify(meeting.actions) : String(meeting.actions || ''),
    ai_model: meeting.aiModel || 'groq',
    created_at: now
  }

  if (IS_SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('meetings').insert(payload)
    if (error) throw new Error(error.message)
    return payload
  } else {
    const stmt = localDb.prepare(`
      INSERT INTO meetings (
        id, user_id, title, audio_source, duration_sec, word_count,
        transcript, mom_raw, summary, decisions, actions, ai_model, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      payload.id,
      payload.user_id,
      payload.title,
      payload.audio_source,
      payload.duration_sec,
      payload.word_count,
      payload.transcript,
      payload.mom_raw,
      payload.summary,
      payload.decisions,
      payload.actions,
      payload.ai_model,
      payload.created_at
    )
    return payload
  }
}

export async function getUserMeetings(userId) {
  if (IS_SUPABASE_CONFIGURED) {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, audio_source, duration_sec, word_count, transcript, mom_raw, summary, decisions, actions, ai_model, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  } else {
    const stmt = localDb.prepare(`
      SELECT id, title, audio_source, duration_sec, word_count, transcript, mom_raw, summary, decisions, actions, ai_model, created_at
      FROM meetings
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(userId)
  }
}

export async function getMeetingById(id, userId) {
  if (IS_SUPABASE_CONFIGURED) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  } else {
    const stmt = localDb.prepare(`
      SELECT * FROM meetings WHERE id = ? AND user_id = ?
    `)
    return stmt.get(id, userId)
  }
}

export async function deleteMeeting(id, userId) {
  if (IS_SUPABASE_CONFIGURED) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  } else {
    const stmt = localDb.prepare(`
      DELETE FROM meetings WHERE id = ? AND user_id = ?
    `)
    stmt.run(id, userId)
  }
}

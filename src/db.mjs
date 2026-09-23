import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = join(DATA_DIR, 'meetagent.db')
const db = new DatabaseSync(DB_PATH)

// Initialize Schema
db.exec(`
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

// User & Auth Operations
export function registerUser(name, email, password) {
  email = (email || '').toLowerCase().trim()
  name = (name || '').trim() || email.split('@')[0]

  if (!email || !email.includes('@')) {
    throw new Error('Please provide a valid email address')
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }

  // Check existing
  const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?')
  const existing = checkStmt.get(email)
  if (existing) {
    throw new Error('An account with this email already exists')
  }

  const userId = `usr_${randomUUID()}`
  const { hash, salt } = hashPassword(password)
  const now = new Date().toISOString()

  const insertStmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertStmt.run(userId, name, email, hash, salt, now)

  const token = createSession(userId)
  return {
    user: { id: userId, name, email, createdAt: now },
    token
  }
}

export function loginUser(email, password) {
  email = (email || '').toLowerCase().trim()
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const stmt = db.prepare('SELECT id, name, email, password_hash, salt, created_at FROM users WHERE email = ?')
  const user = stmt.get(email)

  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    throw new Error('Invalid email or password')
  }

  const token = createSession(user.id)
  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    token
  }
}

export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

  const stmt = db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(token, userId, now.toISOString(), expiresAt)
  return token
}

export function getUserByToken(token) {
  if (!token) return null
  const stmt = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at, s.expires_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `)
  const result = stmt.get(token)
  if (!result) return null

  // Check expiry
  if (new Date(result.expires_at) < new Date()) {
    invalidateSession(token)
    return null
  }

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    createdAt: result.created_at
  }
}

export function invalidateSession(token) {
  if (!token) return
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?')
  stmt.run(token)
}

// Meeting Operations
export function saveMeeting(userId, meeting) {
  const id = `meet_${randomUUID()}`
  const now = new Date().toISOString()
  const title = (meeting.title || '').trim() || `Meeting on ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`

  const stmt = db.prepare(`
    INSERT INTO meetings (
      id, user_id, title, audio_source, duration_sec, word_count,
      transcript, mom_raw, summary, decisions, actions, ai_model, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    userId,
    title,
    meeting.audioSource || 'mic',
    meeting.durationSec || 0,
    meeting.wordCount || 0,
    meeting.transcript || '',
    meeting.momRaw || '',
    meeting.summary || '',
    meeting.decisions || '',
    meeting.actions || '',
    meeting.aiModel || 'groq',
    now
  )

  return getMeetingById(id, userId)
}

export function getUserMeetings(userId) {
  const stmt = db.prepare(`
    SELECT id, title, audio_source, duration_sec, word_count, summary, decisions, actions, ai_model, created_at
    FROM meetings
    WHERE user_id = ?
    ORDER BY created_at DESC
  `)
  return stmt.all(userId)
}

export function getMeetingById(id, userId) {
  const stmt = db.prepare(`
    SELECT * FROM meetings WHERE id = ? AND user_id = ?
  `)
  return stmt.get(id, userId)
}

export function deleteMeeting(id, userId) {
  const stmt = db.prepare(`
    DELETE FROM meetings WHERE id = ? AND user_id = ?
  `)
  stmt.run(id, userId)
}

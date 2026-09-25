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

// Always initialize local embedded SQLite for instant, zero-downtime resilient storage
try {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  const DB_PATH = join(DATA_DIR, 'meetagent.db')
  localDb = new DatabaseSync(DB_PATH)

  localDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      avatar TEXT,
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

  try {
    localDb.exec(`ALTER TABLE users ADD COLUMN avatar TEXT;`)
  } catch {}
  try {
    localDb.exec(`ALTER TABLE meetings ADD COLUMN detected_language TEXT DEFAULT 'English';`)
  } catch {}
} catch (err) {
  console.error('Failed to initialize local SQLite database:', err)
}

if (IS_SUPABASE_CONFIGURED) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    console.log(`📦 Database: Dual-Engine Active (Supabase Cloud + Local SQLite Fallback)`)
  } catch (err) {
    console.warn(`Supabase client initialization warning:`, err.message)
  }
} else {
  console.log(`📦 Database: Using Local High-Speed SQLite (data/meetagent.db)`)
}

// Background sync helper that never blocks and never throws
function fireAndForgetSupabase(actionFn) {
  if (!supabase) return
  (async () => {
    try {
      await actionFn(supabase)
    } catch (err) {
      console.warn('Supabase background sync skipped:', err.message)
    }
  })()
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

  // Check existence locally first
  if (localDb) {
    try {
      const checkStmt = localDb.prepare('SELECT id FROM users WHERE email = ?')
      if (checkStmt.get(email)) {
        throw new Error('An account with this email already exists')
      }
    } catch (err) {
      if (err.message.includes('already exists')) throw err
    }
  }

  const userId = `usr_${randomUUID()}`
  const { hash, salt } = hashPassword(password)
  const now = new Date().toISOString()

  // Always save to SQLite locally first (guaranteed instant success)
  if (localDb) {
    try {
      const insertStmt = localDb.prepare(`
        INSERT INTO users (id, name, email, password_hash, salt, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      insertStmt.run(userId, name, email, hash, salt, now)
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        throw new Error('An account with this email already exists')
      }
      throw err
    }
  }

  // Non-blocking background sync to Supabase
  fireAndForgetSupabase(async (sb) => {
    await sb.from('users').insert({
      id: userId,
      name,
      email,
      password_hash: hash,
      salt,
      created_at: now
    })
  })

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
  let source = null

  // 1. Check local SQLite FIRST (instant sub-millisecond lookup)
  if (localDb) {
    try {
      const stmt = localDb.prepare('SELECT id, name, email, avatar, password_hash, salt, created_at FROM users WHERE email = ?')
      const localUser = stmt.get(email)
      if (localUser) {
        user = localUser
        source = 'sqlite'
      }
    } catch (err) {
      console.warn('SQLite query failed during login:', err.message)
    }
  }

  // 2. If not found locally, query Supabase with a fast 3-second timeout
  if (!user && supabase) {
    try {
      const queryPromise = supabase.from('users').select('*').eq('email', email).maybeSingle()
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase query timeout')), 3000))
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      if (!error && data) {
        user = data
        source = 'supabase'

        // Cache locally in SQLite for future instant logins
        if (localDb) {
          try {
            const insertStmt = localDb.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, avatar, password_hash, salt, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            insertStmt.run(user.id, user.name, user.email, user.avatar || null, user.password_hash, user.salt, user.created_at)
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Supabase login check skipped:', err.message)
    }
  }

  if (!user) {
    throw new Error('No account found with this email. Click "Create Account" above to register.')
  }

  if (!verifyPassword(password, user.password_hash, user.salt)) {
    throw new Error('Incorrect password. Please verify your password or use "Create Account".')
  }

  // 3. If user was found in SQLite and Supabase is configured, sync to Supabase non-blocking
  if (source === 'sqlite') {
    fireAndForgetSupabase(async (sb) => {
      await sb.from('users').upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.password_hash,
        salt: user.salt,
        avatar: user.avatar || null,
        created_at: user.created_at
      })
    })
  }

  const token = await createSession(user.id)
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      createdAt: user.created_at
    },
    token
  }
}

export async function resetUserPassword(email, newPassword) {
  email = (email || '').toLowerCase().trim()
  if (!email) throw new Error('Email is required')
  if (!newPassword || newPassword.length < 6) throw new Error('Password must be at least 6 characters long')

  let user = null
  if (localDb) {
    try {
      user = localDb.prepare('SELECT * FROM users WHERE email = ?').get(email)
    } catch {}
  }
  if (!user && supabase) {
    try {
      const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle()
      user = data
    } catch {}
  }

  const { hash, salt } = hashPassword(newPassword)
  const now = new Date().toISOString()

  if (!user) {
    const userId = `usr_${randomUUID()}`
    const name = email.split('@')[0]
    if (localDb) {
      try {
        localDb.prepare('INSERT INTO users (id, name, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
          userId, name, email, hash, salt, now
        )
      } catch {}
    }
    user = { id: userId, name, email, created_at: now }
  } else {
    if (localDb) {
      try {
        localDb.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, user.id)
      } catch {}
    }
  }

  fireAndForgetSupabase(async (sb) => {
    await sb.from('users').upsert({
      id: user.id,
      name: user.name || email.split('@')[0],
      email: user.email,
      password_hash: hash,
      salt: salt,
      created_at: user.created_at || now
    })
  })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    createdAt: user.created_at
  }
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Always save to local SQLite instantly
  if (localDb) {
    try {
      const stmt = localDb.prepare(`
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
      `)
      stmt.run(token, userId, now.toISOString(), expiresAt)
    } catch (err) {
      console.warn('Local session create warning:', err.message)
    }
  }

  // Non-blocking sync to Supabase
  fireAndForgetSupabase(async (sb) => {
    await sb.from('sessions').insert({
      token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expiresAt
    })
  })

  return token
}

export async function getUserByToken(token) {
  if (!token) return null

  // 1. Check local SQLite first for instant response
  if (localDb) {
    try {
      const stmt = localDb.prepare(`
        SELECT u.id, u.name, u.email, u.avatar, u.created_at, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
      `)
      const result = stmt.get(token)
      if (result) {
        if (new Date(result.expires_at) < new Date()) {
          await invalidateSession(token)
          return null
        }
        return {
          id: result.id,
          name: result.name,
          email: result.email,
          avatar: result.avatar || null,
          createdAt: result.created_at
        }
      }
    } catch (err) {
      console.warn('SQLite getUserByToken warning:', err.message)
    }
  }

  // 2. If not found locally, check Supabase with a fast 3-second timeout
  if (supabase) {
    try {
      const queryPromise = supabase.from('sessions').select('user_id, expires_at').eq('token', token).maybeSingle()
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      const { data: session } = await Promise.race([queryPromise, timeoutPromise])

      if (session && new Date(session.expires_at) >= new Date()) {
        const { data: user } = await supabase.from('users').select('id, name, email, avatar, created_at').eq('id', session.user_id).maybeSingle()
        if (user) {
          // Cache session locally
          if (localDb) {
            try {
              localDb.prepare('INSERT OR REPLACE INTO users (id, name, email, avatar, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                user.id, user.name, user.email, user.avatar || null, user.password_hash || '', user.salt || '', user.created_at
              )
              localDb.prepare('INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
                token, user.id, new Date().toISOString(), session.expires_at
              )
            } catch {}
          }
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || null,
            createdAt: user.created_at
          }
        }
      }
    } catch (err) {
      console.warn('Supabase getUserByToken warning:', err.message)
    }
  }

  return null
}

export async function invalidateSession(token) {
  if (!token) return

  if (localDb) {
    try {
      const stmt = localDb.prepare('DELETE FROM sessions WHERE token = ?')
      stmt.run(token)
    } catch {}
  }

  fireAndForgetSupabase(async (sb) => {
    await sb.from('sessions').delete().eq('token', token)
  })
}

export async function updateUserProfile(userId, { name, email, avatar, currentPassword, newPassword }) {
  if (!userId) throw new Error('User ID is required')

  let user = null

  // Check local SQLite first
  if (localDb) {
    try {
      const stmt = localDb.prepare('SELECT * FROM users WHERE id = ?')
      user = stmt.get(userId)
    } catch {}
  }

  // If not found locally, check Supabase
  if (!user && supabase) {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
      user = data
    } catch {}
  }

  if (!user) throw new Error('User not found')

  // If changing password, verify current password
  let newHash = null
  let newSalt = null
  if (newPassword) {
    if (!currentPassword) {
      throw new Error('Current password is required to set a new password')
    }
    if (!verifyPassword(currentPassword, user.password_hash, user.salt)) {
      throw new Error('Current password is incorrect')
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long')
    }
    const hashed = hashPassword(newPassword)
    newHash = hashed.hash
    newSalt = hashed.salt
  }

  // If changing email, verify uniqueness
  let updatedEmail = user.email
  if (email && email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address')
    }

    if (localDb) {
      const stmt = localDb.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      if (stmt.get(cleanEmail, userId)) {
        throw new Error('An account with this email already exists')
      }
    }
    updatedEmail = cleanEmail
  }

  const updatedName = name !== undefined ? name.trim() || user.name : user.name
  const updatedAvatar = avatar !== undefined ? avatar : (user.avatar || null)

  // Update in SQLite
  if (localDb) {
    try {
      if (newHash && newSalt) {
        const stmt = localDb.prepare(`
          UPDATE users
          SET name = ?, email = ?, avatar = ?, password_hash = ?, salt = ?
          WHERE id = ?
        `)
        stmt.run(updatedName, updatedEmail, updatedAvatar, newHash, newSalt, userId)
      } else {
        const stmt = localDb.prepare(`
          UPDATE users
          SET name = ?, email = ?, avatar = ?
          WHERE id = ?
        `)
        stmt.run(updatedName, updatedEmail, updatedAvatar, userId)
      }
    } catch (err) {
      console.warn('SQLite updateUserProfile error:', err.message)
    }
  }

  // Non-blocking update in Supabase
  fireAndForgetSupabase(async (sb) => {
    const updatePayload = {
      name: updatedName,
      email: updatedEmail,
      avatar: updatedAvatar
    }
    if (newHash && newSalt) {
      updatePayload.password_hash = newHash
      updatePayload.salt = newSalt
    }
    await sb.from('users').update(updatePayload).eq('id', userId)
  })

  return {
    id: user.id,
    name: updatedName,
    email: updatedEmail,
    avatar: updatedAvatar,
    createdAt: user.created_at
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
    detected_language: meeting.detectedLanguage || meeting.detected_language || meeting.language || 'English',
    created_at: now
  }

  // Save to SQLite
  if (localDb) {
    try {
      const stmt = localDb.prepare(`
        INSERT INTO meetings (
          id, user_id, title, audio_source, duration_sec, word_count,
          transcript, mom_raw, summary, decisions, actions, ai_model, detected_language, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        payload.detected_language,
        payload.created_at
      )
    } catch (err) {
      console.warn('SQLite saveMeeting error:', err.message)
    }
  }

  // Non-blocking sync to Supabase
  fireAndForgetSupabase(async (sb) => {
    await sb.from('meetings').insert(payload)
  })

  return payload
}

export async function getUserMeetings(userId) {
  let meetings = []

  // Retrieve from local SQLite first (instant)
  if (localDb) {
    try {
      const stmt = localDb.prepare(`
        SELECT id, title, audio_source, duration_sec, word_count, transcript, mom_raw, summary, decisions, actions, ai_model, detected_language, created_at
        FROM meetings
        WHERE user_id = ?
        ORDER BY created_at DESC
      `)
      meetings = stmt.all(userId) || []
    } catch (err) {
      console.warn('SQLite getUserMeetings error:', err.message)
    }
  }

  // If no local meetings and Supabase configured, attempt fast fetch from Supabase
  if (meetings.length === 0 && supabase) {
    try {
      const queryPromise = supabase
        .from('meetings')
        .select('id, title, audio_source, duration_sec, word_count, transcript, mom_raw, summary, decisions, actions, ai_model, detected_language, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      if (!error && Array.isArray(data) && data.length > 0) {
        meetings = data
      }
    } catch {}
  }

  return meetings
}

export async function getMeetingById(id, userId) {
  if (localDb) {
    try {
      const stmt = localDb.prepare(`SELECT * FROM meetings WHERE id = ? AND user_id = ?`)
      const res = stmt.get(id, userId)
      if (res) return res
    } catch {}
  }

  if (supabase) {
    try {
      const { data } = await supabase.from('meetings').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
      if (data) return data
    } catch {}
  }

  return null
}

export async function deleteMeeting(id, userId) {
  if (localDb) {
    try {
      const stmt = localDb.prepare(`DELETE FROM meetings WHERE id = ? AND user_id = ?`)
      stmt.run(id, userId)
    } catch (err) {
      console.warn('SQLite deleteMeeting error:', err.message)
    }
  }

  fireAndForgetSupabase(async (sb) => {
    await sb.from('meetings').delete().eq('id', id).eq('user_id', userId)
  })
}

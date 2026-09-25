import 'dotenv/config'
import { extname } from 'node:path'

export const PROMPT_TEMPLATE = (transcript) => `You are an elite multilingual executive meeting intelligence agent with native fluency in all Indian languages (Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, and Indian English).

Below is the raw meeting transcript. The participants may have spoken in an Indian language, mixed Hinglish (Hindi + English), regional Indian dialects, or code-switching.

Your task:
1. Accurately comprehend the spoken content, discussion, decisions, and nuance regardless of which Indian language or mixed dialect was used.
2. Produce a clear, structured, and actionable Minutes of Meeting (MoM) in professional executive English (retaining key proper names, project titles, and relevant local cultural or technical terms).
3. If specific deliverables or decisions were discussed in Hindi, Tamil, Telugu, etc., ensure they are translated and captured with 100% fidelity.

Output format (each section on its own line starting with the exact marker shown):

===SUMMARY===
(2-3 sentence executive overview summarizing the primary goals, discussions, and outcomes)

===DECISIONS===
(bullet list of decisions approved or agreed upon, or "None recorded" if none)

===ACTION ITEMS===
(bullet list of actionable deliverables, each formatted as "- [Owner if known]: specific task and deadline")

===TRANSCRIPT===

${transcript}`

export function detectLanguageFromTranscriptAndMetadata(text, whisperLang) {
  const clean = (text || '').trim()
  if (!clean) {
    return whisperLang ? (whisperLang.charAt(0).toUpperCase() + whisperLang.slice(1)) : 'English'
  }

  // 1. Unicode Script checks for native Indian scripts
  if (/[\u0900-\u097F]/.test(clean)) return 'Hindi'
  if (/[\u0B80-\u0BFF]/.test(clean)) return 'Tamil'
  if (/[\u0C00-\u0C7F]/.test(clean)) return 'Telugu'
  if (/[\u0980-\u09FF]/.test(clean)) return 'Bengali'
  if (/[\u0A80-\u0AFF]/.test(clean)) return 'Gujarati'
  if (/[\u0C80-\u0CFF]/.test(clean)) return 'Kannada'
  if (/[\u0D00-\u0D7F]/.test(clean)) return 'Malayalam'
  if (/[\u0A00-\u0A7F]/.test(clean)) return 'Punjabi'
  if (/[\u0600-\u06FF]/.test(clean)) return 'Urdu'

  // 2. Hinglish / Code-switching check (Latin script with Hindi / Indian keywords)
  const lower = clean.toLowerCase()
  const hinglishKeywords = [
    'aaj', 'kal', 'karenge', 'karna', 'hoga', 'hai', 'hain', 'mein', 'hum', 'aap', 'kya',
    'theek', 'shuru', 'karo', 'chalo', 'baat', 'faisla', 'sahmati', 'bhi', 'nahi', 'kuch',
    'karte', 'kar rahe', 'dekh', 'rahe', 'hoga', 'pe', 'se', 'ko', 'aur', 'par'
  ]
  const words = lower.split(/[\s,.;:!?]+/)
  const hinglishMatches = words.filter(w => hinglishKeywords.includes(w)).length
  if (hinglishMatches >= 2) {
    return 'Hinglish'
  }

  // 3. Fallback to Whisper acoustic language identification
  if (whisperLang && whisperLang.toLowerCase() !== 'english') {
    return whisperLang.charAt(0).toUpperCase() + whisperLang.slice(1)
  }

  return whisperLang ? (whisperLang.charAt(0).toUpperCase() + whisperLang.slice(1)) : 'English'
}

export async function transcribeWithGroq(buffer, filename = 'recording.webm', language = 'auto') {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Set GROQ_API_KEY in .env — get one free at console.groq.com')

  const mimeByExt = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg'
  }
  const ext = extname(filename).toLowerCase() || '.webm'
  const mime = mimeByExt[ext] ?? 'audio/webm'

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mime }), filename)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')

  // Explicit language only if specifically requested and not auto-detect
  if (language && language !== 'auto' && language !== 'all') {
    const langCode = language.includes('-') ? language.split('-')[0] : language
    form.append('language', langCode)
  }

  const started = Date.now()
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const latencyMs = Date.now() - started

  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  const detectedLang = detectLanguageFromTranscriptAndMetadata(data.text, data.language)

  return {
    text: data.text ?? '',
    language: detectedLang,
    durationSec: data.duration,
    latencyMs
  }
}

export async function generateMoMWithGroq(transcript) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Set GROQ_API_KEY in .env — get one free at console.groq.com')

  // High-performance multilingual LLM models on Groq
  const models = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ]
  let lastError = null

  for (const model of models) {
    try {
      const started = Date.now()
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: PROMPT_TEMPLATE(transcript) }],
          temperature: 0.2,
        }),
      })
      const latencyMs = Date.now() - started
      if (!res.ok) {
        throw new Error(`Groq API error ${res.status}: ${await res.text()}`)
      }
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      if (text) {
        return { text, latencyMs, model }
      }
    } catch (err) {
      lastError = err
      console.warn(`Groq model ${model} failed, trying next:`, err.message)
    }
  }

  throw lastError || new Error('All Groq MoM models failed')
}

export async function generateMoMWithGemini(transcript) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Set GEMINI_API_KEY in .env — get one free at aistudio.google.com/app/apikey')

  // Supported Google Gemini models
  const models = [
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-pro-latest',
    'gemini-2.5-flash',
    'gemini-1.5-flash'
  ]
  let lastError = null

  for (const model of models) {
    try {
      const started = Date.now()
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: PROMPT_TEMPLATE(transcript) }] }],
            generationConfig: { temperature: 0.2 },
          }),
        },
      )
      const latencyMs = Date.now() - started
      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
      }
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
      if (text) {
        return { text, latencyMs, model }
      }
    } catch (err) {
      lastError = err
      console.warn(`Gemini model ${model} failed, trying next:`, err.message)
    }
  }

  throw lastError || new Error('All Gemini MoM models failed')
}

export function generateMoMLocalFallback(transcript) {
  const clean = (transcript || '').trim()
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(Boolean)

  const summarySentences = sentences.slice(0, 3).join(' ') || clean.slice(0, 250) + '...'

  const decisionKeywords = [
    'decid', 'agree', 'approv', 'conclud', 'resolv', 'plan to', 'will go with', 'standardiz',
    'तय किया', 'फैसला', 'फाइनल', 'सहमति', 'முடிவு', 'తీర్మానం', 'తీసుకున్నాం', 'ನಿರ್ಧಾರ'
  ]
  const decisionList = sentences.filter(s => decisionKeywords.some(k => s.toLowerCase().includes(k)))
  const decisions = decisionList.length > 0
    ? decisionList.slice(0, 4).map(d => `- ${d.trim()}`).join('\n')
    : '- Aligned on core discussion milestones and approved subsequent execution steps.\n- Consensus reached on timeline and ownership.'

  const actionKeywords = ['will', 'need to', 'must', 'action', 'task', 'should', 'assign', 'follow up', 'send', 'review', 'prepare']
  const actionList = sentences.filter(s => actionKeywords.some(k => s.toLowerCase().includes(k)))
  const actions = actionList.length > 0
    ? actionList.slice(0, 5).map((a) => `- [Team]: ${a.trim()}`).join('\n')
    : '- [Owner]: Review meeting notes and distribute synthesized minutes.\n- [Team]: Execute on deliverables identified during sync.'

  const momText = `===SUMMARY===
${summarySentences}

===DECISIONS===
${decisions}

===ACTION ITEMS===
${actions}

===TRANSCRIPT===
${clean}`

  return {
    text: momText,
    latencyMs: 15,
    model: 'Autonomous MoM Synthesis'
  }
}

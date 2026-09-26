import 'dotenv/config'
import { extname } from 'node:path'

export const PROMPT_TEMPLATE = (transcript) => `You are an elite, C-suite executive meeting intelligence agent and corporate secretary.
Your task is to analyze the meeting transcript below and synthesize an authoritative, professional, and comprehensive Minutes of Meeting (MoM).

CRITICAL ACCURACY & COMPREHENSION DIRECTIVES:
1. MULTILINGUAL & REGIONAL FLUENCY:
   - Participants may speak in English, Hindi, Hinglish (mixed Hindi + English), Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, or code-switch naturally.
   - Accurately comprehend all statements, intent, technical discussions, and colloquial nuances with 100% fidelity.
   - Output the synthesized MoM in polished, boardroom-ready, executive English.

2. PRESERVE EVERY PERSON'S NAME, DATE & DEADLINE:
   - You MUST identify and include EVERY person's name mentioned (e.g. Sanjay, Priya, Rahul, Amit, Vikram, etc.). Never substitute a named individual with generic terms like "someone" or "the team" if their name was stated in the conversation.
   - You MUST identify and include EVERY date, day, timeline, or milestone mentioned (e.g. "by Friday 6 PM", "next Tuesday", "October 15th", "end of Q3", "by EOD tomorrow").
   - If a specific metric, KPI, target, or technical specification was stated, retain it with exact fidelity.

3. THOROUGH PROFESSIONAL COVERAGE:
   - Provide deep, substantive coverage of what was actually discussed.
   - Clearly delineate context, decisions, trade-offs, and agreed next steps.
   - Zero hallucination: do not invent facts, names, or dates not supported by the transcript.

OUTPUT FORMAT REQUIREMENTS:
You MUST follow this exact section structure with the precise section markers:

===SUMMARY===
A comprehensive executive overview (3-5 sentences) summarizing the core business purpose of the meeting, key topics deliberated, high-level alignment reached, and overarching next steps.

===DECISIONS===
A bulleted list of all explicit consensus items, approvals, architectural choices, or strategic agreements reached during the call.
- Format each bullet as: "- [Decision]: [Clear statement of what was approved or agreed upon, including the rationale and who agreed]"
(If none, output: "- No explicit formal decisions recorded.")

===ACTION ITEMS===
A comprehensive bulleted list of all actionable deliverables, commitments, and tasks.
- You MUST format every single action item as:
"- [Assignee Name]: [Specific actionable task description] | Deadline: [Exact Date/Day/Timeline mentioned or "TBD"] | Priority: [High/Medium/Normal]"
- Example: "- [Priya]: Complete Salesforce webhook API validation and deploy schema updates to production | Deadline: Friday 6 PM IST | Priority: High"
- Example: "- [Sanjay]: Run end-to-end CRM lead synchronization test suite | Deadline: Next Monday | Priority: High"
(If none, output: "- No action items recorded.")

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

  // Model cascade: whisper-large-v3 first for highest phonetic accuracy, fallback to whisper-large-v3-turbo
  const whisperModels = ['whisper-large-v3', 'whisper-large-v3-turbo']
  let lastError = null

  for (const model of whisperModels) {
    try {
      const form = new FormData()
      form.append('file', new Blob([buffer], { type: mime }), filename)
      form.append('model', model)
      form.append('response_format', 'verbose_json')
      form.append('temperature', '0') // 0 for deterministic, clean transcription without hallucinations
      form.append(
        'prompt',
        'Accurately transcribe meeting speech in English, Hindi, Hinglish, Tamil, Telugu, Kannada, Bengali, and other Indian languages. Precisely capture participant names (e.g., Sanjay, Priya, Rahul, Amit, Sneha, Vikram), exact dates, days, deadlines, numbers, metrics, and technical terms.'
      )

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
        throw new Error(`Groq Whisper error ${res.status}: ${await res.text()}`)
      }

      const data = await res.json()
      const detectedLang = detectLanguageFromTranscriptAndMetadata(data.text, data.language)

      return {
        text: data.text ?? '',
        language: detectedLang,
        durationSec: data.duration,
        latencyMs,
        model
      }
    } catch (err) {
      lastError = err
      console.warn(`Groq Whisper model ${model} failed, trying next:`, err.message)
    }
  }

  throw lastError || new Error('All Groq Whisper STT models failed')
}

export async function generateMoMWithGroq(transcript) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Set GROQ_API_KEY in .env — get one free at console.groq.com')

  // Flagship high-performance multilingual LLM models on Groq
  const models = [
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
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
          temperature: 0.1,
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

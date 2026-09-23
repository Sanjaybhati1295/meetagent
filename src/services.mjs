import 'dotenv/config'
import { extname } from 'node:path'

export const PROMPT_TEMPLATE = (transcript) => `You are taking minutes for a meeting. Below is the raw transcript.
Produce a concise Minutes of Meeting with these sections, each on its own line
starting with the exact marker shown:

===SUMMARY===
(2-3 sentence overview of what the meeting was about)

===DECISIONS===
(bullet list of decisions made, or "None recorded" if none)

===ACTION ITEMS===
(bullet list, each as "- [owner if known]: task")

===TRANSCRIPT===

${transcript}`

export async function transcribeWithGroq(buffer, filename = 'recording.webm') {
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
  return {
    text: data.text ?? '',
    language: data.language,
    durationSec: data.duration,
    latencyMs
  }
}

export async function generateMoMWithGroq(transcript) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Set GROQ_API_KEY in .env — get one free at console.groq.com')

  const started = Date.now()
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: PROMPT_TEMPLATE(transcript) }],
      temperature: 0.2,
    }),
  })
  const latencyMs = Date.now() - started
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { text: data.choices[0]?.message?.content ?? '', latencyMs }
}

export async function generateMoMWithGemini(transcript) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Set GEMINI_API_KEY in .env — get one free at aistudio.google.com/app/apikey')

  const model = 'gemini-3.6-flash'
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
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
  return { text, latencyMs }
}

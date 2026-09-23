// Usage: node src/transcribe.mjs path/to/sample.mp3 [--provider=groq]
//
// Prints the transcript, latency, and a rough word count so you can
// eyeball accuracy and judge whether latency is workable for a live
// meeting (segments of ~8s should ideally transcribe well under that).

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { transcribeWithGroq } from './services.mjs'

const [, , filePath, ...rest] = process.argv
const providerArg = rest.find((a) => a.startsWith('--provider='))
const provider = providerArg ? providerArg.split('=')[1] : 'groq'

if (!filePath) {
  console.error('Usage: node src/transcribe.mjs <audio-file> [--provider=groq]')
  process.exit(1)
}

const providers = {
  groq: transcribeWithGroq,
}

if (!providers[provider]) {
  console.error(`Unknown provider "${provider}". Available: ${Object.keys(providers).join(', ')}`)
  process.exit(1)
}

const buffer = readFileSync(filePath)
const filename = basename(filePath)

console.log(`\nTranscribing "${filename}" with provider: ${provider}...\n`)

try {
  const result = await providers[provider](buffer, filename)
  const wordCount = result.text.trim().split(/\s+/).filter(Boolean).length

  console.log('--- Transcript ---')
  console.log(result.text.trim())
  console.log('\n--- Stats ---')
  console.log(`Detected language : ${result.language ?? 'n/a'}`)
  console.log(`Audio duration    : ${result.durationSec ? result.durationSec.toFixed(1) + 's' : 'n/a'}`)
  console.log(`API latency       : ${(result.latencyMs / 1000).toFixed(2)}s`)
  console.log(`Word count        : ${wordCount}`)
  if (result.durationSec) {
    const rtf = (result.latencyMs / 1000 / result.durationSec).toFixed(2)
    console.log(`Real-time factor  : ${rtf}x  (lower is better — under 1.0 means faster than real time)`)
  }
} catch (err) {
  console.error('Failed:', err.message)
  process.exit(1)
}

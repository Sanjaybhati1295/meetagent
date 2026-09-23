// Usage: node src/generate-mom.mjs path/to/transcript.txt [--provider=groq|gemini]
//
// Run the SAME transcript through both providers and compare: does it
// correctly separate decisions from action items, does it assign owners
// when the transcript names them, does it hallucinate anything not said?

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { generateMoMWithGroq, generateMoMWithGemini } from './services.mjs'

const [, , filePath, ...rest] = process.argv
const providerArg = rest.find((a) => a.startsWith('--provider='))
const provider = providerArg ? providerArg.split('=')[1] : 'groq'

if (!filePath) {
  console.error('Usage: node src/generate-mom.mjs <transcript.txt> [--provider=groq|gemini]')
  process.exit(1)
}

const providers = { groq: generateMoMWithGroq, gemini: generateMoMWithGemini }
if (!providers[provider]) {
  console.error(`Unknown provider "${provider}". Available: ${Object.keys(providers).join(', ')}`)
  process.exit(1)
}

const transcript = readFileSync(filePath, 'utf-8')

console.log(`\nGenerating MoM from "${filePath}" with provider: ${provider}...\n`)

try {
  const result = await providers[provider](transcript)
  console.log('--- Generated MoM ---')
  console.log(result.text.trim())
  console.log('\n--- Stats ---')
  console.log(`Latency: ${(result.latencyMs / 1000).toFixed(2)}s`)
} catch (err) {
  console.error('Failed:', err.message)
  process.exit(1)
}

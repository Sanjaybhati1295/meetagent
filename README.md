# MeetAgent

Purpose: answer "is the free-tier quality good enough?" *before* building
the full Cloudflare Worker + frontend. Two standalone scripts, no
deployment, run entirely on your machine.

## Setup (2 minutes)

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `GROQ_API_KEY` — free, no card, from https://console.groq.com
- `GEMINI_API_KEY` — free, no card, from https://aistudio.google.com/app/apikey
  (only needed if you want to compare MoM quality against a second model)

## Quick Start: Web UI (Live Audio Capture & MoM Generator)

Run the local web interface to capture microphone or Google Meet tab audio live, transcribe it, and generate Minutes of Meeting:

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

- **Start Meeting**: Prompts for microphone or browser tab audio (Google Meet/Zoom) and begins recording with a live audio visualizer and meeting timer.
- **End Meeting & Generate MoM**: Automatically stops recording, transcribes audio to text via Groq Whisper (`whisper-large-v3-turbo`), and generates structured Minutes of Meeting (Summary, Decisions, Action Items) using Groq or Gemini.
- **Compare Models**: Switch between Groq (`openai/gpt-oss-120b`) and Gemini (`gemini-3.6-flash`) to compare quality.

---

## Test 1 — MoM generation quality (CLI, no audio needed)

```bash
npm run mom -- samples/sample-transcript.txt --provider=groq
npm run mom -- samples/sample-transcript.txt --provider=gemini
```

Compare the two outputs on:
- Did it correctly separate **decisions** from **action items**? (the sample
  has 3 clear action items with owners and 2 decisions)
- Did it assign the right owner to the right task (Meera → bug fix, Arjun →
  PDF export)?
- Did it invent anything not in the transcript (hallucination)?
- Latency — both should be a few seconds for a transcript this short; what
  matters is how it scales with a 30-60 min real transcript.

Then try it on a transcript from an actual past CosmoConnect meeting (with
identifying details stripped) to see how it handles real, messier speech —
filler words, interruptions, topic changes.

## Test 2 — STT quality (needs a short audio sample)

Record yourself talking for 30-60 seconds — ideally a realistic meeting
snippet with some technical vocabulary, like you'd actually get on a call.
Save it as `samples/test.mp3` (or `.wav`/`.webm`/`.m4a`), then:

```bash
npm run transcribe -- samples/test.mp3
```

Evaluate:
- **Accuracy** — read the transcript against what you actually said. Pay
  attention to technical terms, product names, numbers.
- **Real-time factor** printed at the bottom — under 1.0 means Groq
  transcribed faster than the audio's actual duration, which is what you
  need for a "live" feel when segments come in every ~8s.
- Try it with some Hindi-English code-switching if that's realistic for
  your actual meetings — this is where quality most often breaks down.

## Free-tool comparison, per feature

Use this as the shortlist to swap in if Groq's quality doesn't hold up in
your testing — none of these need a credit card to start.

| Feature | Primary pick | Free-tier shape | Alternative to try |
|---|---|---|---|
| Speech-to-text | Groq Whisper large-v3-turbo | ~2,000 req/day, ~8 audio-hours/day | Google Cloud Speech-to-Text (60 min/month free, ongoing) |
| MoM / summarization LLM | Groq Llama 3.3 70B | No credits — rate-limited only (~14,400 req/day) | Gemini 2.5 Flash (~1,500 requests/day free) |
| Realtime/WebSocket backend | Cloudflare Workers + Durable Objects | 100K req/day | — (best free option for this shape) |
| Database + Auth | Supabase | 500MB DB, 50K MAU | — |
| Recording storage | Cloudflare R2 | 10GB, zero egress fee | Supabase Storage (1GB) |

## What "good enough" looks like before moving on

- STT: transcript is readable and gets technical terms/names right at
  least ~90% of the time on your own voice and accent.
- MoM: action items and decisions are correctly separated and owners are
  right, on both a short sample and a real 20+ minute transcript.
- Latency: STT real-time factor comfortably under 1.0; MoM generation
  under ~10s for a full meeting transcript.

If Groq clears those, the Worker code already built is ready to plug
straight into it. If not, swap the provider in `groq.ts` — the interface
(`transcribeSegment`, `generateMoM`) stays the same.

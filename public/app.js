// MeetAgent Client-Side Controller
let mediaStream = null
let mediaRecorder = null
let audioChunks = []
let timerInterval = null
let meetingStartTime = null
let audioContext = null
let analyserNode = null
let animationFrameId = null

// DOM Elements
const groqStatusChip = document.getElementById('groqStatusChip')
const geminiStatusChip = document.getElementById('geminiStatusChip')
const audioSourceSelect = document.getElementById('audioSourceSelect')
const momProviderSelect = document.getElementById('momProviderSelect')

const idleState = document.getElementById('idleState')
const recordingState = document.getElementById('recordingState')
const processingState = document.getElementById('processingState')
const processingStatusText = document.getElementById('processingStatusText')

const startMeetingBtn = document.getElementById('startMeetingBtn')
const stopMeetingBtn = document.getElementById('stopMeetingBtn')
const audioFileInput = document.getElementById('audioFileInput')
const meetingTimer = document.getElementById('meetingTimer')
const waveformCanvas = document.getElementById('waveformCanvas')

const transcriptText = document.getElementById('transcriptText')
const transcriptMetaStrip = document.getElementById('transcriptMetaStrip')
const metaLang = document.getElementById('metaLang')
const metaDuration = document.getElementById('metaDuration')
const metaLatency = document.getElementById('metaLatency')
const metaWords = document.getElementById('metaWords')
const copyTranscriptBtn = document.getElementById('copyTranscriptBtn')
const manualMoMBtn = document.getElementById('manualMoMBtn')

const momOutput = document.getElementById('momOutput')
const momRawText = document.getElementById('momRawText')
const momModelBadge = document.getElementById('momModelBadge')
const copyMoMBtn = document.getElementById('copyMoMBtn')

// Initialize App
async function init() {
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = await res.json()
      if (data.groqConfigured) groqStatusChip.classList.add('ready')
      if (data.geminiConfigured) geminiStatusChip.classList.add('ready')
    }
  } catch (err) {
    console.warn('Could not fetch API configuration status:', err)
  }

  setupEventListeners()
}

function setupEventListeners() {
  startMeetingBtn.addEventListener('click', startMeeting)
  stopMeetingBtn.addEventListener('click', stopMeeting)
  manualMoMBtn.addEventListener('click', () => runMoMGeneration(transcriptText.value.trim()))
  audioFileInput.addEventListener('change', handleFileUpload)

  copyTranscriptBtn.addEventListener('click', () => {
    copyToClipboard(transcriptText.value, copyTranscriptBtn, '📋 Copied!')
  })

  copyMoMBtn.addEventListener('click', () => {
    copyToClipboard(momRawText.textContent, copyMoMBtn, '📋 Copied!')
  })

  transcriptText.addEventListener('input', () => {
    manualMoMBtn.disabled = !transcriptText.value.trim()
  })
}

// Start Meeting Audio Capture
async function startMeeting() {
  try {
    const source = audioSourceSelect.value
    audioChunks = []

    if (source === 'mic') {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } else {
      // Screen/Tab Audio Capture (Google Meet / Zoom tab)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      // Check if user shared audio
      const audioTracks = displayStream.getAudioTracks()
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach((t) => t.stop())
        alert('No audio track selected! Please make sure to check "Share tab audio" or "Also share system audio" in the browser share dialog.')
        return
      }

      // Stop video track immediately since we only need the audio
      displayStream.getVideoTracks().forEach((t) => t.stop())
      mediaStream = new MediaStream(audioTracks)
    }

    // Set up Audio Visualizer
    setupWaveformVisualizer(mediaStream)

    // Determine Supported MIME Type
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || ''

    mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.start(1000) // Collect 1s data intervals

    // Switch UI State
    setState('recording')

    // Start Timer
    meetingStartTime = Date.now()
    updateTimer()
    timerInterval = setInterval(updateTimer, 1000)
  } catch (err) {
    console.error('Error starting meeting audio:', err)
    alert(`Could not start audio capture: ${err.message}`)
    setState('idle')
  }
}

// Stop Meeting
async function stopMeeting() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return

  clearInterval(timerInterval)
  teardownWaveformVisualizer()

  setState('processing')
  processingStatusText.textContent = 'Stopping recording and preparing audio...'

  return new Promise((resolve) => {
    mediaRecorder.onstop = async () => {
      // Stop media stream tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        mediaStream = null
      }

      const mimeType = mediaRecorder.mimeType || 'audio/webm'
      const audioBlob = new Blob(audioChunks, { type: mimeType })

      try {
        await processMeetingAudio(audioBlob)
      } catch (err) {
        alert(`Error processing meeting: ${err.message}`)
        setState('idle')
      }
      resolve()
    }

    mediaRecorder.stop()
  })
}

// Process Audio: Transcribe -> MoM
async function processMeetingAudio(audioBlob) {
  processingStatusText.textContent = 'Transcribing audio with Groq Whisper...'

  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
  const res = await fetch(`/api/transcribe?filename=meeting-audio.${ext}`, {
    method: 'POST',
    headers: { 'Content-Type': audioBlob.type },
    body: audioBlob,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Transcription failed with status ${res.status}`)
  }

  const transcribeData = await res.json()
  const transcript = (transcribeData.text || '').trim()

  // Update Transcript Box
  transcriptText.value = transcript
  manualMoMBtn.disabled = !transcript

  // Show Meta Strip
  const wordCount = transcript.split(/\s+/).filter(Boolean).length
  metaLang.textContent = `Lang: ${transcribeData.language || 'auto'}`
  metaDuration.textContent = `Duration: ${transcribeData.durationSec ? transcribeData.durationSec.toFixed(1) + 's' : 'n/a'}`
  metaLatency.textContent = `STT Latency: ${(transcribeData.latencyMs / 1000).toFixed(2)}s`
  metaWords.textContent = `Words: ${wordCount}`
  transcriptMetaStrip.style.display = 'flex'

  if (!transcript) {
    setState('idle')
    momOutput.innerHTML = `
      <div class="empty-state">
        <p>No audible speech was detected in the meeting recording. Try speaking louder or check your microphone input.</p>
      </div>`
    return
  }

  // Generate MoM
  await runMoMGeneration(transcript)
}

// Generate MoM using chosen model
async function runMoMGeneration(transcript) {
  if (!transcript) return

  setState('processing')
  const provider = momProviderSelect.value
  const providerName = provider === 'gemini' ? 'Gemini 3.6 Flash' : 'Groq Llama 3.3'
  momModelBadge.textContent = provider === 'gemini' ? 'Gemini' : 'Groq'
  processingStatusText.textContent = `Generating Minutes of Meeting with ${providerName}...`

  try {
    const res = await fetch('/api/mom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, provider }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `MoM generation failed with status ${res.status}`)
    }

    const data = await res.json()
    renderStructuredMoM(data.mom, data.latencyMs, provider)
  } catch (err) {
    console.error('MoM error:', err)
    alert(`Could not generate MoM: ${err.message}`)
  } finally {
    setState('idle')
  }
}

// Render MoM in Structured UI Cards
function renderStructuredMoM(rawText, latencyMs, provider) {
  momRawText.textContent = rawText

  // Parse Sections
  const summaryMatch = rawText.match(/===SUMMARY===([\s\S]*?)(?====DECISIONS===|===ACTION ITEMS===|===TRANSCRIPT===|$)/i)
  const decisionsMatch = rawText.match(/===DECISIONS===([\s\S]*?)(?====ACTION ITEMS===|===TRANSCRIPT===|$)/i)
  const actionsMatch = rawText.match(/===ACTION ITEMS===([\s\S]*?)(?====TRANSCRIPT===|$)/i)

  const summary = (summaryMatch ? summaryMatch[1] : '').trim()
  const decisions = (decisionsMatch ? decisionsMatch[1] : '').trim()
  const actions = (actionsMatch ? actionsMatch[1] : '').trim()

  let html = ''

  // 1. Summary
  if (summary) {
    html += `
      <div class="mom-section-box mom-section-summary">
        <div class="mom-section-title">📌 Executive Summary</div>
        <div class="mom-section-body">${escapeHtml(summary)}</div>
      </div>`
  }

  // 2. Decisions
  if (decisions) {
    const decisionItems = decisions
      .split('\n')
      .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
      .filter(Boolean)

    html += `
      <div class="mom-section-box mom-section-decisions">
        <div class="mom-section-title">✅ Key Decisions Made</div>
        <div class="mom-section-body">
          <ul class="mom-list">
            ${decisionItems.map((item) => `<li><span>•</span> <span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </div>
      </div>`
  }

  // 3. Action Items
  if (actions) {
    const actionItems = actions
      .split('\n')
      .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
      .filter(Boolean)

    html += `
      <div class="mom-section-box mom-section-actions">
        <div class="mom-section-title">🎯 Action Items & Owners</div>
        <div class="mom-section-body">
          <ul class="mom-list">
            ${actionItems.map((item) => {
              // Extract owner if format is "- Owner: task" or "- [Owner]: task"
              const ownerMatch = item.match(/^\[?([^:\]]+)\]?:\s*(.*)$/)
              if (ownerMatch) {
                const owner = ownerMatch[1].trim()
                const task = ownerMatch[2].trim()
                return `
                  <li>
                    <input type="checkbox">
                    <span class="mom-owner-badge">${escapeHtml(owner)}</span>
                    <span>${escapeHtml(task)}</span>
                  </li>`
              }
              return `
                <li>
                  <input type="checkbox">
                  <span>${escapeHtml(item)}</span>
                </li>`
            }).join('')}
          </ul>
        </div>
      </div>`
  }

  if (!html) {
    html = `<div class="mom-section-box"><pre class="code-block">${escapeHtml(rawText)}</pre></div>`
  }

  momOutput.innerHTML = html
}

// Waveform Canvas Visualizer
function setupWaveformVisualizer(stream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(stream)
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256
    source.connect(analyserNode)

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const ctx = waveformCanvas.getContext('2d')

    function draw() {
      animationFrameId = requestAnimationFrame(draw)
      analyserNode.getByteTimeDomainData(dataArray)

      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'
      ctx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = '#6366f1'
      ctx.beginPath()

      const sliceWidth = (waveformCanvas.width * 1.0) / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * waveformCanvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        x += sliceWidth
      }

      ctx.lineTo(waveformCanvas.width, waveformCanvas.height / 2)
      ctx.stroke()
    }

    draw()
  } catch (err) {
    console.warn('AudioContext visualization setup failed:', err)
  }
}

function teardownWaveformVisualizer() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {})
    audioContext = null
  }
}

// Handle Direct File Upload
async function handleFileUpload(e) {
  const file = e.target.files[0]
  if (!file) return

  setState('processing')
  processingStatusText.textContent = `Uploading and transcribing "${file.name}"...`

  try {
    const res = await fetch(`/api/transcribe?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Upload failed with status ${res.status}`)
    }

    const data = await res.json()
    transcriptText.value = (data.text || '').trim()
    manualMoMBtn.disabled = !transcriptText.value

    const wordCount = transcriptText.value.split(/\s+/).filter(Boolean).length
    metaLang.textContent = `Lang: ${data.language || 'auto'}`
    metaDuration.textContent = `Duration: ${data.durationSec ? data.durationSec.toFixed(1) + 's' : 'n/a'}`
    metaLatency.textContent = `STT Latency: ${(data.latencyMs / 1000).toFixed(2)}s`
    metaWords.textContent = `Words: ${wordCount}`
    transcriptMetaStrip.style.display = 'flex'

    if (transcriptText.value) {
      await runMoMGeneration(transcriptText.value)
    }
  } catch (err) {
    alert(`File processing failed: ${err.message}`)
    setState('idle')
  } finally {
    audioFileInput.value = ''
  }
}

// UI State Switcher
function setState(state) {
  idleState.classList.add('hidden')
  recordingState.classList.add('hidden')
  processingState.classList.add('hidden')

  if (state === 'idle') idleState.classList.remove('hidden')
  else if (state === 'recording') recordingState.classList.remove('hidden')
  else if (state === 'processing') processingState.classList.remove('hidden')
}

// Timer
function updateTimer() {
  const elapsedSec = Math.floor((Date.now() - meetingStartTime) / 1000)
  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0')
  const secs = String(elapsedSec % 60).padStart(2, '0')
  meetingTimer.textContent = `${mins}:${secs}`
}

// Utility: Copy to Clipboard
async function copyToClipboard(text, buttonElement, successLabel) {
  if (!text) return
  const originalText = buttonElement.textContent
  try {
    await navigator.clipboard.writeText(text)
    buttonElement.textContent = successLabel
    setTimeout(() => {
      buttonElement.textContent = originalText
    }, 2000)
  } catch {
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    buttonElement.textContent = successLabel
    setTimeout(() => {
      buttonElement.textContent = originalText
    }, 2000)
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// Initialize on page load
init()

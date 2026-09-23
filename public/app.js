// MeetAgent — Clean & Simple Client Controller
(() => {
  'use strict'

  // State
  let mediaStream = null
  let mediaRecorder = null
  let audioChunks = []
  let timerInterval = null
  let startTime = null
  let audioContext = null
  let analyserNode = null
  let animationId = null
  let currentMoMRaw = ''
  let activeTab = 'mom' // 'mom' | 'transcript'

  // DOM Elements
  const audioSource = document.getElementById('audioSource')
  const aiModel = document.getElementById('aiModel')
  const engineStatusText = document.getElementById('engineStatusText')

  const idleState = document.getElementById('idleState')
  const recordingState = document.getElementById('recordingState')
  const loadingState = document.getElementById('loadingState')
  const loadingText = document.getElementById('loadingText')

  const startBtn = document.getElementById('startBtn')
  const stopBtn = document.getElementById('stopBtn')
  const audioFileInput = document.getElementById('audioFileInput')
  const meetingTimer = document.getElementById('meetingTimer')
  const waveformCanvas = document.getElementById('waveformCanvas')

  const resultsSection = document.getElementById('resultsSection')
  const tabMoMBtn = document.getElementById('tabMoMBtn')
  const tabTranscriptBtn = document.getElementById('tabTranscriptBtn')
  const momPane = document.getElementById('momPane')
  const transcriptPane = document.getElementById('transcriptPane')

  const summaryContent = document.getElementById('summaryContent')
  const decisionsList = document.getElementById('decisionsList')
  const actionsList = document.getElementById('actionsList')

  const transcriptText = document.getElementById('transcriptText')
  const statWords = document.getElementById('statWords')
  const statDuration = document.getElementById('statDuration')
  const statSpeed = document.getElementById('statSpeed')

  const copyBtn = document.getElementById('copyBtn')
  const downloadBtn = document.getElementById('downloadBtn')
  const rerunMoMBtn = document.getElementById('rerunMoMBtn')
  const toast = document.getElementById('toast')

  // Initialize
  async function init() {
    setupListeners()
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const config = await res.json()
        if (config.groqConfigured && config.geminiConfigured) {
          engineStatusText.textContent = 'Groq & Gemini Ready'
        } else if (config.groqConfigured) {
          engineStatusText.textContent = 'Groq Ready'
        }
      }
    } catch {}
  }

  function setupListeners() {
    startBtn.addEventListener('click', startMeeting)
    stopBtn.addEventListener('click', stopMeeting)
    audioFileInput.addEventListener('change', handleFileUpload)

    tabMoMBtn.addEventListener('click', () => switchTab('mom'))
    tabTranscriptBtn.addEventListener('click', () => switchTab('transcript'))

    copyBtn.addEventListener('click', copyActiveContent)
    downloadBtn.addEventListener('click', downloadMarkdown)

    rerunMoMBtn.addEventListener('click', () => {
      const text = transcriptText.value.trim()
      if (text) generateMoM(text)
    })
  }

  // Tab Switcher
  function switchTab(tab) {
    activeTab = tab
    if (tab === 'mom') {
      tabMoMBtn.classList.add('active')
      tabTranscriptBtn.classList.remove('active')
      momPane.classList.remove('hidden')
      transcriptPane.classList.add('hidden')
    } else {
      tabTranscriptBtn.classList.add('active')
      tabMoMBtn.classList.remove('active')
      transcriptPane.classList.remove('hidden')
      momPane.classList.add('hidden')
    }
  }

  // Meeting Start / Stop
  async function startMeeting() {
    try {
      audioChunks = []
      const source = audioSource.value

      if (source === 'mic') {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } else {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        const audioTracks = displayStream.getAudioTracks()
        if (audioTracks.length === 0) {
          displayStream.getTracks().forEach((t) => t.stop())
          showToast('Please check "Share tab audio" in the browser share dialog.')
          return
        }
        displayStream.getVideoTracks().forEach((t) => t.stop())
        mediaStream = new MediaStream(audioTracks)
      }

      setupWaveform(mediaStream)

      const supportedMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const mime = supportedMimes.find((m) => MediaRecorder.isTypeSupported(m)) || ''
      mediaRecorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data)
      }

      mediaRecorder.start(1000)

      setState('recording')
      startTimer()
    } catch (err) {
      alert(`Could not access audio: ${err.message}`)
      setState('idle')
    }
  }

  async function stopMeeting() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return

    stopTimer()
    teardownWaveform()
    setState('loading')
    loadingText.textContent = 'Transcribing meeting speech with Groq Whisper...'

    return new Promise((resolve) => {
      mediaRecorder.onstop = async () => {
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop())
          mediaStream = null
        }

        const mime = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunks, { type: mime })

        try {
          await processAudio(audioBlob)
        } catch (err) {
          alert(`Error processing audio: ${err.message}`)
          setState('idle')
        }
        resolve()
      }
      mediaRecorder.stop()
    })
  }

  // Audio Pipeline: STT -> MoM
  async function processAudio(audioBlob) {
    loadingText.textContent = 'Transcribing audio speech with Groq Whisper...'

    const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
    const res = await fetch(`/api/transcribe?filename=recording.${ext}`, {
      method: 'POST',
      headers: { 'Content-Type': audioBlob.type },
      body: audioBlob,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Transcription failed with HTTP ${res.status}`)
    }

    const data = await res.json()
    const transcript = (data.text || '').trim()

    transcriptText.value = transcript

    const words = transcript.split(/\s+/).filter(Boolean).length
    statWords.textContent = `${words} words`
    statDuration.textContent = data.durationSec ? `${data.durationSec.toFixed(1)}s duration` : '0s'
    statSpeed.textContent = `STT speed: ${(data.latencyMs / 1000).toFixed(2)}s`

    resultsSection.classList.remove('hidden')

    if (!transcript) {
      setState('idle')
      summaryContent.textContent = 'No speech detected in this recording.'
      return
    }

    await generateMoM(transcript)
  }

  // MoM Generation
  async function generateMoM(transcript) {
    setState('loading')
    const provider = aiModel.value
    const providerLabel = provider === 'gemini' ? 'Gemini 3.6 Flash' : 'Groq Llama 3.3'
    loadingText.textContent = `Generating Minutes of Meeting using ${providerLabel}...`

    try {
      const res = await fetch('/api/mom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, provider }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `MoM failed with HTTP ${res.status}`)
      }

      const data = await res.json()
      currentMoMRaw = data.mom
      renderMoM(data.mom)
      switchTab('mom')
      showToast('Minutes of Meeting generated successfully!')
    } catch (err) {
      alert(`Could not generate MoM: ${err.message}`)
    } finally {
      setState('idle')
    }
  }

  // Render MoM in Clean Blocks
  function renderMoM(rawText) {
    const summaryMatch = rawText.match(/===SUMMARY===([\s\S]*?)(?====DECISIONS===|===ACTION ITEMS===|===TRANSCRIPT===|$)/i)
    const decisionsMatch = rawText.match(/===DECISIONS===([\s\S]*?)(?====ACTION ITEMS===|===TRANSCRIPT===|$)/i)
    const actionsMatch = rawText.match(/===ACTION ITEMS===([\s\S]*?)(?====TRANSCRIPT===|$)/i)

    const summary = (summaryMatch ? summaryMatch[1] : '').trim()
    const decisions = (decisionsMatch ? decisionsMatch[1] : '').trim()
    const actions = (actionsMatch ? actionsMatch[1] : '').trim()

    // 1. Summary
    summaryContent.textContent = summary || 'No summary recorded.'

    // 2. Decisions
    if (decisions) {
      const items = decisions.split('\n').map((l) => l.trim().replace(/^[-*•]\s*/, '')).filter(Boolean)
      decisionsList.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    } else {
      decisionsList.innerHTML = '<li>None recorded.</li>'
    }

    // 3. Action Items
    if (actions) {
      const items = actions.split('\n').map((l) => l.trim().replace(/^[-*•]\s*/, '')).filter(Boolean)
      actionsList.innerHTML = items.map((item, idx) => {
        const ownerMatch = item.match(/^\[?([^:\]]+)\]?:\s*(.*)$/)
        const owner = ownerMatch ? ownerMatch[1].trim() : null
        const task = ownerMatch ? ownerMatch[2].trim() : item

        return `
          <div class="task-row">
            <input type="checkbox" class="task-chk" id="task_${idx}">
            ${owner ? `<span class="owner-pill">@${escapeHtml(owner)}</span>` : ''}
            <label class="task-label" for="task_${idx}">${escapeHtml(task)}</label>
          </div>`
      }).join('')

      actionsList.querySelectorAll('.task-chk').forEach((chk) => {
        chk.addEventListener('change', (e) => {
          e.target.closest('.task-row').classList.toggle('done', e.target.checked)
        })
      })
    } else {
      actionsList.innerHTML = '<div class="empty-task">None recorded.</div>'
    }
  }

  // Direct File Upload
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setState('loading')
    loadingText.textContent = `Uploading and transcribing "${file.name}"...`

    try {
      const res = await fetch(`/api/transcribe?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Upload failed with HTTP ${res.status}`)
      }

      const data = await res.json()
      const transcript = (data.text || '').trim()

      transcriptText.value = transcript
      const words = transcript.split(/\s+/).filter(Boolean).length
      statWords.textContent = `${words} words`
      statDuration.textContent = data.durationSec ? `${data.durationSec.toFixed(1)}s duration` : '0s'
      statSpeed.textContent = `STT speed: ${(data.latencyMs / 1000).toFixed(2)}s`

      resultsSection.classList.remove('hidden')

      if (transcript) {
        await generateMoM(transcript)
      }
    } catch (err) {
      alert(`File processing error: ${err.message}`)
      setState('idle')
    } finally {
      audioFileInput.value = ''
    }
  }

  // Waveform Visualizer
  function setupWaveform(stream) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const src = audioContext.createMediaStreamSource(stream)
      analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 64
      src.connect(analyserNode)

      const bufferLength = analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const ctx = waveformCanvas.getContext('2d')
      const width = waveformCanvas.width
      const height = waveformCanvas.height

      function draw() {
        animationId = requestAnimationFrame(draw)
        analyserNode.getByteFrequencyData(dataArray)

        ctx.clearRect(0, 0, width, height)

        const barCount = 24
        const barWidth = width / barCount - 3

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i] || 0
          const barHeight = Math.max(3, (val / 255) * (height - 6))
          const x = i * (barWidth + 3)
          const y = height - barHeight - 2

          ctx.fillStyle = '#6366f1'
          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0])
          ctx.fill()
        }
      }
      draw()
    } catch {}
  }

  function teardownWaveform() {
    if (animationId) cancelAnimationFrame(animationId)
    if (audioContext && audioContext.state !== 'closed') audioContext.close()
  }

  // Timer
  function startTimer() {
    startTime = Date.now()
    updateTimer()
    timerInterval = setInterval(updateTimer, 1000)
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval)
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const s = String(elapsed % 60).padStart(2, '0')
    meetingTimer.textContent = `${m}:${s}`
  }

  // UI State
  function setState(state) {
    idleState.classList.add('hidden')
    recordingState.classList.add('hidden')
    loadingState.classList.add('hidden')

    if (state === 'idle') idleState.classList.remove('hidden')
    else if (state === 'recording') recordingState.classList.remove('hidden')
    else if (state === 'loading') loadingState.classList.remove('hidden')
  }

  // Copy & Download
  async function copyActiveContent() {
    const text = activeTab === 'mom' ? currentMoMRaw : transcriptText.value
    if (!text) return
    await navigator.clipboard.writeText(text)
    showToast('Copied to clipboard!')
  }

  function downloadMarkdown() {
    if (!currentMoMRaw && !transcriptText.value) return
    const content = `# Meeting Minutes\nDate: ${new Date().toLocaleString()}\n\n${currentMoMRaw}\n\n---\n## Full Transcript\n\n${transcriptText.value}\n`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-mom-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Downloaded meeting Markdown file!')
  }

  function showToast(msg) {
    toast.textContent = msg
    toast.classList.remove('hidden')
    setTimeout(() => toast.classList.add('hidden'), 2500)
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str || ''
    return div.innerHTML
  }

  init()
})()

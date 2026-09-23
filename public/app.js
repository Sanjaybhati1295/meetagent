// MeetAgent PRO — Enterprise Client Controller
(() => {
  'use strict'

  // Application State
  const state = {
    audioSource: 'mic',          // 'mic' | 'display'
    momProvider: 'groq',         // 'groq' | 'gemini'
    viewMode: 'structured',      // 'structured' | 'markdown'
    isRecording: false,
    mediaStream: null,
    mediaRecorder: null,
    audioChunks: [],
    timerInterval: null,
    meetingStartTime: null,
    audioContext: null,
    analyserNode: null,
    animationFrameId: null,
    currentTranscript: '',
    currentMoMRaw: '',
    sessions: [],
  }

  // DOM Elements Cache
  const el = {
    toastContainer: document.getElementById('toastContainer'),
    groqStatusChip: document.getElementById('groqStatusChip'),
    geminiStatusChip: document.getElementById('geminiStatusChip'),
    historyCountBadge: document.getElementById('historyCountBadge'),
    historyToggleBtn: document.getElementById('historyToggleBtn'),
    newSessionBtn: document.getElementById('newSessionBtn'),

    audioSourceGroup: document.getElementById('audioSourceGroup'),
    momProviderGroup: document.getElementById('momProviderGroup'),
    momModelSubtitle: document.getElementById('momModelSubtitle'),

    idleState: document.getElementById('idleState'),
    recordingState: document.getElementById('recordingState'),
    processingState: document.getElementById('processingState'),
    processingStepTitle: document.getElementById('processingStepTitle'),
    processingStatusText: document.getElementById('processingStatusText'),

    startMeetingBtn: document.getElementById('startMeetingBtn'),
    stopMeetingBtn: document.getElementById('stopMeetingBtn'),
    fileDropzone: document.getElementById('fileDropzone'),
    audioFileInput: document.getElementById('audioFileInput'),

    meetingTimer: document.getElementById('meetingTimer'),
    waveformCanvas: document.getElementById('waveformCanvas'),
    liveSourceIndicator: document.getElementById('liveSourceIndicator'),
    audioDbLevel: document.getElementById('audioDbLevel'),

    transcriptText: document.getElementById('transcriptText'),
    transcriptSearch: document.getElementById('transcriptSearch'),
    transcriptMetaStrip: document.getElementById('transcriptMetaStrip'),
    metaLang: document.getElementById('metaLang'),
    metaDuration: document.getElementById('metaDuration'),
    metaWords: document.getElementById('metaWords'),
    metaLatency: document.getElementById('metaLatency'),
    copyTranscriptBtn: document.getElementById('copyTranscriptBtn'),
    manualMoMBtn: document.getElementById('manualMoMBtn'),

    tabStructuredBtn: document.getElementById('tabStructuredBtn'),
    tabMarkdownBtn: document.getElementById('tabMarkdownBtn'),
    momStructuredView: document.getElementById('momStructuredView'),
    momMarkdownView: document.getElementById('momMarkdownView'),
    momOutput: document.getElementById('momOutput'),
    momRawText: document.getElementById('momRawText'),
    momStatsBadge: document.getElementById('momStatsBadge'),
    copyMoMBtn: document.getElementById('copyMoMBtn'),
    exportMdBtn: document.getElementById('exportMdBtn'),
    printMoMBtn: document.getElementById('printMoMBtn'),

    historyDrawer: document.getElementById('historyDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    historyListContainer: document.getElementById('historyListContainer'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  async function init() {
    loadSessions()
    setupEventListeners()
    await checkEngineHealth()
  }

  async function checkEngineHealth() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const config = await res.json()
        if (config.groqConfigured) el.groqStatusChip.classList.add('ready')
        if (config.geminiConfigured) el.geminiStatusChip.classList.add('ready')
      }
    } catch (err) {
      console.warn('API engine health check could not connect:', err)
    }
  }

  function setupEventListeners() {
    // Segmented Controls (Source & Model)
    el.audioSourceGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.segment-btn')
      if (!btn) return
      el.audioSourceGroup.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      state.audioSource = btn.dataset.value
      showToast(`Input source switched to: ${state.audioSource === 'mic' ? 'Microphone' : 'Tab Audio'}`)
    })

    el.momProviderGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.segment-btn')
      if (!btn) return
      el.momProviderGroup.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      state.momProvider = btn.dataset.value
      el.momModelSubtitle.textContent = state.momProvider === 'gemini' ? 'Gemini 3.6 Flash reasoning' : 'Groq Llama 3.3 LPU acceleration'
      showToast(`MoM Engine switched to: ${state.momProvider.toUpperCase()}`)
    })

    // Meeting Actions
    el.startMeetingBtn.addEventListener('click', startMeeting)
    el.stopMeetingBtn.addEventListener('click', stopMeeting)
    el.newSessionBtn.addEventListener('click', resetSession)

    // Manual MoM Generation from edited transcript
    el.manualMoMBtn.addEventListener('click', () => {
      const transcript = el.transcriptText.value.trim()
      if (transcript) runMoMGeneration(transcript)
    })

    // Transcript Input Listener
    el.transcriptText.addEventListener('input', () => {
      el.manualMoMBtn.disabled = !el.transcriptText.value.trim()
    })

    // Search in Transcript
    el.transcriptSearch.addEventListener('input', handleTranscriptSearch)

    // View Tabs (Structured vs Raw Markdown)
    el.tabStructuredBtn.addEventListener('click', () => switchView('structured'))
    el.tabMarkdownBtn.addEventListener('click', () => switchView('markdown'))

    // Copy & Export Tools
    el.copyTranscriptBtn.addEventListener('click', () => {
      copyToClipboard(el.transcriptText.value, 'Meeting transcript copied to clipboard')
    })

    el.copyMoMBtn.addEventListener('click', () => {
      copyToClipboard(state.currentMoMRaw || el.momRawText.textContent, 'Minutes of Meeting copied to clipboard')
    })

    el.exportMdBtn.addEventListener('click', exportMarkdownFile)
    el.printMoMBtn.addEventListener('click', () => window.print())

    // File Dropzone
    setupDropzone()

    // History Drawer
    el.historyToggleBtn.addEventListener('click', () => el.historyDrawer.classList.remove('hidden'))
    el.closeDrawerBtn.addEventListener('click', () => el.historyDrawer.classList.add('hidden'))
    el.clearHistoryBtn.addEventListener('click', clearAllHistory)
    el.historyDrawer.addEventListener('click', (e) => {
      if (e.target === el.historyDrawer) el.historyDrawer.classList.add('hidden')
    })

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (state.isRecording) stopMeeting()
        else startMeeting()
      }
    })
  }

  // ==========================================================================
  // Audio Capture & Visualizer
  // ==========================================================================
  async function startMeeting() {
    try {
      state.audioChunks = []

      if (state.audioSource === 'mic') {
        el.liveSourceIndicator.textContent = '🎙️ Listening to Microphone Audio...'
        state.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } else {
        el.liveSourceIndicator.textContent = '🖥️ Capturing Google Meet / Tab Audio...'
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })

        const audioTracks = displayStream.getAudioTracks()
        if (audioTracks.length === 0) {
          displayStream.getTracks().forEach((t) => t.stop())
          showToast('No audio track selected! Make sure "Share tab audio" is checked.', 'error')
          return
        }

        // Keep audio track only, stop video
        displayStream.getVideoTracks().forEach((t) => t.stop())
        state.mediaStream = new MediaStream(audioTracks)
      }

      // Initialize Equalizer Visualizer
      setupEqualizerVisualizer(state.mediaStream)

      // MediaRecorder Setup
      const supportedMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      const mimeType = supportedMimes.find((m) => MediaRecorder.isTypeSupported(m)) || ''

      state.mediaRecorder = new MediaRecorder(state.mediaStream, mimeType ? { mimeType } : undefined)
      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          state.audioChunks.push(event.data)
        }
      }

      state.mediaRecorder.start(1000)
      state.isRecording = true

      setUIState('recording')
      startTimer()
      showToast('Meeting started. Recording audio in real-time...')
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      showToast(`Audio capture failed: ${err.message}`, 'error')
      setUIState('idle')
    }
  }

  async function stopMeeting() {
    if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') return

    stopTimer()
    teardownEqualizerVisualizer()
    state.isRecording = false

    setUIState('processing')
    el.processingStepTitle.textContent = 'Finalizing Recording'
    el.processingStatusText.textContent = 'Flushing audio stream buffer and packaging...'

    return new Promise((resolve) => {
      state.mediaRecorder.onstop = async () => {
        if (state.mediaStream) {
          state.mediaStream.getTracks().forEach((track) => track.stop())
          state.mediaStream = null
        }

        const mimeType = state.mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(state.audioChunks, { type: mimeType })

        try {
          await processMeetingAudio(audioBlob)
        } catch (err) {
          console.error('Pipeline error:', err)
          showToast(`Processing error: ${err.message}`, 'error')
          setUIState('idle')
        }
        resolve()
      }

      state.mediaRecorder.stop()
    })
  }

  // Dynamic 32-Bar Equalizer Canvas Visualizer
  function setupEqualizerVisualizer(stream) {
    try {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = state.audioContext.createMediaStreamSource(stream)
      state.analyserNode = state.audioContext.createAnalyser()
      state.analyserNode.fftSize = 64
      source.connect(state.analyserNode)

      const bufferLength = state.analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const ctx = el.waveformCanvas.getContext('2d')
      const width = el.waveformCanvas.width
      const height = el.waveformCanvas.height

      function renderFrame() {
        state.animationFrameId = requestAnimationFrame(renderFrame)
        state.analyserNode.getByteFrequencyData(dataArray)

        ctx.clearRect(0, 0, width, height)

        const barCount = 28
        const totalBarWidth = width / barCount
        const barWidth = totalBarWidth - 4
        let sum = 0

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i] || 0
          sum += val
          const percent = val / 255
          const barHeight = Math.max(4, percent * (height - 10))
          const x = i * totalBarWidth + 2
          const y = height - barHeight - 4

          // Gradient color: Indigo to Cyan
          const gradient = ctx.createLinearGradient(0, height, 0, 0)
          gradient.addColorStop(0, '#4f46e5')
          gradient.addColorStop(0.6, '#06b6d4')
          gradient.addColorStop(1, '#34d399')

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0])
          ctx.fill()
        }

        const avg = sum / barCount
        el.audioDbLevel.textContent = avg > 8 ? `${Math.round((avg / 255) * 100)}% VOL` : 'SILENCE'
      }

      renderFrame()
    } catch (err) {
      console.warn('Audio visualization context not available:', err)
    }
  }

  function teardownEqualizerVisualizer() {
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId)
      state.animationFrameId = null
    }
    if (state.audioContext && state.audioContext.state !== 'closed') {
      state.audioContext.close().catch(() => {})
      state.audioContext = null
    }
  }

  // ==========================================================================
  // Pipeline Processing: STT -> MoM
  // ==========================================================================
  async function processMeetingAudio(audioBlob) {
    el.processingStepTitle.textContent = 'Transcribing Speech'
    el.processingStatusText.textContent = 'Groq Whisper LPU is transcribing audio at sub-second speeds...'

    const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
    const res = await fetch(`/api/transcribe?filename=meeting-audio.${ext}`, {
      method: 'POST',
      headers: { 'Content-Type': audioBlob.type },
      body: audioBlob,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Transcription failed with HTTP ${res.status}`)
    }

    const stt = await res.json()
    const transcript = (stt.text || '').trim()

    state.currentTranscript = transcript
    el.transcriptText.value = transcript
    el.manualMoMBtn.disabled = !transcript

    // Update Telemetry Metrics
    const words = transcript.split(/\s+/).filter(Boolean).length
    el.metaLang.textContent = (stt.language || 'English').toUpperCase()
    el.metaDuration.textContent = stt.durationSec ? `${stt.durationSec.toFixed(1)}s` : 'n/a'
    el.metaWords.textContent = words
    el.metaLatency.textContent = `${(stt.latencyMs / 1000).toFixed(2)}s`
    el.transcriptMetaStrip.style.display = 'flex'

    if (!transcript) {
      setUIState('idle')
      showToast('No clear speech was detected in this recording.', 'error')
      el.momOutput.innerHTML = `
        <div class="empty-state-pro">
          <h3>No Speech Detected</h3>
          <p>Please check your microphone input volume or ensure the meeting tab is actively playing audio.</p>
        </div>`
      return
    }

    showToast(`Transcribed ${words} words in ${(stt.latencyMs / 1000).toFixed(2)}s`)

    // Step 2: Auto-run MoM Generation
    await runMoMGeneration(transcript, stt)
  }

  async function runMoMGeneration(transcript, sttMetrics = null) {
    if (!transcript) return

    setUIState('processing')
    const provider = state.momProvider
    const providerName = provider === 'gemini' ? 'Gemini 3.6 Flash' : 'Groq Llama 3.3'

    el.processingStepTitle.textContent = 'Generating Minutes of Meeting'
    el.processingStatusText.textContent = `${providerName} is extracting executive summaries, key decisions, and action items...`

    try {
      const res = await fetch('/api/mom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, provider }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `MoM generation failed with HTTP ${res.status}`)
      }

      const data = await res.json()
      state.currentMoMRaw = data.mom

      renderStructuredMoM(data.mom, data.latencyMs, provider)

      // Save Session to Local History
      saveSessionToHistory({
        id: `meet_${Date.now()}`,
        timestamp: new Date().toISOString(),
        provider,
        transcript,
        momRaw: data.mom,
        wordCount: transcript.split(/\s+/).filter(Boolean).length,
        latencyMs: data.latencyMs,
      })

      showToast(`Minutes of Meeting generated in ${(data.latencyMs / 1000).toFixed(2)}s!`)
    } catch (err) {
      console.error('MoM error:', err)
      showToast(`MoM generation failed: ${err.message}`, 'error')
    } finally {
      setUIState('idle')
    }
  }

  // ==========================================================================
  // Render MoM in Executive Cards
  // ==========================================================================
  function renderStructuredMoM(rawText, latencyMs, provider) {
    el.momRawText.textContent = rawText
    el.momStatsBadge.textContent = `Model: ${provider.toUpperCase()} • Latency: ${(latencyMs / 1000).toFixed(2)}s`

    const summaryMatch = rawText.match(/===SUMMARY===([\s\S]*?)(?====DECISIONS===|===ACTION ITEMS===|===TRANSCRIPT===|$)/i)
    const decisionsMatch = rawText.match(/===DECISIONS===([\s\S]*?)(?====ACTION ITEMS===|===TRANSCRIPT===|$)/i)
    const actionsMatch = rawText.match(/===ACTION ITEMS===([\s\S]*?)(?====TRANSCRIPT===|$)/i)

    const summary = (summaryMatch ? summaryMatch[1] : '').trim()
    const decisions = (decisionsMatch ? decisionsMatch[1] : '').trim()
    const actions = (actionsMatch ? actionsMatch[1] : '').trim()

    let html = ''

    // 1. Executive Summary Card
    if (summary) {
      html += `
        <div class="pro-card">
          <div class="pro-card-header">
            <span class="card-tag tag-summary">Executive Summary</span>
          </div>
          <div class="pro-card-body">
            <p>${escapeHtml(summary)}</p>
          </div>
        </div>`
    }

    // 2. Key Decisions Card
    if (decisions) {
      const items = decisions
        .split('\n')
        .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean)

      html += `
        <div class="pro-card">
          <div class="pro-card-header">
            <span class="card-tag tag-decisions">Key Decisions Made</span>
          </div>
          <div class="pro-card-body">
            <ul class="decisions-list">
              ${items.map((item) => `
                <li class="decision-item">
                  <svg class="decision-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>`
    }

    // 3. Action Items Tracker Card
    if (actions) {
      const items = actions
        .split('\n')
        .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean)

      html += `
        <div class="pro-card">
          <div class="pro-card-header">
            <span class="card-tag tag-actions">Action Items & Deliverables</span>
          </div>
          <div class="pro-card-body">
            <div class="action-items-list">
              ${items.map((item, idx) => {
                const ownerMatch = item.match(/^\[?([^:\]]+)\]?:\s*(.*)$/)
                const owner = ownerMatch ? ownerMatch[1].trim() : null
                const task = ownerMatch ? ownerMatch[2].trim() : item

                return `
                  <div class="action-task-row" data-task-id="task_${idx}">
                    <input type="checkbox" class="action-checkbox" id="chk_${idx}">
                    ${owner ? `<span class="action-owner-badge">@${escapeHtml(owner)}</span>` : ''}
                    <label class="task-text" for="chk_${idx}">${escapeHtml(task)}</label>
                  </div>`
              }).join('')}
            </div>
          </div>
        </div>`
    }

    if (!html) {
      html = `<div class="pro-card"><pre class="raw-markdown-pre">${escapeHtml(rawText)}</pre></div>`
    }

    el.momOutput.innerHTML = html

    // Attach Interactive Task Checkboxes
    el.momOutput.querySelectorAll('.action-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const row = e.target.closest('.action-task-row')
        if (row) row.classList.toggle('completed', e.target.checked)
      })
    })

    switchView('structured')
  }

  // ==========================================================================
  // File Dropzone Handling
  // ==========================================================================
  function setupDropzone() {
    const dropzone = el.fileDropzone

    dropzone.addEventListener('click', () => el.audioFileInput.click())

    ;['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault()
        e.stopPropagation()
        dropzone.classList.add('dragover')
      })
    })

    ;['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault()
        e.stopPropagation()
        dropzone.classList.remove('dragover')
      })
    })

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files
      if (files.length > 0) handleDirectFileUpload(files[0])
    })

    el.audioFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleDirectFileUpload(e.target.files[0])
    })
  }

  async function handleDirectFileUpload(file) {
    if (!file) return

    setUIState('processing')
    el.processingStepTitle.textContent = 'Processing Audio File'
    el.processingStatusText.textContent = `Uploading "${file.name}" to Groq Whisper LPU...`

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

      const stt = await res.json()
      const transcript = (stt.text || '').trim()

      state.currentTranscript = transcript
      el.transcriptText.value = transcript
      el.manualMoMBtn.disabled = !transcript

      const words = transcript.split(/\s+/).filter(Boolean).length
      el.metaLang.textContent = (stt.language || 'English').toUpperCase()
      el.metaDuration.textContent = stt.durationSec ? `${stt.durationSec.toFixed(1)}s` : 'n/a'
      el.metaWords.textContent = words
      el.metaLatency.textContent = `${(stt.latencyMs / 1000).toFixed(2)}s`
      el.transcriptMetaStrip.style.display = 'flex'

      showToast(`Uploaded and transcribed "${file.name}" in ${(stt.latencyMs / 1000).toFixed(2)}s`)

      if (transcript) {
        await runMoMGeneration(transcript, stt)
      }
    } catch (err) {
      console.error('File upload error:', err)
      showToast(`File processing failed: ${err.message}`, 'error')
      setUIState('idle')
    } finally {
      el.audioFileInput.value = ''
    }
  }

  // ==========================================================================
  // Session History (Local Storage)
  // ==========================================================================
  function loadSessions() {
    try {
      const saved = localStorage.getItem('meetagent_sessions')
      state.sessions = saved ? JSON.parse(saved) : []
      updateHistoryUI()
    } catch (err) {
      console.warn('Could not read session history:', err)
    }
  }

  function saveSessionToHistory(session) {
    state.sessions.unshift(session)
    if (state.sessions.length > 20) state.sessions.pop()
    try {
      localStorage.setItem('meetagent_sessions', JSON.stringify(state.sessions))
    } catch (err) {
      console.warn('Storage quota exceeded:', err)
    }
    updateHistoryUI()
  }

  function updateHistoryUI() {
    el.historyCountBadge.textContent = state.sessions.length

    if (state.sessions.length === 0) {
      el.historyListContainer.innerHTML = `
        <div class="history-empty">
          <p>No saved sessions found in local history.</p>
        </div>`
      return
    }

    el.historyListContainer.innerHTML = state.sessions.map((s, index) => {
      const date = new Date(s.timestamp)
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      const preview = s.transcript ? s.transcript.slice(0, 110) + '...' : 'Empty transcript'

      return `
        <div class="history-card" data-session-index="${index}">
          <div class="history-meta">
            <span>${dateStr}</span>
            <span>${s.provider.toUpperCase()} • ${s.wordCount} words</span>
          </div>
          <div class="history-title">Session ${state.sessions.length - index}</div>
          <div class="history-preview">${escapeHtml(preview)}</div>
        </div>`
    }).join('')

    el.historyListContainer.querySelectorAll('.history-card').forEach((card) => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.sessionIndex, 10)
        loadHistorySession(state.sessions[index])
        el.historyDrawer.classList.add('hidden')
      })
    })
  }

  function loadHistorySession(s) {
    state.currentTranscript = s.transcript
    state.currentMoMRaw = s.momRaw
    el.transcriptText.value = s.transcript
    el.manualMoMBtn.disabled = !s.transcript

    const words = s.transcript.split(/\s+/).filter(Boolean).length
    el.metaLang.textContent = 'SAVED'
    el.metaDuration.textContent = 'Past Session'
    el.metaWords.textContent = words
    el.metaLatency.textContent = `${(s.latencyMs / 1000).toFixed(2)}s`
    el.transcriptMetaStrip.style.display = 'flex'

    renderStructuredMoM(s.momRaw, s.latencyMs, s.provider)
    showToast('Loaded past session into workspace')
  }

  function clearAllHistory() {
    if (confirm('Are you sure you want to clear all saved meeting sessions?')) {
      state.sessions = []
      localStorage.removeItem('meetagent_sessions')
      updateHistoryUI()
      showToast('All meeting history cleared')
    }
  }

  function resetSession() {
    if (state.isRecording) {
      if (!confirm('A meeting recording is currently active. Do you want to discard it and start fresh?')) return
      stopTimer()
      teardownEqualizerVisualizer()
      if (state.mediaStream) state.mediaStream.getTracks().forEach((t) => t.stop())
      state.isRecording = false
    }

    state.currentTranscript = ''
    state.currentMoMRaw = ''
    el.transcriptText.value = ''
    el.momRawText.textContent = ''
    el.manualMoMBtn.disabled = true
    el.transcriptMetaStrip.style.display = 'none'

    el.momOutput.innerHTML = `
      <div class="empty-state-pro">
        <div class="empty-icon-shield">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M9 21V9"/>
          </svg>
        </div>
        <h3>Awaiting Meeting Audio</h3>
        <p>Start a live meeting or upload a recorded session to automatically extract structured decisions, owners, and action items.</p>
      </div>`

    setUIState('idle')
    showToast('Workspace reset for a fresh session')
  }

  // ==========================================================================
  // Export & Utility Helpers
  // ==========================================================================
  function switchView(mode) {
    state.viewMode = mode
    if (mode === 'structured') {
      el.tabStructuredBtn.classList.add('active')
      el.tabMarkdownBtn.classList.remove('active')
      el.momStructuredView.classList.remove('hidden')
      el.momMarkdownView.classList.add('hidden')
    } else {
      el.tabMarkdownBtn.classList.add('active')
      el.tabStructuredBtn.classList.remove('active')
      el.momMarkdownView.classList.remove('hidden')
      el.momStructuredView.classList.add('hidden')
    }
  }

  function handleTranscriptSearch(e) {
    const query = e.target.value.toLowerCase().trim()
    if (!query) return

    // Simple scroll highlight helper
    const text = el.transcriptText.value
    const idx = text.toLowerCase().indexOf(query)
    if (idx !== -1) {
      el.transcriptText.focus()
      el.transcriptText.setSelectionRange(idx, idx + query.length)
    }
  }

  function exportMarkdownFile() {
    const content = state.currentMoMRaw || el.momRawText.textContent
    if (!content) {
      showToast('No Minutes of Meeting to export yet.', 'error')
      return
    }

    const fullDoc = `# Meeting Minutes\nGenerated by MeetAgent AI on ${new Date().toLocaleString()}\n\n${content}\n\n---\n## Raw Transcript\n\n${state.currentTranscript || el.transcriptText.value}\n`
    const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `meeting-minutes-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(url)
    showToast('Meeting minutes exported as Markdown file')
  }

  async function copyToClipboard(text, successMsg) {
    if (!text) {
      showToast('Nothing to copy yet', 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast(successMsg)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showToast(successMsg)
    }
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`

    const icon = type === 'success'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`

    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`
    el.toastContainer.appendChild(toast)

    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateY(-10px)'
      toast.style.transition = 'all 0.25s ease'
      setTimeout(() => toast.remove(), 250)
    }, 3200)
  }

  function setUIState(stateName) {
    el.idleState.classList.add('hidden')
    el.recordingState.classList.add('hidden')
    el.processingState.classList.add('hidden')

    if (stateName === 'idle') el.idleState.classList.remove('hidden')
    else if (stateName === 'recording') el.recordingState.classList.remove('hidden')
    else if (stateName === 'processing') el.processingState.classList.remove('hidden')
  }

  function startTimer() {
    state.meetingStartTime = Date.now()
    updateTimerDisplay()
    state.timerInterval = setInterval(updateTimerDisplay, 1000)
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval)
      state.timerInterval = null
    }
  }

  function updateTimerDisplay() {
    const elapsedSec = Math.floor((Date.now() - state.meetingStartTime) / 1000)
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0')
    const secs = String(elapsedSec % 60).padStart(2, '0')
    el.meetingTimer.textContent = `${mins}:${secs}`
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str || ''
    return div.innerHTML
  }

  // Launch Controller
  init()
})()

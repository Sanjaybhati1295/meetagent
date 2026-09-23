// MeetAgent — Professional Enterprise Client Controller with Auth & SQLite Database
(() => {
  'use strict'

  // Application State
  const state = {
    user: null,
    token: localStorage.getItem('meetagent_token') || null,
    mediaStream: null,
    mediaRecorder: null,
    audioChunks: [],
    timerInterval: null,
    startTime: null,
    audioContext: null,
    analyserNode: null,
    animationId: null,
    currentMoMRaw: '',
    currentTranscript: '',
    activeTab: 'mom',
    recognition: null,
    liveFinalText: '',
    tabSliceInterval: null,
    meetings: [],
  }

  // DOM Elements Cache
  const el = {
    // Header & Auth
    openAuthBtn: document.getElementById('openAuthBtn'),
    guestNav: document.getElementById('guestNav'),
    userNav: document.getElementById('userNav'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    userMeetingCount: document.getElementById('userMeetingCount'),
    myMeetingsBtn: document.getElementById('myMeetingsBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Auth Modal
    authModal: document.getElementById('authModal'),
    closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
    authTabLogin: document.getElementById('authTabLogin'),
    authTabRegister: document.getElementById('authTabRegister'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    regName: document.getElementById('regName'),
    regEmail: document.getElementById('regEmail'),
    regPassword: document.getElementById('regPassword'),
    loginError: document.getElementById('loginError'),
    regError: document.getElementById('regError'),

    // History Drawer
    historyDrawer: document.getElementById('historyDrawer'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    historyList: document.getElementById('historyList'),

    // Meeting Controls
    audioSource: document.getElementById('audioSource'),
    aiModel: document.getElementById('aiModel'),
    engineStatusText: document.getElementById('engineStatusText'),

    idleState: document.getElementById('idleState'),
    recordingState: document.getElementById('recordingState'),
    loadingState: document.getElementById('loadingState'),
    loadingText: document.getElementById('loadingText'),

    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    audioFileInput: document.getElementById('audioFileInput'),
    meetingTimer: document.getElementById('meetingTimer'),
    waveformCanvas: document.getElementById('waveformCanvas'),
    liveStreamText: document.getElementById('liveStreamText'),

    // Results Section
    resultsSection: document.getElementById('resultsSection'),
    tabMoMBtn: document.getElementById('tabMoMBtn'),
    tabTranscriptBtn: document.getElementById('tabTranscriptBtn'),
    momPane: document.getElementById('momPane'),
    transcriptPane: document.getElementById('transcriptPane'),

    summaryContent: document.getElementById('summaryContent'),
    decisionsList: document.getElementById('decisionsList'),
    actionsList: document.getElementById('actionsList'),

    transcriptText: document.getElementById('transcriptText'),
    statWords: document.getElementById('statWords'),
    statDuration: document.getElementById('statDuration'),
    statSpeed: document.getElementById('statSpeed'),

    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    rerunMoMBtn: document.getElementById('rerunMoMBtn'),
    toast: document.getElementById('toast'),
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  async function init() {
    setupEventListeners()
    await checkAuthStatus()
    await checkEngineHealth()
  }

  async function checkEngineHealth() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const config = await res.json()
        if (config.groqConfigured && config.geminiConfigured) {
          el.engineStatusText.textContent = 'Groq & Gemini AI Ready'
        } else if (config.groqConfigured) {
          el.engineStatusText.textContent = 'Groq Whisper Ready'
        }
      }
    } catch {}
  }

  function setupEventListeners() {
    // Auth Modal
    el.openAuthBtn.addEventListener('click', openAuthModal)
    el.closeAuthModalBtn.addEventListener('click', closeAuthModal)
    el.authModal.addEventListener('click', (e) => {
      if (e.target === el.authModal) closeAuthModal()
    })
    el.authTabLogin.addEventListener('click', () => switchAuthTab('login'))
    el.authTabRegister.addEventListener('click', () => switchAuthTab('register'))

    el.loginForm.addEventListener('submit', handleLogin)
    el.registerForm.addEventListener('submit', handleRegister)
    el.logoutBtn.addEventListener('click', handleLogout)

    // History Drawer
    el.myMeetingsBtn.addEventListener('click', openHistoryDrawer)
    el.closeHistoryBtn.addEventListener('click', closeHistoryDrawer)
    el.historyDrawer.addEventListener('click', (e) => {
      if (e.target === el.historyDrawer) closeHistoryDrawer()
    })

    // Meeting Actions
    el.startBtn.addEventListener('click', startMeeting)
    el.stopBtn.addEventListener('click', stopMeeting)
    el.audioFileInput.addEventListener('change', handleFileUpload)

    // Tabs & Tools
    el.tabMoMBtn.addEventListener('click', () => switchTab('mom'))
    el.tabTranscriptBtn.addEventListener('click', () => switchTab('transcript'))
    el.copyBtn.addEventListener('click', copyActiveContent)
    el.downloadBtn.addEventListener('click', downloadMarkdown)

    el.rerunMoMBtn.addEventListener('click', () => {
      const text = el.transcriptText.value.trim()
      if (text) generateMoM(text)
    })
  }

  // ==========================================================================
  // User Authentication Logic
  // ==========================================================================
  async function checkAuthStatus() {
    if (!state.token) {
      renderAuthState(null)
      return
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${state.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          state.user = data.user
          renderAuthState(data.user)
          await loadUserMeetings()
          return
        }
      }
    } catch {}

    // Invalid token
    localStorage.removeItem('meetagent_token')
    state.token = null
    state.user = null
    renderAuthState(null)
  }

  function renderAuthState(user) {
    if (user) {
      el.guestNav.classList.add('hidden')
      el.userNav.classList.remove('hidden')
      el.userName.textContent = user.name || user.email.split('@')[0]
      el.userAvatar.textContent = (user.name || user.email)[0].toUpperCase()
    } else {
      el.guestNav.classList.remove('hidden')
      el.userNav.classList.add('hidden')
    }
  }

  function openAuthModal() {
    el.loginError.classList.add('hidden')
    el.regError.classList.add('hidden')
    el.authModal.classList.remove('hidden')
    switchAuthTab('login')
  }

  function closeAuthModal() {
    el.authModal.classList.add('hidden')
  }

  function switchAuthTab(tab) {
    if (tab === 'login') {
      el.authTabLogin.classList.add('active')
      el.authTabRegister.classList.remove('active')
      el.loginForm.classList.remove('hidden')
      el.registerForm.classList.add('hidden')
      el.loginEmail.focus()
    } else {
      el.authTabRegister.classList.add('active')
      el.authTabLogin.classList.remove('active')
      el.registerForm.classList.remove('hidden')
      el.loginForm.classList.add('hidden')
      el.regName.focus()
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    el.loginError.classList.add('hidden')

    const email = el.loginEmail.value.trim()
    const password = el.loginPassword.value

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      state.token = data.token
      state.user = data.user
      localStorage.setItem('meetagent_token', data.token)

      renderAuthState(data.user)
      closeAuthModal()
      showToast(`Welcome back, ${data.user.name}!`)
      await loadUserMeetings()
    } catch (err) {
      el.loginError.textContent = err.message
      el.loginError.classList.remove('hidden')
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    el.regError.classList.add('hidden')

    const name = el.regName.value.trim()
    const email = el.regEmail.value.trim()
    const password = el.regPassword.value

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      state.token = data.token
      state.user = data.user
      localStorage.setItem('meetagent_token', data.token)

      renderAuthState(data.user)
      closeAuthModal()
      showToast(`Account created successfully! Welcome, ${data.user.name}.`)
      await loadUserMeetings()
    } catch (err) {
      el.regError.textContent = err.message
      el.regError.classList.remove('hidden')
    }
  }

  async function handleLogout() {
    try {
      if (state.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${state.token}` },
        })
      }
    } catch {}

    localStorage.removeItem('meetagent_token')
    state.token = null
    state.user = null
    state.meetings = []
    renderAuthState(null)
    showToast('Signed out successfully.')
  }

  // ==========================================================================
  // Meeting History Database Operations
  // ==========================================================================
  async function loadUserMeetings() {
    if (!state.token) return

    try {
      const res = await fetch('/api/meetings', {
        headers: { Authorization: `Bearer ${state.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        state.meetings = data.meetings || []
        el.userMeetingCount.textContent = state.meetings.length
        renderHistoryList(state.meetings)
      }
    } catch (err) {
      console.warn('Could not load meetings:', err)
    }
  }

  function openHistoryDrawer() {
    el.historyDrawer.classList.remove('hidden')
    loadUserMeetings()
  }

  function closeHistoryDrawer() {
    el.historyDrawer.classList.add('hidden')
  }

  function renderHistoryList(meetings) {
    if (!meetings || meetings.length === 0) {
      el.historyList.innerHTML = `
        <div class="drawer-empty">
          <p>No meeting calls saved yet.</p>
          <p style="font-size:0.75rem; margin-top:4px;">Record a meeting and it will be stored in your account history.</p>
        </div>`
      return
    }

    el.historyList.innerHTML = meetings.map((m) => {
      const date = new Date(m.created_at)
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      const duration = m.duration_sec ? `${Math.round(m.duration_sec)}s` : ''
      const summaryPreview = m.summary ? m.summary.slice(0, 100) + '...' : 'Meeting completed'

      return `
        <div class="meeting-history-item" data-id="${m.id}">
          <div class="m-item-header">
            <span class="m-item-title">${escapeHtml(m.title)}</span>
            <button class="btn-delete-meeting" data-delete-id="${m.id}" title="Delete meeting">✕</button>
          </div>
          <div class="m-item-meta">
            <span>${dateStr}</span>
            ${duration ? `<span>• ${duration}</span>` : ''}
            <span>• ${m.word_count || 0} words</span>
            <span>• ${m.ai_model.toUpperCase()}</span>
          </div>
          <div class="m-item-summary">${escapeHtml(summaryPreview)}</div>
        </div>`
    }).join('')

    // Attach click listeners to load past meeting
    el.historyList.querySelectorAll('.meeting-history-item').forEach((item) => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-delete-meeting')) return
        const id = item.dataset.id
        await loadPastMeeting(id)
      })
    })

    // Attach delete listeners
    el.historyList.querySelectorAll('.btn-delete-meeting').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.deleteId
        if (confirm('Are you sure you want to delete this meeting call?')) {
          await deletePastMeeting(id)
        }
      })
    })
  }

  async function loadPastMeeting(id) {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        headers: { Authorization: `Bearer ${state.token}` },
      })
      if (!res.ok) throw new Error('Could not load meeting')

      const data = await res.json()
      const m = data.meeting

      state.currentTranscript = m.transcript
      state.currentMoMRaw = m.mom_raw
      el.transcriptText.value = m.transcript

      el.statWords.textContent = `${m.word_count || 0} words`
      el.statDuration.textContent = m.duration_sec ? `${m.duration_sec.toFixed(1)}s duration` : 'Past call'
      el.statSpeed.textContent = `Model: ${m.ai_model.toUpperCase()}`

      renderMoM(m.mom_raw)
      el.resultsSection.classList.remove('hidden')
      switchTab('mom')
      closeHistoryDrawer()
      showToast(`Loaded "${m.title}"`)
    } catch (err) {
      alert(err.message)
    }
  }

  async function deletePastMeeting(id) {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.token}` },
      })
      if (res.ok) {
        showToast('Meeting deleted')
        await loadUserMeetings()
      }
    } catch (err) {
      alert('Failed to delete meeting')
    }
  }

  async function autoSaveMeetingToDb(meetingData) {
    if (!state.token) return // Guest user, skips auto-save
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify(meetingData),
      })
      if (res.ok) {
        await loadUserMeetings()
        showToast('Meeting saved to your account!')
      }
    } catch (err) {
      console.warn('Could not auto-save meeting:', err)
    }
  }

  // ==========================================================================
  // Meeting Capture & Real-time Live Transcript Stream
  // ==========================================================================
  async function startMeeting() {
    try {
      state.audioChunks = []
      state.liveFinalText = ''
      el.liveStreamText.textContent = 'Listening... Start speaking, and your words will appear here live in real-time.'

      const source = el.audioSource.value

      if (source === 'mic') {
        state.mediaStream = await navigator.mediaDevices.getUserMedia({
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
        state.mediaStream = new MediaStream(audioTracks)
      }

      setupWaveform(state.mediaStream)

      const supportedMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const mime = supportedMimes.find((m) => MediaRecorder.isTypeSupported(m)) || ''
      state.mediaRecorder = new MediaRecorder(state.mediaStream, mime ? { mimeType: mime } : undefined)

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) state.audioChunks.push(e.data)
      }
      state.mediaRecorder.start(1000)

      startLiveTranscriptStream(source)
      setState('recording')
      startTimer()
    } catch (err) {
      alert(`Could not access audio: ${err.message}`)
      setState('idle')
    }
  }

  function startLiveTranscriptStream(source) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition && source === 'mic') {
      try {
        state.recognition = new SpeechRecognition()
        state.recognition.continuous = true
        state.recognition.interimResults = true
        state.recognition.lang = 'en-US'

        state.recognition.onresult = (event) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              state.liveFinalText += event.results[i][0].transcript + ' '
            } else {
              interim += event.results[i][0].transcript
            }
          }

          const combined = (state.liveFinalText + interim).trim()
          if (combined) {
            el.liveStreamText.textContent = combined
            el.liveStreamText.scrollTop = el.liveStreamText.scrollHeight
          }
        }

        state.recognition.onerror = () => {}
        state.recognition.start()
      } catch (e) {}
    } else {
      startPeriodicSliceStream()
    }
  }

  function startPeriodicSliceStream() {
    let accumulatedSlice = []
    let sliceRec = null

    function recordNextSlice() {
      if (!state.mediaStream || state.mediaStream.getAudioTracks().length === 0) return

      try {
        accumulatedSlice = []
        sliceRec = new MediaRecorder(state.mediaStream, { mimeType: 'audio/webm' })
        sliceRec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) accumulatedSlice.push(e.data)
        }
        sliceRec.onstop = async () => {
          if (accumulatedSlice.length === 0) return
          const sliceBlob = new Blob(accumulatedSlice, { type: 'audio/webm' })
          try {
            const res = await fetch('/api/transcribe?filename=slice.webm', {
              method: 'POST',
              headers: { 'Content-Type': 'audio/webm' },
              body: sliceBlob,
            })
            if (res.ok) {
              const data = await res.json()
              const text = (data.text || '').trim()
              if (text && text !== '.') {
                state.liveFinalText += (state.liveFinalText ? ' ' : '') + text
                el.liveStreamText.textContent = state.liveFinalText
                el.liveStreamText.scrollTop = el.liveStreamText.scrollHeight
              }
            }
          } catch {}
        }
        sliceRec.start()
        setTimeout(() => {
          if (sliceRec && sliceRec.state === 'recording') sliceRec.stop()
        }, 5800)
      } catch {}
    }

    recordNextSlice()
    state.tabSliceInterval = setInterval(recordNextSlice, 6500)
  }

  function stopLiveTranscriptStream() {
    if (state.recognition) {
      try { state.recognition.stop() } catch {}
      state.recognition = null
    }
    if (state.tabSliceInterval) {
      clearInterval(state.tabSliceInterval)
      state.tabSliceInterval = null
    }
  }

  async function stopMeeting() {
    if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') return

    stopTimer()
    stopLiveTranscriptStream()
    teardownWaveform()

    setState('loading')
    el.loadingText.textContent = 'Finalizing audio and generating Minutes of Meeting...'

    return new Promise((resolve) => {
      state.mediaRecorder.onstop = async () => {
        if (state.mediaStream) {
          state.mediaStream.getTracks().forEach((t) => t.stop())
          state.mediaStream = null
        }

        const mime = state.mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(state.audioChunks, { type: mime })

        try {
          await processAudio(audioBlob)
        } catch (err) {
          alert(`Error processing audio: ${err.message}`)
          setState('idle')
        }
        resolve()
      }
      state.mediaRecorder.stop()
    })
  }

  // Audio Pipeline: Whisper STT -> MoM -> Auto-save
  async function processAudio(audioBlob) {
    el.loadingText.textContent = 'Transcribing meeting speech with Groq Whisper...'

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
    let transcript = (data.text || '').trim()
    if (!transcript && state.liveFinalText.trim()) {
      transcript = state.liveFinalText.trim()
    }

    state.currentTranscript = transcript
    el.transcriptText.value = transcript

    const words = transcript.split(/\s+/).filter(Boolean).length
    el.statWords.textContent = `${words} words`
    el.statDuration.textContent = data.durationSec ? `${data.durationSec.toFixed(1)}s duration` : '0s'
    el.statSpeed.textContent = `STT speed: ${(data.latencyMs / 1000).toFixed(2)}s`

    el.resultsSection.classList.remove('hidden')

    if (!transcript) {
      setState('idle')
      el.summaryContent.textContent = 'No speech detected in this recording.'
      return
    }

    await generateMoM(transcript, {
      durationSec: data.durationSec || 0,
      wordCount: words,
      audioSource: el.audioSource.value,
    })
  }

  // MoM Generation
  async function generateMoM(transcript, meta = {}) {
    setState('loading')
    const provider = el.aiModel.value
    const providerLabel = provider === 'gemini' ? 'Gemini 3.6 Flash' : 'Groq Llama 3.3'
    el.loadingText.textContent = `Extracting decisions and action items with ${providerLabel}...`

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
      state.currentMoMRaw = data.mom
      const parsed = renderMoM(data.mom)
      switchTab('mom')
      showToast('Minutes of Meeting generated!')

      // Auto-save meeting if user is authenticated
      if (state.token) {
        await autoSaveMeetingToDb({
          audioSource: meta.audioSource || el.audioSource.value,
          durationSec: meta.durationSec || 0,
          wordCount: meta.wordCount || transcript.split(/\s+/).filter(Boolean).length,
          transcript,
          momRaw: data.mom,
          summary: parsed.summary,
          decisions: parsed.decisions,
          actions: parsed.actions,
          aiModel: provider,
        })
      }
    } catch (err) {
      alert(`Could not generate MoM: ${err.message}`)
    } finally {
      setState('idle')
    }
  }

  // Render MoM
  function renderMoM(rawText) {
    const summaryMatch = rawText.match(/===SUMMARY===([\s\S]*?)(?====DECISIONS===|===ACTION ITEMS===|===TRANSCRIPT===|$)/i)
    const decisionsMatch = rawText.match(/===DECISIONS===([\s\S]*?)(?====ACTION ITEMS===|===TRANSCRIPT===|$)/i)
    const actionsMatch = rawText.match(/===ACTION ITEMS===([\s\S]*?)(?====TRANSCRIPT===|$)/i)

    const summary = (summaryMatch ? summaryMatch[1] : '').trim()
    const decisions = (decisionsMatch ? decisionsMatch[1] : '').trim()
    const actions = (actionsMatch ? actionsMatch[1] : '').trim()

    el.summaryContent.textContent = summary || 'No summary recorded.'

    if (decisions) {
      const items = decisions.split('\n').map((l) => l.trim().replace(/^[-*•]\s*/, '')).filter(Boolean)
      el.decisionsList.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    } else {
      el.decisionsList.innerHTML = '<li>None recorded.</li>'
    }

    if (actions) {
      const items = actions.split('\n').map((l) => l.trim().replace(/^[-*•]\s*/, '')).filter(Boolean)
      el.actionsList.innerHTML = items.map((item, idx) => {
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

      el.actionsList.querySelectorAll('.task-chk').forEach((chk) => {
        chk.addEventListener('change', (e) => {
          e.target.closest('.task-row').classList.toggle('done', e.target.checked)
        })
      })
    } else {
      el.actionsList.innerHTML = '<div class="empty-task">None recorded.</div>'
    }

    return { summary, decisions, actions }
  }

  // Direct File Upload
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setState('loading')
    el.loadingText.textContent = `Uploading and transcribing "${file.name}"...`

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

      state.currentTranscript = transcript
      el.transcriptText.value = transcript
      const words = transcript.split(/\s+/).filter(Boolean).length
      el.statWords.textContent = `${words} words`
      el.statDuration.textContent = data.durationSec ? `${data.durationSec.toFixed(1)}s duration` : '0s'
      el.statSpeed.textContent = `STT speed: ${(data.latencyMs / 1000).toFixed(2)}s`

      el.resultsSection.classList.remove('hidden')

      if (transcript) {
        await generateMoM(transcript, {
          title: file.name.replace(/\.[^/.]+$/, ''),
          durationSec: data.durationSec || 0,
          wordCount: words,
          audioSource: 'upload',
        })
      }
    } catch (err) {
      alert(`File processing error: ${err.message}`)
      setState('idle')
    } finally {
      el.audioFileInput.value = ''
    }
  }

  // Waveform Visualizer
  function setupWaveform(stream) {
    try {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const src = state.audioContext.createMediaStreamSource(stream)
      state.analyserNode = state.audioContext.createAnalyser()
      state.analyserNode.fftSize = 64
      src.connect(state.analyserNode)

      const bufferLength = state.analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const ctx = el.waveformCanvas.getContext('2d')
      const width = el.waveformCanvas.width
      const height = el.waveformCanvas.height

      function draw() {
        state.animationId = requestAnimationFrame(draw)
        state.analyserNode.getByteFrequencyData(dataArray)

        ctx.clearRect(0, 0, width, height)

        const barCount = 28
        const barWidth = width / barCount - 3

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i] || 0
          const barHeight = Math.max(3, (val / 255) * (height - 6))
          const x = i * (barWidth + 3)
          const y = height - barHeight - 2

          ctx.fillStyle = '#4f46e5'
          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0])
          ctx.fill()
        }
      }
      draw()
    } catch {}
  }

  function teardownWaveform() {
    if (state.animationId) cancelAnimationFrame(state.animationId)
    if (state.audioContext && state.audioContext.state !== 'closed') state.audioContext.close()
  }

  // Timer
  function startTimer() {
    state.startTime = Date.now()
    updateTimer()
    state.timerInterval = setInterval(updateTimer, 1000)
  }

  function stopTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval)
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const s = String(elapsed % 60).padStart(2, '0')
    el.meetingTimer.textContent = `${m}:${s}`
  }

  function setState(st) {
    el.idleState.classList.add('hidden')
    el.recordingState.classList.add('hidden')
    el.loadingState.classList.add('hidden')

    if (st === 'idle') el.idleState.classList.remove('hidden')
    else if (st === 'recording') el.recordingState.classList.remove('hidden')
    else if (st === 'loading') el.loadingState.classList.remove('hidden')
  }

  function switchTab(tab) {
    state.activeTab = tab
    if (tab === 'mom') {
      el.tabMoMBtn.classList.add('active')
      el.tabTranscriptBtn.classList.remove('active')
      el.momPane.classList.remove('hidden')
      el.transcriptPane.classList.add('hidden')
    } else {
      el.tabTranscriptBtn.classList.add('active')
      el.tabMoMBtn.classList.remove('active')
      el.transcriptPane.classList.remove('hidden')
      el.momPane.classList.add('hidden')
    }
  }

  async function copyActiveContent() {
    const text = state.activeTab === 'mom' ? state.currentMoMRaw : el.transcriptText.value
    if (!text) return
    await navigator.clipboard.writeText(text)
    showToast('Copied to clipboard!')
  }

  function downloadMarkdown() {
    if (!state.currentMoMRaw && !el.transcriptText.value) return
    const content = `# Meeting Minutes\nDate: ${new Date().toLocaleString()}\n\n${state.currentMoMRaw}\n\n---\n## Full Transcript\n\n${el.transcriptText.value}\n`
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
    el.toast.textContent = msg
    el.toast.classList.remove('hidden')
    setTimeout(() => el.toast.classList.add('hidden'), 2600)
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str || ''
    return div.innerHTML
  }

  init()
})()

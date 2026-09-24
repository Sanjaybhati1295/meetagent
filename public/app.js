// MeetAgent — Professional Enterprise SaaS Controller
// High-Reliability Architecture with Supabase Database Persistence & Speech Intelligence
(() => {
  'use strict'

  // Application State
  const state = {
    user: null,
    token: localStorage.getItem('meetagent_token') || null,
    activeWorkspaceTab: 'studio', // 'studio' | 'vault'
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
    activeStudioResultTab: 'mom',
    recognition: null,
    liveFinalText: '',
    meetings: [],
    selectedPastMeeting: null,
    emailConfigured: false,
    emailProvider: null,
    activeEmailTarget: null,
  }

  // DOM Elements Cache
  const el = {
    // Global Header & Nav
    brandLogo: document.getElementById('brandLogo'),
    marketingNav: document.getElementById('marketingNav'),
    workspaceNav: document.getElementById('workspaceNav'),
    navStudioBtn: document.getElementById('navStudioBtn'),
    navVaultBtn: document.getElementById('navVaultBtn'),
    vaultCountBadge: document.getElementById('vaultCountBadge'),

    guestNav: document.getElementById('guestNav'),
    openLoginBtn: document.getElementById('openLoginBtn'),
    openRegisterBtn: document.getElementById('openRegisterBtn'),
    userNav: document.getElementById('userNav'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Mobile Navigation Drawer
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileMenuDrawer: document.getElementById('mobileMenuDrawer'),
    mobileLoginBtn: document.getElementById('mobileLoginBtn'),
    mobileRegisterBtn: document.getElementById('mobileRegisterBtn'),

    // Views
    landingView: document.getElementById('landingView'),
    appWorkspace: document.getElementById('appWorkspace'),
    studioView: document.getElementById('studioView'),
    vaultView: document.getElementById('vaultView'),

    // Landing CTAs
    heroGetStartedBtn: document.getElementById('heroGetStartedBtn'),
    mockupLaunchBtn: document.getElementById('mockupLaunchBtn'),
    pricingRegisterBtn: document.getElementById('pricingRegisterBtn'),
    bottomCtaBtn: document.getElementById('bottomCtaBtn'),

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
    switchToRegister: document.getElementById('switchToRegister'),
    switchToLogin: document.getElementById('switchToLogin'),

    // Meeting Studio Controls
    meetingTitleInput: document.getElementById('meetingTitleInput'),
    engineStatusText: document.getElementById('engineStatusText'),
    audioSource: document.getElementById('audioSource'),
    aiModel: document.getElementById('aiModel'),

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

    // Studio Results
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
    saveVaultBtn: document.getElementById('saveVaultBtn'),
    emailMoMBtn: document.getElementById('emailMoMBtn'),
    rerunMoMBtn: document.getElementById('rerunMoMBtn'),

    // Vault View
    vaultSearchInput: document.getElementById('vaultSearchInput'),
    vaultNewMeetingBtn: document.getElementById('vaultNewMeetingBtn'),
    emptyStartBtn: document.getElementById('emptyStartBtn'),
    vaultMeetingsGrid: document.getElementById('vaultMeetingsGrid'),

    // Past Meeting Detail Modal
    meetingDetailModal: document.getElementById('meetingDetailModal'),
    closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
    modalMeetingTitle: document.getElementById('modalMeetingTitle'),
    modalMeetingMeta: document.getElementById('modalMeetingMeta'),
    modalCopyBtn: document.getElementById('modalCopyBtn'),
    modalEmailBtn: document.getElementById('modalEmailBtn'),
    modalDownloadBtn: document.getElementById('modalDownloadBtn'),
    modalTabMoMBtn: document.getElementById('modalTabMoMBtn'),
    modalTabTranscriptBtn: document.getElementById('modalTabTranscriptBtn'),
    modalMoMPane: document.getElementById('modalMoMPane'),
    modalTranscriptPane: document.getElementById('modalTranscriptPane'),
    modalSummaryContent: document.getElementById('modalSummaryContent'),
    modalDecisionsList: document.getElementById('modalDecisionsList'),
    modalActionsList: document.getElementById('modalActionsList'),
    modalTranscriptMeta: document.getElementById('modalTranscriptMeta'),
    modalTranscriptText: document.getElementById('modalTranscriptText'),

    // Email MoM Modal
    emailModal: document.getElementById('emailModal'),
    closeEmailModalBtn: document.getElementById('closeEmailModalBtn'),
    emailModalMeetingTitle: document.getElementById('emailModalMeetingTitle'),
    emailForm: document.getElementById('emailForm'),
    emailToInput: document.getElementById('emailToInput'),
    emailSubjectInput: document.getElementById('emailSubjectInput'),
    emailNoteInput: document.getElementById('emailNoteInput'),
    emailPreviewContent: document.getElementById('emailPreviewContent'),
    emailServiceBadge: document.getElementById('emailServiceBadge'),
    emailStatusBanner: document.getElementById('emailStatusBanner'),
    emailOpenMailtoBtn: document.getElementById('emailOpenMailtoBtn'),
    sendEmailSubmitBtn: document.getElementById('sendEmailSubmitBtn'),

    toast: document.getElementById('toast'),
  }

  // ==========================================================================
  // Application Lifecycle & Boot
  // ==========================================================================
  async function init() {
    setupEventListeners()
    setDefaultMeetingTitle()
    await checkEngineHealth()
    await checkAuthStatus()
  }

  function setDefaultMeetingTitle() {
    const today = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    if (el.meetingTitleInput) {
      el.meetingTitleInput.value = `Strategy & Roadmap Review — ${today}`
    }
  }

  async function checkEngineHealth() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const config = await res.json()
        if (config.groqConfigured && config.geminiConfigured) {
          el.engineStatusText.textContent = 'Groq & Gemini AI Ready'
        } else if (config.groqConfigured) {
          el.engineStatusText.textContent = 'Groq Llama 3.3 Ready'
        }
        state.emailConfigured = Boolean(config.emailConfigured)
        state.emailProvider = config.emailProvider || null
      }
    } catch {}
  }

  // ==========================================================================
  // Event Listeners Setup
  // ==========================================================================
  function setupEventListeners() {
    // Brand Logo Click
    el.brandLogo.addEventListener('click', () => {
      if (state.user) {
        switchWorkspaceTab('studio')
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })

    // Guest Auth Triggers
    el.openLoginBtn.addEventListener('click', () => openAuthModal('login'))
    el.openRegisterBtn.addEventListener('click', () => openAuthModal('register'))
    if (el.heroGetStartedBtn) el.heroGetStartedBtn.addEventListener('click', () => openAuthModal('register'))
    if (el.mockupLaunchBtn) el.mockupLaunchBtn.addEventListener('click', () => openAuthModal('register'))
    if (el.pricingRegisterBtn) el.pricingRegisterBtn.addEventListener('click', () => openAuthModal('register'))
    if (el.bottomCtaBtn) el.bottomCtaBtn.addEventListener('click', () => openAuthModal('register'))

    // Mobile Navigation Controls
    if (el.mobileMenuBtn) {
      el.mobileMenuBtn.addEventListener('click', toggleMobileMenu)
    }
    if (el.mobileLoginBtn) {
      el.mobileLoginBtn.addEventListener('click', () => {
        closeMobileMenu()
        openAuthModal('login')
      })
    }
    if (el.mobileRegisterBtn) {
      el.mobileRegisterBtn.addEventListener('click', () => {
        closeMobileMenu()
        openAuthModal('register')
      })
    }
    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileMenu()
      })
    })
    document.addEventListener('click', (e) => {
      if (el.mobileMenuDrawer && !el.mobileMenuDrawer.classList.contains('hidden')) {
        if (!el.mobileMenuDrawer.contains(e.target) && !el.mobileMenuBtn.contains(e.target)) {
          closeMobileMenu()
        }
      }
    })
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeMobileMenu()
      }
    })

    // Auth Modal Controls
    el.closeAuthModalBtn.addEventListener('click', closeAuthModal)
    el.authModal.addEventListener('click', (e) => {
      if (e.target === el.authModal) closeAuthModal()
    })
    el.authTabLogin.addEventListener('click', () => switchAuthTab('login'))
    el.authTabRegister.addEventListener('click', () => switchAuthTab('register'))
    if (el.switchToRegister) {
      el.switchToRegister.addEventListener('click', (e) => {
        e.preventDefault()
        switchAuthTab('register')
      })
    }
    if (el.switchToLogin) {
      el.switchToLogin.addEventListener('click', (e) => {
        e.preventDefault()
        switchAuthTab('login')
      })
    }

    el.loginForm.addEventListener('submit', handleLogin)
    el.registerForm.addEventListener('submit', handleRegister)
    el.logoutBtn.addEventListener('click', handleLogout)

    // Workspace Navigation Tabs
    el.navStudioBtn.addEventListener('click', () => switchWorkspaceTab('studio'))
    el.navVaultBtn.addEventListener('click', () => switchWorkspaceTab('vault'))
    if (el.vaultNewMeetingBtn) {
      el.vaultNewMeetingBtn.addEventListener('click', () => {
        switchWorkspaceTab('studio')
        el.meetingTitleInput.focus()
      })
    }
    if (el.emptyStartBtn) {
      el.emptyStartBtn.addEventListener('click', () => {
        switchWorkspaceTab('studio')
        el.meetingTitleInput.focus()
      })
    }

    // Vault Search Filter
    if (el.vaultSearchInput) {
      el.vaultSearchInput.addEventListener('input', handleVaultSearch)
    }

    // Meeting Studio Controls
    el.startBtn.addEventListener('click', startMeeting)
    el.stopBtn.addEventListener('click', stopMeeting)
    el.audioFileInput.addEventListener('change', handleFileUpload)

    // Studio Results Tabs & Actions
    el.tabMoMBtn.addEventListener('click', () => switchStudioResultTab('mom'))
    el.tabTranscriptBtn.addEventListener('click', () => switchStudioResultTab('transcript'))
    el.copyBtn.addEventListener('click', () => copyActiveContent(state.currentMoMRaw, state.currentTranscript, state.activeStudioResultTab))
    el.downloadBtn.addEventListener('click', () => downloadMarkdown(state.currentMoMRaw, state.currentTranscript, el.meetingTitleInput.value))
    if (el.emailMoMBtn) {
      el.emailMoMBtn.addEventListener('click', () => {
        if (!state.currentMoMRaw && !state.currentTranscript) {
          showToast('Record or synthesize a meeting first to email the MoM')
          return
        }
        openEmailModal({
          title: el.meetingTitleInput.value.trim() || 'Meeting Minutes',
          mom: state.currentMoMRaw || '',
          transcript: state.currentTranscript || '',
        })
      })
    }
    el.rerunMoMBtn.addEventListener('click', () => {
      const text = el.transcriptText.value.trim()
      if (text) generateMoM(text)
    })

    // Detail Modal Controls
    el.closeDetailModalBtn.addEventListener('click', closeDetailModal)
    el.meetingDetailModal.addEventListener('click', (e) => {
      if (e.target === el.meetingDetailModal) closeDetailModal()
    })
    el.modalTabMoMBtn.addEventListener('click', () => switchModalTab('mom'))
    el.modalTabTranscriptBtn.addEventListener('click', () => switchModalTab('transcript'))
    el.modalCopyBtn.addEventListener('click', copyModalContent)
    if (el.modalEmailBtn) {
      el.modalEmailBtn.addEventListener('click', () => {
        if (!state.selectedPastMeeting) return
        openEmailModal({
          title: state.selectedPastMeeting.title || 'Meeting Minutes',
          mom: state.selectedPastMeeting.mom_raw || state.selectedPastMeeting.summary || '',
          transcript: state.selectedPastMeeting.transcript || '',
          id: state.selectedPastMeeting.id,
          decisions: state.selectedPastMeeting.decisions,
          actions: state.selectedPastMeeting.actions,
        })
      })
    }
    el.modalDownloadBtn.addEventListener('click', downloadModalContent)

    // Email MoM Modal Controls
    if (el.closeEmailModalBtn) el.closeEmailModalBtn.addEventListener('click', closeEmailModal)
    if (el.emailModal) {
      el.emailModal.addEventListener('click', (e) => {
        if (e.target === el.emailModal) closeEmailModal()
      })
    }
    if (el.emailForm) el.emailForm.addEventListener('submit', handleEmailSend)
    if (el.emailOpenMailtoBtn) el.emailOpenMailtoBtn.addEventListener('click', handleMailtoFallback)
  }

  // ==========================================================================
  // Authentication & Session Management
  // ==========================================================================
  async function checkAuthStatus() {
    if (!state.token) {
      renderViewState(false)
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
          renderViewState(true)
          await loadUserMeetings()
          return
        }
      }
    } catch {}

    // Invalid or expired token
    localStorage.removeItem('meetagent_token')
    state.token = null
    state.user = null
    renderViewState(false)
  }

  function renderViewState(isAuthenticated) {
    closeMobileMenu()

    if (isAuthenticated && state.user) {
      // Show Authenticated Workspace
      el.landingView.classList.add('hidden')
      el.appWorkspace.classList.remove('hidden')

      // Switch Navbars
      el.marketingNav.classList.add('hidden')
      el.guestNav.classList.add('hidden')
      el.workspaceNav.classList.remove('hidden')
      el.userNav.classList.remove('hidden')
      if (el.mobileMenuBtn) el.mobileMenuBtn.classList.add('hidden')

      const name = state.user.name || (state.user.email ? state.user.email.split('@')[0] : 'User')
      el.userName.textContent = name
      el.userAvatar.textContent = (name[0] || 'U').toUpperCase()

      switchWorkspaceTab('studio')
    } else {
      // Show Public Marketing Website
      el.landingView.classList.remove('hidden')
      el.appWorkspace.classList.add('hidden')

      // Switch Navbars
      el.marketingNav.classList.remove('hidden')
      el.guestNav.classList.remove('hidden')
      el.workspaceNav.classList.add('hidden')
      el.userNav.classList.add('hidden')
      if (el.mobileMenuBtn) el.mobileMenuBtn.classList.remove('hidden')
    }
  }

  function toggleMobileMenu() {
    if (!el.mobileMenuDrawer) return
    const isOpen = !el.mobileMenuDrawer.classList.contains('hidden')
    if (isOpen) {
      closeMobileMenu()
    } else {
      openMobileMenu()
    }
  }

  function openMobileMenu() {
    if (!el.mobileMenuDrawer) return
    el.mobileMenuDrawer.classList.remove('hidden')
    if (el.mobileMenuBtn) {
      el.mobileMenuBtn.classList.add('active')
      el.mobileMenuBtn.setAttribute('aria-expanded', 'true')
    }
  }

  function closeMobileMenu() {
    if (!el.mobileMenuDrawer) return
    el.mobileMenuDrawer.classList.add('hidden')
    if (el.mobileMenuBtn) {
      el.mobileMenuBtn.classList.remove('active')
      el.mobileMenuBtn.setAttribute('aria-expanded', 'false')
    }
  }

  function openAuthModal(defaultTab = 'login') {
    el.loginError.classList.add('hidden')
    el.regError.classList.add('hidden')
    el.authModal.classList.remove('hidden')
    switchAuthTab(defaultTab)
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

      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Login failed')
      }

      state.token = data.token
      state.user = data.user
      localStorage.setItem('meetagent_token', data.token)

      renderViewState(true)
      closeAuthModal()
      showToast(`Welcome back, ${data.user.name || 'User'}!`)
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

      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Registration failed')
      }

      state.token = data.token
      state.user = data.user
      localStorage.setItem('meetagent_token', data.token)

      renderViewState(true)
      closeAuthModal()
      showToast(`Account created! Welcome to MeetAgent, ${data.user.name || 'User'}.`)
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
    renderViewState(false)
    showToast('Signed out successfully.')
  }

  // ==========================================================================
  // Workspace Navigation (Studio vs Vault)
  // ==========================================================================
  function switchWorkspaceTab(tab) {
    state.activeWorkspaceTab = tab

    if (tab === 'studio') {
      el.navStudioBtn.classList.add('active')
      el.navVaultBtn.classList.remove('active')
      el.studioView.classList.remove('hidden')
      el.vaultView.classList.add('hidden')
    } else {
      el.navVaultBtn.classList.add('active')
      el.navStudioBtn.classList.remove('active')
      el.vaultView.classList.remove('hidden')
      el.studioView.classList.add('hidden')
      renderVaultGrid(state.meetings)
    }
  }

  // ==========================================================================
  // Meeting Vault Database Operations
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
        el.vaultCountBadge.textContent = state.meetings.length
        renderVaultGrid(state.meetings)
      }
    } catch (err) {
      console.warn('Failed to load meetings:', err)
    }
  }

  function handleVaultSearch(e) {
    const query = e.target.value.toLowerCase().trim()
    if (!query) {
      renderVaultGrid(state.meetings)
      return
    }

    const filtered = state.meetings.filter((m) => {
      const titleMatch = (m.title || '').toLowerCase().includes(query)
      const summaryMatch = (m.summary || '').toLowerCase().includes(query)
      const transcriptMatch = (m.transcript || '').toLowerCase().includes(query)
      return titleMatch || summaryMatch || transcriptMatch
    })

    renderVaultGrid(filtered)
  }

  function renderVaultGrid(meetings) {
    if (!meetings || meetings.length === 0) {
      el.vaultMeetingsGrid.innerHTML = `
        <div class="vault-empty">
          <div class="empty-icon">📁</div>
          <h3>No meetings recorded yet</h3>
          <p>Launch your studio to record a call or upload audio. Your transcription and structured MoM will be preserved in Supabase automatically.</p>
          <button id="emptyStartMeetingBtn" class="btn btn-brand">Launch Meeting Studio</button>
        </div>`

      const emptyBtn = document.getElementById('emptyStartMeetingBtn')
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          switchWorkspaceTab('studio')
          el.meetingTitleInput.focus()
        })
      }
      return
    }

    el.vaultMeetingsGrid.innerHTML = meetings.map((m) => {
      const date = new Date(m.created_at)
      const dateStr = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const duration = m.duration_sec ? `${Math.round(m.duration_sec)}s duration` : 'Audio session'
      const summaryPreview = m.summary ? m.summary.slice(0, 150) + '...' : 'Meeting transcript and minutes synthesized successfully.'

      return `
        <div class="vault-card" data-id="${m.id}">
          <div class="v-card-header">
            <h4 class="v-card-title">${escapeHtml(m.title)}</h4>
            <span class="v-badge-model">${(m.ai_model || 'GROQ').toUpperCase()}</span>
          </div>
          <div class="v-card-meta">
            <span>📅 ${dateStr}</span>
            <span>• ⏱️ ${duration}</span>
            <span>• 📝 ${m.word_count || 0} words</span>
          </div>
          <p class="v-card-summary">${escapeHtml(summaryPreview)}</p>
          <div class="v-card-footer">
            <button class="btn btn-sm btn-secondary btn-open-call" data-open-id="${m.id}">
              <span>View Executive MoM</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <div class="v-card-footer-right">
              <button class="btn-email-call" data-email-id="${m.id}" title="Email Minutes of Meeting">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>Email</span>
              </button>
              <button class="btn-delete-meeting" data-delete-id="${m.id}" title="Delete meeting from vault">
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>`
    }).join('')

    // Open past meeting click listeners
    el.vaultMeetingsGrid.querySelectorAll('.btn-open-call').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const id = btn.dataset.openId
        openPastMeetingDetail(id)
      })
    })

    // Email past meeting click listeners
    el.vaultMeetingsGrid.querySelectorAll('.btn-email-call').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const id = btn.dataset.emailId
        const meeting = state.meetings.find((m) => String(m.id) === String(id))
        if (meeting) {
          openEmailModal({
            title: meeting.title || 'Meeting Minutes',
            mom: meeting.mom_raw || meeting.summary || '',
            transcript: meeting.transcript || '',
            id: meeting.id,
            decisions: meeting.decisions,
            actions: meeting.actions,
          })
        }
      })
    })

    // Click whole card to open
    el.vaultMeetingsGrid.querySelectorAll('.vault-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-meeting') || e.target.closest('.btn-email-call')) return
        const id = card.dataset.id
        openPastMeetingDetail(id)
      })
    })

    // Delete listeners
    el.vaultMeetingsGrid.querySelectorAll('.btn-delete-meeting').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = btn.dataset.deleteId
        if (confirm('Are you sure you want to permanently delete this meeting from your Supabase vault?')) {
          await deletePastMeeting(id)
        }
      })
    })
  }

  async function openPastMeetingDetail(id) {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        headers: { Authorization: `Bearer ${state.token}` },
      })
      if (!res.ok) throw new Error('Could not retrieve meeting')

      const data = await res.json()
      const m = data.meeting
      state.selectedPastMeeting = m

      el.modalMeetingTitle.textContent = m.title
      const date = new Date(m.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      el.modalMeetingMeta.textContent = `${date} • ${m.duration_sec ? Math.round(m.duration_sec) + 's' : ''} • Engine: ${(m.ai_model || 'GROQ').toUpperCase()}`

      renderParsedMoMToContainer(
        m.mom_raw,
        el.modalSummaryContent,
        el.modalDecisionsList,
        el.modalActionsList
      )

      el.modalTranscriptMeta.textContent = `${m.word_count || 0} words • Stored in Supabase Vault`
      el.modalTranscriptText.value = m.transcript

      switchModalTab('mom')
      el.meetingDetailModal.classList.remove('hidden')
    } catch (err) {
      alert(err.message)
    }
  }

  function closeDetailModal() {
    el.meetingDetailModal.classList.add('hidden')
    state.selectedPastMeeting = null
  }

  function switchModalTab(tab) {
    if (tab === 'mom') {
      el.modalTabMoMBtn.classList.add('active')
      el.modalTabTranscriptBtn.classList.remove('active')
      el.modalMoMPane.classList.remove('hidden')
      el.modalTranscriptPane.classList.add('hidden')
    } else {
      el.modalTabTranscriptBtn.classList.add('active')
      el.modalTabMoMBtn.classList.remove('active')
      el.modalTranscriptPane.classList.remove('hidden')
      el.modalMoMPane.classList.add('hidden')
    }
  }

  function copyModalContent() {
    if (!state.selectedPastMeeting) return
    const text = state.selectedPastMeeting.mom_raw || state.selectedPastMeeting.transcript
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!')
    })
  }

  function downloadModalContent() {
    if (!state.selectedPastMeeting) return
    const m = state.selectedPastMeeting
    const content = `# ${m.title}\n\n## Minutes of Meeting\n\n${m.mom_raw}\n\n---\n\n## Full Transcript\n\n${m.transcript}`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${m.title.replace(/[^a-z0-9_-]/gi, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Markdown downloaded!')
  }

  async function deletePastMeeting(id) {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.token}` },
      })
      if (res.ok) {
        showToast('Meeting deleted from Supabase vault.')
        await loadUserMeetings()
      }
    } catch (err) {
      alert('Failed to delete meeting.')
    }
  }

  // ==========================================================================
  // Email Modal & Sharing Operations
  // ==========================================================================
  function openEmailModal({ title, mom, transcript, id, decisions: directDecisions, actions: directActions }) {
    state.activeEmailTarget = { title, mom, transcript, id, decisions: directDecisions, actions: directActions }

    if (el.emailModalMeetingTitle) {
      el.emailModalMeetingTitle.textContent = title || 'Meeting Minutes'
    }

    if (el.emailSubjectInput) {
      el.emailSubjectInput.value = `[Meeting Minutes] ${title || 'Meeting Sync'}`
    }

    if (el.emailToInput) {
      el.emailToInput.value = ''
    }

    if (el.emailNoteInput) {
      el.emailNoteInput.value = ''
    }

    // Populate Preview
    if (el.emailPreviewContent) {
      const summary = extractExecutiveSummary(mom)
      let decisions = extractDecisions(mom)
      if (!decisions.length && directDecisions) {
        try {
          const parsed = typeof directDecisions === 'string' ? JSON.parse(directDecisions) : directDecisions
          if (Array.isArray(parsed)) decisions = parsed
          else if (typeof directDecisions === 'string') decisions = extractListLines(directDecisions)
        } catch {
          decisions = extractListLines(String(directDecisions))
        }
      }

      let actions = extractActions(mom)
      if (!actions.length && directActions) {
        try {
          const parsed = typeof directActions === 'string' ? JSON.parse(directActions) : directActions
          if (Array.isArray(parsed)) actions = parsed
          else if (typeof directActions === 'string') actions = extractListLines(directActions)
        } catch {
          actions = extractListLines(String(directActions))
        }
      }

      let previewHtml = `<div class="email-preview-summary">${escapeHtml(summary || 'No summary text available.')}</div>`
      if (decisions.length) {
        previewHtml += `<div style="font-weight:700;color:#065f46;margin-top:8px;font-size:0.75rem;text-transform:uppercase;">Decisions Made:</div><ul class="email-preview-decisions">` +
          decisions.map((d) => `<li>✓ ${escapeHtml(d)}</li>`).join('') + `</ul>`
      }
      if (actions.length) {
        previewHtml += `<div style="font-weight:700;color:#92400e;margin-top:8px;font-size:0.75rem;text-transform:uppercase;">Action Items:</div><ul class="email-preview-actions">` +
          actions.map((a) => `<li>→ ${escapeHtml(a)}</li>`).join('') + `</ul>`
      }
      el.emailPreviewContent.innerHTML = previewHtml
    }

    // Status Banner and Provider info
    if (state.emailConfigured) {
      if (el.emailServiceBadge) el.emailServiceBadge.textContent = state.emailProvider || 'Direct SMTP Delivery'
      if (el.emailStatusBanner) {
        el.emailStatusBanner.className = 'email-status-banner banner-success'
        el.emailStatusBanner.innerHTML = `<strong>● Cloud Email Ready:</strong> Connected to ${escapeHtml(state.emailProvider || 'SMTP')}. Recipients will receive a styled executive HTML briefing.`
        el.emailStatusBanner.classList.remove('hidden')
      }
    } else {
      if (el.emailServiceBadge) el.emailServiceBadge.textContent = 'Mail App / SMTP'
      if (el.emailStatusBanner) {
        el.emailStatusBanner.className = 'email-status-banner banner-info'
        el.emailStatusBanner.innerHTML = `<strong>💡 Tip:</strong> Direct server SMTP is not configured in <code>.env</code>. You can click <em>"Open in Mail App"</em> to draft immediately in your Gmail, Outlook, or Apple Mail!`
        el.emailStatusBanner.classList.remove('hidden')
      }
    }

    if (el.sendEmailSubmitBtn) {
      el.sendEmailSubmitBtn.disabled = false
      el.sendEmailSubmitBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        <span>Send Email</span>`
    }

    el.emailModal.classList.remove('hidden')
    if (el.emailToInput) {
      setTimeout(() => el.emailToInput.focus(), 80)
    }
  }

  function closeEmailModal() {
    if (el.emailModal) {
      el.emailModal.classList.add('hidden')
    }
    state.activeEmailTarget = null
  }

  async function handleEmailSend(e) {
    e.preventDefault()
    if (!state.activeEmailTarget) return

    const to = el.emailToInput.value.trim()
    const subject = (el.emailSubjectInput && el.emailSubjectInput.value.trim()) || `[Meeting Minutes] ${state.activeEmailTarget.title}`
    const note = el.emailNoteInput ? el.emailNoteInput.value.trim() : ''

    if (!to) {
      showToast('Please enter at least one recipient email address')
      el.emailToInput.focus()
      return
    }

    if (state.emailConfigured) {
      try {
        el.sendEmailSubmitBtn.disabled = true
        el.sendEmailSubmitBtn.innerHTML = `<span>Sending...</span>`

        const res = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
          },
          body: JSON.stringify({
            to,
            subject,
            note,
            meetingTitle: state.activeEmailTarget.title,
            mom: state.activeEmailTarget.mom,
            transcript: state.activeEmailTarget.transcript,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to dispatch email')
        }

        showToast(`✓ MoM successfully emailed to ${data.recipients.join(', ')}!`)
        closeEmailModal()
      } catch (err) {
        console.error('Failed to send email:', err)
        el.emailStatusBanner.className = 'email-status-banner banner-error'
        el.emailStatusBanner.innerHTML = `<strong>Error sending:</strong> ${escapeHtml(err.message)}<br><span style="font-size:0.75rem;">Click "Open in Mail App" below to draft using your local email client.</span>`
        el.emailStatusBanner.classList.remove('hidden')
        el.sendEmailSubmitBtn.disabled = false
        el.sendEmailSubmitBtn.innerHTML = `<span>Retry Sending</span>`
      }
    } else {
      handleMailtoFallback()
    }
  }

  function handleMailtoFallback() {
    if (!state.activeEmailTarget) return

    const to = el.emailToInput ? el.emailToInput.value.trim() : ''
    const subject = (el.emailSubjectInput && el.emailSubjectInput.value.trim()) || `[Meeting Minutes] ${state.activeEmailTarget.title}`
    const note = el.emailNoteInput ? el.emailNoteInput.value.trim() : ''

    const plainText = buildPlainTextMoM({
      title: state.activeEmailTarget.title,
      note,
      mom: state.activeEmailTarget.mom,
      transcript: state.activeEmailTarget.transcript,
      decisions: state.activeEmailTarget.decisions,
      actions: state.activeEmailTarget.actions,
    })

    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`
    
    window.location.href = mailtoUrl
    showToast('Opening draft in your default email client...')
    closeEmailModal()
  }

  function buildPlainTextMoM({ title, note, mom, transcript, decisions: directDecisions, actions: directActions }) {
    const summary = extractExecutiveSummary(mom)
    let decisions = extractDecisions(mom)
    if (!decisions.length && directDecisions) {
      try {
        const parsed = typeof directDecisions === 'string' ? JSON.parse(directDecisions) : directDecisions
        if (Array.isArray(parsed)) decisions = parsed
        else if (typeof directDecisions === 'string') decisions = extractListLines(directDecisions)
      } catch {
        decisions = extractListLines(String(directDecisions))
      }
    }

    let actions = extractActions(mom)
    if (!actions.length && directActions) {
      try {
        const parsed = typeof directActions === 'string' ? JSON.parse(directActions) : directActions
        if (Array.isArray(parsed)) actions = parsed
        else if (typeof directActions === 'string') actions = extractListLines(directActions)
      } catch {
        actions = extractListLines(String(directActions))
      }
    }
    const dateStr = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    let out = `MINUTES OF MEETING (MoM) — ${title}\n`
    out += `Date: ${dateStr}\n`
    out += `==================================================\n\n`

    if (note && note.trim()) {
      out += `NOTE FROM SENDER:\n`
      out += `${note.trim()}\n\n`
      out += `--------------------------------------------------\n\n`
    }

    out += `EXECUTIVE SUMMARY:\n`
    out += `${summary || 'No summary available.'}\n\n`

    out += `KEY DECISIONS MADE:\n`
    if (decisions.length) {
      decisions.forEach((d) => { out += `  [✓] ${d}\n` })
    } else {
      out += `  (No decisions recorded)\n`
    }
    out += `\n`

    out += `ACTION ITEMS & DELIVERABLES:\n`
    if (actions.length) {
      actions.forEach((a) => { out += `  [→] ${a}\n` })
    } else {
      out += `  (No action items recorded)\n`
    }
    out += `\n`

    if (transcript && transcript.trim()) {
      out += `--------------------------------------------------\n`
      out += `SPEECH TRANSCRIPT:\n\n`
      out += `${transcript.trim()}\n\n`
    }

    out += `==================================================\n`
    out += `Generated with MeetAgent — Executive Meeting Intelligence\n`

    return out
  }

  async function autoSaveMeetingToDb(meetingData) {
    if (!state.token) return
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
        showToast('Saved to Supabase Cloud Vault!')
        await loadUserMeetings()
      }
    } catch (err) {
      console.warn('Auto-save error:', err)
    }
  }

  // ==========================================================================
  // Meeting Studio Recording Controller
  // ==========================================================================
  async function startMeeting() {
    if (!state.user) {
      openAuthModal('login')
      showToast('Please sign in to record meetings.')
      return
    }

    try {
      const source = el.audioSource.value
      state.audioChunks = []
      state.liveFinalText = ''
      el.liveStreamText.textContent = 'Listening... Start speaking, and your words will appear here live in real-time.'

      if (source === 'display') {
        state.mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
          },
        })

        const audioTracks = state.mediaStream.getAudioTracks()
        if (audioTracks.length === 0) {
          state.mediaStream.getTracks().forEach((t) => t.stop())
          throw new Error('No audio detected from shared tab. Please enable "Also share tab audio".')
        }
      } else {
        state.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      }

      setupAudioVisualizer(state.mediaStream)
      startLiveSpeechStream()

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      state.mediaRecorder = new MediaRecorder(state.mediaStream, { mimeType })
      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          state.audioChunks.push(e.data)
        }
      }
      state.mediaRecorder.start(1000)

      startTimer()

      el.idleState.classList.add('hidden')
      el.recordingState.classList.remove('hidden')
      el.resultsSection.classList.add('hidden')
    } catch (err) {
      console.error('Audio capture error:', err)
      alert(err.message || 'Could not access audio device.')
    }
  }

  function startLiveSpeechStream() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      el.liveStreamText.innerHTML = '<em>Real-time speech streaming active via Whisper STT buffer.</em>'
      return
    }

    try {
      state.recognition = new SpeechRecognition()
      state.recognition.continuous = true
      state.recognition.interimResults = true
      state.recognition.lang = 'en-US'

      state.recognition.onresult = (event) => {
        let interimText = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            state.liveFinalText += event.results[i][0].transcript + ' '
          } else {
            interimText += event.results[i][0].transcript
          }
        }
        el.liveStreamText.innerHTML = `
          <span>${escapeHtml(state.liveFinalText)}</span>
          <span style="color:var(--brand-primary); font-weight:600;">${escapeHtml(interimText)}</span>
        `
        el.liveStreamText.scrollTop = el.liveStreamText.scrollHeight
      }

      state.recognition.onerror = () => {}
      state.recognition.onend = () => {
        if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
          try { state.recognition.start() } catch {}
        }
      }

      state.recognition.start()
    } catch {}
  }

  function stopMeeting() {
    stopTimer()
    if (state.recognition) {
      try { state.recognition.stop() } catch {}
      state.recognition = null
    }

    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = async () => {
        cleanupStream()
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' })
        await processMeetingAudio(audioBlob)
      }
      state.mediaRecorder.stop()
    } else {
      cleanupStream()
    }

    el.recordingState.classList.add('hidden')
    el.loadingState.classList.remove('hidden')
    el.loadingText.textContent = 'Transcribing meeting speech with Groq Whisper...'
  }

  function cleanupStream() {
    if (state.visualizerResizeHandler) {
      window.removeEventListener('resize', state.visualizerResizeHandler)
      state.visualizerResizeHandler = null
    }
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((track) => track.stop())
      state.mediaStream = null
    }
    if (state.audioContext) {
      state.audioContext.close()
      state.audioContext = null
    }
    if (state.animationId) {
      cancelAnimationFrame(state.animationId)
      state.animationId = null
    }
  }

  async function processMeetingAudio(audioBlob) {
    try {
      const startTime = performance.now()
      const title = el.meetingTitleInput.value.trim() || 'Executive Sync'

      // Step 1: STT
      let transcript = ''
      try {
        const res = await fetch('/api/transcribe?filename=meeting.webm', {
          method: 'POST',
          headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
          body: audioBlob,
        })
        if (res.ok) {
          const data = await res.json()
          transcript = data.text || ''
        }
      } catch (err) {
        console.warn('Backend STT failed, falling back to live transcript:', err)
      }

      if (!transcript.trim()) {
        transcript = state.liveFinalText.trim()
      }

      if (!transcript.trim()) {
        throw new Error('No speech detected in this meeting recording.')
      }

      const sttSpeed = ((performance.now() - startTime) / 1000).toFixed(1)
      state.currentTranscript = transcript
      el.transcriptText.value = transcript

      const wordCount = transcript.trim().split(/\s+/).length
      const durationSec = (performance.now() - state.startTime) / 1000

      el.statWords.textContent = `${wordCount} words`
      el.statDuration.textContent = `${durationSec.toFixed(1)}s duration`
      el.statSpeed.textContent = `STT speed: ${sttSpeed}s`

      // Step 2: MoM Generation
      el.loadingText.textContent = 'Synthesizing Minutes of Meeting with AI...'
      await generateMoM(transcript, durationSec, wordCount, title)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to process meeting.')
      el.loadingState.classList.add('hidden')
      el.idleState.classList.remove('hidden')
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!state.user) {
      openAuthModal('login')
      showToast('Please sign in to upload meetings.')
      return
    }

    try {
      el.idleState.classList.add('hidden')
      el.loadingState.classList.remove('hidden')
      el.loadingText.textContent = `Uploading "${file.name}" and transcribing...`

      const startTime = performance.now()
      const title = file.name.replace(/\.[^/.]+$/, '')

      const res = await fetch(`/api/transcribe?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'audio/webm' },
        body: file,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to transcribe file')
      }

      const data = await res.json()
      const transcript = data.text || ''

      if (!transcript.trim()) {
        throw new Error('No speech detected in audio file.')
      }

      const sttSpeed = ((performance.now() - startTime) / 1000).toFixed(1)
      state.currentTranscript = transcript
      el.transcriptText.value = transcript

      const wordCount = transcript.trim().split(/\s+/).length
      el.statWords.textContent = `${wordCount} words`
      el.statDuration.textContent = 'Uploaded Audio'
      el.statSpeed.textContent = `STT: ${sttSpeed}s`

      el.loadingText.textContent = 'Generating Minutes of Meeting...'
      await generateMoM(transcript, 0, wordCount, title)
    } catch (err) {
      alert(err.message || 'File processing failed')
      el.loadingState.classList.add('hidden')
      el.idleState.classList.remove('hidden')
    } finally {
      el.audioFileInput.value = ''
    }
  }

  async function generateMoM(transcript, durationSec = 0, wordCount = 0, title = 'Executive Sync') {
    const model = el.aiModel.value
    try {
      const res = await fetch('/api/mom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, model }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate MoM')
      }

      const data = await res.json()
      state.currentMoMRaw = data.mom

      renderParsedMoMToContainer(
        data.mom,
        el.summaryContent,
        el.decisionsList,
        el.actionsList
      )

      el.loadingState.classList.add('hidden')
      el.resultsSection.classList.remove('hidden')
      el.idleState.classList.remove('hidden')
      switchStudioResultTab('mom')

      // Auto-save to Supabase Database
      const meetingPayload = {
        title: title || el.meetingTitleInput.value.trim() || 'Meeting Session',
        transcript,
        momRaw: data.mom,
        summary: extractExecutiveSummary(data.mom),
        decisions: extractDecisions(data.mom),
        actions: extractActions(data.mom),
        aiModel: model,
        durationSec: durationSec || 0,
        wordCount: wordCount || transcript.split(/\s+/).length,
      }

      await autoSaveMeetingToDb(meetingPayload)
    } catch (err) {
      alert(err.message || 'Failed to synthesize MoM')
      el.loadingState.classList.add('hidden')
      el.idleState.classList.remove('hidden')
    }
  }

  // ==========================================================================
  // MoM Rendering & Markdown Parser
  // ==========================================================================
  function renderParsedMoMToContainer(rawMarkdown, summaryEl, decisionsEl, actionsEl) {
    if (!rawMarkdown) {
      summaryEl.textContent = 'No summary available.'
      decisionsEl.innerHTML = '<li>No decisions recorded.</li>'
      actionsEl.innerHTML = '<div class="empty-task">No action items recorded.</div>'
      return
    }

    const summary = extractExecutiveSummary(rawMarkdown)
    const decisions = extractDecisions(rawMarkdown)
    const actions = extractActions(rawMarkdown)

    summaryEl.innerHTML = `<p>${escapeHtml(summary || 'Meeting overview completed.')}</p>`

    if (decisions.length > 0) {
      decisionsEl.innerHTML = decisions.map((d) => `<li>${escapeHtml(d)}</li>`).join('')
    } else {
      decisionsEl.innerHTML = '<li>No explicit decisions recorded.</li>'
    }

    if (actions.length > 0) {
      actionsEl.innerHTML = actions.map((a) => {
        const match = a.match(/^\[?([A-Za-z0-9\s._-]+)\]?:\s*(.+)$/)
        if (match) {
          const owner = match[1].trim()
          const task = match[2].trim()
          return `
            <div class="action-task-item">
              <input type="checkbox">
              <span class="task-owner-pill">${escapeHtml(owner)}</span>
              <span>${escapeHtml(task)}</span>
            </div>`
        }
        return `
          <div class="action-task-item">
            <input type="checkbox">
            <span>${escapeHtml(a)}</span>
          </div>`
      }).join('')
    } else {
      actionsEl.innerHTML = '<div class="empty-task">No action items recorded.</div>'
    }
  }

  function cleanParagraph(text) {
    if (!text) return ''
    return text
      .replace(/^[#*=\-\s]+/gm, '')
      .replace(/[#*=\-\s]+$/gm, '')
      .trim()
  }

  function extractListLines(chunk) {
    if (!chunk) return []
    return chunk
      .split('\n')
      .map((l) => l.replace(/^[*\s\-•\d.]+|\[[ xX]\]/g, '').trim())
      .filter((l) => l.length > 2 && !/^none(\s*recorded|\s*explicitly)?\.?$/i.test(l))
  }

  function extractSummary(md) {
    return extractExecutiveSummary(md)
  }

  function extractExecutiveSummary(md) {
    if (!md) return ''
    // 1. Tag format: ===SUMMARY=== ... ===DECISIONS===
    const tagMatch = md.match(/===\s*SUMMARY\s*===([\s\S]*?)(?====\s*DECISIONS|===\s*ACTION|===\s*TRANSCRIPT|$)/i)
    if (tagMatch && tagMatch[1].trim()) {
      return cleanParagraph(tagMatch[1])
    }

    // 2. Markdown Header format: ### Executive Summary ... ### Key Decisions
    const headerMatch = md.match(/(?:###?|\*\*)\s*(?:Executive\s+)?Summary:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*(?:Key\s+)?Decisions|(?:###?|\*\*)\s*Action\s+Items|$)/i)
    if (headerMatch && headerMatch[1].trim()) {
      return cleanParagraph(headerMatch[1])
    }

    // 3. Fallback: Take everything before the first decisions or action items heading
    const beforeSectionMatch = md.match(/^([\s\S]*?)(?=(?:###?|\*\*|===)\s*(?:Key\s+)?Decisions|(?:###?|\*\*|===)\s*Action\s+Items)/i)
    if (beforeSectionMatch && beforeSectionMatch[1].trim()) {
      return cleanParagraph(beforeSectionMatch[1])
    }

    const firstPara = md.split(/\n\s*\n/)[0] || md.slice(0, 300)
    return cleanParagraph(firstPara)
  }

  function extractDecisions(md) {
    if (!md) return []
    // 1. Tag format: ===DECISIONS=== ... ===ACTION ITEMS===
    const tagMatch = md.match(/===\s*DECISIONS\s*===([\s\S]*?)(?====\s*ACTION|===\s*TRANSCRIPT|===\s*SUMMARY|$)/i)
    if (tagMatch && tagMatch[1].trim()) {
      return extractListLines(tagMatch[1])
    }

    // 2. Markdown Header format: ### Key Decisions ...
    const headerMatch = md.match(/(?:###?|\*\*)\s*(?:Key\s+)?Decisions:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*Action\s+Items|(?:###?|\*\*)\s*(?:Executive\s+)?Summary|$)/i)
    if (headerMatch && headerMatch[1].trim()) {
      return extractListLines(headerMatch[1])
    }

    return []
  }

  function extractActions(md) {
    if (!md) return []
    // 1. Tag format: ===ACTION ITEMS=== ...
    const tagMatch = md.match(/===\s*ACTION\s*ITEMS?\s*===([\s\S]*?)(?====\s*TRANSCRIPT|===\s*SUMMARY|===\s*DECISIONS|$)/i)
    if (tagMatch && tagMatch[1].trim()) {
      return extractListLines(tagMatch[1])
    }

    // 2. Markdown Header format: ### Action Items ...
    const headerMatch = md.match(/(?:###?|\*\*)\s*Action\s*Items?:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*(?:Key\s+)?Decisions|(?:###?|\*\*)\s*(?:Executive\s+)?Summary|$)/i)
    if (headerMatch && headerMatch[1].trim()) {
      return extractListLines(headerMatch[1])
    }

    return []
  }

  // ==========================================================================
  // Waveform Visualizer & Audio Timer
  // ==========================================================================
  function setupAudioVisualizer(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      state.audioContext = new AudioCtx()
      const source = state.audioContext.createMediaStreamSource(stream)
      state.analyserNode = state.audioContext.createAnalyser()
      state.analyserNode.fftSize = 64
      source.connect(state.analyserNode)

      const canvas = el.waveformCanvas
      const ctx = canvas.getContext('2d')
      const bufferLength = state.analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      function syncCanvasDimensions() {
        if (canvas && canvas.parentElement) {
          canvas.width = canvas.parentElement.clientWidth || 300
        }
      }
      syncCanvasDimensions()
      state.visualizerResizeHandler = syncCanvasDimensions
      window.addEventListener('resize', syncCanvasDimensions)

      function draw() {
        state.animationId = requestAnimationFrame(draw)
        state.analyserNode.getByteFrequencyData(dataArray)

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const barWidth = (canvas.width / bufferLength) * 1.5
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height
          ctx.fillStyle = '#4338ca' // Royal Indigo
          ctx.beginPath()
          ctx.roundRect(x, canvas.height - barHeight, Math.max(barWidth - 2, 2), barHeight, [2, 2, 0, 0])
          ctx.fill()
          x += barWidth + 1
        }
      }

      draw()
    } catch (e) {
      console.warn('Audio visualization not supported:', e)
    }
  }

  function startTimer() {
    state.startTime = performance.now()
    el.meetingTimer.textContent = '00:00'
    state.timerInterval = setInterval(() => {
      const elapsed = Math.floor((performance.now() - state.startTime) / 1000)
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
      const secs = String(elapsed % 60).padStart(2, '0')
      el.meetingTimer.textContent = `${mins}:${secs}`
    }, 1000)
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval)
      state.timerInterval = null
    }
  }

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================
  function switchStudioResultTab(tab) {
    state.activeStudioResultTab = tab
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

  function copyActiveContent(momRaw, transcript, activeTab) {
    const textToCopy = activeTab === 'mom' ? momRaw : transcript
    if (!textToCopy) return
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('Copied to clipboard!')
    })
  }

  function downloadMarkdown(momRaw, transcript, title = 'Meeting_MoM') {
    const content = `# ${title}\n\n## Minutes of Meeting\n\n${momRaw}\n\n---\n\n## Full Transcript\n\n${transcript}`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9_-]/gi, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Markdown file downloaded!')
  }

  function showToast(msg) {
    el.toast.textContent = msg
    el.toast.classList.remove('hidden')
    setTimeout(() => {
      el.toast.classList.add('hidden')
    }, 3200)
  }

  function escapeHtml(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Boot Application
  init()
})()

// MeetAgent — Professional Enterprise SaaS Controller
// High-Reliability Architecture with Cloud Database Persistence & Speech Intelligence
(() => {
  'use strict'

  // Application State
  const state = {
    user: null,
    token: localStorage.getItem('meetagent_token') || null,
    activeWorkspaceTab: localStorage.getItem('meetagent_active_tab') || 'studio',
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
    navProfileBtn: document.getElementById('navProfileBtn'),
    vaultCountBadge: document.getElementById('vaultCountBadge'),

    guestNav: document.getElementById('guestNav'),
    navOpenStudioBtn: document.getElementById('navOpenStudioBtn'),
    navOpenDemoBtn: document.getElementById('navOpenDemoBtn'),
    navOpenVaultBtn: document.getElementById('navOpenVaultBtn'),
    openLoginBtn: document.getElementById('openLoginBtn'),
    openRegisterBtn: document.getElementById('openRegisterBtn'),
    userNav: document.getElementById('userNav'),
    navUserStudioBtn: document.getElementById('navUserStudioBtn'),
    navUserHistoryBtn: document.getElementById('navUserHistoryBtn'),
    topUserPill: document.getElementById('topUserPill'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Mobile Bottom Application Bar
    mobileBottomBar: document.getElementById('mobileBottomBar'),
    mobileTabStudio: document.getElementById('mobileTabStudio'),
    mobileTabDemo: document.getElementById('mobileTabDemo'),
    mobileTabVault: document.getElementById('mobileTabVault'),
    mobileTabVaultLabel: document.getElementById('mobileTabVaultLabel'),
    mobileTabAccount: document.getElementById('mobileTabAccount'),
    mobileTabAccountLabel: document.getElementById('mobileTabAccountLabel'),

    // Sidebar Navigation Elements
    sidebarNavStudio: document.getElementById('sidebarNavStudio'),
    sidebarNavVault: document.getElementById('sidebarNavVault'),
    sidebarNavVaultTitle: document.getElementById('sidebarNavVaultTitle'),
    sidebarNavProfile: document.getElementById('sidebarNavProfile'),
    sidebarVaultCountBadge: document.getElementById('sidebarVaultCountBadge'),
    sidebarUserCard: document.getElementById('sidebarUserCard'),
    sidebarUserAvatar: document.getElementById('sidebarUserAvatar'),
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserEmail: document.getElementById('sidebarUserEmail'),
    sidebarLogoutBtn: document.getElementById('sidebarLogoutBtn'),

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
    profileView: document.getElementById('profileView'),

    // Profile View Elements
    profileAvatarLarge: document.getElementById('profileAvatarLarge'),
    profileCardName: document.getElementById('profileCardName'),
    profileCardEmail: document.getElementById('profileCardEmail'),
    profilePhotoInput: document.getElementById('profilePhotoInput'),
    profileUploadPhotoBtn: document.getElementById('profileUploadPhotoBtn'),
    profileRemovePhotoBtn: document.getElementById('profileRemovePhotoBtn'),
    profileInfoForm: document.getElementById('profileInfoForm'),
    profileInfoAlert: document.getElementById('profileInfoAlert'),
    profileNameInput: document.getElementById('profileNameInput'),
    profileEmailInput: document.getElementById('profileEmailInput'),
    profileSaveInfoBtn: document.getElementById('profileSaveInfoBtn'),
    profilePasswordForm: document.getElementById('profilePasswordForm'),
    profilePasswordAlert: document.getElementById('profilePasswordAlert'),
    profileCurrentPasswordInput: document.getElementById('profileCurrentPasswordInput'),
    profileNewPasswordInput: document.getElementById('profileNewPasswordInput'),
    profileConfirmPasswordInput: document.getElementById('profileConfirmPasswordInput'),
    profileSavePasswordBtn: document.getElementById('profileSavePasswordBtn'),

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
    resetForm: document.getElementById('resetForm'),
    resetEmail: document.getElementById('resetEmail'),
    resetNewPassword: document.getElementById('resetNewPassword'),
    resetError: document.getElementById('resetError'),
    resetSuccess: document.getElementById('resetSuccess'),
    switchToReset: document.getElementById('switchToReset'),
    switchToLoginFromReset: document.getElementById('switchToLoginFromReset'),

    // Meeting Studio Controls
    callConsoleCard: document.getElementById('callConsoleCard'),
    meetingTitleInput: document.getElementById('meetingTitleInput'),
    detectedLangPill: document.getElementById('detectedLangPill'),
    statLanguage: document.getElementById('statLanguage'),
    engineStatusText: document.getElementById('engineStatusText'),
    audioSource: document.getElementById('audioSource'),
    sourceMicBtn: document.getElementById('sourceMicBtn'),
    sourceScreenBtn: document.getElementById('sourceScreenBtn'),
    aiModel: document.getElementById('aiModel'),

    guestNoticeBanner: document.getElementById('guestNoticeBanner'),
    guestNoticeLoginBtn: document.getElementById('guestNoticeLoginBtn'),
    idleState: document.getElementById('idleState'),
    recordingState: document.getElementById('recordingState'),
    loadingState: document.getElementById('loadingState'),
    loadingText: document.getElementById('loadingText'),

    startBtn: document.getElementById('startBtn'),
    startBtnLabel: document.getElementById('startBtnLabel'),
    stopBtn: document.getElementById('stopBtn'),
    audioFileInput: document.getElementById('audioFileInput'),
    meetingTimer: document.getElementById('meetingTimer'),
    waveformCanvas: document.getElementById('waveformCanvas'),
    liveStreamText: document.getElementById('liveStreamText'),

    // Studio Results
    resultsSection: document.getElementById('resultsSection'),
    newMeetingStudioBtn: document.getElementById('newMeetingStudioBtn'),
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

    // Landing Demo & FAQ
    heroDemoScrollBtn: document.getElementById('heroDemoScrollBtn'),
    demoPresetNav: document.querySelector('.demo-preset-nav'),
    demoScenarioBrief: document.getElementById('demoScenarioBrief'),
    demoScenarioTag: document.getElementById('demoScenarioTag'),
    demoScenarioDuration: document.getElementById('demoScenarioDuration'),
    demoScenarioObjective: document.getElementById('demoScenarioObjective'),
    demoScenarioTitle: document.getElementById('demoScenarioTitle'),
    demoScenarioDesc: document.getElementById('demoScenarioDesc'),
    demoScenarioRoster: document.getElementById('demoScenarioRoster'),
    demoPlayBtn: document.getElementById('demoPlayBtn'),
    demoPlayIcon: document.getElementById('demoPlayIcon'),
    demoPlayLabel: document.getElementById('demoPlayLabel'),
    demoInstantBtn: document.getElementById('demoInstantBtn'),
    demoSpeedBtn: document.getElementById('demoSpeedBtn'),
    demoSpeedLabel: document.getElementById('demoSpeedLabel'),
    demoResetBtn: document.getElementById('demoResetBtn'),
    demoTimer: document.getElementById('demoTimer'),
    demoProgressBar: document.getElementById('demoProgressBar'),
    demoEqualizer: document.getElementById('demoEqualizer'),
    demoChatStream: document.getElementById('demoChatStream'),
    demoMomCards: document.getElementById('demoMomCards'),
    demoStreamBadge: document.getElementById('demoStreamBadge'),
    demoMomBadge: document.getElementById('demoMomBadge'),
    demoStatusText: document.getElementById('demoStatusText'),

    toast: document.getElementById('toast'),

    // Universal Dialog Modal
    dialogModal: document.getElementById('dialogModal'),
    dialogTitle: document.getElementById('dialogTitle'),
    dialogMessage: document.getElementById('dialogMessage'),
    dialogIconBox: document.getElementById('dialogIconBox'),
    dialogConfirmBtn: document.getElementById('dialogConfirmBtn'),
    dialogCancelBtn: document.getElementById('dialogCancelBtn'),
    globalSpinnerBadge: document.getElementById('globalSpinnerBadge'),
    globalSpinnerText: document.getElementById('globalSpinnerText'),
  }

  // ==========================================================================
  // Global Spinner & Request Feedback Management
  // ==========================================================================
  let activeServerProcesses = 0

  function showGlobalSpinner(text = 'Processing...') {
    activeServerProcesses++
    const bar = document.getElementById('globalProgressBar')
    if (bar) bar.classList.add('active')

    const badge = document.getElementById('globalSpinnerBadge')
    const badgeText = document.getElementById('globalSpinnerText')
    if (badge) {
      if (badgeText && text) badgeText.textContent = text
      badge.classList.remove('hidden')
    }
  }

  function hideGlobalSpinner() {
    activeServerProcesses = Math.max(0, activeServerProcesses - 1)
    if (activeServerProcesses === 0) {
      const bar = document.getElementById('globalProgressBar')
      if (bar) bar.classList.remove('active')

      const badge = document.getElementById('globalSpinnerBadge')
      if (badge) badge.classList.add('hidden')
    }
  }

  // ==========================================================================
  // Universal Modal Dialog System (Replacing alert & confirm)
  // ==========================================================================
  let dialogResolve = null

  function getDialogIconSvg(type) {
    switch (type) {
      case 'danger':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`
      case 'warning':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`
      case 'success':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>`
      case 'info':
      default:
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`
    }
  }

  function openDialog({ title, message, type = 'info', confirmText = 'Confirm', cancelText = 'Cancel', isConfirm = true }) {
    return new Promise((resolve) => {
      dialogResolve = resolve

      if (el.dialogTitle) el.dialogTitle.textContent = title || (isConfirm ? 'Confirm Action' : 'Notice')
      if (el.dialogMessage) el.dialogMessage.textContent = message || ''

      if (el.dialogIconBox) {
        el.dialogIconBox.className = `dialog-icon-box icon-${type}`
        el.dialogIconBox.innerHTML = getDialogIconSvg(type)
      }

      if (el.dialogConfirmBtn) {
        el.dialogConfirmBtn.textContent = confirmText
        el.dialogConfirmBtn.className = type === 'danger' ? 'btn btn-danger' : 'btn btn-primary'
      }

      if (el.dialogCancelBtn) {
        el.dialogCancelBtn.textContent = cancelText
        if (isConfirm) {
          el.dialogCancelBtn.classList.remove('hidden')
        } else {
          el.dialogCancelBtn.classList.add('hidden')
        }
      }

      if (el.dialogModal) {
        el.dialogModal.classList.remove('hidden')
        if (el.dialogConfirmBtn) el.dialogConfirmBtn.focus()
      }
    })
  }

  function closeDialog(result = false) {
    if (el.dialogModal) el.dialogModal.classList.add('hidden')
    if (dialogResolve) {
      const res = dialogResolve
      dialogResolve = null
      res(result)
    }
  }

  function showConfirmDialog(opts = {}) {
    return openDialog({ ...opts, isConfirm: true })
  }

  function showAlertDialog(opts = {}) {
    return openDialog({ ...opts, isConfirm: false, confirmText: opts.confirmText || 'Okay' })
  }

  function setButtonLoading(btn, isLoading, loadingText = '') {
    if (!btn) return
    if (isLoading) {
      btn.disabled = true
      if (!btn.getAttribute('data-original-html')) {
        btn.setAttribute('data-original-html', btn.innerHTML)
      }
      btn.innerHTML = `<span class="btn-spinner"></span><span>${loadingText || 'Processing...'}</span>`
    } else {
      btn.disabled = false
      const orig = btn.getAttribute('data-original-html')
      if (orig) {
        btn.innerHTML = orig
        btn.removeAttribute('data-original-html')
      }
    }
  }

  // ==========================================================================
  // Application Lifecycle & Boot
  // ==========================================================================
  async function init() {
    setupEventListeners()
    setDefaultMeetingTitle()
    setupLandingHeroDemo()
    setupFAQAccordion()

    // Immediate Zero-FOUC optimistic session restoration
    if (state.token) {
      document.documentElement.classList.add('has-auth-session')
      const savedTab = localStorage.getItem('meetagent_active_tab') || 'studio'
      state.activeWorkspaceTab = savedTab
      document.documentElement.setAttribute('data-active-tab', savedTab)

      try {
        const cachedUser = localStorage.getItem('meetagent_user')
        if (cachedUser) {
          state.user = JSON.parse(cachedUser)
        }
      } catch {}
      renderViewState(true)
    } else {
      document.documentElement.classList.remove('has-auth-session')
      document.documentElement.removeAttribute('data-active-tab')
      renderViewState(false)
    }

    // Verify authentication and engine in background without blocking UI
    Promise.all([
      checkAuthStatus(),
      checkEngineHealth(),
    ]).catch(() => {})
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
        if (el.engineStatusText) {
          el.engineStatusText.textContent = 'AI Assistant Ready'
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
    if (el.brandLogo) {
      el.brandLogo.addEventListener('click', () => {
        if (state.user) {
          openStudioWorkstation()
        } else {
          if (el.landingView) el.landingView.classList.remove('hidden')
          if (el.appWorkspace) el.appWorkspace.classList.add('hidden')
          updateMobileBottomBar('demo')
          updateTopNavActive('demo')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
    }

    // Guest Auth Triggers
    if (el.openLoginBtn) el.openLoginBtn.addEventListener('click', () => openAuthModal('login'))
    if (el.openRegisterBtn) el.openRegisterBtn.addEventListener('click', () => openAuthModal('register'))
    if (el.guestNoticeLoginBtn) el.guestNoticeLoginBtn.addEventListener('click', () => openAuthModal('login'))

    // Direct App Navigation
    if (el.heroGetStartedBtn) el.heroGetStartedBtn.addEventListener('click', () => openStudioWorkstation())
    if (el.navOpenStudioBtn) el.navOpenStudioBtn.addEventListener('click', () => openStudioWorkstation())
    if (el.navOpenDemoBtn) el.navOpenDemoBtn.addEventListener('click', () => openDemoSimulator())
    if (el.navOpenVaultBtn) el.navOpenVaultBtn.addEventListener('click', () => openVaultWorkstation())
    if (el.navUserStudioBtn) el.navUserStudioBtn.addEventListener('click', () => switchWorkspaceTab('studio'))
    if (el.navUserHistoryBtn) el.navUserHistoryBtn.addEventListener('click', () => switchWorkspaceTab('vault'))

    // Mobile Bottom Application Bar
    if (el.mobileTabStudio) el.mobileTabStudio.addEventListener('click', () => openStudioWorkstation())
    if (el.mobileTabDemo) el.mobileTabDemo.addEventListener('click', () => openDemoSimulator())
    if (el.mobileTabVault) el.mobileTabVault.addEventListener('click', () => openVaultWorkstation())
    if (el.mobileTabAccount) el.mobileTabAccount.addEventListener('click', () => {
      if (state.user) {
        openProfileWorkstation()
      } else {
        openAuthModal('login')
      }
    })

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
    if (el.switchToReset) {
      el.switchToReset.addEventListener('click', (e) => {
        e.preventDefault()
        switchAuthTab('reset')
      })
    }
    if (el.switchToLoginFromReset) {
      el.switchToLoginFromReset.addEventListener('click', (e) => {
        e.preventDefault()
        switchAuthTab('login')
      })
    }

    el.loginForm.addEventListener('submit', handleLogin)
    el.registerForm.addEventListener('submit', handleRegister)
    if (el.resetForm) el.resetForm.addEventListener('submit', handleResetPassword)
    el.logoutBtn.addEventListener('click', handleLogout)

    // Workspace Navigation Tabs & Sidebar
    if (el.navStudioBtn) el.navStudioBtn.addEventListener('click', () => switchWorkspaceTab('studio'))
    if (el.navVaultBtn) el.navVaultBtn.addEventListener('click', () => switchWorkspaceTab('vault'))
    if (el.navProfileBtn) el.navProfileBtn.addEventListener('click', () => switchWorkspaceTab('profile'))
    if (el.topUserPill) el.topUserPill.addEventListener('click', () => switchWorkspaceTab('profile'))

    // Left-Side Workspace Navigation Menu
    if (el.sidebarNavStudio) el.sidebarNavStudio.addEventListener('click', () => switchWorkspaceTab('studio'))
    if (el.sidebarNavVault) el.sidebarNavVault.addEventListener('click', () => switchWorkspaceTab('vault'))
    if (el.sidebarNavProfile) el.sidebarNavProfile.addEventListener('click', () => switchWorkspaceTab('profile'))
    if (el.sidebarUserCard) el.sidebarUserCard.addEventListener('click', () => switchWorkspaceTab('profile'))
    if (el.sidebarLogoutBtn) el.sidebarLogoutBtn.addEventListener('click', handleLogout)

    // User Profile Actions
    if (el.profileUploadPhotoBtn) el.profileUploadPhotoBtn.addEventListener('click', () => el.profilePhotoInput.click())
    if (el.profilePhotoInput) el.profilePhotoInput.addEventListener('change', handleProfilePhotoUpload)
    if (el.profileRemovePhotoBtn) el.profileRemovePhotoBtn.addEventListener('click', handleProfilePhotoRemove)
    if (el.profileInfoForm) el.profileInfoForm.addEventListener('submit', handleProfileInfoSubmit)
    if (el.profilePasswordForm) el.profilePasswordForm.addEventListener('submit', handleProfilePasswordSubmit)

    document.querySelectorAll('.preset-avatar-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset')
        handlePresetAvatarSelect(preset)
      })
    })
    if (el.vaultNewMeetingBtn) {
      el.vaultNewMeetingBtn.addEventListener('click', () => {
        switchWorkspaceTab('studio')
        resetStudioForNewMeeting()
      })
    }
    if (el.emptyStartBtn) {
      el.emptyStartBtn.addEventListener('click', () => {
        switchWorkspaceTab('studio')
        resetStudioForNewMeeting()
      })
    }

    // Vault Search Filter
    if (el.vaultSearchInput) {
      el.vaultSearchInput.addEventListener('input', handleVaultSearch)
    }

    el.startBtn.addEventListener('click', startMeeting)
    el.stopBtn.addEventListener('click', stopMeeting)
    el.audioFileInput.addEventListener('change', handleFileUpload)

    if (el.sourceMicBtn) {
      el.sourceMicBtn.addEventListener('click', () => setAudioSource('mic'))
    }
    if (el.sourceScreenBtn) {
      el.sourceScreenBtn.addEventListener('click', () => setAudioSource('tab'))
    }

    // Studio Results Tabs & Actions
    el.tabMoMBtn.addEventListener('click', () => switchStudioResultTab('mom'))
    el.tabTranscriptBtn.addEventListener('click', () => switchStudioResultTab('transcript'))
    el.copyBtn.addEventListener('click', () => copyActiveContent(state.currentMoMRaw, state.currentTranscript, state.activeStudioResultTab))
    el.downloadBtn.addEventListener('click', () => downloadMarkdown(state.currentMoMRaw, state.currentTranscript, el.meetingTitleInput.value))
    if (el.newMeetingStudioBtn) {
      el.newMeetingStudioBtn.addEventListener('click', resetStudioForNewMeeting)
    }
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

    if (el.saveVaultBtn) {
      el.saveVaultBtn.addEventListener('click', () => {
        if (!state.user) {
          showToast('Sign in or create an account to save this session to your Meeting History.')
          openAuthModal('login')
          return
        }
        switchWorkspaceTab('vault')
      })
    }

    // Universal Dialog Modal Controls
    if (el.dialogConfirmBtn) {
      el.dialogConfirmBtn.addEventListener('click', () => closeDialog(true))
    }
    if (el.dialogCancelBtn) {
      el.dialogCancelBtn.addEventListener('click', () => closeDialog(false))
    }
    if (el.dialogModal) {
      el.dialogModal.addEventListener('click', (e) => {
        if (e.target === el.dialogModal) closeDialog(false)
      })
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el.dialogModal && !el.dialogModal.classList.contains('hidden')) {
          closeDialog(false)
        }
        if (el.meetingDetailModal && !el.meetingDetailModal.classList.contains('hidden')) {
          closeDetailModal()
        }
      }

      // Studio recording shortcut: Alt+R (when not typing in form inputs)
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      if ((e.altKey && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) && !isInputFocused) {
        e.preventDefault()
        if (state.isRecording) {
          if (el.stopBtn && !el.stopBtn.disabled) el.stopBtn.click()
        } else {
          if (el.startBtn && !el.startBtn.disabled) el.startBtn.click()
        }
      }

      // View switching shortcuts: Alt+1 (Studio), Alt+2 (Vault), Alt+3 (Profile)
      if (e.altKey && !isInputFocused) {
        if (e.key === '1' || e.code === 'Digit1') {
          e.preventDefault()
          if (el.sidebarNavStudio) el.sidebarNavStudio.click()
        } else if (e.key === '2' || e.code === 'Digit2') {
          e.preventDefault()
          if (el.sidebarNavVault) el.sidebarNavVault.click()
        } else if (e.key === '3' || e.code === 'Digit3') {
          e.preventDefault()
          if (el.sidebarNavProfile) el.sidebarNavProfile.click()
        }
      }
    })
  }

  // ==========================================================================
  // Authentication & Session Management
  // ==========================================================================
  async function checkAuthStatus() {
    if (!state.token) {
      document.documentElement.classList.remove('has-auth-session')
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
          localStorage.setItem('meetagent_user', JSON.stringify(data.user))
          document.documentElement.classList.add('has-auth-session')
          renderViewState(true)
          await loadUserMeetings()
          return
        }
      }
    } catch {}

    // Invalid or expired token
    localStorage.removeItem('meetagent_token')
    localStorage.removeItem('meetagent_user')
    document.documentElement.classList.remove('has-auth-session')
    state.token = null
    state.user = null
    renderViewState(false)
  }

  window.meetagentOpenAuth = () => openAuthModal('login')

  function renderViewState(isAuthenticated) {
    closeMobileMenu()

    const breadcrumb = document.getElementById('workspaceBreadcrumb')
    const engineBadge = document.getElementById('engineStatusBadge')

    if (isAuthenticated && state.user) {
      document.documentElement.classList.add('has-auth-session')

      // Show Workspace, Hide Landing Page
      if (el.landingView) el.landingView.classList.add('hidden')
      if (el.appWorkspace) el.appWorkspace.classList.remove('hidden')
      if (el.workspaceNav) el.workspaceNav.classList.remove('hidden')

      if (el.marketingNav) el.marketingNav.classList.add('hidden')
      if (el.guestNav) el.guestNav.classList.add('hidden')
      if (el.userNav) el.userNav.classList.remove('hidden')
      if (el.mobileMenuBtn) el.mobileMenuBtn.classList.add('hidden')
      if (breadcrumb) breadcrumb.classList.remove('hidden')
      if (engineBadge) engineBadge.classList.remove('hidden')

      // Show Meeting History on mobile bottom bar and sidebar
      if (el.mobileTabVault) {
        el.mobileTabVault.classList.remove('hidden')
      }
      if (el.mobileTabVaultLabel) {
        el.mobileTabVaultLabel.textContent = 'Meeting History'
      }
      if (el.sidebarNavVault) {
        el.sidebarNavVault.classList.remove('hidden')
      }
      if (el.sidebarNavVaultTitle) {
        el.sidebarNavVaultTitle.textContent = 'Meeting History'
      }
      if (el.mobileTabAccountLabel) {
        el.mobileTabAccountLabel.textContent = 'Account'
      }

      // Check if local avatar backup exists
      if (state.user && state.user.id) {
        const localAvatar = localStorage.getItem('meetagent_avatar_' + state.user.id)
        if (localAvatar && !state.user.avatar) {
          state.user.avatar = localAvatar
        }
      }

      renderUserAvatars(state.user)

      const name = state.user.name || (state.user.email ? state.user.email.split('@')[0] : 'User')
      const email = state.user.email || ''

      if (el.userName) el.userName.textContent = name
      if (el.sidebarUserName) el.sidebarUserName.textContent = name
      if (el.sidebarUserEmail) el.sidebarUserEmail.textContent = email
      if (el.profileCardName) el.profileCardName.textContent = name
      if (el.profileCardEmail) el.profileCardEmail.textContent = email

      if (el.profileNameInput) el.profileNameInput.value = state.user.name || ''
      if (el.profileEmailInput) el.profileEmailInput.value = state.user.email || ''

      switchWorkspaceTab(state.activeWorkspaceTab || 'studio')
      loadUserMeetings()
    } else {
      document.documentElement.classList.remove('has-auth-session')

      // Show Landing Page, Hide Workspace
      if (el.landingView) el.landingView.classList.remove('hidden')
      if (el.appWorkspace) el.appWorkspace.classList.add('hidden')
      if (el.workspaceNav) el.workspaceNav.classList.add('hidden')

      if (el.marketingNav) el.marketingNav.classList.remove('hidden')
      if (el.guestNav) el.guestNav.classList.remove('hidden')
      if (el.userNav) el.userNav.classList.add('hidden')
      if (el.mobileMenuBtn) el.mobileMenuBtn.classList.remove('hidden')
      if (breadcrumb) breadcrumb.classList.add('hidden')
      if (engineBadge) engineBadge.classList.add('hidden')

      // Strictly hide Meeting History when not logged in
      if (el.mobileTabVault) {
        el.mobileTabVault.classList.add('hidden')
      }
      if (el.sidebarNavVault) {
        el.sidebarNavVault.classList.add('hidden')
      }
      if (el.navOpenVaultBtn) {
        el.navOpenVaultBtn.classList.add('hidden')
      }
      if (el.mobileTabAccountLabel) {
        el.mobileTabAccountLabel.textContent = 'Sign In'
      }

      // If active tab was vault, reset to studio
      if (state.activeWorkspaceTab === 'vault') {
        state.activeWorkspaceTab = 'studio'
        localStorage.setItem('meetagent_active_tab', 'studio')
        document.documentElement.setAttribute('data-active-tab', 'studio')
      }
    }
  }

  function renderUserAvatars(user) {
    if (!user) return
    const name = user.name || (user.email ? user.email.split('@')[0] : 'User')
    const initial = (name[0] || 'U').toUpperCase()
    const avatar = user.avatar || localStorage.getItem('meetagent_avatar_' + user.id)

    const applyToElement = (elem) => {
      if (!elem) return
      if (avatar) {
        if (avatar.startsWith('data:image') || avatar.startsWith('http')) {
          elem.innerHTML = `<img src="${avatar}" class="avatar-image-render" alt="${name}">`
        } else {
          elem.textContent = avatar
        }
      } else {
        elem.textContent = initial
      }
    }

    applyToElement(el.userAvatar)
    applyToElement(el.sidebarUserAvatar)
    applyToElement(el.profileAvatarLarge)
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
    if (el.loginError) el.loginError.classList.add('hidden')
    if (el.regError) el.regError.classList.add('hidden')
    if (el.resetError) el.resetError.classList.add('hidden')
    if (el.resetSuccess) el.resetSuccess.classList.add('hidden')
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
      if (el.resetForm) el.resetForm.classList.add('hidden')
      el.loginEmail.focus()
    } else if (tab === 'register') {
      el.authTabRegister.classList.add('active')
      el.authTabLogin.classList.remove('active')
      el.registerForm.classList.remove('hidden')
      el.loginForm.classList.add('hidden')
      if (el.resetForm) el.resetForm.classList.add('hidden')
      el.regName.focus()
    } else if (tab === 'reset') {
      el.authTabLogin.classList.remove('active')
      el.authTabRegister.classList.remove('active')
      el.loginForm.classList.add('hidden')
      el.registerForm.classList.add('hidden')
      if (el.resetForm) el.resetForm.classList.remove('hidden')
      if (el.resetError) el.resetError.classList.add('hidden')
      if (el.resetSuccess) el.resetSuccess.classList.add('hidden')
      if (el.resetEmail) {
        if (el.loginEmail && el.loginEmail.value) el.resetEmail.value = el.loginEmail.value.trim()
        el.resetEmail.focus()
      }
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (el.resetError) el.resetError.classList.add('hidden')
    if (el.resetSuccess) el.resetSuccess.classList.add('hidden')

    const email = el.resetEmail.value.trim()
    const newPassword = el.resetNewPassword.value

    if (!email || !newPassword) return

    const submitBtn = el.resetForm ? el.resetForm.querySelector('button[type="submit"]') : null
    setButtonLoading(submitBtn, true, 'Resetting Password...')
    showGlobalSpinner()

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed')
      }

      if (el.resetSuccess) {
        el.resetSuccess.textContent = data.message || 'Password reset successfully!'
        el.resetSuccess.classList.remove('hidden')
      }

      if (data.user && data.token) {
        state.token = data.token
        state.user = data.user
        localStorage.setItem('meetagent_token', data.token)
        localStorage.setItem('meetagent_user', JSON.stringify(data.user))
        document.documentElement.classList.add('has-auth-session')
        setTimeout(() => {
          renderViewState(true)
          closeAuthModal()
          showToast(`Welcome back, ${data.user.name || 'User'}! Password reset.`)
          loadUserMeetings()
        }, 600)
      } else {
        setTimeout(() => {
          switchAuthTab('login')
          if (el.loginEmail) el.loginEmail.value = email
          if (el.loginPassword) el.loginPassword.value = newPassword
          showToast('Password updated! You can now sign in.')
        }, 800)
      }
    } catch (err) {
      if (el.resetError) {
        el.resetError.textContent = err.message
        el.resetError.classList.remove('hidden')
      }
    } finally {
      setButtonLoading(submitBtn, false)
      hideGlobalSpinner()
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    el.loginError.classList.add('hidden')

    const email = el.loginEmail.value.trim()
    const password = el.loginPassword.value

    const submitBtn = el.loginForm ? el.loginForm.querySelector('button[type="submit"]') : null
    setButtonLoading(submitBtn, true, 'Signing In...')
    showGlobalSpinner()

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
      localStorage.setItem('meetagent_user', JSON.stringify(data.user))
      document.documentElement.classList.add('has-auth-session')

      renderViewState(true)
      closeAuthModal()
      showToast(`Welcome back, ${data.user.name || 'User'}!`)
      await loadUserMeetings()
    } catch (err) {
      el.loginError.textContent = err.message
      el.loginError.classList.remove('hidden')
    } finally {
      setButtonLoading(submitBtn, false)
      hideGlobalSpinner()
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    el.regError.classList.add('hidden')

    const name = el.regName.value.trim()
    const email = el.regEmail.value.trim()
    const password = el.regPassword.value

    const submitBtn = el.registerForm ? el.registerForm.querySelector('button[type="submit"]') : null
    setButtonLoading(submitBtn, true, 'Creating Account...')
    showGlobalSpinner()

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
      localStorage.setItem('meetagent_user', JSON.stringify(data.user))
      document.documentElement.classList.add('has-auth-session')

      renderViewState(true)
      closeAuthModal()
      showToast(`Account created! Welcome to MeetAgent, ${data.user.name || 'User'}.`)
      await loadUserMeetings()
    } catch (err) {
      el.regError.textContent = err.message
      el.regError.classList.remove('hidden')
    } finally {
      setButtonLoading(submitBtn, false)
      hideGlobalSpinner()
    }
  }

  async function handleLogout() {
    showGlobalSpinner()
    try {
      if (state.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${state.token}` },
        })
      }
    } catch {} finally {
      hideGlobalSpinner()
    }

    localStorage.removeItem('meetagent_token')
    localStorage.removeItem('meetagent_user')
    localStorage.removeItem('meetagent_active_tab')
    document.documentElement.removeAttribute('data-active-tab')
    document.documentElement.classList.remove('has-auth-session')
    state.token = null
    state.user = null
    state.meetings = []
    renderViewState(false)
    showToast('Signed out successfully.')
  }

  // ==========================================================================
  // Workspace Navigation (Studio vs Vault vs Profile)
  // ==========================================================================
  function openStudioWorkstation() {
    closeMobileMenu()
    if (el.landingView) el.landingView.classList.add('hidden')
    if (el.appWorkspace) el.appWorkspace.classList.remove('hidden')
    switchWorkspaceTab('studio')
    updateMobileBottomBar('studio')
    updateTopNavActive('studio')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openDemoSimulator() {
    closeMobileMenu()
    if (el.landingView) el.landingView.classList.remove('hidden')
    if (el.appWorkspace) el.appWorkspace.classList.add('hidden')
    updateMobileBottomBar('demo')
    updateTopNavActive('demo')
    const demoSec = document.getElementById('demo')
    if (demoSec) {
      demoSec.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function openVaultWorkstation() {
    if (!state.user) {
      showToast('Sign in to view your Meeting History.')
      openAuthModal('login')
      return
    }
    closeMobileMenu()
    if (el.landingView) el.landingView.classList.add('hidden')
    if (el.appWorkspace) el.appWorkspace.classList.remove('hidden')
    switchWorkspaceTab('vault')
    updateMobileBottomBar('vault')
    updateTopNavActive('vault')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openProfileWorkstation() {
    closeMobileMenu()
    if (el.landingView) el.landingView.classList.add('hidden')
    if (el.appWorkspace) el.appWorkspace.classList.remove('hidden')
    switchWorkspaceTab('profile')
    updateMobileBottomBar('account')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateMobileBottomBar(activeTab) {
    if (!el.mobileBottomBar) return
    const tabs = el.mobileBottomBar.querySelectorAll('.mobile-bottom-tab')
    tabs.forEach((t) => {
      if (t.dataset.tab === activeTab) {
        t.classList.add('active')
      } else {
        t.classList.remove('active')
      }
    })
  }

  function updateTopNavActive(activeTab) {
    if (el.navOpenStudioBtn) el.navOpenStudioBtn.classList.toggle('active', activeTab === 'studio')
    if (el.navOpenDemoBtn) el.navOpenDemoBtn.classList.toggle('active', activeTab === 'demo')
    if (el.navOpenVaultBtn) el.navOpenVaultBtn.classList.toggle('active', activeTab === 'vault')
    if (el.navUserStudioBtn) el.navUserStudioBtn.classList.toggle('active', activeTab === 'studio')
    if (el.navUserHistoryBtn) el.navUserHistoryBtn.classList.toggle('active', activeTab === 'vault')
  }

  function switchWorkspaceTab(tab) {
    state.activeWorkspaceTab = tab
    localStorage.setItem('meetagent_active_tab', tab)
    document.documentElement.setAttribute('data-active-tab', tab)

    // Reset top nav tab buttons
    if (el.navStudioBtn) el.navStudioBtn.classList.remove('active')
    if (el.navVaultBtn) el.navVaultBtn.classList.remove('active')
    if (el.navProfileBtn) el.navProfileBtn.classList.remove('active')
    if (el.navUserStudioBtn) el.navUserStudioBtn.classList.remove('active')
    if (el.navUserHistoryBtn) el.navUserHistoryBtn.classList.remove('active')

    // Reset left sidebar navigation items
    if (el.sidebarNavStudio) el.sidebarNavStudio.classList.remove('active')
    if (el.sidebarNavVault) el.sidebarNavVault.classList.remove('active')
    if (el.sidebarNavProfile) el.sidebarNavProfile.classList.remove('active')

    // Reset view visibility
    if (el.studioView) el.studioView.classList.add('hidden')
    if (el.vaultView) el.vaultView.classList.add('hidden')
    if (el.profileView) el.profileView.classList.add('hidden')

    updateMobileBottomBar(tab === 'profile' ? 'account' : tab)
    updateTopNavActive(tab)

    if (tab === 'studio') {
      if (el.navStudioBtn) el.navStudioBtn.classList.add('active')
      if (el.navUserStudioBtn) el.navUserStudioBtn.classList.add('active')
      if (el.sidebarNavStudio) el.sidebarNavStudio.classList.add('active')
      if (el.studioView) el.studioView.classList.remove('hidden')
      if (el.callConsoleCard && el.callConsoleCard.classList.contains('hidden') && (!state.mediaRecorder || state.mediaRecorder.state === 'inactive')) {
        resetStudioForNewMeeting()
      }
    } else if (tab === 'vault') {
      if (!state.user) {
        showToast('Sign in to view your Meeting History.')
        openAuthModal('login')
        switchWorkspaceTab('studio')
        return
      }
      if (el.navVaultBtn) el.navVaultBtn.classList.add('active')
      if (el.navUserHistoryBtn) el.navUserHistoryBtn.classList.add('active')
      if (el.sidebarNavVault) el.sidebarNavVault.classList.add('active')
      if (el.vaultView) el.vaultView.classList.remove('hidden')
      renderVaultGrid(state.meetings)
    } else if (tab === 'profile') {
      if (el.navProfileBtn) el.navProfileBtn.classList.add('active')
      if (el.sidebarNavProfile) el.sidebarNavProfile.classList.add('active')
      if (el.profileView) el.profileView.classList.remove('hidden')

      if (state.user) {
        if (el.profileNameInput) el.profileNameInput.value = state.user.name || ''
        if (el.profileEmailInput) el.profileEmailInput.value = state.user.email || ''
        renderUserAvatars(state.user)
      }
    }
  }

  // ==========================================================================
  // Meeting History Database Operations
  // ==========================================================================
  async function loadUserMeetings() {
    if (!state.token) return

    if (state.meetings.length === 0 && el.vaultMeetingsGrid) {
      el.vaultMeetingsGrid.innerHTML = `
        <div class="vault-loading-wrap">
          <div class="modern-spinner"></div>
          <p class="vault-loading-text">Loading meeting history...</p>
        </div>`
    }

    showGlobalSpinner()
    try {
      const res = await fetch('/api/meetings', {
        headers: { Authorization: `Bearer ${state.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        state.meetings = data.meetings || []
        if (el.vaultCountBadge) el.vaultCountBadge.textContent = state.meetings.length
        if (el.sidebarVaultCountBadge) el.sidebarVaultCountBadge.textContent = state.meetings.length
        const totalCountEl = document.getElementById('vaultTotalMeetingsCount')
        if (totalCountEl) totalCountEl.textContent = state.meetings.length
        renderVaultGrid(state.meetings)
      }
    } catch (err) {
      console.warn('Failed to load meetings:', err)
    } finally {
      hideGlobalSpinner()
    }
  }

  // ==========================================================================
  // User Profile & Settings Operations
  // ==========================================================================
  async function updateProfileOnServer(payload) {
    if (!state.token) throw new Error('Not authenticated')
    showGlobalSpinner()
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }
      return data.user
    } finally {
      hideGlobalSpinner()
    }
  }

  function resizeImageToDataUrl(file, maxWidth = 256, maxHeight = 256) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = () => reject(new Error('Failed to load image file'))
        img.src = event.target.result
      }
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })
  }

  async function handleProfilePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file exceeds 5MB limit. Please choose a smaller photo.')
      return
    }

    setButtonLoading(el.profileUploadPhotoBtn, true, 'Uploading...')

    try {
      showToast('Optimizing and uploading profile photo...')
      const dataUrl = await resizeImageToDataUrl(file, 256, 256)
      await updateProfileOnServer({ avatar: dataUrl })
      state.user.avatar = dataUrl
      localStorage.setItem('meetagent_avatar_' + state.user.id, dataUrl)
      localStorage.setItem('meetagent_user', JSON.stringify(state.user))
      renderUserAvatars(state.user)
      showToast('Profile photo updated successfully!')
    } catch (err) {
      showToast(`Error updating photo: ${err.message}`)
    } finally {
      setButtonLoading(el.profileUploadPhotoBtn, false)
      e.target.value = ''
    }
  }

  async function handleProfilePhotoRemove() {
    if (!state.user) return

    try {
      await updateProfileOnServer({ avatar: null })
      state.user.avatar = null
      localStorage.removeItem('meetagent_avatar_' + state.user.id)
      localStorage.setItem('meetagent_user', JSON.stringify(state.user))
      renderUserAvatars(state.user)
      showToast('Profile photo removed.')
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  async function handlePresetAvatarSelect(preset) {
    if (!state.user) return
    try {
      await updateProfileOnServer({ avatar: preset })
      state.user.avatar = preset
      localStorage.setItem('meetagent_avatar_' + state.user.id, preset)
      localStorage.setItem('meetagent_user', JSON.stringify(state.user))
      renderUserAvatars(state.user)
      showToast(`Avatar updated to ${preset}!`)
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  async function handleProfileInfoSubmit(e) {
    e.preventDefault()
    if (!state.user || !state.token) return

    const name = el.profileNameInput.value.trim()
    const email = el.profileEmailInput.value.trim()
    const alertEl = el.profileInfoAlert
    alertEl.classList.add('hidden')

    if (!name || !email) {
      alertEl.className = 'status-banner banner-error'
      alertEl.textContent = 'Name and email address are required.'
      alertEl.classList.remove('hidden')
      return
    }

    setButtonLoading(el.profileSaveInfoBtn, true, 'Saving Profile...')

    try {
      const updated = await updateProfileOnServer({ name, email })
      state.user.name = updated.name || name
      state.user.email = updated.email || email
      localStorage.setItem('meetagent_user', JSON.stringify(state.user))

      if (el.userName) el.userName.textContent = state.user.name
      if (el.sidebarUserName) el.sidebarUserName.textContent = state.user.name
      if (el.sidebarUserEmail) el.sidebarUserEmail.textContent = state.user.email
      if (el.profileCardName) el.profileCardName.textContent = state.user.name
      if (el.profileCardEmail) el.profileCardEmail.textContent = state.user.email

      renderUserAvatars(state.user)

      alertEl.className = 'status-banner banner-success'
      alertEl.textContent = 'Profile information saved successfully.'
      alertEl.classList.remove('hidden')
      showToast('Profile information updated!')
    } catch (err) {
      alertEl.className = 'status-banner banner-error'
      alertEl.textContent = err.message
      alertEl.classList.remove('hidden')
    } finally {
      setButtonLoading(el.profileSaveInfoBtn, false)
    }
  }

  async function handleProfilePasswordSubmit(e) {
    e.preventDefault()
    if (!state.user || !state.token) return

    const currentPassword = el.profileCurrentPasswordInput.value
    const newPassword = el.profileNewPasswordInput.value
    const confirmPassword = el.profileConfirmPasswordInput.value
    const alertEl = el.profilePasswordAlert
    alertEl.classList.add('hidden')

    if (!currentPassword) {
      alertEl.className = 'status-banner banner-error'
      alertEl.textContent = 'Please enter your current password to confirm changes.'
      alertEl.classList.remove('hidden')
      return
    }

    if (newPassword.length < 6) {
      alertEl.className = 'status-banner banner-error'
      alertEl.textContent = 'New password must be at least 6 characters long.'
      alertEl.classList.remove('hidden')
      return
    }

    if (newPassword !== confirmPassword) {
      alertEl.className = 'status-banner banner-error'
      alertEl.textContent = 'New passwords do not match. Please verify and retry.'
      alertEl.classList.remove('hidden')
      return
    }

    setButtonLoading(el.profileSavePasswordBtn, true, 'Updating Password...')

    try {
      await updateProfileOnServer({ currentPassword, newPassword })
      el.profileCurrentPasswordInput.value = ''
      el.profileNewPasswordInput.value = ''
      el.profileConfirmPasswordInput.value = ''

      alertEl.className = 'status-banner banner-success'
      alertEl.textContent = 'Password has been updated successfully.'
      alertEl.classList.remove('hidden')
      showToast('Password updated successfully!')
    } catch (err) {
      alertEl.className = 'status-banner banner-error'
      alertEl.textContent = err.message
      alertEl.classList.remove('hidden')
    } finally {
      setButtonLoading(el.profileSavePasswordBtn, false)
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
        <div class="vault-empty-card">
          <div class="empty-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
              <path d="M6 6h10M6 10h10"/>
            </svg>
          </div>
          <h3>No meeting history yet</h3>
          <p>Record a session in Studio or import audio to generate structured minutes and executive action items.</p>
          <button id="emptyStartMeetingBtn" class="btn btn-primary">Start New Session</button>
        </div>`

      const emptyBtn = document.getElementById('emptyStartMeetingBtn')
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          switchWorkspaceTab('studio')
          resetStudioForNewMeeting()
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
          <div class="v-card-top-row">
            <div class="v-card-icon-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="v-card-title-group">
              <h4 class="v-card-title">${escapeHtml(m.title)}</h4>
              <div class="v-card-meta-chips">
                <span class="v-meta-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                  <span>${dateStr}</span>
                </span>
                <span class="v-meta-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>${duration}</span>
                </span>
                <span class="v-meta-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                  </svg>
                  <span>${m.word_count || 0} words</span>
                </span>
                ${m.detected_language ? `
                  <span class="v-meta-chip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                    <span>${escapeHtml(m.detected_language)}</span>
                  </span>` : ''}
              </div>
            </div>
            <span class="v-status-badge">
              <span class="v-status-dot"></span>
              <span>MoM Ready</span>
            </span>
          </div>

          <div class="v-card-summary-box">
            <p class="v-card-summary">${escapeHtml(summaryPreview)}</p>
          </div>

          <div class="v-card-footer">
            <button class="btn btn-sm btn-secondary btn-open-call" data-open-id="${m.id}">
              <span>View MoM</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <div class="v-card-footer-right">
              <button class="btn btn-sm btn-ghost btn-email-call" data-email-id="${m.id}" title="Email Minutes of Meeting">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>Email</span>
              </button>
              <button class="btn btn-sm btn-ghost btn-delete-meeting text-danger" data-delete-id="${m.id}" title="Delete meeting from vault">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                <span>Delete</span>
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
        const confirmed = await showConfirmDialog({
          title: 'Delete Meeting Record',
          message: 'Are you sure you want to permanently delete this meeting from your history? This action cannot be undone.',
          type: 'danger',
          confirmText: 'Delete Meeting',
          cancelText: 'Cancel',
        })
        if (confirmed) {
          setButtonLoading(btn, true, '')
          showGlobalSpinner('Deleting meeting from history...')
          try {
            await deletePastMeeting(id)
          } finally {
            hideGlobalSpinner()
            setButtonLoading(btn, false)
          }
        }
      })
    })
  }

  async function openPastMeetingDetail(id) {
    showGlobalSpinner('Retrieving meeting from history...')
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
      const langStr = m.detected_language ? ` • Language: ${m.detected_language}` : ''
      el.modalMeetingMeta.textContent = `${date} • ${m.duration_sec ? Math.round(m.duration_sec) + 's' : 'Recorded Session'}${langStr}`

      renderParsedMoMToContainer(
        m.mom_raw,
        el.modalSummaryContent,
        el.modalDecisionsList,
        el.modalActionsList
      )

      el.modalTranscriptMeta.textContent = `${m.word_count || 0} words${m.detected_language ? ` • ${m.detected_language}` : ''} • Meeting History`
      el.modalTranscriptText.value = m.transcript

      switchModalTab('mom')
      el.meetingDetailModal.classList.remove('hidden')
    } catch (err) {
      await showAlertDialog({
        title: 'Unable to Open Meeting',
        message: err.message || 'Could not load meeting details from history.',
        type: 'danger',
      })
    } finally {
      hideGlobalSpinner()
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
        showToast('Meeting deleted from history.')
        await loadUserMeetings()
      } else {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete meeting.')
      }
    } catch (err) {
      await showAlertDialog({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete meeting from history. Please check your connection and try again.',
        type: 'danger',
      })
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
        if (state.emailProvider === 'Resend') {
          el.emailStatusBanner.className = 'status-banner banner-info'
          el.emailStatusBanner.innerHTML = `<strong>● Cloud Email (${escapeHtml(state.emailProvider)}):</strong> Connected. <em>Note: Free Resend test keys only deliver to the account owner (<strong>sanjaybhati1295@gmail.com</strong>). To email other team members, click <strong>"Open in Mail App"</strong> below.</em>`
        } else {
          el.emailStatusBanner.className = 'status-banner banner-success'
          el.emailStatusBanner.innerHTML = `<strong>● Cloud Email Ready:</strong> Connected to ${escapeHtml(state.emailProvider || 'SMTP')}. Recipients will receive a styled executive HTML briefing.`
        }
        el.emailStatusBanner.classList.remove('hidden')
      }
    } else {
      if (el.emailServiceBadge) el.emailServiceBadge.textContent = 'Mail App / SMTP'
      if (el.emailStatusBanner) {
        el.emailStatusBanner.className = 'status-banner banner-info'
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

    if (!state.user && state.emailConfigured) {
      openAuthModal('login')
      showToast('Please sign in or use "Open in Mail App" to send meeting minutes.')
      return
    }

    if (state.emailConfigured) {
      setButtonLoading(el.sendEmailSubmitBtn, true, 'Sending Email...')
      showGlobalSpinner('Dispatching meeting minutes via email...')

      try {
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
        el.emailStatusBanner.className = 'status-banner banner-error'
        el.emailStatusBanner.innerHTML = `
          <strong>Delivery Notice:</strong> ${escapeHtml(err.message)}
          <div style="margin-top: 10px;">
            <button type="button" id="emailStatusMailtoBtn" class="btn btn-sm btn-secondary" style="background:#ffffff; color:#dc2626; border:1px solid #fca5a5; font-weight:600;">
              🚀 Open in Mail App to Send Immediately
            </button>
          </div>
        `
        el.emailStatusBanner.classList.remove('hidden')
        const mailtoBtn = document.getElementById('emailStatusMailtoBtn')
        if (mailtoBtn) {
          mailtoBtn.addEventListener('click', () => handleMailtoFallback())
        }
      } finally {
        setButtonLoading(el.sendEmailSubmitBtn, false)
        hideGlobalSpinner()
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
    if (!state.token) {
      showToast('Meeting minutes generated! Sign in to save to your Meeting History.', 4000)
      return
    }
    showGlobalSpinner()
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
        showToast('Saved to Meeting History!')
        await loadUserMeetings()
      }
    } catch (err) {
      console.warn('Auto-save error:', err)
    } finally {
      hideGlobalSpinner()
    }
  }

  // ==========================================================================
  // Meeting Studio Recording Controller
  // ==========================================================================
  function resetStudioForNewMeeting() {
    if (el.resultsSection) el.resultsSection.classList.add('hidden')
    if (el.callConsoleCard) el.callConsoleCard.classList.remove('hidden')
    if (el.idleState) el.idleState.classList.remove('hidden')
    if (el.recordingState) el.recordingState.classList.add('hidden')
    if (el.loadingState) el.loadingState.classList.add('hidden')

    setDefaultMeetingTitle()
    state.currentMoMRaw = ''
    state.currentTranscript = ''
    state.liveFinalText = ''
    state.audioChunks = []

    if (el.liveStreamText) {
      el.liveStreamText.textContent = 'Listening... Start speaking, and your words will appear here live in real-time.'
    }
    if (el.transcriptText) {
      el.transcriptText.value = ''
    }
    if (el.meetingTimer) {
      el.meetingTimer.textContent = '00:00'
    }
    if (el.statWords) el.statWords.textContent = '0 words'
    if (el.statDuration) el.statDuration.textContent = '0s duration'
    if (el.statSpeed) el.statSpeed.textContent = ''
    if (el.statLanguage) {
      el.statLanguage.textContent = ''
      el.statLanguage.classList.add('hidden')
    }
    if (el.detectedLangPill) {
      el.detectedLangPill.textContent = ''
      el.detectedLangPill.classList.add('hidden')
    }
    state.detectedLanguage = ''

    if (el.summaryContent) {
      el.summaryContent.textContent = 'Executive minutes will appear here automatically after the meeting ends.'
    }
    if (el.decisionsList) {
      el.decisionsList.innerHTML = '<li>No decisions recorded.</li>'
    }
    if (el.actionsList) {
      el.actionsList.innerHTML = '<div class="empty-task">No action items recorded.</div>'
    }

    if (el.meetingTitleInput) {
      el.meetingTitleInput.focus()
    }
    setAudioSource('mic')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setAudioSource(source) {
    const val = (source === 'tab' || source === 'display') ? 'display' : 'mic'
    if (el.audioSource) el.audioSource.value = val
    if (el.sourceMicBtn) el.sourceMicBtn.classList.toggle('active', val === 'mic')
    if (el.sourceScreenBtn) el.sourceScreenBtn.classList.toggle('active', val === 'display')
  }

  async function startMeeting() {
    if (!state.user) {
      openAuthModal('login')
      showToast('Please sign in or create an account to record meetings.')
      return
    }

    setButtonLoading(el.startBtn, true, 'Connecting Audio...')
    showGlobalSpinner('Connecting microphone & audio capture...')

    try {
      const source = (el.audioSource && el.audioSource.value) ? el.audioSource.value : 'mic'
      state.audioChunks = []
      state.liveFinalText = ''
      if (el.liveStreamText) {
        el.liveStreamText.textContent = 'Listening... Start speaking to view live speech transcription.'
      }

      if (source === 'display' || source === 'tab') {
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
            channelCount: 1,
            sampleRate: { ideal: 48000 },
          },
        })
      }

      setupAudioVisualizer(state.mediaStream)
      startLiveSpeechStream()

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm')

      state.mediaRecorder = new MediaRecorder(state.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })
      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          state.audioChunks.push(e.data)
        }
      }
      state.mediaRecorder.start(1000)

      startTimer()

      if (el.callConsoleCard) el.callConsoleCard.classList.remove('hidden')
      if (el.idleState) el.idleState.classList.add('hidden')
      if (el.recordingState) el.recordingState.classList.remove('hidden')
      if (el.loadingState) el.loadingState.classList.add('hidden')
      if (el.resultsSection) el.resultsSection.classList.add('hidden')
    } catch (err) {
      console.error('Audio capture error:', err)
      await showAlertDialog({
        title: 'Microphone Access Required',
        message: err.message || 'Could not access audio device. Please verify your browser microphone or tab audio permissions.',
        type: 'warning',
      })
      if (el.callConsoleCard) el.callConsoleCard.classList.remove('hidden')
      if (el.idleState) el.idleState.classList.remove('hidden')
      if (el.recordingState) el.recordingState.classList.add('hidden')
      if (el.loadingState) el.loadingState.classList.add('hidden')
    } finally {
      setButtonLoading(el.startBtn, false)
      hideGlobalSpinner()
    }
  }

  function startLiveSpeechStream() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      el.liveStreamText.innerHTML = '<em>Real-time speech recognition active.</em>'
      return
    }

    try {
      state.recognition = new SpeechRecognition()
      state.recognition.continuous = true
      state.recognition.interimResults = true

      // Auto-detect system/browser locale (defaults to en-IN for natural Indian accents & Hinglish)
      const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'en-IN'
      state.recognition.lang = browserLang.startsWith('en') ? 'en-IN' : browserLang

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

  function detectClientSideLanguage(text) {
    const clean = (text || '').trim()
    if (!clean) return 'English'
    if (/[\u0900-\u097F]/.test(clean)) return 'Hindi'
    if (/[\u0B80-\u0BFF]/.test(clean)) return 'Tamil'
    if (/[\u0C00-\u0C7F]/.test(clean)) return 'Telugu'
    if (/[\u0980-\u09FF]/.test(clean)) return 'Bengali'
    if (/[\u0A80-\u0AFF]/.test(clean)) return 'Gujarati'
    if (/[\u0C80-\u0CFF]/.test(clean)) return 'Kannada'
    if (/[\u0D00-\u0D7F]/.test(clean)) return 'Malayalam'
    if (/[\u0A00-\u0A7F]/.test(clean)) return 'Punjabi'
    if (/[\u0600-\u06FF]/.test(clean)) return 'Urdu'

    const lower = clean.toLowerCase()
    const hinglishKeywords = [
      'aaj', 'kal', 'karenge', 'karna', 'hoga', 'hai', 'hain', 'mein', 'hum', 'aap', 'kya',
      'theek', 'shuru', 'karo', 'chalo', 'baat', 'faisla', 'sahmati', 'bhi', 'nahi', 'kuch',
      'karte', 'kar rahe', 'dekh', 'rahe', 'hoga', 'pe', 'se', 'ko', 'aur', 'par'
    ]
    const words = lower.split(/[\s,.;:!?]+/)
    const matches = words.filter(w => hinglishKeywords.includes(w)).length
    if (matches >= 2) return 'Hinglish'

    return 'English'
  }

  function stopMeeting() {
    stopTimer()
    if (state.recognition) {
      try { state.recognition.stop() } catch {}
      state.recognition = null
    }

    setButtonLoading(el.stopBtn, true, 'Finalizing Call...')
    showGlobalSpinner('Synthesizing audio recording...')

    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = async () => {
        cleanupStream()
        setButtonLoading(el.stopBtn, false)
        const mimeType = (state.mediaRecorder && state.mediaRecorder.mimeType) || 'audio/webm'
        const audioBlob = new Blob(state.audioChunks, { type: mimeType })
        await processMeetingAudio(audioBlob)
      }
      try {
        if (state.mediaRecorder.state === 'recording') {
          state.mediaRecorder.requestData()
        }
      } catch {}
      state.mediaRecorder.stop()
    } else {
      cleanupStream()
      setButtonLoading(el.stopBtn, false)
      hideGlobalSpinner()
    }

    el.recordingState.classList.add('hidden')
    el.loadingState.classList.remove('hidden')
    el.loadingText.textContent = 'Transcribing meeting speech...'
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
    showGlobalSpinner('Transcribing meeting speech with multilingual AI...')
    try {
      const startTime = performance.now()
      const title = el.meetingTitleInput.value.trim() || 'Executive Sync'

      // Step 1: Speech to Text (auto-detects spoken language: Hindi, Hinglish, Tamil, Telugu, and all Indian & global languages)
      let transcript = ''
      try {
        if (!audioBlob || audioBlob.size === 0) {
          throw new Error('No audio buffer captured from microphone.')
        }

        const res = await fetch('/api/transcribe?filename=meeting.webm&language=auto', {
          method: 'POST',
          headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
          body: audioBlob,
        })
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.warn('Backend transcription API returned error:', res.status, errText)
          throw new Error(`AI transcription error (${res.status}): ${errText}`)
        }
        const data = await res.json()
        transcript = data.text || ''
        state.detectedLanguage = data.language || detectClientSideLanguage(transcript) || 'English'
      } catch (err) {
        console.warn('Backend transcription failed, checking live captions:', err.message)
      }

      if (!transcript.trim()) {
        transcript = state.liveFinalText.trim()
        if (transcript.trim() && !state.detectedLanguage) {
          state.detectedLanguage = detectClientSideLanguage(transcript)
        }
      }

      if (!transcript.trim()) {
        throw new Error('No speech detected in this meeting recording. Please speak clearly into your microphone.')
      }

      const sttSpeed = ((performance.now() - startTime) / 1000).toFixed(1)
      state.currentTranscript = transcript
      el.transcriptText.value = transcript

      const wordCount = transcript.trim().split(/\s+/).length
      const durationSec = (performance.now() - state.startTime) / 1000

      el.statWords.textContent = `${wordCount} words`
      el.statDuration.textContent = `${durationSec.toFixed(1)}s duration`
      el.statSpeed.textContent = `Processing speed: ${sttSpeed}s`
      const globeSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
      if (el.statLanguage) {
        el.statLanguage.innerHTML = `${globeSvg}<span>Auto-Detected: ${escapeHtml(state.detectedLanguage || 'English')}</span>`
        el.statLanguage.classList.remove('hidden')
      }
      if (el.detectedLangPill) {
        el.detectedLangPill.innerHTML = `${globeSvg}<span>Auto-Detected: ${escapeHtml(state.detectedLanguage || 'English')}</span>`
        el.detectedLangPill.classList.remove('hidden')
      }

      // Step 2: MoM Generation
      el.loadingText.textContent = 'Synthesizing Minutes of Meeting with AI...'
      showGlobalSpinner('Synthesizing Minutes of Meeting with AI...')
      await generateMoM(transcript, durationSec, wordCount, title)
    } catch (err) {
      console.error(err)
      await showAlertDialog({
        title: 'Meeting Processing Failed',
        message: err.message || 'Failed to process meeting recording. Please try again.',
        type: 'danger',
      })
      if (el.loadingState) el.loadingState.classList.add('hidden')
      if (el.callConsoleCard) el.callConsoleCard.classList.remove('hidden')
      if (el.idleState) el.idleState.classList.remove('hidden')
    } finally {
      hideGlobalSpinner()
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!state.user) {
      el.audioFileInput.value = ''
      openAuthModal('login')
      showToast('Please sign in or create an account to upload meetings.')
      return
    }

    showGlobalSpinner(`Uploading "${file.name}" & transcribing...`)
    try {
      if (el.resultsSection) el.resultsSection.classList.add('hidden')
      if (el.callConsoleCard) el.callConsoleCard.classList.remove('hidden')
      if (el.idleState) el.idleState.classList.add('hidden')
      if (el.loadingState) el.loadingState.classList.remove('hidden')
      if (el.loadingText) el.loadingText.textContent = `Uploading "${file.name}" and transcribing...`

      const startTime = performance.now()
      const title = file.name.replace(/\.[^/.]+$/, '')

      const res = await fetch(`/api/transcribe?filename=${encodeURIComponent(file.name)}&language=auto`, {
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
      state.detectedLanguage = data.language || detectClientSideLanguage(transcript) || 'English'

      if (!transcript.trim()) {
        throw new Error('No speech detected in audio file.')
      }

      const sttSpeed = ((performance.now() - startTime) / 1000).toFixed(1)
      state.currentTranscript = transcript
      el.transcriptText.value = transcript

      const wordCount = transcript.trim().split(/\s+/).length
      el.statWords.textContent = `${wordCount} words`
      el.statDuration.textContent = 'Uploaded Audio'
      el.statSpeed.textContent = `Processing: ${sttSpeed}s`
      const globeSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
      if (el.statLanguage) {
        el.statLanguage.innerHTML = `${globeSvg}<span>Auto-Detected: ${escapeHtml(state.detectedLanguage || 'English')}</span>`
        el.statLanguage.classList.remove('hidden')
      }
      if (el.detectedLangPill) {
        el.detectedLangPill.innerHTML = `${globeSvg}<span>Auto-Detected: ${escapeHtml(state.detectedLanguage || 'English')}</span>`
        el.detectedLangPill.classList.remove('hidden')
      }

      el.loadingText.textContent = 'Generating Minutes of Meeting...'
      showGlobalSpinner('Synthesizing Minutes of Meeting with AI...')
      await generateMoM(transcript, 0, wordCount, title)
    } catch (err) {
      await showAlertDialog({
        title: 'File Upload Error',
        message: err.message || 'File processing failed. Please verify the audio file format.',
        type: 'danger',
      })
      if (el.loadingState) el.loadingState.classList.add('hidden')
      if (el.callConsoleCard) el.callConsoleCard.classList.remove('hidden')
      if (el.idleState) el.idleState.classList.remove('hidden')
    } finally {
      hideGlobalSpinner()
      el.audioFileInput.value = ''
    }
  }

  async function generateMoM(transcript, durationSec = 0, wordCount = 0, title = 'Executive Sync') {
    const model = (el.aiModel && el.aiModel.value) ? el.aiModel.value : 'groq'
    if (el.rerunMoMBtn) setButtonLoading(el.rerunMoMBtn, true, 'Synthesizing MoM...')
    showGlobalSpinner('Synthesizing Minutes of Meeting with AI...')

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

      if (el.loadingState) el.loadingState.classList.add('hidden')
      if (el.idleState) el.idleState.classList.remove('hidden')
      if (el.callConsoleCard) el.callConsoleCard.classList.add('hidden')
      if (el.resultsSection) {
        el.resultsSection.classList.remove('hidden')
        el.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      switchStudioResultTab('mom')

      // Auto-save to Cloud Vault
      const meetingPayload = {
        title: title || (el.meetingTitleInput ? el.meetingTitleInput.value.trim() : 'Meeting Session'),
        transcript,
        momRaw: data.mom,
        summary: extractExecutiveSummary(data.mom),
        decisions: extractDecisions(data.mom),
        actions: extractActions(data.mom),
        aiModel: model,
        durationSec: durationSec || 0,
        wordCount: wordCount || transcript.split(/\s+/).length,
        detectedLanguage: state.detectedLanguage || 'English',
      }

      await autoSaveMeetingToDb(meetingPayload)
    } catch (err) {
      await showAlertDialog({
        title: 'AI Synthesis Error',
        message: err.message || 'Failed to synthesize Minutes of Meeting. Please check your connection and try again.',
        type: 'danger',
      })
      if (el.loadingState) el.loadingState.classList.add('hidden')
      if (el.callConsoleCard) el.callConsoleCard.classList.remove('hidden')
      if (el.idleState) el.idleState.classList.remove('hidden')
    } finally {
      if (el.rerunMoMBtn) setButtonLoading(el.rerunMoMBtn, false)
      hideGlobalSpinner()
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
      actionsEl.innerHTML = actions.map((a, idx) => {
        let textToParse = a
        let owner = ''
        let deadline = ''
        let priority = ''

        // 1. Extract owner if present [Owner]:
        const ownerMatch = textToParse.match(/^\[?([A-Za-z0-9\s._-]+)\]?:\s*(.+)$/)
        if (ownerMatch) {
          owner = ownerMatch[1].trim()
          textToParse = ownerMatch[2].trim()
        }

        // 2. Extract priority if present | Priority: High
        const priorityMatch = textToParse.match(/\|\s*Priority:\s*([A-Za-z]+)/i)
        if (priorityMatch) {
          priority = priorityMatch[1].trim()
          textToParse = textToParse.replace(/\|\s*Priority:\s*([A-Za-z]+)/i, '').trim()
        }

        // 3. Extract deadline if present | Deadline: ...
        const deadlineMatch = textToParse.match(/\|\s*(?:Deadline|Due Date|Due|By):\s*([^|]+)/i)
        if (deadlineMatch) {
          deadline = deadlineMatch[1].trim()
          textToParse = textToParse.replace(/\|\s*(?:Deadline|Due Date|Due|By):\s*([^|]+)/i, '').trim()
        }

        const taskClean = textToParse.replace(/\|+$/, '').trim()

        return `
          <div class="action-task-item" data-task-idx="${idx}">
            <label class="task-checkbox-label">
              <input type="checkbox" class="task-check-input" aria-label="Mark task complete">
              <span class="task-custom-box">
                <svg class="check-svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            </label>
            <div class="task-content-wrap">
              <div class="task-primary-row">
                ${owner ? `
                  <span class="task-owner-pill">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>${escapeHtml(owner)}</span>
                  </span>` : ''}
                <span class="task-text">${escapeHtml(taskClean)}</span>
              </div>
              ${(deadline || priority) ? `
                <div class="task-metadata-row">
                  ${deadline ? `
                    <span class="task-date-pill" title="Deadline / Due Date">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span>${escapeHtml(deadline)}</span>
                    </span>` : ''}
                  ${priority ? `
                    <span class="task-priority-pill priority-${escapeHtml(priority.toLowerCase())}" title="Priority level">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      <span>${escapeHtml(priority)}</span>
                    </span>` : ''}
                </div>` : ''}
            </div>
          </div>`
      }).join('')

      actionsEl.querySelectorAll('.action-task-item').forEach((item) => {
        const checkbox = item.querySelector('.task-check-input')
        item.addEventListener('click', (e) => {
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked
          }
          if (checkbox.checked) {
            item.classList.add('completed')
          } else {
            item.classList.remove('completed')
          }
        })
      })
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
      state.analyserNode.fftSize = 128
      state.analyserNode.smoothingTimeConstant = 0.8
      source.connect(state.analyserNode)

      const canvas = el.waveformCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const bufferLength = state.analyserNode.frequencyBinCount
      const freqData = new Uint8Array(bufferLength)

      let logicalWidth = 600
      let logicalHeight = 64

      function syncCanvasDimensions() {
        if (canvas && canvas.parentElement) {
          const rect = canvas.parentElement.getBoundingClientRect()
          const dpr = window.devicePixelRatio || 1
          logicalWidth = rect.width || 600
          logicalHeight = 64
          canvas.width = logicalWidth * dpr
          canvas.height = logicalHeight * dpr
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          canvas.style.width = `${logicalWidth}px`
          canvas.style.height = `${logicalHeight}px`
        }
      }
      syncCanvasDimensions()
      state.visualizerResizeHandler = syncCanvasDimensions
      window.addEventListener('resize', syncCanvasDimensions)

      let phase = 0

      function draw() {
        state.animationId = requestAnimationFrame(draw)
        state.analyserNode.getByteFrequencyData(freqData)

        // Compute average volume level (0 to 1)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += freqData[i]
        }
        const avg = sum / bufferLength
        const energy = Math.min(Math.max(avg / 110, 0.08), 1.0) // baseline gentle breathing

        phase += 0.04 + energy * 0.06

        // Clear canvas
        ctx.clearRect(0, 0, logicalWidth, logicalHeight)

        const centerY = logicalHeight / 2

        // Draw 3 harmonic warm organic sine waves with gradient blending
        const waves = [
          { freq: 0.016, speed: 1.0, color1: '#E87A58', color2: '#D96C4A', amp: 22 * energy, alpha: 0.9, lineWidth: 2.5 },
          { freq: 0.022, speed: -1.3, color1: '#E29578', color2: '#C05C3D', amp: 16 * energy, alpha: 0.75, lineWidth: 2 },
          { freq: 0.011, speed: 0.7, color1: '#DDA15E', color2: '#BC6C25', amp: 26 * energy, alpha: 0.65, lineWidth: 2 },
        ]

        waves.forEach((w) => {
          ctx.save()
          ctx.beginPath()
          ctx.lineWidth = w.lineWidth
          const grad = ctx.createLinearGradient(0, 0, logicalWidth, 0)
          grad.addColorStop(0, 'rgba(217, 108, 74, 0)')
          grad.addColorStop(0.2, w.color1)
          grad.addColorStop(0.8, w.color2)
          grad.addColorStop(1, 'rgba(188, 108, 37, 0)')
          ctx.strokeStyle = grad
          ctx.shadowBlur = 10 * energy
          ctx.shadowColor = w.color1

          for (let x = 0; x <= logicalWidth; x += 4) {
            // Smooth bell-curve envelope: edges taper to center
            const normX = (x / logicalWidth) * 2 - 1
            const envelope = Math.max(0, 1 - normX * normX)
            const y = centerY + Math.sin(x * w.freq + phase * w.speed) * w.amp * envelope
            if (x === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.stroke()
          ctx.restore()
        })
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

  // ==========================================================================
  // Interactive Landing Simulator & FAQ Accordion
  // ==========================================================================
  const DEMO_PRESETS = {
    sprint: {
      key: 'sprint',
      title: '🚀 Sprint Architecture Sync',
      category: 'ENGINEERING & TECH',
      tagClass: 'badge-tag-indigo',
      duration: '⏱ 20 min technical sync',
      objective: '🎯 Target: Cloud DB Migration & Security Signoff',
      desc: 'Engineering leadership aligns on Supabase cloud migration, PostgreSQL Row-Level Security (RLS) policies, and Friday morning custom-domain production deployment.',
      roster: [
        { name: 'Sarah Jenkins', role: 'VP Engineering', avatar: 'S', color: '#4338ca' },
        { name: 'Alex Rivera', role: 'Lead Architect', avatar: 'A', color: '#059669' },
        { name: 'Maya Lin', role: 'Staff UI Engineer', avatar: 'M', color: '#d97706' },
      ],
      agenda: [
        'Review PostgreSQL Row-Level Security (RLS) policies for user data isolation',
        'Verify client-side 1-click email briefing modal with SMTP/Resend delivery fallbacks',
        'Freeze staging PR reviews and approve Friday 9:00 AM production deployment',
      ],
      durationSec: 20,
      messages: [
        {
          atSec: 1.5,
          name: 'Sarah Jenkins',
          role: 'VP Engineering',
          avatar: 'S',
          avatarBg: '#4338ca',
          time: '00:03',
          text: 'Team, we need to finalize the migration of our customer data vault to Supabase cloud infrastructure before Friday morning.',
        },
        {
          atSec: 5.5,
          name: 'Alex Rivera',
          role: 'Lead Architect',
          avatar: 'A',
          avatarBg: '#059669',
          time: '00:08',
          text: 'Agreed. I have locked down PostgreSQL Row-Level Security (RLS) policies with AES-256 encryption at rest so each customer tenant is strictly isolated.',
        },
        {
          atSec: 10.0,
          name: 'Maya Lin',
          role: 'Staff UI Engineer',
          avatar: 'M',
          avatarBg: '#d97706',
          time: '00:14',
          text: 'On the client side, PR #142 wires up the 1-click email briefing modal with enterprise SMTP and Resend fallbacks. Latency is sub-second across Safari and Chrome.',
        },
        {
          atSec: 14.5,
          name: 'Alex Rivera',
          role: 'Lead Architect',
          avatar: 'A',
          avatarBg: '#059669',
          time: '00:18',
          text: 'We also stress-tested the WebSocket audio ingestion pipeline up to 100 concurrent recording streams with zero dropped frames.',
        },
        {
          atSec: 18.0,
          name: 'Sarah Jenkins',
          role: 'VP Engineering',
          avatar: 'S',
          avatarBg: '#4338ca',
          time: '00:22',
          text: 'Outstanding work. PR freeze is at 5 PM today, and we push the production release to our custom domain at 9 AM Friday.',
        },
      ],
      momType: 'technical',
      mom: {
        badge: 'ENGINEERING SPECIFICATION',
        summary: 'The engineering team confirmed the successful migration of user data vaults to encrypted Supabase cloud infrastructure with PostgreSQL Row-Level Security (RLS). Real-time WebSocket audio processing passed load testing with zero frame drops, and client-side email dispatch is verified for Friday 9:00 AM production deployment.',
        specs: [
          { label: 'Cloud Architecture', value: 'Supabase Cloud (PostgreSQL)' },
          { label: 'Security Model', value: 'AES-256 + Tenant RLS' },
          { label: 'Audio Ingestion', value: 'WebSocket Stream (<1.2s)' },
          { label: 'Release Window', value: 'Friday 9:00 AM EST' },
        ],
        decisions: [
          'Standardize all customer meeting vaults on encrypted cloud database with Row-Level Security (RLS).',
          'Deploy PR #142 with dual-redundant Resend & SMTP email dispatch channels.',
          'Schedule production domain cutover for Friday 9:00 AM with 24-hour code freeze starting today.',
        ],
        tasks: [
          {
            key: 'INFRA-89',
            title: 'Verify PostgreSQL RLS tenant isolation & backup schedule',
            owner: 'Alex Rivera',
            due: 'Thu 4:00 PM',
          },
          {
            key: 'FE-142',
            title: 'Merge 1-click email briefing modal with SMTP fallbacks',
            owner: 'Maya Lin',
            due: 'Today 5:00 PM',
          },
          {
            key: 'REL-04',
            title: 'Conduct staging smoke tests & trigger production release',
            owner: 'Sarah Jenkins',
            due: 'Fri 9:00 AM',
          },
        ],
      },
    },

    board: {
      key: 'board',
      title: '📊 Executive Board Review',
      category: 'EXECUTIVE & C-SUITE',
      tagClass: 'badge-tag-emerald',
      duration: '⏱ 45 min quarterly board',
      objective: '🎯 Target: Q3 Financial Review & Headcount Approval',
      desc: 'Chief Executive Officer, Chief Financial Officer, and Revenue leadership review quarterly financials showing 180% ARR growth, 84% gross margins, and authorize expanding enterprise sales engineering capacity.',
      roster: [
        { name: 'David Sterling', role: 'Chief Executive Officer', avatar: 'D', color: '#1e293b' },
        { name: 'Rachel Vance', role: 'Chief Financial Officer', avatar: 'R', color: '#059669' },
        { name: 'Liam O’Connor', role: 'Chief Revenue Officer', avatar: 'L', color: '#0284c7' },
      ],
      agenda: [
        'Examine Q3 Financial Performance: ARR, Gross Margins, and Unit Economics',
        'Review Fortune 500 Enterprise Pilot Demand and Dedicated Tenant Requests',
        'Vote on Resolution to Authorize 3 Additional Enterprise Sales Engineering Roles',
      ],
      durationSec: 20,
      messages: [
        {
          atSec: 1.5,
          name: 'David Sterling',
          role: 'CEO',
          avatar: 'D',
          avatarBg: '#1e293b',
          time: '00:03',
          text: 'Welcome to our Q3 Executive Board review. Rachel, please walk us through the quarter-end ARR figures and gross margin realization.',
        },
        {
          atSec: 5.5,
          name: 'Rachel Vance',
          role: 'CFO',
          avatar: 'R',
          avatarBg: '#059669',
          time: '00:08',
          text: 'We closed Q3 at $14.2M ARR, representing 180% YoY growth. Meeting intelligence automation cut internal operational overhead by 34%, expanding gross margins to 84.2%.',
        },
        {
          atSec: 10.0,
          name: 'Liam O’Connor',
          role: 'CRO',
          avatar: 'L',
          avatarBg: '#0284c7',
          time: '00:14',
          text: 'Enterprise demand is accelerating rapidly. We currently have three Fortune 500 pilots requesting private-tenant deployments that require dedicated sales engineering support.',
        },
        {
          atSec: 14.5,
          name: 'Rachel Vance',
          role: 'CFO',
          avatar: 'R',
          avatarBg: '#059669',
          time: '00:18',
          text: 'Our cash runway stands at 28 months with a highly capital-efficient trajectory. We have full fiscal capacity to hire ahead of revenue.',
        },
        {
          atSec: 18.0,
          name: 'David Sterling',
          role: 'CEO',
          avatar: 'D',
          avatarBg: '#1e293b',
          time: '00:22',
          text: 'The chair moves to approve three additional Enterprise Sales Engineering positions for Q4. All in favor? The motion carries unanimously.',
        },
      ],
      momType: 'executive',
      mom: {
        badge: 'EXECUTIVE BOARD RESOLUTION',
        summary: 'Executive leadership presented Q3 operational results marked by $14.2M in Annual Recurring Revenue (+180% YoY) and 84.2% gross margins. In response to heavy Fortune 500 enterprise demand, the board unanimously ratified a corporate resolution authorizing three additional Enterprise Sales Engineering positions.',
        kpis: [
          { label: 'Annual Recurring Revenue', val: '$14.2M', sub: '+180% YoY' },
          { label: 'Gross Profit Margin', val: '84.2%', sub: '+620 bps' },
          { label: 'Cash Runway', val: '28 Mo', sub: 'Capital Efficient' },
          { label: 'Authorized Expansion', val: '+3 Roles', sub: 'Enterprise SE' },
        ],
        resolutions: [
          'Resolution 2026-Q3-A: Unanimously authorized allocation of budget for 3 Enterprise Sales Engineering hires in Q4.',
          'Resolution 2026-Q3-B: Approved commercial offering of private-tenant database deployments for Tier-1 enterprise accounts.',
          'Resolution 2026-Q3-C: Directed management to commence preliminary syndicate planning for Series B growth financing.',
        ],
        actions: [
          {
            title: 'Deliver audited Q3 financials and capitalization table to audit committee',
            owner: 'Rachel Vance (CFO)',
            due: 'Oct 15',
          },
          {
            title: 'Execute private-tenant contracts for 3 Fortune 500 enterprise pilots',
            owner: 'Liam O’Connor (CRO)',
            due: 'Oct 10',
          },
          {
            title: 'Circulate certified board minutes to institutional lead investors',
            owner: 'David Sterling (CEO)',
            due: 'Oct 3',
          },
        ],
      },
    },

    client: {
      key: 'client',
      title: '🤝 Enterprise Client Discovery',
      category: 'B2B ENTERPRISE SALES',
      tagClass: 'badge-tag-amber',
      duration: '⏱ 30 min discovery call',
      objective: '🎯 Target: Infosec Clearance & Pilot SOW Approval',
      desc: 'Fortune 500 Banking VP of Security evaluates MeetAgent\'s zero-bot browser architecture against strict infosec standards, approves data sovereignty, and agrees to pilot SOW.',
      roster: [
        { name: 'Johnathan Vance', role: 'VP InfoSec, FinTech Bank', avatar: 'J', color: '#b45309' },
        { name: 'Marcus Vance', role: 'Enterprise Director, MeetAgent', avatar: 'M', color: '#059669' },
        { name: 'Elena Rostova', role: 'Procurement Specialist', avatar: 'E', color: '#7c3aed' },
      ],
      agenda: [
        'Assess banking infosec policy regarding external bot attendance on confidential calls',
        'Demonstrate client-side 0-bot audio capture, local tab streaming, and encryption',
        'Align on 50-seat pilot rollout scope, Master Service Agreement, and SOW execution',
      ],
      durationSec: 20,
      messages: [
        {
          atSec: 1.5,
          name: 'Johnathan Vance',
          role: 'VP InfoSec, FinTech Bank',
          avatar: 'J',
          avatarBg: '#b45309',
          time: '00:03',
          text: 'Our banking compliance charter strictly forbids third-party bot attendees on sensitive client strategy and trading calls.',
        },
        {
          atSec: 5.5,
          name: 'Marcus Vance',
          role: 'Enterprise Director',
          avatar: 'M',
          avatarBg: '#059669',
          time: '00:08',
          text: 'Understood, Johnathan. MeetAgent uses a zero-bot architecture. Audio is captured client-side directly in the browser tab or hardware microphone—no external bot ever joins your meeting.',
        },
        {
          atSec: 10.0,
          name: 'Johnathan Vance',
          role: 'VP InfoSec, FinTech Bank',
          avatar: 'J',
          avatarBg: '#b45309',
          time: '00:14',
          text: 'That immediately satisfies our primary compliance roadblock. What about meeting summaries? Can executive minutes be emailed instantly without leaking raw audio?',
        },
        {
          atSec: 14.5,
          name: 'Marcus Vance',
          role: 'Enterprise Director',
          avatar: 'M',
          avatarBg: '#059669',
          time: '00:18',
          text: 'Yes. Structured HTML minutes with action items are dispatched automatically via your verified domain email. Raw transcript is excluded from the email by default for privacy.',
        },
        {
          atSec: 18.0,
          name: 'Elena Rostova',
          role: 'Procurement Specialist',
          avatar: 'E',
          avatarBg: '#7c3aed',
          time: '00:22',
          text: 'This meets all our security guidelines. Marcus, please send over the SOW and DPA for our 50-seat pilot starting next Monday.',
        },
      ],
      momType: 'sales',
      mom: {
        badge: 'ENTERPRISE DEAL & SOW SUMMARY',
        summary: 'Client discovery confirmed MeetAgent\'s zero-bot browser capture architecture fulfills enterprise banking cybersecurity and infosec requirements. The procurement and security teams approved launching a 50-seat enterprise pilot starting next Monday, with automated post-meeting HTML summaries.',
        dealTerms: [
          { label: 'Contract Value', val: '$85,000 ARR', sub: '50 Enterprise Seats' },
          { label: 'Security Clearance', val: 'PASSED', sub: 'Zero-Bot Architecture' },
          { label: 'Data Sovereignty', val: 'Private Tenant', sub: 'SOC2 & GDPR Ready' },
          { label: 'Deployment Date', val: 'Next Monday', sub: 'Onboarding Scheduled' },
        ],
        complianceChecks: [
          'Confirmed: 0 third-party bots enter meeting calls; audio captured strictly within user browser tab.',
          'Confirmed: Audio and transcripts secured in client-controlled database with AES-256 encryption.',
          'Confirmed: Automated email briefings transmit structured minutes without exposing full raw transcript.',
        ],
        nextSteps: [
          {
            title: 'Transmit customized Master Services Agreement (MSA) and 50-seat pilot SOW',
            owner: 'Marcus Vance (MeetAgent)',
            due: 'Today 5:00 PM',
          },
          {
            title: 'Execute infosec signoff ticket in internal enterprise procurement portal',
            owner: 'Johnathan Vance (Client)',
            due: '48 Hours',
          },
          {
            title: 'Schedule technical user onboarding session for 50 enterprise pilot users',
            owner: 'Marcus Vance (MeetAgent)',
            due: 'Next Monday',
          },
        ],
      },
    },
  }

  let demoState = {
    currentPreset: 'sprint',
    isPlaying: false,
    speedMultiplier: 1,
    simTime: 0,
    timerId: null,
    renderedIndex: -1,
    momRendered: false,
  }

  function setupLandingHeroDemo() {
    if (!el.demoPlayBtn) return

    // Preset selector buttons
    const presetBtns = document.querySelectorAll('.demo-preset-btn')
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset
        if (!presetKey || !DEMO_PRESETS[presetKey]) return
        presetBtns.forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        switchDemoPreset(presetKey)
      })
    })

    // Play / Pause simulation button
    el.demoPlayBtn.addEventListener('click', toggleDemoPlay)

    // Instant MoM button (Instant synthesis without waiting)
    if (el.demoInstantBtn) {
      el.demoInstantBtn.addEventListener('click', () => {
        completeInstantSynthesis()
      })
    }

    // Speed toggle button (1x / 2x)
    if (el.demoSpeedBtn) {
      el.demoSpeedBtn.addEventListener('click', () => {
        demoState.speedMultiplier = demoState.speedMultiplier === 1 ? 2 : 1
        if (el.demoSpeedLabel) {
          el.demoSpeedLabel.textContent = `${demoState.speedMultiplier}x Speed`
        }
      })
    }

    // Reset button
    if (el.demoResetBtn) {
      el.demoResetBtn.addEventListener('click', resetDemo)
    }

    // Hero demo scroll button
    if (el.heroDemoScrollBtn) {
      el.heroDemoScrollBtn.addEventListener('click', () => {
        const demoTarget = document.getElementById('demo')
        if (demoTarget) {
          demoTarget.scrollIntoView({ behavior: 'smooth' })
          setTimeout(() => {
            if (!demoState.isPlaying) {
              startDemoPlay()
            }
          }, 600)
        }
      })
    }

    // Initialize initial display for sprint preset
    switchDemoPreset('sprint')
  }

  function updateScenarioBriefBanner(presetKey) {
    const preset = DEMO_PRESETS[presetKey] || DEMO_PRESETS.sprint
    if (el.demoScenarioTag) {
      el.demoScenarioTag.className = preset.tagClass
      el.demoScenarioTag.textContent = preset.category
    }
    if (el.demoScenarioDuration) {
      el.demoScenarioDuration.textContent = preset.duration
    }
    if (el.demoScenarioObjective) {
      el.demoScenarioObjective.textContent = preset.objective
    }
    if (el.demoScenarioTitle) {
      el.demoScenarioTitle.textContent = preset.title
    }
    if (el.demoScenarioDesc) {
      el.demoScenarioDesc.textContent = preset.desc
    }
    if (el.demoTimer) {
      el.demoTimer.textContent = `00:00 / 00:${String(preset.durationSec).padStart(2, '0')}`
    }
    if (el.demoScenarioRoster) {
      el.demoScenarioRoster.innerHTML = preset.roster.map((p) => `
        <div class="roster-chip">
          <span class="roster-chip-avatar" style="background:${p.color};">${escapeHtml(p.avatar)}</span>
          <span class="roster-chip-name">${escapeHtml(p.name)}</span>
          <span class="roster-chip-role">· ${escapeHtml(p.role)}</span>
        </div>`).join('')
    }
  }

  function switchDemoPreset(presetKey) {
    stopDemoTimer()
    demoState.currentPreset = presetKey
    updateScenarioBriefBanner(presetKey)
    resetDemo()
  }

  function toggleDemoPlay() {
    if (demoState.isPlaying) {
      pauseDemoPlay()
    } else {
      const currentPreset = DEMO_PRESETS[demoState.currentPreset] || DEMO_PRESETS.sprint
      if (demoState.simTime >= currentPreset.durationSec) {
        resetDemo()
      }
      startDemoPlay()
    }
  }

  function startDemoPlay() {
    demoState.isPlaying = true
    if (el.demoPlayIcon) {
      el.demoPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    }
    if (el.demoPlayLabel) {
      el.demoPlayLabel.textContent = 'Pause'
    }
    if (el.demoEqualizer) {
      el.demoEqualizer.classList.add('animating')
    }
    if (el.demoStatusText) {
      el.demoStatusText.textContent = 'SIMULATING LIVE CALL'
    }
    if (el.demoStreamBadge) {
      el.demoStreamBadge.textContent = 'Voice Stream Active'
    }

    // Remove scenario placeholder message if starting from 0
    if (demoState.simTime === 0 && el.demoChatStream) {
      el.demoChatStream.innerHTML = ''
    }

    demoState.timerId = setInterval(() => {
      const stepIncrement = 0.25 * (demoState.speedMultiplier || 1)
      demoState.simTime += stepIncrement
      updateDemoProgress()

      const currentPreset = DEMO_PRESETS[demoState.currentPreset] || DEMO_PRESETS.sprint

      // Render chat messages sequentially
      for (let i = 0; i < currentPreset.messages.length; i++) {
        const msg = currentPreset.messages[i]
        if (demoState.simTime >= msg.atSec && i > demoState.renderedIndex) {
          demoState.renderedIndex = i
          renderDemoSpeechBubble(msg)
        }
      }

      // Pre-MoM badge update
      if (demoState.simTime >= currentPreset.durationSec - 3 && !demoState.momRendered) {
        if (el.demoMomBadge) {
          el.demoMomBadge.textContent = 'Synthesizing Minutes...'
          el.demoMomBadge.style.color = 'var(--brand-amber, #B45309)'
          el.demoMomBadge.style.background = '#FFFBEB'
        }
      }

      // Finish simulation
      if (demoState.simTime >= currentPreset.durationSec) {
        completeDemoSimulation(currentPreset)
      }
    }, 250)
  }

  function pauseDemoPlay() {
    stopDemoTimer()
    demoState.isPlaying = false
    if (el.demoPlayIcon) {
      el.demoPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>'
    }
    if (el.demoPlayLabel) {
      el.demoPlayLabel.textContent = 'Resume'
    }
    if (el.demoEqualizer) {
      el.demoEqualizer.classList.remove('animating')
    }
    if (el.demoStatusText) {
      el.demoStatusText.textContent = 'SIMULATION PAUSED'
    }
  }

  function stopDemoTimer() {
    if (demoState.timerId) {
      clearInterval(demoState.timerId)
      demoState.timerId = null
    }
  }

  function resetDemo() {
    stopDemoTimer()
    demoState.isPlaying = false
    demoState.simTime = 0
    demoState.renderedIndex = -1
    demoState.momRendered = false

    const currentPreset = DEMO_PRESETS[demoState.currentPreset] || DEMO_PRESETS.sprint

    if (el.demoPlayIcon) {
      el.demoPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>'
    }
    if (el.demoPlayLabel) {
      el.demoPlayLabel.textContent = 'Play Simulation'
    }
    if (el.demoTimer) {
      el.demoTimer.textContent = `00:00 / 00:${String(currentPreset.durationSec).padStart(2, '0')}`
    }
    if (el.demoProgressBar) {
      el.demoProgressBar.style.width = '0%'
    }
    if (el.demoEqualizer) {
      el.demoEqualizer.classList.remove('animating')
    }
    if (el.demoStatusText) {
      el.demoStatusText.textContent = 'READY TO SIMULATE'
    }
    if (el.demoStreamBadge) {
      el.demoStreamBadge.textContent = 'Voice Stream Idle'
    }
    if (el.demoMomBadge) {
      el.demoMomBadge.textContent = 'Awaiting Audio'
      el.demoMomBadge.style.color = 'var(--text-muted)'
      el.demoMomBadge.style.background = 'var(--bg-subtle)'
    }

    // Render initial preview state tailored to currentPreset
    if (el.demoChatStream) {
      const agendaItemsHtml = currentPreset.agenda.map((item) => `
        <li class="scenario-agenda-item">
          <span class="scenario-agenda-bullet">›</span>
          <span>${escapeHtml(item)}</span>
        </li>`).join('')

      const speakersHtml = currentPreset.roster.map((p) => `
        <div class="roster-chip" style="margin:2px 0;">
          <span class="roster-chip-avatar" style="background:${p.color};">${escapeHtml(p.avatar)}</span>
          <span class="roster-chip-name">${escapeHtml(p.name)}</span>
          <span class="roster-chip-role">(${escapeHtml(p.role)})</span>
        </div>`).join('')

      el.demoChatStream.innerHTML = `
        <div class="scenario-intro-card">
          <div class="scenario-intro-header">
            <span class="scenario-intro-title">Meeting Agenda & Scope</span>
            <span class="${currentPreset.tagClass}">${escapeHtml(currentPreset.category)}</span>
          </div>
          <ul class="scenario-agenda-list">
            ${agendaItemsHtml}
          </ul>
          <div style="font-size:0.72rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-top:4px;">
            Active Speakers Lineup
          </div>
          <div class="scenario-speaker-preview">
            ${speakersHtml}
          </div>
          <div style="background:var(--bg-subtle); padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-light); font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">
            Press <strong>Play Simulation</strong> above to stream speech, or click <strong>Instant MoM</strong>.
          </div>
        </div>`
    }

    if (el.demoMomCards) {
      let previewBlueprint = ''
      if (currentPreset.momType === 'technical') {
        previewBlueprint = `
          <div style="display:flex; flex-direction:column; gap:6px; font-size:0.78rem; color:var(--text-body); margin:8px 0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-indigo">Output 1</span>
              <span><strong>Cloud Architecture Spec:</strong> PostgreSQL RLS isolation & AES-256 specs</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-indigo">Output 2</span>
              <span><strong>Engineering Decisions:</strong> Dual SMTP fallbacks & deployment freeze</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-indigo">Output 3</span>
              <span><strong>Sprint PRs:</strong> JIRA keys (INFRA-89, FE-142), assignees & deadlines</span>
            </div>
          </div>`
      } else if (currentPreset.momType === 'executive') {
        previewBlueprint = `
          <div style="display:flex; flex-direction:column; gap:6px; font-size:0.78rem; color:var(--text-body); margin:8px 0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-emerald">Output 1</span>
              <span><strong>C-Suite Scorecard:</strong> $14.2M ARR, 84.2% Gross Margin, 28 Mo Runway</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-emerald">Output 2</span>
              <span><strong>Board Resolutions:</strong> Unanimous approval of +3 SE roles for Q4</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-emerald">Output 3</span>
              <span><strong>Governance Actions:</strong> Audited filings (CFO) & investor updates (CEO)</span>
            </div>
          </div>`
      } else if (currentPreset.momType === 'sales') {
        previewBlueprint = `
          <div style="display:flex; flex-direction:column; gap:6px; font-size:0.78rem; color:var(--text-body); margin:8px 0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-amber">Output 1</span>
              <span><strong>Commercial Terms:</strong> $85,000 ARR pilot, 50 Enterprise seats</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-amber">Output 2</span>
              <span><strong>Infosec Verification:</strong> Zero-bot local capture & private tenant</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge-tag-amber">Output 3</span>
              <span><strong>Closing Next Steps:</strong> Formal SOW/MSA dispatch & onboarding timeline</span>
            </div>
          </div>`
      }

      el.demoMomCards.innerHTML = `
        <div class="scenario-intro-card">
          <div class="scenario-intro-header">
            <span class="scenario-intro-title">Synthesized Output Blueprint</span>
            <span class="demo-badge-pill">Autonomous AI</span>
          </div>
          <p style="font-size:0.8rem; line-height:1.5; color:var(--text-secondary); margin:0;">
            MeetAgent customizes the synthesized minutes structure specifically for <strong>${escapeHtml(currentPreset.title)}</strong>:
          </p>
          ${previewBlueprint}
          <div style="margin-top:6px; padding-top:10px; border-top:1px solid var(--border-light); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <button id="scenarioQuickMoMBtn" class="btn btn-primary btn-sm" type="button" style="font-size:0.78rem;">
              ⚡ View Completed MoM Immediately
            </button>
            <span style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">Synthesis: &lt;1.0s</span>
          </div>
        </div>`

      const quickBtn = document.getElementById('scenarioQuickMoMBtn')
      if (quickBtn) {
        quickBtn.addEventListener('click', () => {
          completeInstantSynthesis()
        })
      }
    }
  }

  function completeInstantSynthesis() {
    stopDemoTimer()
    demoState.isPlaying = false
    const currentPreset = DEMO_PRESETS[demoState.currentPreset] || DEMO_PRESETS.sprint
    demoState.simTime = currentPreset.durationSec
    updateDemoProgress()

    if (el.demoPlayIcon) {
      el.demoPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>'
    }
    if (el.demoPlayLabel) {
      el.demoPlayLabel.textContent = 'Replay'
    }
    if (el.demoEqualizer) {
      el.demoEqualizer.classList.remove('animating')
    }
    if (el.demoStatusText) {
      el.demoStatusText.textContent = 'COMPLETED (0.8s)'
    }
    if (el.demoStreamBadge) {
      el.demoStreamBadge.textContent = 'All Speech Transcribed'
    }
    if (el.demoMomBadge) {
      el.demoMomBadge.textContent = 'Generated in 0.8s'
      el.demoMomBadge.style.color = '#047857'
      el.demoMomBadge.style.background = '#ECFDF5'
    }

    // Render all chat speech bubbles into left stream
    if (el.demoChatStream) {
      el.demoChatStream.innerHTML = ''
      currentPreset.messages.forEach((msg) => {
        const bubble = document.createElement('div')
        bubble.className = 'mock-speech-bubble'
        bubble.innerHTML = `
          <div class="speaker-tag">
            <span class="speaker-avatar" style="background:${msg.avatarBg};">${escapeHtml(msg.avatar)}</span>
            <div style="display:flex; flex-direction:column; line-height:1.2;">
              <span class="speaker-name">${escapeHtml(msg.name)}</span>
              <span class="speaker-role" style="font-size:0.68rem; color:var(--text-muted);">${escapeHtml(msg.role || '')}</span>
            </div>
            <span class="speech-time" style="margin-left:auto;">${escapeHtml(msg.time)}</span>
          </div>
          <div class="speech-text">
            ${escapeHtml(msg.text)}
          </div>`
        el.demoChatStream.appendChild(bubble)
      })
      el.demoChatStream.scrollTop = el.demoChatStream.scrollHeight
    }

    // Render custom MoM cards
    renderDemoMoMCards(currentPreset)
  }

  function updateDemoProgress() {
    const currentPreset = DEMO_PRESETS[demoState.currentPreset] || DEMO_PRESETS.sprint
    const curSec = Math.min(Math.floor(demoState.simTime), currentPreset.durationSec)
    const formatted = `00:${String(curSec).padStart(2, '0')} / 00:${String(currentPreset.durationSec).padStart(2, '0')}`
    if (el.demoTimer) {
      el.demoTimer.textContent = formatted
    }
    if (el.demoProgressBar) {
      const pct = Math.min((demoState.simTime / currentPreset.durationSec) * 100, 100)
      el.demoProgressBar.style.width = `${pct}%`
    }
  }

  function renderDemoSpeechBubble(msg) {
    if (!el.demoChatStream) return
    // Remove active highlight from previous bubbles
    el.demoChatStream.querySelectorAll('.live-active-bubble').forEach((b) => b.classList.remove('live-active-bubble'))

    const bubble = document.createElement('div')
    bubble.className = 'mock-speech-bubble live-active-bubble'
    bubble.innerHTML = `
      <div class="speaker-tag">
        <span class="speaker-avatar" style="background:${msg.avatarBg};">${escapeHtml(msg.avatar)}</span>
        <div style="display:flex; flex-direction:column; line-height:1.2;">
          <span class="speaker-name">${escapeHtml(msg.name)}</span>
          <span class="speaker-role" style="font-size:0.68rem; color:var(--text-muted);">${escapeHtml(msg.role || '')}</span>
        </div>
        <span class="speech-time" style="margin-left:auto;">${escapeHtml(msg.time)}</span>
      </div>
      <div class="speech-text">
        ${escapeHtml(msg.text)}
      </div>`
    
    el.demoChatStream.appendChild(bubble)
    el.demoChatStream.scrollTop = el.demoChatStream.scrollHeight
  }

  function completeDemoSimulation(preset) {
    stopDemoTimer()
    demoState.isPlaying = false
    demoState.simTime = preset.durationSec
    updateDemoProgress()

    if (el.demoPlayIcon) {
      el.demoPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>'
    }
    if (el.demoPlayLabel) {
      el.demoPlayLabel.textContent = 'Replay'
    }
    if (el.demoEqualizer) {
      el.demoEqualizer.classList.remove('animating')
    }
    if (el.demoStatusText) {
      el.demoStatusText.textContent = 'COMPLETED (0.8s)'
    }
    if (el.demoStreamBadge) {
      el.demoStreamBadge.textContent = 'Speech Transcribed'
    }
    if (el.demoMomBadge) {
      el.demoMomBadge.textContent = 'Generated in 0.8s'
      el.demoMomBadge.style.color = '#047857'
      el.demoMomBadge.style.background = '#ECFDF5'
    }

    // Render generated MoM Cards
    renderDemoMoMCards(preset)
  }

  function renderDemoMoMCards(preset) {
    if (!el.demoMomCards) return
    demoState.momRendered = true

    if (preset.momType === 'technical') {
      const specsHtml = preset.mom.specs.map((s) => `
        <div class="mock-spec-item">
          <span>${escapeHtml(s.label)}:</span>
          <strong>${escapeHtml(s.value)}</strong>
        </div>`).join('')

      const decisionsHtml = preset.mom.decisions.map((d) => `
        <li>
          <span class="check-icon">✓</span>
          <span>${escapeHtml(d)}</span>
        </li>`).join('')

      const tasksHtml = preset.mom.tasks.map((t) => `
        <div class="mock-task">
          <span class="mock-jira-key">${escapeHtml(t.key)}</span>
          <span style="font-weight:500;">${escapeHtml(t.title)}</span>
          <span class="task-badge">${escapeHtml(t.owner)}</span>
          <span class="mock-due-tag">${escapeHtml(t.due)}</span>
        </div>`).join('')

      el.demoMomCards.innerHTML = `
        <div class="mock-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span class="mock-card-tag tag-indigo">Technical Architecture Summary</span>
            <span class="badge-tag-indigo">PostgreSQL / RLS</span>
          </div>
          <p>${escapeHtml(preset.mom.summary)}</p>
          <div class="mock-spec-box">
            ${specsHtml}
          </div>
        </div>

        <div class="mock-card">
          <span class="mock-card-tag tag-emerald">Architecture Decisions & Security Safeguards</span>
          <ul class="mock-list">
            ${decisionsHtml}
          </ul>
        </div>

        <div class="mock-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span class="mock-card-tag tag-amber">Sprint Deliverables & PR Backlog</span>
            <span style="font-size:0.7rem; font-weight:600; color:var(--text-muted);">Release: Friday 9 AM</span>
          </div>
          <div class="mock-tasks">
            ${tasksHtml}
          </div>
        </div>`
    } else if (preset.momType === 'executive') {
      const kpisHtml = preset.mom.kpis.map((k) => `
        <div class="demo-kpi-card">
          <span class="demo-kpi-label">${escapeHtml(k.label)}</span>
          <div class="demo-kpi-val-row">
            <span class="demo-kpi-val">${escapeHtml(k.val)}</span>
            <span class="demo-kpi-sub">${escapeHtml(k.sub)}</span>
          </div>
        </div>`).join('')

      const resolutionsHtml = preset.mom.resolutions.map((r) => `
        <li>
          <span class="check-icon">✓</span>
          <span><strong>${escapeHtml(r.split(':')[0])}:</strong> ${escapeHtml(r.split(':').slice(1).join(':'))}</span>
        </li>`).join('')

      const actionsHtml = preset.mom.actions.map((a) => `
        <div class="mock-task">
          <span class="check-icon">✓</span>
          <span style="font-weight:500;">${escapeHtml(a.title)}</span>
          <span class="task-badge" style="background:#ECFDF5; color:#047857; border-color:#A7F3D0;">${escapeHtml(a.owner)}</span>
          <span class="mock-due-tag">${escapeHtml(a.due)}</span>
        </div>`).join('')

      el.demoMomCards.innerHTML = `
        <div class="mock-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span class="mock-card-tag tag-emerald">Executive Board Statement</span>
            <span class="badge-tag-emerald">Q3 Audited</span>
          </div>
          <p>${escapeHtml(preset.mom.summary)}</p>
          <div class="demo-kpi-grid">
            ${kpisHtml}
          </div>
        </div>

        <div class="mock-card">
          <span class="mock-card-tag tag-emerald">Formal Board Resolutions Approved</span>
          <ul class="mock-list">
            ${resolutionsHtml}
          </ul>
        </div>

        <div class="mock-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span class="mock-card-tag tag-amber">Corporate Governance Deliverables</span>
            <span style="font-size:0.7rem; font-weight:600; color:var(--text-muted);">Quarterly Filing</span>
          </div>
          <div class="mock-tasks">
            ${actionsHtml}
          </div>
        </div>`
    } else if (preset.momType === 'sales') {
      const dealsHtml = preset.mom.dealTerms.map((d) => `
        <div class="demo-kpi-card">
          <span class="demo-kpi-label">${escapeHtml(d.label)}</span>
          <div class="demo-kpi-val-row">
            <span class="demo-kpi-val" style="color:var(--primary); font-size:1.05rem;">${escapeHtml(d.val)}</span>
            <span class="demo-kpi-sub" style="color:var(--text-muted);">${escapeHtml(d.sub)}</span>
          </div>
        </div>`).join('')

      const complianceHtml = preset.mom.complianceChecks.map((c) => `
        <li>
          <span class="check-icon" style="color:var(--primary);">✓</span>
          <span>${escapeHtml(c)}</span>
        </li>`).join('')

      const nextStepsHtml = preset.mom.nextSteps.map((s) => `
        <div class="mock-task">
          <span class="mock-deal-badge">SOW</span>
          <span style="font-weight:500;">${escapeHtml(s.title)}</span>
          <span class="task-badge" style="background:#FFFBEB; color:#B45309; border-color:#FDE68A;">${escapeHtml(s.owner)}</span>
          <span class="mock-due-tag">${escapeHtml(s.due)}</span>
        </div>`).join('')

      el.demoMomCards.innerHTML = `
        <div class="mock-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span class="mock-card-tag tag-amber">Enterprise Opportunity & Terms</span>
            <span class="badge-tag-amber">Tier-1 Pilot</span>
          </div>
          <p>${escapeHtml(preset.mom.summary)}</p>
          <div class="demo-kpi-grid">
            ${dealsHtml}
          </div>
        </div>

        <div class="mock-card">
          <span class="mock-card-tag tag-emerald">Infosec & Compliance Verification</span>
          <ul class="mock-list">
            ${complianceHtml}
          </ul>
        </div>

        <div class="mock-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span class="mock-card-tag tag-amber">Procurement & Pilot Closing Milestones</span>
            <span style="font-size:0.7rem; font-weight:600; color:var(--text-muted);">Target: Next Monday</span>
          </div>
          <div class="mock-tasks">
            ${nextStepsHtml}
          </div>
        </div>`
    }
  }

  function setupFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item')
    faqItems.forEach((item) => {
      const btn = item.querySelector('.faq-question')
      if (!btn) return
      btn.addEventListener('click', () => {
        const wasActive = item.classList.contains('active')
        faqItems.forEach((i) => i.classList.remove('active'))
        if (!wasActive) {
          item.classList.add('active')
        }
      })
    })
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

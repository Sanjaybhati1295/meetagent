import nodemailer from 'nodemailer'

/**
 * Checks whether server-side email dispatching is configured.
 */
export function isEmailConfigured() {
  const hasSmtp = Boolean(process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS))
  const hasResend = Boolean(process.env.RESEND_API_KEY)
  return hasSmtp || hasResend
}

/**
 * Returns the active email service provider name or null.
 */
export function getEmailProviderName() {
  if (process.env.RESEND_API_KEY) return 'Resend'
  if (process.env.SMTP_HOST) return `SMTP (${process.env.SMTP_HOST})`
  return null
}

/**
 * Extracts sections from markdown MoM text.
 */
export function parseMoMSections(md = '') {
  let summary = ''
  let decisions = []
  let actions = []

  if (!md) return { summary, decisions, actions }

  // 1. Summary
  const summaryTag = md.match(/===\s*SUMMARY\s*===([\s\S]*?)(?====\s*DECISIONS|===\s*ACTION|===\s*TRANSCRIPT|$)/i)
  if (summaryTag && summaryTag[1].trim()) {
    summary = summaryTag[1].trim()
  } else {
    const summaryHeader = md.match(/(?:###?|\*\*)\s*(?:Executive\s+)?Summary:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*(?:Key\s+)?Decisions|(?:###?|\*\*)\s*Action\s+Items|$)/i)
    if (summaryHeader && summaryHeader[1].trim()) {
      summary = summaryHeader[1].trim()
    } else {
      const firstChunk = md.split(/\n\s*\n/)[0] || md.slice(0, 300)
      summary = firstChunk.trim()
    }
  }

  // 2. Decisions
  const decisionsTag = md.match(/===\s*DECISIONS\s*===([\s\S]*?)(?====\s*ACTION|===\s*TRANSCRIPT|===\s*SUMMARY|$)/i)
  const decisionsHeader = md.match(/(?:###?|\*\*)\s*(?:Key\s+)?Decisions:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*Action\s+Items|(?:###?|\*\*)\s*(?:Executive\s+)?Summary|$)/i)
  const decisionsRaw = (decisionsTag && decisionsTag[1]) || (decisionsHeader && decisionsHeader[1]) || ''
  if (decisionsRaw.trim()) {
    decisions = decisionsRaw
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.]\s*/, '').replace(/^\[[ x]\]\s*/i, '').trim())
      .filter((l) => l.length > 2 && !l.startsWith('===') && !l.startsWith('###'))
  }

  // 3. Action Items
  const actionsTag = md.match(/===\s*ACTION\s*ITEMS?\s*===([\s\S]*?)(?====\s*TRANSCRIPT|===\s*SUMMARY|===\s*DECISIONS|$)/i)
  const actionsHeader = md.match(/(?:###?|\*\*)\s*Action\s*Items?:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*(?:Key\s+)?Decisions|(?:###?|\*\*)\s*(?:Executive\s+)?Summary|$)/i)
  const actionsRaw = (actionsTag && actionsTag[1]) || (actionsHeader && actionsHeader[1]) || ''
  if (actionsRaw.trim()) {
    actions = actionsRaw
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.]\s*/, '').replace(/^\[[ x]\]\s*/i, '').trim())
      .filter((l) => l.length > 2 && !l.startsWith('===') && !l.startsWith('###'))
  }

  return { summary, decisions, actions }
}

/**
 * Generates an executive, beautifully styled HTML email template.
 */
export function generateEmailHtml({
  meetingTitle,
  dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  note = '',
  momText = '',
  transcriptText = '',
  senderName = 'A Team Member',
}) {
  const { summary, decisions, actions } = parseMoMSections(momText)

  const noteBlock = note.trim()
    ? `
    <div style="background-color: #f8fafc; border-left: 4px solid #4338ca; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em;">Note from ${escapeHtml(senderName)}</p>
      <p style="margin: 6px 0 0 0; font-size: 15px; color: #334155; line-height: 1.5;">${escapeHtml(note).replace(/\n/g, '<br>')}</p>
    </div>`
    : ''

  const decisionsHtml = decisions.length
    ? decisions
        .map(
          (d) => `
        <li style="margin-bottom: 8px; color: #065f46; font-size: 14px; line-height: 1.5;">
          <strong style="color: #059669;">✓</strong> ${escapeHtml(d)}
        </li>`
        )
        .join('')
    : '<li style="color: #64748b; font-size: 14px; list-style: none;">No explicit decisions recorded.</li>'

  const actionsHtml = actions.length
    ? actions
        .map(
          (a) => `
        <li style="margin-bottom: 8px; color: #92400e; font-size: 14px; line-height: 1.5;">
          <strong style="color: #d97706;">→</strong> ${escapeHtml(a)}
        </li>`
        )
        .join('')
    : '<li style="color: #64748b; font-size: 14px; list-style: none;">No action items recorded.</li>'


  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meetingTitle)} — Executive MoM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf9f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%); color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px;">
                      Executive Meeting Intelligence
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                      ${escapeHtml(meetingTitle)}
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #e0e7ff;">
                      Recorded & Transcribed • ${escapeHtml(dateStr)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 32px;">
              ${noteBlock}

              <!-- 1. Executive Summary -->
              <div style="margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                  Executive Summary
                </div>
                <div style="background-color: #ffffff; border-left: 3px solid #4338ca; padding: 12px 16px; font-size: 15px; line-height: 1.6; color: #1e293b;">
                  ${escapeHtml(summary || 'No summary text available.').replace(/\n/g, '<br>')}
                </div>
              </div>

              <!-- 2. Decisions Made -->
              <div style="margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                  Decisions Made
                </div>
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px;">
                  <ul style="margin: 0; padding-left: 8px; list-style-type: none;">
                    ${decisionsHtml}
                  </ul>
                </div>
              </div>

              <!-- 3. Action Items -->
              <div style="margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                  Action Items & Deliverables
                </div>
                <div style="background-color: #fffdf5; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 18px;">
                  <ul style="margin: 0; padding-left: 8px; list-style-type: none;">
                    ${actionsHtml}
                  </ul>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                Sent via <strong>MeetAgent</strong> — Real-time Speech Intelligence & Supabase Cloud Vault
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © 2026 MeetAgent Inc. All meeting data is secured with enterprise encryption.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Generates structured plain-text format for emails or mailto links.
 */
export function generateEmailText({
  meetingTitle,
  dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  note = '',
  momText = '',
  transcriptText = '',
  senderName = 'A Team Member',
}) {
  const { summary, decisions, actions } = parseMoMSections(momText)

  let text = `MEETAGENT — MINUTES OF MEETING (MoM)\n`
  text += `==================================================\n`
  text += `Meeting: ${meetingTitle}\n`
  text += `Date:    ${dateStr}\n`
  text += `Sent by: ${senderName}\n`
  text += `==================================================\n\n`

  if (note.trim()) {
    text += `NOTE FROM SENDER:\n`
    text += `${note.trim()}\n\n`
    text += `--------------------------------------------------\n\n`
  }

  text += `EXECUTIVE SUMMARY:\n`
  text += `${summary || 'No summary text available.'}\n\n`

  text += `KEY DECISIONS MADE:\n`
  if (decisions.length) {
    decisions.forEach((d) => {
      text += `  [✓] ${d}\n`
    })
  } else {
    text += `  (No explicit decisions recorded)\n`
  }
  text += `\n`

  text += `ACTION ITEMS & DELIVERABLES:\n`
  if (actions.length) {
    actions.forEach((a) => {
      text += `  [→] ${a}\n`
    })
  } else {
    text += `  (No action items recorded)\n`
  }
  text += `\n`

  text += `==================================================\n`
  text += `Generated with MeetAgent — Executive Voice Intelligence\n`

  return text
}

/**
 * Dispatch an email using either configured SMTP or Resend API.
 */
export async function sendMeetingEmail({
  to,
  subject,
  note = '',
  meetingTitle = 'Executive Meeting Sync',
  momText = '',
  transcriptText = '',
  senderName = 'MeetAgent User',
  senderEmail = null,
}) {
  if (!to || !to.trim()) {
    throw new Error('Recipient email address is required')
  }

  // Parse comma-separated recipients
  const recipients = to
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean)

  if (recipients.length === 0) {
    throw new Error('At least one valid recipient email is required')
  }

  const finalSubject = subject && subject.trim()
    ? subject.trim()
    : `[Meeting Minutes] ${meetingTitle}`

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const html = generateEmailHtml({
    meetingTitle,
    dateStr,
    note,
    momText,
    transcriptText,
    senderName,
  })

  const text = generateEmailText({
    meetingTitle,
    dateStr,
    note,
    momText,
    transcriptText,
    senderName,
  })

  // 1. Try Resend API first if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resendFrom = process.env.RESEND_FROM || 'MeetAgent <onboarding@resend.dev>'
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: recipients,
          subject: finalSubject,
          html,
          text,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const rawMsg = errData.message || `Resend API failed with status ${res.status}`
        if (res.status === 403 && rawMsg.includes('only send testing emails')) {
          throw new Error(
            `Resend Sandbox Mode: Test domain "onboarding@resend.dev" can only send to the registered account owner (sanjaybhati1295@gmail.com). To send to other recipients, click "Open in Mail App" below, verify a custom domain at resend.com, or configure SMTP in .env.`
          )
        }
        throw new Error(rawMsg)
      }

      const data = await res.json()
      return {
        success: true,
        provider: 'Resend',
        id: data.id,
        recipients,
      }
    } catch (err) {
      if (process.env.SMTP_HOST) {
        console.warn('Resend dispatch failed, falling back to SMTP:', err.message)
      } else {
        throw err
      }
    }
  }

  // 2. Try SMTP via nodemailer if configured
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    })

    const fromAddress =
      process.env.SMTP_FROM ||
      (senderEmail ? `${senderName} <${senderEmail}>` : 'MeetAgent <no-reply@meetagent.com>')

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipients.join(', '),
      subject: finalSubject,
      text,
      html,
    })

    return {
      success: true,
      provider: 'SMTP',
      messageId: info.messageId,
      recipients,
    }
  }

  // 3. Not configured on server
  throw new Error(
    'Email delivery is not configured on the server. Please set SMTP_HOST or RESEND_API_KEY in .env, or use the "Open in Mail App" button.'
  )
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

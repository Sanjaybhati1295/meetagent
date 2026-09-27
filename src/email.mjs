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
  let title = ''
  let summary = ''
  let decisions = []
  let actions = []

  if (!md) return { title, summary, decisions, actions }

  // 1. Title
  const titleTag = md.match(/===\s*TITLE\s*===([\s\S]*?)(?====\s*SUMMARY|===\s*ACTION|===\s*TRANSCRIPT|$)/i)
  if (titleTag && titleTag[1].trim()) {
    title = titleTag[1].trim().replace(/^["']|["']$/g, '').split('\n')[0].trim()
  }

  // 2. Summary
  const summaryTag = md.match(/===\s*SUMMARY\s*===([\s\S]*?)(?====\s*ACTION|===\s*DECISIONS|===\s*TRANSCRIPT|$)/i)
  if (summaryTag && summaryTag[1].trim()) {
    summary = summaryTag[1].trim()
  } else {
    const summaryHeader = md.match(/(?:###?|\*\*)\s*(?:Executive\s+)?Summary:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*Action\s+Items|$)/i)
    if (summaryHeader && summaryHeader[1].trim()) {
      summary = summaryHeader[1].trim()
    } else {
      const firstChunk = md.split(/\n\s*\n/)[0] || md.slice(0, 300)
      summary = firstChunk.trim()
    }
  }

  // 3. Action Items (Point-to-point details)
  const actionsTag = md.match(/===\s*ACTION\s*ITEMS?\s*===([\s\S]*?)(?====\s*TRANSCRIPT|===\s*SUMMARY|$)/i)
  const actionsHeader = md.match(/(?:###?|\*\*)\s*Action\s*Items?:?\s*\**([\s\S]*?)(?=(?:###?|\*\*)\s*(?:Executive\s+)?Summary|$)/i)
  const actionsRaw = (actionsTag && actionsTag[1]) || (actionsHeader && actionsHeader[1]) || ''
  if (actionsRaw.trim()) {
    actions = actionsRaw
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.]\s*/, '').replace(/^\[[ x]\]\s*/i, '').trim())
      .filter((l) => l.length > 2 && !l.startsWith('===') && !l.startsWith('###'))
  }

  return { title, summary, decisions, actions }
}

/**
 * Generates an executive, beautifully styled HTML email template.
 */
export function generateEmailHtml({
  meetingTitle,
  dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  note = '',
  mom = '',
  momText = '',
  transcriptText = '',
  senderName = 'A Team Member',
}) {
  const rawMoM = momText || mom || ''
  const { title: parsedTitle, summary, actions } = parseMoMSections(rawMoM)
  const effectiveTitle = (meetingTitle && meetingTitle !== 'Executive Meeting Sync' && meetingTitle !== 'Strategy & Architecture Sync')
    ? meetingTitle
    : (parsedTitle || meetingTitle || 'Executive Meeting Sync')

  const noteBlock = note.trim()
    ? `
    <div style="background-color: #f8fafc; border-left: 4px solid #4338ca; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em;">Note from ${escapeHtml(senderName)}</p>
      <p style="margin: 6px 0 0 0; font-size: 15px; color: #334155; line-height: 1.5;">${escapeHtml(note).replace(/\n/g, '<br>')}</p>
    </div>`
    : ''

  const actionsHtml = actions.length
    ? actions
        .map(
          (a) => `
        <li style="margin-bottom: 10px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <strong style="color: #d97706; margin-right: 4px;">•</strong> ${escapeHtml(a)}
        </li>`
        )
        .join('')
    : '<li style="color: #64748b; font-size: 14px; list-style: none;">No action items recorded.</li>'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(effectiveTitle)} — Minutes of Meeting</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf9f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px;">
                      Minutes of Meeting
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                      ${escapeHtml(effectiveTitle)}
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">
                      Synthesized with MeetAgent • ${escapeHtml(dateStr)}
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

              <!-- 1. Summary -->
              <div style="margin-bottom: 26px;">
                <div style="display: inline-block; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
                  Summary
                </div>
                <div style="background-color: #f8fafc; border-left: 3px solid #4338ca; padding: 14px 18px; font-size: 15px; line-height: 1.6; color: #1e293b; border-radius: 0 6px 6px 0;">
                  ${escapeHtml(summary || 'No summary text available.').replace(/\n/g, '<br>')}
                </div>
              </div>

              <!-- 2. Action Items (Point-to-Point Details) -->
              <div style="margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
                  Action Items (Point-to-Point Details)
                </div>
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px;">
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
                Sent via <strong>MeetAgent</strong> — Autonomous Speech Intelligence & Cloud Vault
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © 2026 MeetAgent Inc. Meeting transcript omitted for confidentiality.
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
  mom = '',
  momText = '',
  transcriptText = '',
  senderName = 'A Team Member',
}) {
  const rawMoM = momText || mom || ''
  const { title: parsedTitle, summary, actions } = parseMoMSections(rawMoM)
  const effectiveTitle = (meetingTitle && meetingTitle !== 'Executive Meeting Sync' && meetingTitle !== 'Strategy & Architecture Sync')
    ? meetingTitle
    : (parsedTitle || meetingTitle || 'Executive Meeting Sync')

  let text = `MEETAGENT — MINUTES OF MEETING (MoM)\n`
  text += `==================================================\n`
  text += `Meeting: ${effectiveTitle}\n`
  text += `Date:    ${dateStr}\n`
  text += `Sent by: ${senderName}\n`
  text += `==================================================\n\n`

  if (note.trim()) {
    text += `NOTE FROM SENDER:\n`
    text += `${note.trim()}\n\n`
    text += `--------------------------------------------------\n\n`
  }

  text += `SUMMARY:\n`
  text += `${summary || 'No summary text available.'}\n\n`

  text += `ACTION ITEMS (POINT-TO-POINT DETAILS):\n`
  if (actions.length) {
    actions.forEach((a) => {
      text += `  • ${a}\n`
    })
  } else {
    text += `  (No action items recorded)\n`
  }
  text += `\n`

  text += `==================================================\n`
  text += `Generated with MeetAgent — Speech Intelligence & Cloud Vault\n`

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

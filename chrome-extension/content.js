// ── Injection guard ──────────────────────────────
// Always register listener — Chrome deduplicates internally
// Use window flag only to avoid double-init of state
if (!window.__mvInjected) {
  window.__mvInjected = true
  window.__mvPayload = null
  window.__mvPopupEl = null
  window.__mvSelectedContent = ''
}

// Always add listener — safe to add multiple times
// Chrome will deduplicate same function reference IF we use named function
// Re-injection = new function scope = need to remove old + add new
if (window.__mvRemoveListener) {
  chrome.runtime.onMessage.removeListener(window.__mvRemoveListener)
}
window.__mvRemoveListener = onMessage
chrome.runtime.onMessage.addListener(onMessage)

// ── Message handler ──────────────────────────────
function onMessage(message, sender, sendResponse) {
  if (message.type === 'SHOW_SAVE_POPUP') {
    const payload = normalizePayload(message.payload)
    console.log('[MV CS] SHOW_SAVE_POPUP', {
      payload,
      selection: getPageSelection(),
      rawPayload: message.payload,
    })
    window.__mvSelectedContent = payload.content
    window.__mvPayload = payload
    showSavePopup(payload)
    return
  }

  if (message.type === 'FETCH_TOKEN_FROM_PAGE') {
    console.log('[MV CS] FETCH_TOKEN_FROM_PAGE requested')
    fetch('/api/ext/token', {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return null
        const data = await res.json()
        return data ? { ...data, appUrl: window.location.origin } : null
      })
      .then((data) => sendResponse(data))
      .catch(() => sendResponse(null))
    return true
  }
}

function normalizePayload(payload) {
  const normalized = Object.assign({}, payload || {})
  const pageMeta = getPageMetadata()

  if (!String(normalized.content ?? '').trim()) {
    normalized.content = getPageSelection()
  }

  normalized.content = String(normalized.content ?? '').trim()
  normalized.url = pickFirstNonEmpty(normalized.url, pageMeta.url)
  normalized.sourceTitle = pickFirstNonEmpty(normalized.sourceTitle, pageMeta.title)
  normalized.favIconUrl = normalized.favIconUrl ?? pageMeta.favIconUrl

  return normalized
}

function getPageSelection() {
  try {
    return window.getSelection()?.toString().trim() || ''
  } catch {
    return ''
  }
}

function getPageMetadata() {
  try {
    const canonicalHref =
      document.querySelector('link[rel="canonical"]')?.href?.trim() || ''
    const url = canonicalHref || window.location.href || null
    const title = document.title?.trim() || null
    const favIconUrl =
      document.querySelector('link[rel="icon"]')?.href ||
      document.querySelector('link[rel="shortcut icon"]')?.href ||
      document.querySelector('link[rel="apple-touch-icon"]')?.href ||
      `${window.location.origin}/favicon.ico`

    return { url, title, favIconUrl }
  } catch {
    return { url: null, title: null, favIconUrl: null }
  }
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return null
}

// ── Show popup ───────────────────────────────────
function showSavePopup(payload) {
  removePopup()

  const collections = payload.collections ?? []
  const projects = payload.projects ?? []

  const el = document.createElement('div')
  el.id = 'mv-save-popup'
  el.dataset.mvSelectedContent = payload.content ?? ''
  el.dataset.mvPageUrl = payload.url ?? ''
  el.dataset.mvPageTitle = payload.sourceTitle ?? ''
  el.innerHTML = buildPopupHTML(payload, collections, projects)
  document.body.appendChild(el)
  window.__mvPopupEl = el

  setupListeners()
  hydratePopupSession()
  // Populate debug area with stored token info
  try {
    chrome.storage.local.get(['auth_token', 'user_email'], (r) => {
      const dbg = document.getElementById('mv-debug')
      if (!dbg) return
      const has = Boolean(r?.auth_token)
      const email = r?.user_email ?? ''
      dbg.textContent = `Auth token stored: ${has} ${has ? '· user: ' + email : ''}`
      console.log('[MV CS] Debug token stored:', { hasToken: has, email })
    })
  } catch (e) {
    console.warn('[MV CS] Could not read storage for debug', e)
  }
  setTimeout(() => removePopup(), 20000)
}

async function hydratePopupSession() {
  try {
    const session = await chrome.runtime.sendMessage({
      type: 'ENSURE_EXTENSION_SESSION',
      includeVaultData: true,
    })

    if (!window.__mvPayload) return

    window.__mvPayload.isAuthenticated = Boolean(session?.isAuthenticated)

    if ((session?.collections ?? []).length > 0) {
      window.__mvPayload.collections = session.collections
    }

    if ((session?.projects ?? []).length > 0) {
      window.__mvPayload.projects = session.projects
    }

    const warning = document.querySelector('.mv-auth-warning')
    if (window.__mvPayload.isAuthenticated && warning) {
      warning.remove()
    }
  } catch (err) {
    console.warn('[MV CS] Failed to hydrate popup session', err)
  }
}

// ── Build HTML ───────────────────────────────────
function buildPopupHTML(payload, collections, projects) {
  const preview = payload.content.length > 80
    ? payload.content.slice(0, 80) + '...'
    : payload.content

  const authWarning = payload.isAuthenticated
    ? ''
    : `<div class="mv-auth-warning">You are not logged in. Select save to sign in, then complete the save.</div>`

  const colOptions = collections
    .map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
    .join('')

  const projOptions = projects
    .map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
    .join('')

  const colHTML = collections.length > 0
    ? `<select id="mv-col-select" class="mv-select">
         <option value="">No collection</option>
         ${colOptions}
       </select>`
    : `<p class="mv-empty-hint">No collections yet.</p>`

  const projHTML = projects.length > 0
    ? `<select id="mv-proj-select" class="mv-select">
         <option value="">Select project</option>
         ${projOptions}
       </select>`
    : `<p class="mv-empty-hint">No projects yet.</p>`

  return `
    <div class="mv-popup-inner">

      <div class="mv-popup-header">
        <div class="mv-logo">
          <div class="mv-logo-icon">M</div>
          <span class="mv-logo-text">Memory Vault</span>
        </div>
        <button class="mv-close" id="mv-close-btn">✕</button>
      </div>

      <div class="mv-preview">"${esc(preview)}"</div>
      ${authWarning}

      <div class="mv-vault-toggle">
        <button class="mv-vault-btn active" id="mv-personal-btn" data-vault="personal">
          👤 Personal
        </button>
        <button class="mv-vault-btn" id="mv-work-btn" data-vault="work">
          💼 Work
        </button>
      </div>

      <div id="mv-personal-section" class="mv-section">
        <label class="mv-label">Collection</label>
        ${colHTML}
      </div>

      <div id="mv-work-section" class="mv-section" style="display:none">
        <label class="mv-label">Project</label>
        ${projHTML}
      </div>

      <div class="mv-note-section">
        <label class="mv-label">
          Note <span class="mv-optional">(optional)</span>
        </label>
        <textarea
          id="mv-note"
          class="mv-textarea"
          placeholder="Add context..."
          rows="2"
        ></textarea>
      </div>

      <div id="mv-error" class="mv-error" style="display:none"></div>

      <div id="mv-debug" class="mv-debug" style="margin-top:8px;font-size:12px;color:#bbb"></div>

      <button class="mv-save-btn" id="mv-save-btn">Save to vault</button>

      <p class="mv-hint">Ctrl+Enter · Esc to close</p>

    </div>
  `
}

// ── Escape HTML ──────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Setup listeners ──────────────────────────────
function setupListeners() {
  let vault = 'personal'

  document.getElementById('mv-close-btn')
    ?.addEventListener('click', e => {
      e.stopPropagation()
      removePopup()
    })

  document.getElementById('mv-personal-btn')
    ?.addEventListener('click', e => {
      e.stopPropagation()
      vault = 'personal'
      document.getElementById('mv-personal-btn').classList.add('active')
      document.getElementById('mv-work-btn').classList.remove('active')
      document.getElementById('mv-personal-section').style.display = 'block'
      document.getElementById('mv-work-section').style.display = 'none'
    })

  document.getElementById('mv-work-btn')
    ?.addEventListener('click', e => {
      e.stopPropagation()
      vault = 'work'
      document.getElementById('mv-work-btn').classList.add('active')
      document.getElementById('mv-personal-btn').classList.remove('active')
      document.getElementById('mv-work-section').style.display = 'block'
      document.getElementById('mv-personal-section').style.display = 'none'
    })

  document.getElementById('mv-save-btn')
    ?.addEventListener('click', e => {
      e.stopPropagation()
      handleSave(vault)
    })

  window.__mvPopupEl?.addEventListener('click', e => e.stopPropagation())
  document.addEventListener('keydown', onKey)

  setTimeout(() => {
    document.addEventListener('click', removePopup, { once: true })
  }, 200)
}

// ── Keyboard handler ─────────────────────────────
function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const active = document.querySelector('.mv-vault-btn.active')
    handleSave(active?.dataset.vault ?? 'personal')
  }
  if (e.key === 'Escape') removePopup()
}

// ── Save ─────────────────────────────────────────
async function handleSave(vault) {
  const payload = window.__mvPayload || {}
  const persistedContent = getPersistedSelectedContent()
  const clipContext = await resolveClipContext(payload)

  if (!String(payload.content ?? '').trim()) {
    const pageSelection = getPageSelection()
    if (pageSelection) {
      payload.content = pageSelection
      window.__mvPayload = payload
      window.__mvSelectedContent = pageSelection
    } else if (persistedContent) {
      payload.content = persistedContent
      window.__mvPayload = payload
    }
  }

  if (!String(payload.content ?? '').trim()) {
    showErr('No content. Please select text and try again.')
    return
  }

  const btn = document.getElementById('mv-save-btn')
  if (!btn || btn.disabled) return

  btn.disabled = true
  btn.textContent = 'Saving...'

  const note = document.getElementById('mv-note')?.value.trim()

  const colId = vault === 'personal'
    ? (document.getElementById('mv-col-select')?.value || null)
    : null

  const projId = vault === 'work'
    ? (document.getElementById('mv-proj-select')?.value || null)
    : null

  const content = note
    ? `${payload.content}\n\nNote: ${note}`
    : payload.content

  try {
    if (!payload.isAuthenticated) {
      const session = await chrome.runtime.sendMessage({
        type: 'ENSURE_EXTENSION_SESSION',
        includeVaultData: false,
      })

      payload.isAuthenticated = Boolean(session?.isAuthenticated)
      window.__mvPayload = payload

      if (!payload.isAuthenticated) {
        showErr('Please login to Memory Vault first.')
        btn.disabled = false
        btn.textContent = 'Save to vault'
        return
      }
    }

    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_MEMORY',
      payload: {
        content,
        url: clipContext.url,
        source_title: clipContext.sourceTitle,
        vault_type: vault,
        collection_id: colId,
        project_id: projId,
      },
    })

    if (!res?.success) {
      throw new Error(res?.error ?? 'Save failed')
    }

    btn.textContent = '✓ Saved!'
    btn.classList.add('mv-saved')
    setTimeout(removePopup, 1500)

  } catch (err) {
    showErr(err.message ?? 'Save failed. Try again.')
    btn.disabled = false
    btn.textContent = 'Save to vault'
  }
}

function getPersistedSelectedContent() {
  const popupContent = window.__mvPopupEl?.dataset?.mvSelectedContent ?? ''
  if (String(popupContent).trim()) return popupContent.trim()
  return String(window.__mvSelectedContent ?? '').trim()
}

async function resolveClipContext(payload = {}) {
  const pageMeta = getPageMetadata()
  const dataset = window.__mvPopupEl?.dataset ?? {}

  let tabContext = null
  try {
    tabContext = await chrome.runtime.sendMessage({ type: 'GET_CLIP_CONTEXT' })
  } catch (err) {
    console.warn('[MV CS] Failed to resolve tab clip context', err)
  }

  const url = pickFirstNonEmpty(
    payload.url,
    dataset.mvPageUrl,
    tabContext?.url,
    pageMeta.url,
    window.location.href
  )

  const sourceTitle = pickFirstNonEmpty(
    payload.sourceTitle,
    dataset.mvPageTitle,
    tabContext?.sourceTitle,
    pageMeta.title,
    document.title
  )

  return { url, sourceTitle }
}

// ── Show error ───────────────────────────────────
function showErr(msg) {
  const el = document.getElementById('mv-error')
  if (!el) return
  el.textContent = msg
  el.style.display = 'block'
}

// ── Remove popup ─────────────────────────────────
function removePopup() {
  document.removeEventListener('keydown', onKey)
  window.__mvPopupEl?.remove()
  window.__mvPopupEl = null
  window.__mvPayload = null
}
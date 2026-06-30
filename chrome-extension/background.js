const DEFAULT_APP_URL = 'http://localhost:3000'
const APP_URL_PATTERNS = [
  'http://localhost:3000/*',
  'https://*.vercel.app/*',
  'https://memoryvault.app/*',
]

// ── Context menu setup ───────────────────────────
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-vault',
      title: 'Save to Memory Vault',
      contexts: ['selection'],
    })
  })
}

chrome.runtime.onInstalled.addListener(createContextMenu)
chrome.runtime.onStartup.addListener(createContextMenu)
createContextMenu()

// ── Context menu click ───────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'save-to-vault') return
  if (!tab?.id) return

  const selectedText = info.selectionText?.trim() ?? ''
  const pageUrl = info.pageUrl || tab.url || null
  console.log('[MV BG] context menu clicked', {
    selectedText,
    tabId: tab.id,
    pageUrl,
    tabTitle: tab.title,
  })

  ensureExtensionSession({ includeVaultData: true })
    .then(async (session) => {
      const payload = {
        content: selectedText,
        url: pageUrl,
        sourceTitle: tab.title ?? null,
        favIconUrl: tab.favIconUrl ?? null,
        collections: session.collections ?? [],
        projects: session.projects ?? [],
        isAuthenticated: session.isAuthenticated,
      }

      const success = await showSavePopupInTab(tab.id, payload)
      if (!success) {
        console.error('[MV BG] Unable to show save popup on tab', tab.id)
      }
    })
    .catch((error) => {
      console.error('[MV BG] Failed to bootstrap session for context menu save', error)
    })
})

async function showSavePopupInTab(tabId, payload) {
  const message = { type: 'SHOW_SAVE_POPUP', payload }

  try {
    await chrome.tabs.sendMessage(tabId, message)
    return true
  } catch (firstError) {
    console.warn('[MV BG] Initial sendMessage failed, injecting content script', firstError)
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    })
  } catch (injectError) {
    console.error('[MV BG] Content script injection failed', injectError)
    return false
  }

  try {
    await chrome.tabs.sendMessage(tabId, message)
    return true
  } catch (secondError) {
    console.error('[MV BG] sendMessage failed after injection', secondError)
    return false
  }
}

// ── Message handler ──────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Save memory
  if (message.type === 'SAVE_MEMORY') {
    handleSaveMemory(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }

  // Fetch token from dashboard (called from popup)
  if (message.type === 'FETCH_TOKEN') {
    fetchTokenFromApp()
      .then((data) => sendResponse(data))
      .catch(() => sendResponse(null))
    return true
  }

  // Verify token
  if (message.type === 'VERIFY_TOKEN') {
    verifyToken(message.token)
      .then((valid) => sendResponse({ valid }))
      .catch(() => sendResponse({ valid: false }))
    return true
  }

  // Get vault data (collections + projects)
  if (message.type === 'GET_VAULT_DATA') {
    getVaultData()
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ collections: [], projects: [] }))
    return true
  }

  if (message.type === 'ENSURE_EXTENSION_SESSION') {
    ensureExtensionSession({ includeVaultData: Boolean(message.includeVaultData) })
      .then((data) => sendResponse(data))
      .catch(() =>
        sendResponse({
          isAuthenticated: false,
          collections: [],
          projects: [],
        })
      )
    return true
  }

  if (message.type === 'GET_CLIP_CONTEXT') {
    sendResponse({
      url: sender.tab?.url ?? null,
      sourceTitle: sender.tab?.title ?? null,
      favIconUrl: sender.tab?.favIconUrl ?? null,
    })
    return true
  }

  // Open the login page when user chooses to sign in from the popup
  if (message.type === 'OPEN_LOGIN_PAGE') {
    openAppPage('/login')
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }))
    return true
  }

  if (message.type === 'OPEN_APP_PAGE') {
    openAppPage(message.path ?? '/')
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }))
    return true
  }
})

// ── Fetch token from Next.js API ─────────────────
async function fetchTokenFromApp() {
  try {
    const appUrl = await resolveAppUrl()
    const res = await fetch(`${appUrl}/api/ext/token`, {
      credentials: 'include',
      mode: 'cors',
    })

    if (res.ok) {
      const data = await res.json()
      if (data?.token) {
        await setStoredAppUrl(appUrl)
        chrome.storage.local.set({
          auth_token: data.token,
          user_email: data.email ?? '',
          user_name: data.name ?? '',
        })
        return data
      }
    }

    console.warn('[MV BG] fetchTokenFromApp failed', res.status)

    const pageData = await fetchTokenFromAppFromPage()
    if (pageData?.token) {
      console.log('[MV BG] fetchTokenFromApp: obtained token from page fallback')
      return pageData
    }

    if (res.status === 401) {
      chrome.storage.local.remove(['auth_token', 'user_email', 'user_name'])
    }
    return null
  } catch (err) {
    console.warn('[MV BG] fetchTokenFromApp network fallback', err)
    const pageData = await fetchTokenFromAppFromPage()
    if (pageData?.token) {
      return pageData
    }
    return null
  }
}

async function fetchTokenFromAppFromPage() {
  try {
    const tabs = await chrome.tabs.query({
      url: APP_URL_PATTERNS,
    })

    for (const tab of tabs) {
      if (!tab.id) continue
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'FETCH_TOKEN_FROM_PAGE',
        })

        if (response?.token) {
          if (response.appUrl) {
            await setStoredAppUrl(response.appUrl)
          }
          chrome.storage.local.set({
            auth_token: response.token,
            user_email: response.email ?? '',
            user_name: response.name ?? '',
          })
          return response
        }
      } catch (err) {
        console.warn('[MV BG] fetchTokenFromAppFromPage sendMessage failed', err)
      }
    }
  } catch (err) {
    console.error('[MV BG] fetchTokenFromAppFromPage error', err)
  }

  // As a last resort, open a dashboard tab and fetch token from page context
  console.log('[MV BG] No dashboard tab returned token, trying open-tab fallback')
  const tabResult = await fetchTokenByOpeningTab()
  if (tabResult?.token) return tabResult

  return null
}

async function fetchTokenByOpeningTab() {
  let openedTabId = null
  try {
    const appUrl = await resolveAppUrl()
    const tab = await chrome.tabs.create({ url: `${appUrl}/dashboard`, active: false })
    openedTabId = tab.id ?? null

    // Wait for tab to finish loading
    await new Promise((resolve) => {
      const onUpdated = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(onUpdated)
      // fallback timeout
      setTimeout(() => {
        try { chrome.tabs.onUpdated.removeListener(onUpdated) } catch {}
        resolve()
      }, 5000)
    })

    if (!tab.id) return null

    const latestTab = await chrome.tabs.get(tab.id).catch(() => null)
    const latestUrl = latestTab?.url ?? ''

    if (!latestTab || latestUrl.startsWith('chrome-error://')) {
      console.warn('[MV BG] Open-tab token fallback landed on error page')
      return null
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          const res = await fetch('/api/ext/token', { credentials: 'include' })
          if (!res.ok) return null
          return await res.json()
        } catch {
          return null
        }
      },
    })

    if (results && results.length > 0) {
      console.log('[MV BG] fetchTokenByOpeningTab: obtained token from opened tab')
      if (results[0].result?.appUrl) {
        await setStoredAppUrl(results[0].result.appUrl)
      } else {
        await setStoredAppUrl(appUrl)
      }
      return results[0].result
    }
  } catch (err) {
    console.warn('[MV BG] fetchTokenByOpeningTab fallback failed', err)
  } finally {
    if (openedTabId) {
      try { await chrome.tabs.remove(openedTabId) } catch {}
    }
  }
  return null
}

// ── Verify token ─────────────────────────────────
async function verifyToken(token) {
  try {
    const appUrl = await resolveAppUrl()
    const res = await fetch(`${appUrl}/api/ext/token`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (res.status === 401) {
      chrome.storage.local.remove(['auth_token', 'user_email', 'user_name'])
      return false
    }

    return res.ok
  } catch {
    return false
  }
}

// ── Get vault data ───────────────────────────────
async function getVaultData() {
  const token = await getStoredToken()
  if (!token) {
    console.log('[MV BG] No token for vault data')
    return { collections: [], projects: [] }
  }

  try {
    const appUrl = await resolveAppUrl()
    const [colRes, projRes] = await Promise.all([
      fetch(`${appUrl}/api/collections`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
      fetch(`${appUrl}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
    ])

    console.log('[MV BG] Collections status:', colRes.status)
    console.log('[MV BG] Projects status:', projRes.status)

    const colJson = colRes.ok ? await colRes.json() : { data: [] }
    const projJson = projRes.ok ? await projRes.json() : { data: [] }

    console.log('[MV BG] Collections:', colJson.data?.length ?? 0)
    console.log('[MV BG] Projects:', projJson.data?.length ?? 0)

    const collections = colJson.data ?? []
    const projects = projJson.data ?? []

    chrome.storage.local.set({ collections, projects })

    return { collections, projects }
  } catch (err) {
    console.error('[MV BG] Vault data error:', err)
    return { collections: [], projects: [] }
  }
}

async function ensureExtensionSession(options = {}) {
  const includeVaultData = options.includeVaultData === true
  let token = await getStoredToken()
  let isAuthenticated = false

  if (token) {
    isAuthenticated = await verifyToken(token)
    if (!isAuthenticated) {
      token = null
      chrome.storage.local.remove(['auth_token', 'user_email', 'user_name'])
    }
  }

  if (!token) {
    const authData = await fetchTokenFromApp()
    if (authData?.token) {
      token = authData.token
      isAuthenticated = true
      chrome.storage.local.set({ auth_token: token })
    }
  }

  let collections = []
  let projects = []

  if (includeVaultData && isAuthenticated) {
    const vaultData = await getVaultData()
    collections = vaultData.collections ?? []
    projects = vaultData.projects ?? []
  } else if (includeVaultData) {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(['collections', 'projects'], resolve)
    })
    collections = stored.collections ?? []
    projects = stored.projects ?? []
  }

  return {
    isAuthenticated,
    token,
    collections,
    projects,
  }
}

// ── Save memory ──────────────────────────────────
async function handleSaveMemory(payload) {
  const token = await getStoredToken()

  if (!token) {
    throw new Error('Not authenticated. Please login to Memory Vault.')
  }

  const normalizedPayload = normalizeSavePayload(payload)
  const appUrl = await resolveAppUrl()
  const res = await fetch(`${appUrl}/api/memories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(normalizedPayload),
  })

  if (res.status === 401) {
    chrome.storage.local.remove(['auth_token', 'user_email', 'user_name'])
    throw new Error('Session expired. Please login again.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Failed (${res.status})`)
  }

  return res.json()
}

// ── Get stored token ─────────────────────────────
async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth_token'], (r) => {
      resolve(r.auth_token ?? null)
    })
  })
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return null
}

function normalizeSavePayload(payload = {}) {
  const url = pickFirstNonEmpty(payload.url)
  const sourceTitle = pickFirstNonEmpty(
    payload.source_title,
    payload.sourceTitle
  )

  let resolvedTitle = sourceTitle
  if (url && !resolvedTitle) {
    try {
      resolvedTitle = new URL(url).hostname.replace(/^www\./, '')
    } catch {}
  }

  return {
    content: String(payload.content ?? '').trim(),
    url,
    source_title: resolvedTitle,
    vault_type: payload.vault_type,
    collection_id: payload.collection_id ?? null,
    project_id: payload.project_id ?? null,
  }
}

async function resolveAppUrl() {
  const stored = await new Promise((resolve) => {
    chrome.storage.local.get(['app_url'], resolve)
  })

  if (stored.app_url) {
    return stored.app_url
  }

  const tabs = await chrome.tabs.query({ url: APP_URL_PATTERNS })
  for (const tab of tabs) {
    const tabUrl = tab.url ?? ''
    try {
      const origin = new URL(tabUrl).origin
      if (origin) {
        await setStoredAppUrl(origin)
        return origin
      }
    } catch {}
  }

  return DEFAULT_APP_URL
}

async function setStoredAppUrl(appUrl) {
  if (!appUrl) return
  await chrome.storage.local.set({ app_url: appUrl })
}

async function openAppPage(pathname) {
  const appUrl = await resolveAppUrl()
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  await chrome.tabs.create({ url: `${appUrl}${path}` })
}
let vaultType = 'personal'

document.addEventListener('DOMContentLoaded', async () => {
  await initPopup()
  setupListeners()
})

// ── Init ─────────────────────────────────────────
async function initPopup() {
  // Step 1: Check if already have valid token
  const stored = await getStoredAuth()

  if (stored?.token) {
    // Verify still valid
    const valid = await verifyToken(stored.token)
    if (valid) {
      showLoggedInUI(stored)
      await loadVaultData(stored.token)
      return
    }
    // Token expired — clear
    await clearAuth()
  }

  // Step 2: Try to get token from open dashboard tab
  const token = await fetchTokenFromDashboard()

  if (token) {
    showLoggedInUI(token)
    await loadVaultData(token.token)
    return
  }

  // Step 3: Not logged in
  showSection('logged-out')
}

// ── Fetch token from open dashboard tab ──────────
async function fetchTokenFromDashboard() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_TOKEN',
    })

    if (!response?.token) return null

    // Save to storage
    await new Promise((resolve) => {
      chrome.storage.local.set({
        auth_token: response.token,
        user_email: response.email ?? '',
        user_name: response.name ?? '',
      }, resolve)
    })

    return {
      token: response.token,
      email: response.email,
      name: response.name,
    }
  } catch (err) {
    console.error('Token fetch error:', err)
    return null
  }
}

function showLoggedInUI(authData) {
  const badge = document.getElementById('user-badge')
  if (badge && authData.email) {
    badge.textContent = authData.email.split('@')[0]
    badge.style.display = 'block'
  }
  showSection('logged-in')
}

async function verifyToken(token) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'VERIFY_TOKEN',
      token,
    })
    return response?.valid === true
  } catch {
    return false
  }
}
// ── Load vault data ───────────────────────────────
async function loadVaultData(token) {
  try {
    console.log('[MV] Loading vault data...')

    const response = await chrome.runtime.sendMessage({
      type: 'GET_VAULT_DATA',
    })

    console.log('[MV] Vault data:', {
      collections: response?.collections?.length ?? 0,
      projects: response?.projects?.length ?? 0,
    })

    const collections = response?.collections ?? []
    const projects = response?.projects ?? []

    populateSelect('collection-select', collections, 'No collection')
    populateSelect('project-select', projects, 'Select project')

    // Save to storage for content script
    await new Promise((resolve) => {
      chrome.storage.local.set({ collections, projects }, resolve)
    })

  } catch (err) {
    console.error('[MV] Load vault data error:', err)
  }
}

// ── Populate select ───────────────────────────────
function populateSelect(id, items, placeholder) {
  const select = document.getElementById(id)
  if (!select) return
  select.innerHTML = `<option value="">${placeholder}</option>`
  items.forEach((item) => {
    if(!item?.id) return
    const opt = document.createElement('option')
    opt.value = item.id
    opt.textContent = item.name ?? 'Unnamed'
    select.appendChild(opt)
  })
}

// ── Setup listeners ───────────────────────────────
function setupListeners() {
  // Login
  document.getElementById('login-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'OPEN_APP_PAGE',
      path: '/login',
    })
  })

  // Dashboard
  document.getElementById('open-dashboard')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'OPEN_APP_PAGE',
      path: '/dashboard',
    })
  })

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await clearAuth()
    showSection('logged-out')
    showStatus('Vault disconnected', 'info')
  })

  // Vault toggle
  document.getElementById('p-btn')?.addEventListener('click', () => {
    switchVault('personal')
  })
  document.getElementById('w-btn')?.addEventListener('click', () => {
    switchVault('work')
  })

  // Save
  document.getElementById('quick-save-btn')?.addEventListener('click', handleQuickSave)

  // Ctrl+Enter
  document.getElementById('quick-input')?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleQuickSave()
  })
}

// ── Switch vault ──────────────────────────────────
function switchVault(type) {
  vaultType = type
  document.getElementById('p-btn').classList.toggle('active', type === 'personal')
  document.getElementById('w-btn').classList.toggle('active', type === 'work')
  document.getElementById('collection-wrap').style.display =
    type === 'personal' ? 'block' : 'none'
  document.getElementById('project-wrap').style.display =
    type === 'work' ? 'block' : 'none'
}

// ── Quick save ────────────────────────────────────
async function handleQuickSave() {
  const input = document.getElementById('quick-input')
  const btn = document.getElementById('quick-save-btn')
  const content = input?.value.trim()

  if (!content) {
    showStatus('Please enter something to save', 'error')
    return
  }

  btn.disabled = true
  btn.textContent = 'Saving...'

  const authData = await getStoredAuth()
  if (!authData?.token) {
    showStatus('Please login first', 'error')
    btn.disabled = false
    btn.textContent = 'Save to vault'
    return
  }

  const collectionId = vaultType === 'personal'
    ? (document.getElementById('collection-select')?.value || null)
    : null

  const projectId = vaultType === 'work'
    ? (document.getElementById('project-select')?.value || null)
    : null

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_MEMORY',
      payload: {
        content,
        vault_type: vaultType,
        url: tab?.url ?? null,
        source_title: tab?.title ?? null,
        collection_id: collectionId,
        project_id: projectId,
      },
    })

    if (!res?.success) {
      throw new Error(res?.error ?? 'Save failed')
    }

    input.value = ''
    showStatus('✓ Saved to vault!', 'success')

  } catch (err) {
    showStatus(err.message ?? 'Save failed', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Save to vault'
  }
}

// ── Auth storage ──────────────────────────────────
async function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['auth_token', 'user_email', 'user_name'],
      (r) => resolve(
        r.auth_token
          ? { token: r.auth_token, email: r.user_email, name: r.user_name }
          : null
      )
    )
  })
}

async function clearAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(
      ['auth_token', 'user_email', 'user_name', 'collections', 'projects'],
      resolve
    )
  })
}

// ── UI helpers ────────────────────────────────────
function showSection(id) {
  document.getElementById('logged-in').style.display = 'none'
  document.getElementById('logged-out').style.display = 'none'
  document.getElementById(id).style.display = 'block'
}

function showStatus(msg, type) {
  const el = document.getElementById('status-msg')
  if (!el) return
  el.textContent = msg
  el.className = `status ${type}`
  el.style.display = 'block'
  setTimeout(() => { el.style.display = 'none' }, 3000)
}
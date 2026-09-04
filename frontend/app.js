/* ═══════════════════════════════════════════════════════
   Aigle d'Or — Application Logic
   ═══════════════════════════════════════════════════════ */

;(function () {
  'use strict'

  // ── State ────────────────────────────────────────────
  const state = {
    photos: [],       // Array of { file: File, id: string, previewUrl: string }
    emails: [],       // Array of email strings
    dateRows: [],     // Array of { id: string, days: string, month: string, year: string }
    sending: false
  }

  // ── DOM Elements ─────────────────────────────────────
  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => document.querySelectorAll(sel)

  const dom = {
    form:               $('#email-form'),
    photoInput:         $('#photo-input'),
    photoGrid:          $('#photo-grid'),
    photoCount:         $('#photo-count'),
    addPhotoBtn:        $('#add-photo-btn'),
    emailInput:         $('#email-input'),
    emailTags:          $('#email-tags'),
    emailContainer:     $('#email-tags-container'),
    datesRowsContainer: $('#dates-rows-container'),
    addDateBtn:         $('#add-date-btn'),
    datesPreview:       $('#dates-preview'),
    subjectInput:       $('#subject-input'),
    bodyInput:          $('#body-input'),
    sendBtn:            $('#send-btn'),
    toastContainer:     $('#toast-container'),
    successOverlay:     $('#success-overlay'),
    successMessage:     $('#success-message'),
    successCloseBtn:    $('#success-close-btn'),
    statusIndicator:    $('#status-indicator')
  }

  // ── Months in French ─────────────────────────────────
  const MONTHS_FR = [
    '', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ]

  // ── Init ─────────────────────────────────────────────
  function init() {
    setDefaultValues()
    bindEvents()
    checkServerStatus()
  }

  function setDefaultValues() {
    const now = new Date()
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
    const currentYear = String(now.getFullYear())

    state.dateRows = [
      { id: generateId(), days: '', month: currentMonth, year: currentYear }
    ]

    renderDateRows()
    updateDatesPreview()
    updateSubjectAndBody()
  }

  // ── Event Bindings ───────────────────────────────────
  function bindEvents() {
    // Photos
    dom.photoInput.addEventListener('change', handlePhotoSelect)
    dom.addPhotoBtn.addEventListener('click', () => {
      // On iOS Safari, we need a slight delay
      setTimeout(() => dom.photoInput.click(), 10)
    })

    // Prevent default label behavior since we handle click manually
    dom.addPhotoBtn.addEventListener('click', (e) => e.preventDefault())

    // Emails
    dom.emailInput.addEventListener('keydown', handleEmailKeydown)
    dom.emailInput.addEventListener('blur', handleEmailBlur)
    dom.emailInput.addEventListener('paste', handleEmailPaste)

    // Dates
    dom.addDateBtn.addEventListener('click', addDateRow)

    // Form submit
    dom.form.addEventListener('submit', handleSubmit)

    // Success overlay
    dom.successCloseBtn.addEventListener('click', handleSuccessClose)
  }

  // ── Photo Handling ───────────────────────────────────
  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    files.forEach(file => {
      const id = generateId()
      const previewUrl = URL.createObjectURL(file)
      state.photos.push({ file, id, previewUrl })
    })

    renderPhotos()
    // Reset input so the same files can be selected again
    dom.photoInput.value = ''
  }

  function renderPhotos() {
    dom.photoGrid.innerHTML = ''

    state.photos.forEach(photo => {
      const thumb = document.createElement('div')
      thumb.className = 'photo-thumb'
      thumb.dataset.id = photo.id
      thumb.innerHTML = `
        <img src="${photo.previewUrl}" alt="Photo jointe" loading="lazy">
        <button type="button" class="photo-remove" aria-label="Supprimer" data-id="${photo.id}">×</button>
      `
      dom.photoGrid.appendChild(thumb)
    })

    // Bind remove buttons
    dom.photoGrid.querySelectorAll('.photo-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        removePhoto(btn.dataset.id)
      })
    })

    dom.photoCount.textContent = state.photos.length
  }

  function removePhoto(id) {
    const index = state.photos.findIndex(p => p.id === id)
    if (index > -1) {
      URL.revokeObjectURL(state.photos[index].previewUrl)
      state.photos.splice(index, 1)
      renderPhotos()
    }
  }

  // ── Email Tag Handling ───────────────────────────────
  function handleEmailKeydown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmailFromInput()
    }
    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && !dom.emailInput.value && state.emails.length) {
      removeEmail(state.emails[state.emails.length - 1])
    }
  }

  function handleEmailBlur() {
    if (dom.emailInput.value.trim()) {
      addEmailFromInput()
    }
  }

  function handleEmailPaste(e) {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData).getData('text')
    const emails = text.split(/[,;\s]+/).filter(s => s.includes('@'))
    emails.forEach(email => addEmail(email.trim()))
  }

  function addEmailFromInput() {
    const value = dom.emailInput.value.trim().replace(/,$/,'')
    if (value) {
      addEmail(value)
      dom.emailInput.value = ''
    }
  }

  function addEmail(email) {
    // Basic validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      showToast('Adresse email invalide', 'error')
      dom.emailInput.classList.add('shake')
      setTimeout(() => dom.emailInput.classList.remove('shake'), 500)
      return
    }

    // Check duplicates
    if (state.emails.includes(email.toLowerCase())) {
      showToast('Email déjà ajouté', 'info')
      return
    }

    state.emails.push(email.toLowerCase())
    renderEmails()
  }

  function removeEmail(email) {
    state.emails = state.emails.filter(e => e !== email)
    renderEmails()
  }

  function renderEmails() {
    dom.emailTags.innerHTML = ''

    state.emails.forEach(email => {
      const tag = document.createElement('span')
      tag.className = 'email-tag'
      tag.innerHTML = `
        <span>${escapeHtml(email)}</span>
        <button type="button" class="email-tag-remove" data-email="${escapeHtml(email)}" aria-label="Retirer">×</button>
      `
      dom.emailTags.appendChild(tag)
    })

    dom.emailTags.querySelectorAll('.email-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => removeEmail(btn.dataset.email))
    })
  }

  // ── Date Rows Handling ───────────────────────────────
  function renderDateRows() {
    dom.datesRowsContainer.innerHTML = ''

    state.dateRows.forEach((row, index) => {
      const rowItem = document.createElement('div')
      rowItem.className = 'date-row-item'
      rowItem.dataset.id = row.id

      const showRemove = state.dateRows.length > 1

      rowItem.innerHTML = `
        <div class="date-row-header">
          <span class="date-row-title">${state.dateRows.length > 1 ? `Période ${index + 1}` : 'Période de vente'}</span>
          ${showRemove ? `<button type="button" class="remove-date-btn" data-id="${row.id}" aria-label="Supprimer cette période">✕ Supprimer</button>` : ''}
        </div>
        <div class="dates-row">
          <div class="input-group dates-input-group">
            <label class="input-label">Jours</label>
            <input
              type="text"
              class="form-input date-days-input"
              data-id="${row.id}"
              placeholder="Ex : 11, 12, 13"
              value="${escapeHtml(row.days)}"
              inputmode="text"
            >
          </div>
          <div class="input-group month-input-group">
            <label class="input-label">Mois</label>
            <select class="form-input form-select date-month-select" data-id="${row.id}">
              ${MONTHS_FR.slice(1).map((m, idx) => {
                const val = String(idx + 1).padStart(2, '0')
                return `<option value="${val}" ${row.month === val ? 'selected' : ''}>${m.charAt(0).toUpperCase() + m.slice(1)}</option>`
              }).join('')}
            </select>
          </div>
          <div class="input-group year-input-group">
            <label class="input-label">Année</label>
            <input
              type="number"
              class="form-input date-year-input"
              data-id="${row.id}"
              min="2024"
              max="2030"
              value="${escapeHtml(row.year)}"
              inputmode="numeric"
            >
          </div>
        </div>
      `

      dom.datesRowsContainer.appendChild(rowItem)
    })

    // Écouteurs d'événements sur les inputs de chaque ligne
    dom.datesRowsContainer.querySelectorAll('.date-days-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const row = state.dateRows.find(r => r.id === e.target.dataset.id)
        if (row) {
          row.days = e.target.value
          updateDatesPreview()
          updateSubjectAndBody()
        }
      })
    })

    dom.datesRowsContainer.querySelectorAll('.date-month-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const row = state.dateRows.find(r => r.id === e.target.dataset.id)
        if (row) {
          row.month = e.target.value
          updateDatesPreview()
          updateSubjectAndBody()
        }
      })
    })

    dom.datesRowsContainer.querySelectorAll('.date-year-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const row = state.dateRows.find(r => r.id === e.target.dataset.id)
        if (row) {
          row.year = e.target.value
          updateDatesPreview()
          updateSubjectAndBody()
        }
      })
    })

    dom.datesRowsContainer.querySelectorAll('.remove-date-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        removeDateRow(btn.dataset.id)
      })
    })
  }

  function addDateRow() {
    const lastRow = state.dateRows[state.dateRows.length - 1]
    const defaultMonth = lastRow ? lastRow.month : String(new Date().getMonth() + 1).padStart(2, '0')
    const defaultYear = lastRow ? lastRow.year : String(new Date().getFullYear())

    state.dateRows.push({
      id: generateId(),
      days: '',
      month: defaultMonth,
      year: defaultYear
    })

    renderDateRows()
    updateDatesPreview()
    updateSubjectAndBody()

    // Placer le focus sur le champ jours de la nouvelle ligne
    const newInputs = dom.datesRowsContainer.querySelectorAll('.date-days-input')
    if (newInputs.length) {
      newInputs[newInputs.length - 1].focus()
    }
  }

  function removeDateRow(id) {
    if (state.dateRows.length <= 1) return
    state.dateRows = state.dateRows.filter(r => r.id !== id)
    renderDateRows()
    updateDatesPreview()
    updateSubjectAndBody()
  }

  // ── Formateurs de dates multiples ────────────────────
  function getValidDateRows() {
    return state.dateRows.filter(r => r.days && r.days.trim().length > 0)
  }

  function formatListWithEt(items, prefix = 'du ') {
    if (!items.length) return ''
    if (items.length === 1) return prefix + items[0]
    if (items.length === 2) return `${prefix}${items[0]} et ${prefix}${items[1]}`
    const head = items.slice(0, -1).map(item => prefix + item).join(', ')
    const tail = prefix + items[items.length - 1]
    return `${head} et ${tail}`
  }

  function getShortDatesStrings() {
    return getValidDateRows().map(r => {
      const cleanDays = r.days.trim().replace(/\s+/g, ' ')
      return `${cleanDays} / ${r.month} / ${r.year}`
    })
  }

  function getFullDatesStrings() {
    return getValidDateRows().map(r => {
      const cleanDays = r.days.trim().replace(/\s+/g, ' ')
      const monthNum = parseInt(r.month)
      const monthName = MONTHS_FR[monthNum] || ''
      return `${cleanDays} ${monthName} ${r.year}`
    })
  }

  function updateDatesPreview() {
    const fulls = getFullDatesStrings()
    if (fulls.length) {
      const previewText = fulls.join(' | ')
      dom.datesPreview.textContent = `📌 ${previewText}`
    } else {
      dom.datesPreview.textContent = ''
    }
  }

  function updateSubjectAndBody() {
    const shorts = getShortDatesStrings()
    const fulls = getFullDatesStrings()

    if (shorts.length) {
      const subjectFormatted = formatListWithEt(shorts, 'du ')
      const bodyFormatted = formatListWithEt(fulls, 'du ')

      dom.subjectInput.value = `Versement des ventes ${subjectFormatted}`
      dom.bodyInput.value = `Bonjour,\n\nVoici les versements des ventes ${bodyFormatted}.\n\nCordialement`
    } else {
      dom.subjectInput.value = ''
      dom.bodyInput.value = ''
    }
  }

  // ── Form Submit ──────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (state.sending) return

    // Validation
    if (!state.photos.length) {
      showToast('Ajoutez au moins une photo', 'error')
      shakeSection('section-photos')
      return
    }

    if (!state.emails.length) {
      // Try to add what's in the input
      if (dom.emailInput.value.trim()) {
        addEmailFromInput()
      }
      if (!state.emails.length) {
        showToast('Ajoutez au moins un destinataire', 'error')
        shakeSection('section-emails')
        dom.emailInput.focus()
        return
      }
    }

    if (!getValidDateRows().length) {
      showToast('Renseignez au moins une date de vente', 'error')
      shakeSection('section-dates')
      return
    }

    if (!dom.subjectInput.value.trim()) {
      showToast('L\'objet est requis', 'error')
      shakeSection('section-message')
      dom.subjectInput.focus()
      return
    }

    if (!dom.bodyInput.value.trim()) {
      showToast('Le corps du message est requis', 'error')
      shakeSection('section-message')
      dom.bodyInput.focus()
      return
    }

    // Send
    state.sending = true
    dom.sendBtn.classList.add('loading')

    try {
      const formData = new FormData()
      formData.append('to', state.emails.join(', '))
      formData.append('subject', dom.subjectInput.value)
      formData.append('body', dom.bodyInput.value)

      state.photos.forEach(photo => {
        formData.append('photos', photo.file)
      })

      const response = await fetch('/api/send-email', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(`Email envoyé à ${state.emails.join(', ')}`)
      } else {
        showToast(result.message || 'Erreur lors de l\'envoi', 'error')
      }
    } catch (error) {
      console.error('Erreur:', error)
      showToast('Impossible de contacter le serveur', 'error')
    } finally {
      state.sending = false
      dom.sendBtn.classList.remove('loading')
    }
  }

  // ── Success Overlay ──────────────────────────────────
  function showSuccess(message) {
    dom.successMessage.textContent = message
    dom.successOverlay.classList.add('visible')
  }

  function handleSuccessClose() {
    dom.successOverlay.classList.remove('visible')
    resetForm()
  }

  function resetForm() {
    // Clear photos
    state.photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
    state.photos = []
    renderPhotos()

    // Clear emails
    state.emails = []
    renderEmails()

    // Reset dates to single current month row
    setDefaultValues()

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Toast System ─────────────────────────────────────
  function showToast(message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`

    const icons = { error: '❌', success: '✅', info: 'ℹ️' }
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${escapeHtml(message)}</span>`

    dom.toastContainer.appendChild(toast)

    // Auto-remove
    setTimeout(() => {
      toast.classList.add('toast-out')
      setTimeout(() => toast.remove(), 300)
    }, 3500)
  }

  // ── Section Shake (error) ────────────────────────────
  function shakeSection(id) {
    const section = document.getElementById(id)
    if (section) {
      section.classList.add('shake')
      setTimeout(() => section.classList.remove('shake'), 500)
    }
  }

  // ── Server Health Check ──────────────────────────────
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        setOnlineStatus(true)
      } else {
        setOnlineStatus(false)
      }
    } catch {
      setOnlineStatus(false)
    }
  }

  function setOnlineStatus(online) {
    if (online) {
      dom.statusIndicator.classList.remove('offline')
      dom.statusIndicator.querySelector('.status-text').textContent = 'En ligne'
    } else {
      dom.statusIndicator.classList.add('offline')
      dom.statusIndicator.querySelector('.status-text').textContent = 'Hors ligne'
    }
  }

  // ── Utilities ────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  // ── Service Worker Registration ──────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.warn('SW registration failed:', err))
    })
  }

  // ── Launch ───────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init)

})()

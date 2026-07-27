require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const nodemailer = require('nodemailer')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// ── Middleware ──────────────────────────────────────────
app.use(cors())
app.use(express.json())

// Servir le frontend (dossier ../frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')))

// ── Multer : stockage temporaire des photos ────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max par photo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Seules les images sont acceptées'), false)
    }
  }
})

// ── Configuration Nodemailer ───────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true pour le port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false // Nécessaire si antivirus/proxy intercepte le TLS
  }
})

// Vérifier la connexion SMTP au démarrage
transporter.verify()
  .then(() => console.log('✅ Connexion SMTP OK'))
  .catch(err => console.error('❌ Erreur SMTP:', err.message))

// ── Route : Envoi d'email ──────────────────────────────
app.post('/api/send-email', upload.array('photos', 20), async (req, res) => {
  try {
    const { to, subject, body } = req.body

    // Validation
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis : to, subject, body'
      })
    }

    // Préparer les pièces jointes
    const attachments = (req.files || []).map((file, index) => ({
      filename: file.originalname || `photo_${index + 1}.jpg`,
      content: file.buffer,
      contentType: file.mimetype
    }))

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: to, // peut être "a@mail.com, b@mail.com"
      subject: subject,
      text: body,
      attachments: attachments
    })

    console.log(`📧 Email envoyé à ${to} — MessageId: ${info.messageId}`)

    res.json({
      success: true,
      message: 'Email envoyé avec succès !',
      messageId: info.messageId
    })

  } catch (error) {
    console.error('❌ Erreur envoi email:', error)
    res.status(500).json({
      success: false,
      message: `Erreur lors de l'envoi : ${error.message}`
    })
  }
})

// ── Route : Vérifier le statut du serveur ──────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Fallback : renvoyer index.html pour la PWA ─────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'))
})

// ── Démarrage ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🦅 Aigle d'Or — Serveur sur http://localhost:${PORT}`)
})

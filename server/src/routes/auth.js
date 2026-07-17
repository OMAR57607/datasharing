import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import { JWT_SECRET, TOKEN_EXPIRES_IN } from '../config.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
  }

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username)

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  )

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  })
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router

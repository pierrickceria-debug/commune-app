const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('../db')

const SECRET = 'commune-secret-2024'

router.post('/inscription', async (req, res) => {
  const { nom, email, mot_de_passe, adresse, commune } = req.body

  if (!nom || !email || !mot_de_passe || !adresse || !commune) {
    return res.status(400).json({ erreur: 'Tous les champs sont obligatoires' })
  }

  const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existe) {
    return res.status(400).json({ erreur: 'Cet email est déjà utilisé' })
  }

  const hash = await bcrypt.hash(mot_de_passe, 10)
  const result = db.prepare(
    'INSERT INTO users (nom, email, mot_de_passe, adresse, commune) VALUES (?, ?, ?, ?, ?)'
  ).run(nom, email, hash, adresse, commune)

  const token = jwt.sign({ id: result.lastInsertRowid, nom, commune }, SECRET)
  res.json({ token, nom, commune })
})

router.post('/connexion', async (req, res) => {
  const { email, mot_de_passe } = req.body

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    return res.status(400).json({ erreur: 'Email ou mot de passe incorrect' })
  }

  const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe)
  if (!ok) {
    return res.status(400).json({ erreur: 'Email ou mot de passe incorrect' })
  }

  const token = jwt.sign({ id: user.id, nom: user.nom, commune: user.commune }, SECRET)
  res.json({ token, nom: user.nom, commune: user.commune })
})

module.exports = router
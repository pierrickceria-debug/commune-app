const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { getDb, run, get, lastInsertRowid } = require('../db')

const SECRET = 'commune-secret-2024'

router.post('/inscription', async (req, res) => {
  await getDb()
  const { nom, email, mot_de_passe, adresse, commune } = req.body

  if (!nom || !email || !mot_de_passe || !adresse || !commune) {
    return res.status(400).json({ erreur: 'Tous les champs sont obligatoires' })
  }

  const existe = get('SELECT id FROM users WHERE email = ?', [email])
  if (existe) {
    return res.status(400).json({ erreur: 'Cet email est deja utilise' })
  }

  const hash = await bcrypt.hash(mot_de_passe, 10)
  run('INSERT INTO users (nom, email, mot_de_passe, adresse, commune) VALUES (?, ?, ?, ?, ?)',
    [nom, email, hash, adresse, commune])
  const id = lastInsertRowid()

  const token = jwt.sign({ id, nom, commune }, SECRET)
  res.json({ token, nom, commune })
})

router.post('/connexion', async (req, res) => {
  await getDb()
  const { email, mot_de_passe } = req.body

  const user = get('SELECT * FROM users WHERE email = ?', [email])
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
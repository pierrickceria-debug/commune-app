const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const db = require('../db')

const SECRET = 'commune-secret-2024'

function getUser(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

router.get('/', (req, res) => {
  const { commune } = req.query
  let query = 'SELECT * FROM ideas ORDER BY created_at DESC'
  let params = []
  if (commune) {
    query = 'SELECT * FROM ideas WHERE commune = ? ORDER BY created_at DESC'
    params = [commune]
  }
  const ideas = db.prepare(query).all(...params)
  res.json(ideas)
})

router.get('/stats', (req, res) => {
  const user = getUser(req)
  if (!user) return res.status(401).json({ erreur: 'Non connecté' })
  const idees = db.prepare('SELECT COUNT(*) as total FROM ideas WHERE user_id = ?').get(user.id)
  const votes = db.prepare('SELECT SUM(votes) as total FROM ideas WHERE user_id = ?').get(user.id)
  const commentaires = db.prepare('SELECT COUNT(*) as total FROM comments WHERE user_id = ?').get(user.id)
  const mesIdees = db.prepare('SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC').all(user.id)
  res.json({
    idees: idees.total,
    votes: votes.total || 0,
    commentaires: commentaires.total,
    mesIdees
  })
})

router.post('/', (req, res) => {
  const user = getUser(req)
  if (!user) return res.status(401).json({ erreur: 'Non connecté' })
  const { title, category, body, photo } = req.body
  const result = db.prepare(
    'INSERT INTO ideas (user_id, author, title, category, body, commune, photo) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(user.id, user.nom, title, category, body, user.commune, photo || null)
  res.json({ id: result.lastInsertRowid })
})

router.patch('/:id/vote', (req, res) => {
  db.prepare('UPDATE ideas SET votes = votes + 1 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/:id/comments', (req, res) => {
  const comments = db.prepare(
    'SELECT * FROM comments WHERE idea_id = ? ORDER BY created_at ASC'
  ).all(req.params.id)
  res.json(comments)
})

router.post('/:id/comments', (req, res) => {
  const user = getUser(req)
  if (!user) return res.status(401).json({ erreur: 'Non connecté' })
  const { body } = req.body
  const result = db.prepare(
    'INSERT INTO comments (idea_id, user_id, author, body) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, user.id, user.nom, body)
  res.json({ id: result.lastInsertRowid })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM comments WHERE idea_id = ?').run(req.params.id)
  db.prepare('DELETE FROM ideas WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.delete('/:ideaId/comments/:commentId', (req, res) => {
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId)
  res.json({ ok: true })
})

module.exports = router
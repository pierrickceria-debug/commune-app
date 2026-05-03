const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { getDb, run, get, all, lastInsertRowid } = require('../db')

const SECRET = 'commune-secret-2024'

function getUser(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

router.get('/', async (req, res) => {
  await getDb()
  const { commune } = req.query
  let ideas
  if (commune) {
    ideas = all('SELECT * FROM ideas WHERE commune = ? ORDER BY created_at DESC', [commune])
  } else {
    ideas = all('SELECT * FROM ideas ORDER BY created_at DESC')
  }
  res.json(ideas)
})

router.get('/stats', async (req, res) => {
  await getDb()
  const user = getUser(req)
  if (!user) return res.status(401).json({ erreur: 'Non connecte' })

  const idees = get('SELECT COUNT(*) as total FROM ideas WHERE user_id = ?', [user.id])
  const votes = get('SELECT SUM(votes) as total FROM ideas WHERE user_id = ?', [user.id])
  const commentaires = get('SELECT COUNT(*) as total FROM comments WHERE user_id = ?', [user.id])
  const mesIdees = all('SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC', [user.id])

  res.json({
    idees: idees.total,
    votes: votes.total || 0,
    commentaires: commentaires.total,
    mesIdees
  })
})

router.post('/', async (req, res) => {
  await getDb()
  const user = getUser(req)
  if (!user) return res.status(401).json({ erreur: 'Non connecte' })

  const { title, category, body, photo } = req.body
  run('INSERT INTO ideas (user_id, author, title, category, body, commune, photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user.id, user.nom, title, category, body, user.commune, photo || null])
  const id = lastInsertRowid()
  res.json({ id })
})

router.patch('/:id/vote', async (req, res) => {
  await getDb()
  run('UPDATE ideas SET votes = votes + 1 WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

router.get('/:id/comments', async (req, res) => {
  await getDb()
  const comments = all('SELECT * FROM comments WHERE idea_id = ? ORDER BY created_at ASC', [req.params.id])
  res.json(comments)
})

router.post('/:id/comments', async (req, res) => {
  await getDb()
  const user = getUser(req)
  if (!user) return res.status(401).json({ erreur: 'Non connecte' })

  const { body } = req.body
  run('INSERT INTO comments (idea_id, user_id, author, body) VALUES (?, ?, ?, ?)',
    [req.params.id, user.id, user.nom, body])
  const id = lastInsertRowid()
  res.json({ id })
})

router.delete('/:id', async (req, res) => {
  await getDb()
  run('DELETE FROM comments WHERE idea_id = ?', [req.params.id])
  run('DELETE FROM ideas WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})

router.delete('/:ideaId/comments/:commentId', async (req, res) => {
  await getDb()
  run('DELETE FROM comments WHERE id = ?', [req.params.commentId])
  res.json({ ok: true })
})

module.exports = router
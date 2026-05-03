const express = require('express')
const cors = require('cors')
const path = require('path')
const multer = require('multer')
const fs = require('fs')
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads')
const ideasRouter = require('./routes/ideas')
const usersRouter = require('./routes/users')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + ext)
  }
})

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier recu' })
  res.json({ url: '/uploads/' + req.file.filename })
})

app.use('/api/ideas', ideasRouter)
app.use('/api/users', usersRouter)

app.listen(3000, () => console.log('Serveur lance sur http://localhost:3000'))
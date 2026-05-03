const API = 'http://localhost:3000/api/ideas'

const token = localStorage.getItem('token')
const nom = localStorage.getItem('nom')
const commune = localStorage.getItem('commune')

if (!token) window.location.href = '/login.html'

document.getElementById('user-info').textContent = `Bonjour ${nom} — ${commune}`

function seDeconnecter() {
  localStorage.removeItem('token')
  localStorage.removeItem('nom')
  localStorage.removeItem('commune')
  window.location.href = '/login.html'
}

function afficherFormulaire() {
  document.getElementById('formulaire').style.display = 'flex'
  document.getElementById('formulaire').style.flexDirection = 'column'
  document.getElementById('formulaire').style.gap = '10px'
  document.getElementById('liste').style.display = 'none'
}

function masquerFormulaire() {
  document.getElementById('formulaire').style.display = 'none'
  document.getElementById('liste').style.display = 'block'
}

function previewPhoto(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    document.getElementById('photo-img').src = e.target.result
    document.getElementById('photo-preview').style.display = 'block'
    document.getElementById('photo-label').textContent = '✅ Photo sélectionnée'
  }
  reader.readAsDataURL(file)
}

let filtreCommune = ''

async function chargerIdees() {
  let url = API
  if (filtreCommune) url += `?commune=${encodeURIComponent(filtreCommune)}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const ideas = await res.json()
  const container = document.getElementById('ideas-container')
  container.innerHTML = ''

  if (ideas.length === 0) {
    container.innerHTML = '<p style="color:#999">Aucune idée pour le moment.</p>'
    return
  }

  for (const idea of ideas) {
    const comments = await fetch(`${API}/${idea.id}/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json())

    container.innerHTML += `
      <div class="idea-card">
        <div class="idea-meta">
          <span class="badge ${idea.category}">${idea.category}</span>
          <span class="idea-author">${idea.author}</span>
          <span class="idea-author" style="color:#1D9E75;">— ${idea.commune}</span>
        </div>
        <h3>${idea.title}</h3>
        <p>${idea.body}</p>
        ${idea.photo ? `<img src="${idea.photo}" style="width:100%;border-radius:8px;margin:8px 0;max-height:300px;object-fit:cover;">` : ''}
        <div class="idea-footer">
          <button class="vote-btn" onclick="voter(${idea.id})">
            👍 ${idea.votes} vote${idea.votes > 1 ? 's' : ''}
          </button>
          <span class="idea-date">${new Date(idea.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="comments-section">
          <div class="comments-list" id="comments-${idea.id}">
            ${comments.length === 0
              ? '<p class="no-comments">Aucun commentaire pour le moment.</p>'
              : comments.map(c => `
                  <div class="comment">
                    <span class="comment-author">${c.author}</span>
                    <span class="comment-body">${c.body}</span>
                    <span class="comment-date">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                `).join('')
            }
          </div>
          <div class="comment-form">
            <input type="text" id="comment-body-${idea.id}" placeholder="Votre commentaire...">
            <button class="comment-btn" onclick="commenter(${idea.id})">Commenter</button>
          </div>
        </div>
      </div>
    `
  }
}

async function publierIdee() {
  const title = document.getElementById('title').value.trim()
  const category = document.getElementById('category').value
  const body = document.getElementById('body').value.trim()
  const photoInput = document.getElementById('photo-input')

  if (!title || !body) {
    alert('Merci de remplir tous les champs !')
    return
  }

  let photoUrl = null

  if (photoInput.files[0]) {
    const formData = new FormData()
    formData.append('photo', photoInput.files[0])
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    const uploadData = await uploadRes.json()
    photoUrl = uploadData.url
  }

  await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title, category, body, author: nom, commune, photo: photoUrl })
  })

  document.getElementById('title').value = ''
  document.getElementById('body').value = ''
  document.getElementById('photo-input').value = ''
  document.getElementById('photo-preview').style.display = 'none'
  document.getElementById('photo-label').textContent = '📷 Ajouter une photo (optionnel)'
  masquerFormulaire()
  chargerIdees()
}

async function voter(id) {
  await fetch(`${API}/${id}/vote`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  })
  chargerIdees()
}

async function commenter(ideaId) {
  const body = document.getElementById(`comment-body-${ideaId}`).value.trim()
  if (!body) {
    alert('Merci d\'écrire un commentaire !')
    return
  }

  await fetch(`${API}/${ideaId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ author: nom, body })
  })

  chargerIdees()
}

chargerIdees()
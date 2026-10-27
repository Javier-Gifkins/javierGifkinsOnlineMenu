import { useEffect, useState } from 'react'
import './App.css'

const categories = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks']
const blankItem = { name: '', category: 'Starters', price: '', description: '', image: '' }
const fallbackImage = 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80'

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status}).`)
  }
  return data
}

function App() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [category, setCategory] = useState('All')
  const [form, setForm] = useState(blankItem)
  const [editingId, setEditingId] = useState(null)
  const [loginPassword, setLoginPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    Promise.all([apiRequest('/api/menu'), apiRequest('/api/auth/session')])
      .then(([menu, session]) => {
        if (!isMounted) return
        setItems(menu)
        setIsAdmin(session.authenticated)
      })
      .catch((requestError) => {
        if (isMounted) setError(`Could not connect to the menu service. ${requestError.message}`)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => { isMounted = false }
  }, [])

  const visibleItems = category === 'All'
    ? items
    : items.filter((item) => item.category === category)

  function editItem(item) {
    setEditingId(item.id)
    setForm({ ...item, price: String(item.price) })
  }

  async function saveItem(event) {
    event.preventDefault()
    setError('')
    const item = { ...form, price: Number(form.price) }

    try {
      const savedItem = await apiRequest(
        editingId ? `/api/menu/${encodeURIComponent(editingId)}` : '/api/menu',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(item),
        },
      )
      setItems((current) => editingId
        ? current.map((existing) => existing.id === editingId ? savedItem : existing)
        : [...current, savedItem])
      setForm(blankItem)
      setEditingId(null)
    } catch (requestError) {
      setError(`Could not save the menu item. ${requestError.message}`)
    }
  }

  async function removeItem(id) {
    setError('')
    try {
      await apiRequest(`/api/menu/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setItems((current) => current.filter((item) => item.id !== id))
      if (editingId === id) {
        setEditingId(null)
        setForm(blankItem)
      }
    } catch (requestError) {
      setError(`Could not remove the menu item. ${requestError.message}`)
    }
  }

  async function login(event) {
    event.preventDefault()
    setError('')
    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password: loginPassword }),
      })
      setIsAdmin(true)
      setLoginPassword('')
    } catch (requestError) {
      setError(`Could not log in. ${requestError.message}`)
    }
  }

  async function logout() {
    setError('')
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
      setIsAdmin(false)
      setIsEditing(false)
      setEditingId(null)
      setForm(blankItem)
    } catch (requestError) {
      setError(`Could not log out. ${requestError.message}`)
    }
  }

  return (
    <>
      <header className="header">
        <a className="logo" href="#top">olive <span>&</span> oak</a>
        <a className="nav-link" href="#menu">Our menu</a>
        <button
          className="manage-button"
          disabled={isLoading}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (isAdmin ? 'Done' : 'Close') : 'Manage menu'}
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="hero-kicker"><span /> YOUR NEIGHBORHOOD TABLE</p>
            <h1>Come hungry.<br /><em>Leave happy.</em></h1>
            <span>Seasonal plates, good company, and one more reason to stay a little longer.</span>
            <div className="hero-actions">
              <a className="hero-primary" href="#menu">Explore the menu <span aria-hidden="true">↗</span></a>
              <span className="hero-note">Fresh ingredients · Made with care</span>
            </div>
          </div>
          <div className="hero-visual">
            <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85" alt="Warmly lit dining room set for dinner" />
            <div className="hero-stamp"><span>GOOD FOOD</span><strong>Since<br />always.</strong><span>GOOD COMPANY</span></div>
            <div className="hero-caption"><span>01 / 04</span><span>A place to gather</span></div>
          </div>
        </section>

        <section className="menu" id="menu">
          <div className="menu-heading">
            <div>
              <p className="eyebrow">A LITTLE OF EVERYTHING</p>
              <h2>Made for the<br /><em>middle of the table.</em></h2>
            </div>
            <p className="intro">Simple, seasonal ingredients.<br />Thoughtful plates worth sharing.</p>
          </div>

          {isEditing && !isAdmin && (
            <div className="editor">
              <p>Log in to manage the menu.</p>
              <form className="login-form" onSubmit={login}>
                <input
                  aria-label="Admin password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Admin password"
                  value={loginPassword}
                  required
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
                <button className="add-button" type="submit">Log in</button>
              </form>
            </div>
          )}

          {isEditing && isAdmin && (
            <div className="editor">
              <div className="editor-heading">
                <p>Menu editing is on. Changes are shared with all visitors.</p>
                <button className="cancel-button" type="button" onClick={logout}>Sign out</button>
              </div>
              <form onSubmit={saveItem}>
                <input aria-label="Dish name" placeholder="Dish name" value={form.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <select aria-label="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  {categories.slice(1).map((name) => <option key={name}>{name}</option>)}
                </select>
                <input aria-label="Price" type="number" min="0" step="0.01" placeholder="Price" value={form.price} required onChange={(event) => setForm({ ...form, price: event.target.value })} />
                <input aria-label="Description" placeholder="Description" value={form.description} required onChange={(event) => setForm({ ...form, description: event.target.value })} />
                <input aria-label="Image URL" type="url" placeholder="Photo URL (optional)" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} />
                <button className="add-button" type="submit">{editingId ? 'Save changes' : 'Add dish'}</button>
                {editingId && <button className="cancel-button" type="button" onClick={() => { setEditingId(null); setForm(blankItem) }}>Cancel</button>}
              </form>
            </div>
          )}

          {error && <p className="api-error" role="alert">{error}</p>}

          <div className="filters" aria-label="Menu categories">
            {categories.map((name) => (
              <button className={category === name ? 'active' : ''} key={name} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>

          {isLoading
            ? <p className="empty" role="status">Loading menu...</p>
            : (
              <div className="menu-grid">
                {visibleItems.map((item) => (
                  <article className="dish" key={item.id}>
                    <div className="dish-image">
                      <img src={item.image || fallbackImage} alt={item.name} />
                      <span>{item.category}</span>
                    </div>
                    <div className="dish-info">
                      <div className="dish-title"><h3>{item.name}</h3><span>${Number(item.price).toFixed(2)}</span></div>
                      <p>{item.description}</p>
                      {isEditing && isAdmin && <div className="item-actions">
                        <button onClick={() => editItem(item)}>Edit</button>
                        <button onClick={() => removeItem(item.id)}>Remove</button>
                      </div>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          {!isLoading && visibleItems.length === 0 && <p className="empty">No dishes in this category yet.</p>}
        </section>

        <footer className="footer">
          <strong>olive <span>&</span> oak</strong>
          <span>Good food tastes better together.</span>
          <span>Open daily · 11:30 am — 9:00 pm</span>
        </footer>
      </main>
    </>
  )
}

export default App

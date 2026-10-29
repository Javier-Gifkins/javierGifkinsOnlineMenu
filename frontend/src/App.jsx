import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import './App.css'

const categories = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks']
const blankItem = { name: '', category: 'Starters', price: '', description: '', image: '' }
const fallbackImage = 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80'
const formFields = [
  { key: 'name', label: 'Dish name', type: 'text', placeholder: 'Dish name', required: true },
  { key: 'category', label: 'Category', type: 'select', options: categories.slice(1) },
  { key: 'price', label: 'Price', type: 'number', placeholder: 'Price', min: '0', step: '0.01', required: true },
  { key: 'description', label: 'Description', type: 'text', placeholder: 'Description', required: true },
  { key: 'image', label: 'Image URL', type: 'url', placeholder: 'Photo URL (optional)' },
]

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

function AppLayout({ children, isLoading, isEditing, isAdmin, setIsEditing, theme, toggleTheme }) {
  return (
    <div className={`app-shell ${theme}`}>
      <header className="header">
        <Link className="logo" to="/">olive <span>&</span> oak</Link>
        <Link className="nav-link" to="/">Our menu</Link>
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          className="manage-button"
          disabled={isLoading}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (isAdmin ? 'Done' : 'Close') : 'Manage menu'}
        </button>
      </header>

      <main id="top">{children}</main>

      <footer className="footer">
        <strong>olive <span>&</span> oak</strong>
        <span>Good food tastes better together.</span>
        <span>Open daily · 11:30 am - 9:00 pm</span>
      </footer>
    </div>
  )
}

function MenuPage({
  items,
  isLoading,
  isAdmin,
  isEditing,
  setIsEditing,
  error,
  loginPassword,
  setLoginPassword,
  form,
  setForm,
  editingId,
  setEditingId,
  category,
  setCategory,
  removeItem,
  editItem,
  saveItem,
  login,
  logout,
  theme,
  toggleTheme,
}) {
  const visibleItems = category === 'All' ? items : items.filter((item) => item.category === category)

  return (
    <AppLayout isLoading={isLoading} isEditing={isEditing} isAdmin={isAdmin} setIsEditing={setIsEditing} theme={theme} toggleTheme={toggleTheme}>
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker"><span /> YOUR NEIGHBORHOOD TABLE</p>
          <h1>Come hungry.<br /><em>Leave happy.</em></h1>
          <span>Seasonal plates, good company, and one more reason to stay a little longer.</span>
          <div className="hero-actions">
            <a className="hero-primary" href="#menu">Explore the menu</a>
            <span className="hero-note">Fresh ingredients · Made with care</span>
          </div>
        </div>

        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85"
            alt="Warmly lit dining room set for dinner"
          />
          <div className="hero-stamp">
            <span>GOOD FOOD</span>
            <strong>Since<br />always.</strong>
            <span>GOOD COMPANY</span>
          </div>
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
              {formFields.map(({ key, label, type, options, ...fieldProps }) => (
                type === 'select' ? (
                  <select
                    key={key}
                    aria-label={label}
                    value={form[key]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  >
                    {options.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    key={key}
                    aria-label={label}
                    type={type}
                    value={form[key]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    {...fieldProps}
                  />
                )
              ))}
              <button className="add-button" type="submit">{editingId ? 'Save changes' : 'Add dish'}</button>
              {editingId && (
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setForm(blankItem)
                  }}
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        )}

        {error && <p className="api-error" role="alert">{error}</p>}

        <div className="filters" aria-label="Menu categories">
          {categories.map((name) => (
            <button
              className={category === name ? 'active' : ''}
              key={name}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="empty" role="status">Loading menu...</p>
        ) : (
          <div className="menu-grid">
            {visibleItems.map((item) => (
              <Link className="dish dish-link" key={item.id} to={`/menu/${encodeURIComponent(item.id)}`}>
                <div className="dish-image">
                  <img src={item.image || fallbackImage} alt={item.name} />
                  <span>{item.category}</span>
                </div>
                <div className="dish-info">
                  <div className="dish-title">
                    <h3>{item.name}</h3>
                    <span>${Number(item.price).toFixed(2)}</span>
                  </div>
                  <p>{item.description}</p>
                  {isEditing && isAdmin && (
                    <div className="item-actions" onClick={(event) => event.preventDefault()}>
                      <button type="button" onClick={() => editItem(item)}>Edit</button>
                      <button type="button" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && visibleItems.length === 0 && <p className="empty">No dishes in this category yet.</p>}
      </section>
    </AppLayout>
  )
}

function MenuItemPage({ items, isAdmin, isEditing, setIsEditing, editItem, removeItem, theme, toggleTheme }) {
  const { id } = useParams()
  const item = items.find((entry) => entry.id === id)
  const [nutrition, setNutrition] = useState(null)
  const [nutritionLoading, setNutritionLoading] = useState(true)

  useEffect(() => {
    if (!item) return

    let isMounted = true
    fetch(`/api/menu/${encodeURIComponent(item.id)}/nutrition`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Nutrition request failed.')
        }
        return data
      })
      .then((data) => {
        if (!isMounted) return
        setNutrition(data.nutrition ?? {})
      })
      .catch(() => {
        if (isMounted) setNutrition({})
      })
      .finally(() => {
        if (isMounted) setNutritionLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [item])

  if (!item) {
    return (
      <AppLayout isLoading={false} isEditing={isEditing} isAdmin={isAdmin} setIsEditing={setIsEditing} theme={theme} toggleTheme={toggleTheme}>
        <section className="detail-page">
          <div className="detail-empty">
            <p>That dish is no longer on the menu.</p>
            <Link className="back-link" to="/">Back to menu</Link>
          </div>
        </section>
      </AppLayout>
    )
  }

  const nutritionRows = [
    { label: 'Calories', value: nutrition?.calories ?? '?', unit: 'kcal' },
    { label: 'Protein', value: nutrition?.protein ?? '?', unit: 'g' },
    { label: 'Carbs', value: nutrition?.carbs ?? '?', unit: 'g' },
    { label: 'Fat', value: nutrition?.fat ?? '?', unit: 'g' },
    { label: 'Fiber', value: nutrition?.fiber ?? '?', unit: 'g' },
    { label: 'Sugar', value: nutrition?.sugar ?? '?', unit: 'g' },
  ]

  return (
    <AppLayout isLoading={false} isEditing={isEditing} isAdmin={isAdmin} setIsEditing={setIsEditing} theme={theme} toggleTheme={toggleTheme}>
      <section className="detail-page">
        <div className="detail-topbar">
          <Link className="back-link" to="/">Back to menu</Link>
          <span className="detail-category">{item.category}</span>
        </div>

        <article className="detail-card">
          <div className="detail-image-wrap">
            <img src={item.image || fallbackImage} alt={item.name} className="detail-image" />
          </div>

          <div className="detail-content">
            <p className="eyebrow detail-eyebrow">Dish details</p>
            <h1>{item.name}</h1>
            <p className="detail-price">${Number(item.price).toFixed(2)}</p>
            <p className="detail-description">{item.description}</p>

            <div className="nutrition-panel">
              <div className="nutrition-header">
                <h2>Nutrition</h2>
                <span>{nutritionLoading ? 'Loading...' : 'Estimated'}</span>
              </div>

              <div className="nutrition-grid">
                {nutritionRows.map((row) => (
                  <div className="nutrition-card" key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value === '?' ? '?' : `${row.value}${row.unit}`}</strong>
                  </div>
                ))}
              </div>
            </div>

            {isEditing && isAdmin && (
              <div className="item-actions detail-actions">
                <button type="button" onClick={() => editItem(item)}>Edit</button>
                <button type="button" onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            )}
          </div>
        </article>
      </section>
    </AppLayout>
  )
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
  const [theme, setTheme] = useState(() => localStorage.getItem('menu-theme') || 'light')

  useEffect(() => {
    localStorage.setItem('menu-theme', theme)
  }, [theme])

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

    return () => {
      isMounted = false
    }
  }, [])

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

  function toggleTheme() {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={(
            <MenuPage
              items={items}
              isLoading={isLoading}
              isAdmin={isAdmin}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              error={error}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              form={form}
              setForm={setForm}
              editingId={editingId}
              setEditingId={setEditingId}
              category={category}
              setCategory={setCategory}
              removeItem={removeItem}
              editItem={editItem}
              saveItem={saveItem}
              login={login}
              logout={logout}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          )}
        />

        <Route
          path="/menu/:id"
          element={(
            <MenuItemPage
              items={items}
              isAdmin={isAdmin}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              editItem={editItem}
              removeItem={removeItem}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          )}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

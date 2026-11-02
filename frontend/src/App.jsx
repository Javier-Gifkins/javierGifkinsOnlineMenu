import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import './App.css'
import NutritionPieChart from './3dPieChart.jsx'

const categories = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks']
const commonAllergenLabels = ['Dairy', 'Gluten', 'Soy', 'Sesame', 'Nuts']
const allergenOptions = [...commonAllergenLabels]
const ingredientUnits = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pcs']
const blankIngredient = { name: '', quantity: '', unit: 'g' }
const blankItem = { name: '', category: 'Starters', price: '', description: '', image: '', ingredients: [blankIngredient], allergens: [] }

function normalizeIngredientItem(value) {
  if (!value || typeof value !== 'object') return null

  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const quantity = Number(value.quantity)
  const unit = typeof value.unit === 'string' ? value.unit.trim() || 'g' : 'g'

  if (!name || !Number.isFinite(quantity) || quantity <= 0) return null

  return {
    name,
    quantity,
    unit,
  }
}

function normalizeIngredients(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeIngredientItem(item))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        name: item,
        quantity: 1,
        unit: 'g',
      }))
  }

  return []
}

function formatIngredientSummary(ingredients) {
  return normalizeIngredients(ingredients)
    .map((ingredient) => `${ingredient.name} ${ingredient.quantity}${ingredient.unit}`)
    .join(', ')
}

function normalizeAllergen(allergen) {
  const value = typeof allergen === 'string' ? allergen.trim() : ''
  if (!value) return ''

  const key = value.toLowerCase()
  if (key === 'milk' || key === 'dairy') return 'Dairy'
  if (key === 'gluten') return 'Gluten'
  if (key === 'soy' || key === 'soya') return 'Soy'
  if (key === 'sesame') return 'Sesame'
  if (key === 'peanut' || key === 'peanuts' || key === 'tree nut' || key === 'tree nuts' || key === 'nut' || key === 'nuts') return 'Nuts'

  return value
}
const fallbackImage = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
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

function AppLayout({ children, isLoading, isEditing, isAdmin, setIsEditing, theme, toggleTheme, highContrast, toggleHighContrast }) {
  return (
    <div className={`app-shell ${theme} ${highContrast ? 'high-contrast' : ''}`}>
      <header className="header">
        <Link className="logo" to="/">olive <span>&</span> oak</Link>
        <Link className="nav-link" to="/">Our menu</Link>
        <div className="header-actions">
          <button
            className="switch-toggle theme-switch"
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
          </button>
          <button
            className="switch-toggle contrast-switch"
            type="button"
            aria-label={`Switch to ${highContrast ? 'normal' : 'high'} contrast`}
            aria-pressed={highContrast}
            onClick={toggleHighContrast}
          >
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">{highContrast ? 'High contrast' : 'Normal contrast'}</span>
          </button>
        </div>
        <button
          className="manage-button"
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
  highContrast,
  toggleHighContrast,
}) {
  const visibleItems = category === 'All' ? items : items.filter((item) => item.category === category)

  return (
    <AppLayout isLoading={isLoading} isEditing={isEditing} isAdmin={isAdmin} setIsEditing={setIsEditing} theme={theme} toggleTheme={toggleTheme} highContrast={highContrast} toggleHighContrast={toggleHighContrast}>
      {isEditing && !isAdmin && (
        <div className="editor admin-editor admin-editor-top">
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
        <div className="editor admin-editor admin-editor-top">
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

            <div className="ingredient-builder">
              <div className="ingredient-builder-header">
                <span>Ingredients with quantity</span>
                <button
                  type="button"
                  className="mini-button"
                  onClick={() => setForm((current) => ({
                    ...current,
                    ingredients: [...(current.ingredients || []), { ...blankIngredient }],
                  }))}
                >
                  + Add ingredient
                </button>
              </div>

              {(form.ingredients || []).map((ingredient, index) => (
                <div key={`ingredient-row-${index}`} className="ingredient-row">
                  <input
                    aria-label={`Ingredient name ${index + 1}`}
                    type="text"
                    value={ingredient.name || ''}
                    placeholder="Ingredient"
                    onChange={(event) => {
                      setForm((current) => {
                        const nextIngredients = [...(current.ingredients || [])]
                        nextIngredients[index] = { ...nextIngredients[index], name: event.target.value }
                        return { ...current, ingredients: nextIngredients }
                      })
                    }}
                  />
                  <input
                    aria-label={`Ingredient quantity ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={ingredient.quantity || ''}
                    placeholder="Qty"
                    onChange={(event) => {
                      setForm((current) => {
                        const nextIngredients = [...(current.ingredients || [])]
                        nextIngredients[index] = { ...nextIngredients[index], quantity: event.target.value }
                        return { ...current, ingredients: nextIngredients }
                      })
                    }}
                  />
                  <select
                    aria-label={`Ingredient unit ${index + 1}`}
                    value={ingredient.unit || 'g'}
                    onChange={(event) => {
                      setForm((current) => {
                        const nextIngredients = [...(current.ingredients || [])]
                        nextIngredients[index] = { ...nextIngredients[index], unit: event.target.value }
                        return { ...current, ingredients: nextIngredients }
                      })
                    }}
                  >
                    {ingredientUnits.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mini-button danger"
                    onClick={() => {
                      setForm((current) => {
                        const nextIngredients = (current.ingredients || []).filter((_, ingredientIndex) => ingredientIndex !== index)
                        return { ...current, ingredients: nextIngredients.length ? nextIngredients : [{ ...blankIngredient }] }
                      })
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="allergen-picker">
              <span>Allergens</span>
              <div className="allergen-options">
                {allergenOptions.map((allergen) => (
                  <label key={allergen} className="allergen-option">
                    <input
                      type="checkbox"
                      checked={Array.isArray(form.allergens) && form.allergens.includes(allergen)}
                      onChange={(event) => {
                        const nextAllergens = event.target.checked
                          ? [...(form.allergens || []), allergen]
                          : (form.allergens || []).filter((item) => item !== allergen)

                        setForm((current) => ({ ...current, allergens: nextAllergens }))
                      }}
                    />
                    <span>{allergen}</span>
                  </label>
                ))}
              </div>
            </div>

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
            {visibleItems.map((item) => {
              const itemAllergens = (Array.isArray(item.allergens) ? item.allergens : []).map(normalizeAllergen).filter(Boolean)
              const commonItemAllergens = itemAllergens.filter((allergen) => commonAllergenLabels.includes(allergen))
              const ingredientList = normalizeIngredients(item.ingredients)

              return (
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
                    {ingredientList.length > 0 && (
                      <div className="dish-ingredients">Ingredients: {formatIngredientSummary(ingredientList)}</div>
                    )}
                    {commonItemAllergens.length > 0 && (
                      <div className="dish-allergen-banner">
                        Contains allergens: {commonItemAllergens.join(', ')}
                      </div>
                    )}
                    {isEditing && isAdmin && (
                      <div className="item-actions" onClick={(event) => event.preventDefault()}>
                        <button type="button" onClick={() => editItem(item)}>Edit</button>
                        <button type="button" onClick={() => removeItem(item.id)}>Remove</button>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {!isLoading && visibleItems.length === 0 && <p className="empty">No dishes in this category yet.</p>}
      </section>
    </AppLayout>
  )
}

function MenuItemPage({ items, isAdmin, isEditing, setIsEditing, editItem, removeItem, theme, toggleTheme, highContrast, toggleHighContrast }) {
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
      <AppLayout isLoading={false} isEditing={isEditing} isAdmin={isAdmin} setIsEditing={setIsEditing} theme={theme} toggleTheme={toggleTheme} highContrast={highContrast} toggleHighContrast={toggleHighContrast}>
        <section className="detail-page">
          <div className="detail-empty">
            <p>That dish is no longer on the menu.</p>
            <Link className="back-link" to="/">Back to menu</Link>
          </div>
        </section>
      </AppLayout>
    )
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '?') return '?'
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return '?'
    return Number(numericValue.toFixed(2))
  }

  const nutritionRows = [
    { label: 'Calories', value: formatValue(nutrition?.calories), unit: 'kcal' },
    { label: 'Protein', value: formatValue(nutrition?.protein), unit: 'g' },
    { label: 'Carbs', value: formatValue(nutrition?.carbs), unit: 'g' },
    { label: 'Fat', value: formatValue(nutrition?.fat), unit: 'g' },
    { label: 'Fiber', value: formatValue(nutrition?.fiber), unit: 'g' },
    { label: 'Sugar', value: formatValue(nutrition?.sugar), unit: 'g' },
  ]

  const allergens = (Array.isArray(item.allergens) ? item.allergens : []).map(normalizeAllergen).filter(Boolean)
  const commonAllergens = allergens.filter((allergen) => commonAllergenLabels.includes(allergen))
  const ingredientList = normalizeIngredients(item.ingredients)
  const nutritionChartData = Object.entries(nutrition ?? {})
    .filter(([key, value]) => ['protein', 'carbs', 'fat', 'fiber', 'sugar'].includes(key) && Number(value) > 0)
    .map(([key, value]) => ({
      x: key.charAt(0).toUpperCase() + key.slice(1),
      y: Number(Number(value).toFixed(2)),
    }))

  return (
    <AppLayout isLoading={false} isEditing={isEditing} isAdmin={isAdmin} setIsEditing={setIsEditing} theme={theme} toggleTheme={toggleTheme} highContrast={highContrast} toggleHighContrast={toggleHighContrast}>
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

            {ingredientList.length > 0 && (
              <div className="ingredient-panel">
                <h3>Ingredients</h3>
                <div className="ingredient-list">
                  {ingredientList.map((ingredient) => (
                    <span key={`${ingredient.name}-${ingredient.quantity}-${ingredient.unit}`} className="ingredient-pill">
                      {ingredient.name} · {ingredient.quantity}{ingredient.unit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="allergen-panel">
              <h3>Allergens</h3>
              {commonAllergens.length > 0 && (
                <div className="allergen-warning">
                  This dish contains common allergens: {commonAllergens.join(', ')}.
                </div>
              )}
              <div className="allergen-list">
                {allergens.length > 0 ? allergens.map((allergen) => (
                  <span key={allergen} className="allergen-pill">{allergen}</span>
                )) : <span className="allergen-empty">No major allergens flagged.</span>}
              </div>
            </div>

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

              {!nutritionLoading && nutritionChartData.length > 0 && (
                <div className="nutrition-chart-panel">
                  <NutritionPieChart data={nutritionChartData} title={`${item.name} macro split`} />
                </div>
              )}
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
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('menu-high-contrast') === 'true')

  useEffect(() => {
    localStorage.setItem('menu-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('menu-high-contrast', String(highContrast))
  }, [highContrast])

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
    setForm({
      ...item,
      price: String(item.price),
      ingredients: normalizeIngredients(item.ingredients).length
        ? normalizeIngredients(item.ingredients)
        : [{ ...blankIngredient }],
      allergens: Array.isArray(item.allergens)
        ? item.allergens.map(normalizeAllergen).filter(Boolean)
        : [],
    })
  }

  async function saveItem(event) {
    event.preventDefault()
    setError('')
    const item = {
      ...form,
      price: Number(form.price),
      ingredients: normalizeIngredients(form.ingredients),
      allergens: Array.isArray(form.allergens) ? form.allergens : [],
    }

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

  function toggleHighContrast() {
    setHighContrast((current) => !current)
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
              highContrast={highContrast}
              toggleHighContrast={toggleHighContrast}
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
              highContrast={highContrast}
              toggleHighContrast={toggleHighContrast}
            />
          )}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

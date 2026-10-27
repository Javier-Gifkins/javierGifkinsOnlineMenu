import { useEffect, useState } from 'react'
import './App.css'

const initialItems = [
  { id: 1, name: 'Burrata & tomatoes', category: 'Starters', price: 16, description: 'Creamy burrata, ripe tomatoes, basil oil, grilled sourdough.', image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80' },
  { id: 2, name: 'Roasted carrots', category: 'Starters', price: 13, description: 'Honey-roasted carrots, whipped feta, dukkah, orange zest.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80' },
  { id: 3, name: 'Brown butter gnocchi', category: 'Mains', price: 24, description: 'Potato gnocchi, sage brown butter, toasted hazelnuts, parmesan.', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80' },
  { id: 4, name: 'Crispy-skin salmon', category: 'Mains', price: 29, description: 'Pan-seared salmon, crushed potatoes, greens, lemon caper butter.', image: 'https://images.unsplash.com/photo-1466220838312-3e9b9c9b9b81?auto=format&fit=crop&w=800&q=80' },
  { id: 5, name: 'Warm apple tart', category: 'Desserts', price: 12, description: 'Buttery pastry, orchard apples, vanilla ice cream, salted caramel.', image: 'https://images.unsplash.com/photo-1621743478914-cc8a86d7e7b5?auto=format&fit=crop&w=800&q=80' },
  { id: 6, name: 'Garden lemonade', category: 'Drinks', price: 7, description: 'Fresh lemon, rosemary syrup, sparkling water.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=800&q=80' },
]

const categories = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks']
const blankItem = { name: '', category: 'Starters', price: '', description: '', image: '' }

function App() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('menu-items')) || initialItems
    } catch (error) {
      console.error('Could not read the saved menu.', error)
      return initialItems
    }
  })
  const [isEditing, setIsEditing] = useState(false)
  const [category, setCategory] = useState('All')
  const [form, setForm] = useState(blankItem)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem('menu-items', JSON.stringify(items))
    } catch (error) {
      console.error('Could not save the menu in this browser.', error)
    }
  }, [items])

  const visibleItems = category === 'All'
    ? items
    : items.filter((item) => item.category === category)

  function editItem(item) {
    setEditingId(item.id)
    setForm({ ...item, price: String(item.price) })
  }

  function saveItem(event) {
    event.preventDefault()
    const item = { ...form, id: editingId ?? Date.now(), price: Number(form.price) }
    setItems((current) => editingId
      ? current.map((existing) => existing.id === editingId ? item : existing)
      : [...current, item])
    setForm(blankItem)
    setEditingId(null)
  }

  return (
    <>
      <header className="header">
        <a className="logo" href="#top">olive <span>&</span> oak</a>
        <a className="nav-link" href="#menu">Our menu</a>
        <button className="manage-button" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Done' : 'Manage menu'}
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

          {isEditing && (
            <div className="editor">
              <p>Menu editing is on. Changes are saved in this browser.</p>
              <form onSubmit={saveItem}>
                <input aria-label="Dish name" placeholder="Dish name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <select aria-label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.slice(1).map((name) => <option key={name}>{name}</option>)}
                </select>
                <input aria-label="Price" type="number" min="0" step="0.01" placeholder="Price" value={form.price} required onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <input aria-label="Description" placeholder="Description" value={form.description} required onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <input aria-label="Image URL" type="url" placeholder="Photo URL (optional)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                <button className="add-button" type="submit">{editingId ? 'Save changes' : 'Add dish'}</button>
                {editingId && <button className="cancel-button" type="button" onClick={() => { setEditingId(null); setForm(blankItem) }}>Cancel</button>}
              </form>
            </div>
          )}

          <div className="filters" aria-label="Menu categories">
            {categories.map((name) => (
              <button className={category === name ? 'active' : ''} key={name} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>

          <div className="menu-grid">
            {visibleItems.map((item) => (
              <article className="dish" key={item.id}>
                <div className="dish-image">
                  <img src={item.image || initialItems[0].image} alt={item.name} />
                  <span>{item.category}</span>
                </div>
                <div className="dish-info">
                  <div className="dish-title"><h3>{item.name}</h3><span>${Number(item.price).toFixed(2)}</span></div>
                  <p>{item.description}</p>
                  {isEditing && <div className="item-actions">
                    <button onClick={() => editItem(item)}>Edit</button>
                    <button onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>Remove</button>
                  </div>}
                </div>
              </article>
            ))}
          </div>
          {visibleItems.length === 0 && <p className="empty">No dishes in this category yet.</p>}
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

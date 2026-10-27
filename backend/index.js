import 'dotenv/config'
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto'
import express from 'express'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { rateLimit } from 'express-rate-limit'
import { MongoClient } from 'mongodb'

const categories = new Set(['Starters', 'Mains', 'Desserts', 'Drinks'])
const defaultMenu = [
  { name: 'Burrata & tomatoes', category: 'Starters', price: 16, description: 'Creamy burrata, ripe tomatoes, basil oil, grilled sourdough.', image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80' },
  { name: 'Roasted carrots', category: 'Starters', price: 13, description: 'Honey-roasted carrots, whipped feta, dukkah, orange zest.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80' },
  { name: 'Brown butter gnocchi', category: 'Mains', price: 24, description: 'Potato gnocchi, sage brown butter, toasted hazelnuts, parmesan.', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80' },
  { name: 'Crispy-skin salmon', category: 'Mains', price: 29, description: 'Pan-seared salmon, crushed potatoes, greens, lemon caper butter.', image: 'https://images.unsplash.com/photo-1466220838312-3e9b9c9b9b81?auto=format&fit=crop&w=800&q=80' },
  { name: 'Warm apple tart', category: 'Desserts', price: 12, description: 'Buttery pastry, orchard apples, vanilla ice cream, salted caramel.', image: 'https://images.unsplash.com/photo-1621743478914-cc8a86d7e7b5?auto=format&fit=crop&w=800&q=80' },
  { name: 'Garden lemonade', category: 'Drinks', price: 7, description: 'Fresh lemon, rosemary syrup, sparkling water.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=800&q=80' },
]

function requiredSetting(name, minimumLength = 1) {
  const value = process.env[name]
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} must be configured with at least ${minimumLength} characters.`)
  }
  return value
}

function validateMenuItem(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A menu item object is required.' }
  }

  const { name, category, price, description, image = '' } = body
  const numericPrice = typeof price === 'number' || (typeof price === 'string' && price.trim())
    ? Number(price)
    : Number.NaN
  if (typeof name !== 'string' || !name.trim()) return { error: 'A dish name is required.' }
  if (!categories.has(category)) return { error: 'Choose a valid menu category.' }
  if (!Number.isFinite(numericPrice) || numericPrice < 0) return { error: 'Price must be a non-negative number.' }
  if (typeof description !== 'string' || !description.trim()) return { error: 'A description is required.' }
  if (typeof image !== 'string') return { error: 'Image must be a URL string.' }

  return {
    item: {
      name: name.trim(),
      category,
      price: numericPrice,
      description: description.trim(),
      image: image.trim(),
    },
  }
}

const mongoUri = requiredSetting('MONGODB_URI')
const adminPassword = requiredSetting('ADMIN_PASSWORD', 12)
const sessionSecret = requiredSetting('SESSION_SECRET', 32)
const port = Number(process.env.PORT) || 3001
const client = new MongoClient(mongoUri)
const app = express()

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

await client.connect()
const database = client.db(process.env.MONGODB_DATABASE || 'online_menu')
const menuItems = database.collection('menu_items')
const appSettings = database.collection('app_settings')
const seedMarker = await appSettings.findOne({ _id: 'default-menu-v1' })
if (!seedMarker) {
  if (await menuItems.countDocuments() === 0) {
    await menuItems.insertMany(defaultMenu.map((item) => ({ id: randomUUID(), ...item })))
  }
  await appSettings.insertOne({ _id: 'default-menu-v1', completedAt: new Date() })
}

app.use(express.json({ limit: '100kb' }))
app.use(session({
  name: 'menu_admin',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    client,
    collectionName: 'admin_sessions',
    ttl: 60 * 60 * 24,
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24,
  },
}))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
})

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next()
  return res.status(401).json({ error: 'Log in to manage the menu.' })
}

app.get('/api/auth/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session.isAdmin) })
})

app.post('/api/auth/login', loginLimiter, (req, res, next) => {
  const suppliedPassword = typeof req.body?.password === 'string' ? req.body.password : ''
  const suppliedHash = createHash('sha256').update(suppliedPassword).digest()
  const expectedHash = createHash('sha256').update(adminPassword).digest()
  if (!timingSafeEqual(suppliedHash, expectedHash)) {
    return res.status(401).json({ error: 'Incorrect password.' })
  }

  req.session.regenerate((error) => {
    if (error) return next(error)
    req.session.isAdmin = true
    req.session.save((saveError) => {
      if (saveError) return next(saveError)
      return res.json({ authenticated: true })
    })
  })
})

app.post('/api/auth/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error)
    res.clearCookie('menu_admin', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    return res.json({ authenticated: false })
  })
})

app.get('/api/menu', async (req, res) => {
  res.json(await menuItems.find({}, { projection: { _id: 0 } }).toArray())
})

app.post('/api/menu', requireAdmin, async (req, res) => {
  const result = validateMenuItem(req.body)
  if (result.error) return res.status(400).json({ error: result.error })

  const item = { id: randomUUID(), ...result.item }
  await menuItems.insertOne(item)
  return res.status(201).json(item)
})

app.put('/api/menu/:id', requireAdmin, async (req, res) => {
  const result = validateMenuItem(req.body)
  if (result.error) return res.status(400).json({ error: result.error })

  const update = await menuItems.updateOne({ id: req.params.id }, { $set: result.item })
  if (!update.matchedCount) return res.status(404).json({ error: 'Menu item not found.' })

  return res.json({ id: req.params.id, ...result.item })
})

app.delete('/api/menu/:id', requireAdmin, async (req, res) => {
  const result = await menuItems.deleteOne({ id: req.params.id })
  if (!result.deletedCount) return res.status(404).json({ error: 'Menu item not found.' })
  return res.status(204).end()
})

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' })
})

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' })
  }

  console.error('API request failed:', error)
  return res.status(500).json({ error: 'An unexpected server error occurred.' })
})

app.listen(port, () => {
  console.log(`Menu API listening on http://localhost:${port}`)
})

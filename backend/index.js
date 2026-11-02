import 'dotenv/config'
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto'
import express from 'express'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { rateLimit } from 'express-rate-limit'
import { MongoClient } from 'mongodb'

const categories = new Set(['Starters', 'Mains', 'Desserts', 'Drinks'])
const allergenLabels = ['Dairy', 'Gluten', 'Soy', 'Sesame', 'Nuts', 'Eggs', 'Shellfish', 'Fish']
const allergenAliases = {
  dairy: 'Dairy',
  milk: 'Dairy',
  gluten: 'Gluten',
  soy: 'Soy',
  soya: 'Soy',
  sesame: 'Sesame',
  nuts: 'Nuts',
  peanut: 'Nuts',
  peanuts: 'Nuts',
  'tree nut': 'Nuts',
  'tree nuts': 'Nuts',
}

const defaultMenu = [
  { name: 'Burrata & tomatoes', category: 'Starters', price: 16, description: 'Creamy burrata, ripe tomatoes, basil oil, grilled sourdough.', image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80', allergens: ['Dairy', 'Gluten'] },
  { name: 'Roasted carrots', category: 'Starters', price: 13, description: 'Honey-roasted carrots, whipped feta, dukkah, orange zest.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', allergens: ['Dairy', 'Sesame'] },
  { name: 'Brown butter gnocchi', category: 'Mains', price: 24, description: 'Potato gnocchi, sage brown butter, toasted hazelnuts, parmesan.', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80', allergens: ['Gluten', 'Dairy', 'Nuts'] },
  { name: 'Crispy-skin salmon', category: 'Mains', price: 29, description: 'Pan-seared salmon, crushed potatoes, greens, lemon caper butter.', image: 'https://images.unsplash.com/photo-1466220838312-3e9b9c9b9b81?auto=format&fit=crop&w=800&q=80', allergens: [] },
  { name: 'Warm apple tart', category: 'Desserts', price: 12, description: 'Buttery pastry, orchard apples, vanilla ice cream, salted caramel.', image: 'https://images.unsplash.com/photo-1621743478914-cc8a86d7e7b5?auto=format&fit=crop&w=800&q=80', allergens: ['Gluten', 'Dairy'] },
  { name: 'Garden lemonade', category: 'Drinks', price: 7, description: 'Fresh lemon, rosemary syrup, sparkling water.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=800&q=80', allergens: [] },
]

function requiredSetting(name, minimumLength = 1) {
  const value = process.env[name]
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} must be configured with at least ${minimumLength} characters.`)
  }
  return value
}

function normalizeAllergenLabel(value) {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed) return ''

  const directMatch = allergenAliases[trimmed.toLowerCase()]
  if (directMatch) return directMatch

  const normalized = trimmed.toLowerCase()
  if (normalized === 'milk' || normalized === 'dairy') return 'Dairy'
  if (normalized === 'gluten') return 'Gluten'
  if (normalized === 'soy' || normalized === 'soya') return 'Soy'
  if (normalized === 'sesame') return 'Sesame'
  if (normalized === 'peanut' || normalized === 'peanuts' || normalized === 'tree nut' || normalized === 'tree nuts' || normalized === 'nut' || normalized === 'nuts') return 'Nuts'

  return trimmed
}

function normalizeIngredientEntry(value) {
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

function validateMenuItem(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A menu item object is required.' }
  }

  const { name, category, price, description, image = '', ingredients: itemIngredients = [], allergens: itemAllergens = [] } = body
  const numericPrice = typeof price === 'number' || (typeof price === 'string' && price.trim())
    ? Number(price)
    : Number.NaN
  const sanitizedIngredients = Array.isArray(itemIngredients)
    ? itemIngredients
      .map(normalizeIngredientEntry)
      .filter(Boolean)
    : typeof itemIngredients === 'string'
      ? itemIngredients
        .split(',')
        .map((ingredient) => ingredient.trim())
        .filter(Boolean)
        .map((ingredient) => ({ name: ingredient, quantity: 1, unit: 'g' }))
      : []
  const sanitizedAllergens = Array.isArray(itemAllergens)
    ? [...new Set(itemAllergens
      .map(normalizeAllergenLabel)
      .filter((allergen) => allergen && allergenLabels.includes(allergen)))]
    : []

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
      ingredients: sanitizedIngredients,
      allergens: sanitizedAllergens,
    },
  }
}

const mongoUri = requiredSetting('MONGODB_URI')
const adminPassword = requiredSetting('ADMIN_PASSWORD', 12)
const sessionSecret = requiredSetting('SESSION_SECRET', 32)
const port = Number(process.env.PORT) || 3001
const fdcApiKey = process.env.FDC_API_KEY || ''
const fdcBaseUrl = process.env.FDC_BASE_URL || 'https://api.nal.usda.gov/fdc/v1'
const client = new MongoClient(mongoUri)
const app = express()

const nutritionKeyMap = {
  Energy: 'calories',
  Protein: 'protein',
  'Total lipid (fat)': 'fat',
  'Carbohydrate, by difference': 'carbs',
  'Fiber, total dietary': 'fiber',
  'Sugars, total including NLEA': 'sugar',
}

function estimateNutrition(itemName = '') {
  const name = String(itemName).toLowerCase()

  if (name.includes('salmon')) return { calories: 420, protein: 34, carbs: 12, fat: 19, fiber: 2, sugar: 3 }
  if (name.includes('gnocchi') || name.includes('pasta')) return { calories: 560, protein: 18, carbs: 66, fat: 23, fiber: 5, sugar: 8 }
  if (name.includes('carrot')) return { calories: 190, protein: 7, carbs: 28, fat: 8, fiber: 6, sugar: 11 }
  if (name.includes('burrata') || name.includes('tomato') || name.includes('pizza')) return { calories: 460, protein: 17, carbs: 42, fat: 21, fiber: 5, sugar: 9 }
  if (name.includes('apple') || name.includes('tart')) return { calories: 340, protein: 5, carbs: 47, fat: 14, fiber: 4, sugar: 28 }
  if (name.includes('lemon') || name.includes('drink') || name.includes('lemonade')) return { calories: 120, protein: 1, carbs: 29, fat: 0, fiber: 1, sugar: 24 }

  return { calories: 320, protein: 16, carbs: 27, fat: 14, fiber: 4, sugar: 7 }
}

function normalizeNutrition(food) {
  if (!food?.foodNutrients) return {}

  const nutrients = {}
  for (const entry of food.foodNutrients) {
    const nutrientName = entry?.nutrientName ?? entry?.nutrient?.name ?? ''
    const key = nutritionKeyMap[nutrientName] ?? nutritionKeyMap[nutrientName.trim()]
    if (!key) continue

    const value = Number(entry?.value ?? entry?.amount)
    if (Number.isFinite(value)) nutrients[key] = value
  }

  return nutrients
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`FDC API error (${response.status}): ${body.slice(0, 200)}`)
  }

  return body ? JSON.parse(body) : null
}

function unitToGrams(unit, quantity) {
  const normalizedUnit = String(unit || 'g').trim().toLowerCase()
  const conversionMap = {
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    kgs: 1000,
    kilogram: 1000,
    kilograms: 1000,
    ml: 1,
    milliliter: 1,
    milliliters: 1,
    l: 1000,
    liter: 1000,
    litre: 1000,
    liters: 1000,
    litres: 1000,
    tsp: 5,
    teaspoon: 5,
    teaspoons: 5,
    tbsp: 15,
    tablespoon: 15,
    tablespoons: 15,
    cup: 240,
    cups: 240,
    oz: 28.35,
    ounce: 28.35,
    ounces: 28.35,
    lb: 453.6,
    lbs: 453.6,
    pcs: 50,
    pc: 50,
    piece: 50,
    pieces: 50,
  }

  const multiplier = conversionMap[normalizedUnit] ?? 1
  return Number(quantity) * multiplier
}

function scaleNutritionByWeight(nutrition, quantity, unit) {
  if (!nutrition || typeof nutrition !== 'object') return {}

  const grams = unitToGrams(unit, quantity)
  if (!Number.isFinite(grams) || grams <= 0) return nutrition

  const scaleFactor = grams / 100
  const scaled = {}
  for (const [key, value] of Object.entries(nutrition)) {
    const numberValue = Number(value)
    if (Number.isFinite(numberValue)) scaled[key] = numberValue * scaleFactor
  }

  return scaled
}

async function lookupNutritionByName(itemName) {
  const fallback = { itemName, match: null, nutrition: estimateNutrition(itemName) }

  if (!fdcApiKey) {
    return fallback
  }

  const searchUrl = `${fdcBaseUrl}/foods/search?query=${encodeURIComponent(itemName)}&pageSize=1`
  const searchResult = await fetchJson(searchUrl, { 'x-api-key': fdcApiKey })
  const food = searchResult?.foods?.[0]

  if (!food) {
    return fallback
  }

  const foodDetails = await fetchJson(`${fdcBaseUrl}/food/${food.fdcId}`, { 'x-api-key': fdcApiKey })
  const nutrition = normalizeNutrition(foodDetails)

  if (Object.keys(nutrition).length > 0) {
    return {
      itemName,
      match: foodDetails?.description || food?.description || null,
      nutrition,
    }
  }

  return {
    itemName,
    match: foodDetails?.description || food?.description || null,
    nutrition: estimateNutrition(itemName),
  }
}

async function lookupMenuItemNutrition(item) {
  if (Array.isArray(item?.ingredients) && item.ingredients.length > 0) {
    const totals = {}

    for (const ingredient of item.ingredients) {
      const ingredientName = typeof ingredient?.name === 'string' ? ingredient.name.trim() : ''
      const ingredientQuantity = Number(ingredient?.quantity)
      const ingredientUnit = typeof ingredient?.unit === 'string' ? ingredient.unit : 'g'

      if (!ingredientName || !Number.isFinite(ingredientQuantity) || ingredientQuantity <= 0) continue

      const ingredientData = await lookupNutritionByName(ingredientName)
      const ingredientNutrition = ingredientData?.nutrition ?? estimateNutrition(ingredientName)
      const scaledNutrition = scaleNutritionByWeight(ingredientNutrition, ingredientQuantity, ingredientUnit)

      for (const [key, value] of Object.entries(scaledNutrition)) {
        totals[key] = (totals[key] ?? 0) + Number(value)
      }
    }

    if (Object.keys(totals).length > 0) {
      return {
        itemName: item.name,
        match: item.name,
        nutrition: totals,
      }
    }
  }

  return lookupNutritionByName(item?.name || '')
}

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

app.get('/api/nutrition', async (req, res) => {
  const itemName = typeof req.query.name === 'string' ? req.query.name.trim() : ''
  if (!itemName) {
    return res.status(400).json({ error: 'A food name is required. Example: /api/nutrition?name=salmon' })
  }

  try {
    const nutrition = await lookupNutritionByName(itemName)
    return res.json(nutrition)
  } catch (error) {
    return res.status(502).json({ error: 'Could not load nutrition data from FoodData Central.', details: error.message })
  }
})

app.get('/api/menu/:id/nutrition', async (req, res) => {
  const item = await menuItems.findOne({ id: req.params.id }, { projection: { _id: 0 } })
  if (!item) return res.status(404).json({ error: 'Menu item not found.' })

  try {
    const nutrition = await lookupMenuItemNutrition(item)
    return res.json({ ...nutrition, menuItem: item })
  } catch (error) {
    return res.status(502).json({ error: 'Could not load nutrition data from FoodData Central.', details: error.message })
  }
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

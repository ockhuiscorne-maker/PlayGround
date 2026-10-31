/* Browser port of life_simulator.py. Same rules, same balance, DOM instead of print(). */

const CONFIG = {
  startAge: 18,
  startMoney: 1000,
  startHealth: 100,
  startHappiness: 100,
  universityCost: 800,
  maxAge: 80,
  income: {
    'College Student': 1500,
    'Retail Worker': 24000,
    'Software Engineer': 75000
  }
}

const EVENTS = [
  { text: 'Found $50 on the street!', effects: { money: 50, happiness: 5 }, weight: 2 },
  { text: 'Got the flu and had to pay for medicine.', effects: { health: -15, money: -100, happiness: -10 }, weight: 1 },
  { text: 'Hung out with close friends and had an amazing time.', effects: { happiness: 15 }, weight: 3 },
  { text: 'Your phone screen cracked and needed fixing.', effects: { money: -150, happiness: -10 }, weight: 2 },
  { text: 'Won a small local gaming tournament!', effects: { money: 200, happiness: 20 }, weight: 2 }
]

const CREATOR_YEARS = [
  { amount: 2000, weight: 4 },
  { amount: 15000, weight: 5 },
  { amount: 80000, weight: 1 }
]

const CAREER_LABELS = {
  college: 'College Student',
  retail: 'Retail Worker',
  creator: 'Content Creator'
}

const CAREER_INTROS = {
  college: 'You enrolled at university. Four lean years, then the payoff.',
  retail: 'You started in retail. Steady work, steady pay.',
  creator: 'You bought a webcam and started streaming. Fingers crossed.'
}

const moneyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
})

const $ = id => document.getElementById(id)

const ui = {
  app: $('app'),
  setup: $('setup-view'),
  play: $('play-view'),
  name: $('name-input'),
  log: $('log'),
  next: $('next-year'),
  chipAge: $('chip-age'),
  chipCareer: $('chip-career'),
  money: $('stat-money'),
  healthValue: $('health-value'),
  happinessValue: $('happiness-value'),
  healthFill: $('health-fill'),
  happinessFill: $('happiness-fill'),
  factAge: $('fact-age'),
  factCareer: $('fact-career'),
  factYears: $('fact-years'),
  status: $('status-pill'),
  turnEyebrow: $('turn-eyebrow'),
  ending: $('ending'),
  endingEyebrow: $('ending-eyebrow'),
  endingTitle: $('ending-title'),
  endingBody: $('ending-body'),
  endingAge: $('ending-age'),
  endingCareer: $('ending-career'),
  endingMoney: $('ending-money'),
  restart: $('restart')
}

let state = createState()
let busy = false

function createState () {
  return {
    name: 'Sam',
    age: CONFIG.startAge,
    health: CONFIG.startHealth,
    happiness: CONFIG.startHappiness,
    money: CONFIG.startMoney,
    career: 'Unemployed',
    alive: true,
    years: 0,
    log: []
  }
}

function clamp (value) {
  return Math.max(0, Math.min(100, value))
}

function pickWeighted (items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

function addLog (entry) {
  state.log.unshift(entry)
}

/* ---------- game rules ---------- */

function chooseCareer (key) {
  const name = ui.name.value.trim() || 'Sam'
  state = createState()
  state.name = name.slice(0, 24)

  if (key === 'college') {
    if (state.money >= CONFIG.universityCost) {
      state.money -= CONFIG.universityCost
      state.career = CAREER_LABELS.college
    } else {
      state.career = CAREER_LABELS.retail
      addLog({ age: state.age, kind: 'bad', text: 'Tuition was out of reach, so you took a retail job instead.' })
    }
  } else {
    state.career = CAREER_LABELS[key]
  }

  addLog({
    age: state.age,
    kind: key === 'college' ? 'milestone' : 'good',
    text: CAREER_INTROS[key] || 'A new chapter begins.'
  })

  ui.setup.hidden = true
  ui.play.hidden = false
  ui.ending.hidden = true
  render()
  ui.next.focus()
}

function runYear () {
  if (busy || !state.alive) return
  busy = true
  ui.next.disabled = true
  ui.next.setAttribute('aria-busy', 'true')

  state.age += 1
  state.years += 1

  updateFinances()

  const event = pickWeighted(EVENTS)
  for (const [key, value] of Object.entries(event.effects)) {
    if (key === 'money') state.money += value
    if (key === 'health') state.health += value
    if (key === 'happiness') state.happiness += value
  }
  addLog({
    age: state.age,
    kind: event.effects.money < 0 || event.effects.health < 0 || event.effects.happiness < 0 ? 'bad' : 'good',
    text: event.text,
    deltas: event.effects
  })

  applyAging()

  if (state.money < 0) {
    state.happiness -= 10
    addLog({ age: state.age, kind: 'bad', text: 'You are in debt. Your happiness takes a hit.', deltas: { happiness: -10 } })
  }

  state.health = clamp(state.health)
  state.happiness = clamp(state.happiness)

  if (state.age < CONFIG.maxAge && (state.health <= 0 || state.happiness <= 0)) {
    state.alive = false
  }

  render()

  window.setTimeout(() => {
    busy = false
    ui.next.removeAttribute('aria-busy')
    ui.next.disabled = !state.alive
    if (!state.alive || state.age >= CONFIG.maxAge) showEnding()
  }, 320)
}

function updateFinances () {
  if (state.career === 'Content Creator') {
    const year = pickWeighted(CREATOR_YEARS)
    state.money += year.amount
    addLog({
      age: state.age,
      kind: year.amount >= 40000 ? 'milestone' : 'good',
      text: `Your channel earned ${moneyFormat.format(year.amount)} this year.`,
      deltas: { money: year.amount }
    })
  } else {
    state.money += CONFIG.income[state.career] || 0
  }

  if (state.career === CAREER_LABELS.college && state.age >= 22) {
    state.career = 'Software Engineer'
    addLog({ age: state.age, kind: 'milestone', text: 'You graduated! You are now a Software Engineer.' })
  }
}

function applyAging () {
  if (state.age >= 70) state.health -= 3
  else if (state.age >= 55) state.health -= 2
  else if (state.age >= 35) state.health -= 1

  if (state.age >= 40) state.happiness -= 1

  if (state.money > 10000) {
    state.happiness += 2
    state.health += 2
  } else if (state.money > 3000) {
    state.health += 1
  }
}

/* ---------- rendering ---------- */

function render () {
  const alive = state.alive
  const money = moneyFormat.format(state.money)

  ui.chipAge.textContent = `Age ${state.age}`
  ui.chipCareer.textContent = state.career === 'Unemployed' ? 'Undecided' : state.career
  ui.money.textContent = money
  ui.money.classList.toggle('negative', state.money < 0)

  setMeter(ui.healthFill, ui.healthValue, state.health)
  setMeter(ui.happinessFill, ui.happinessValue, state.happiness)

  ui.factAge.textContent = String(state.age)
  ui.factCareer.textContent = state.career === 'Unemployed' ? 'Undecided' : state.career
  ui.factYears.textContent = String(state.years)

  ui.turnEyebrow.textContent = state.years === 0 ? 'Year 1' : `Year ${state.years + 1}`
  ui.next.disabled = busy || !alive

  ui.status.textContent = !alive ? 'Game over' : state.years === 0 ? 'Ready' : 'In progress'
  ui.status.classList.toggle('over', !alive)

  renderLog()
}

function setMeter (fill, label, value) {
  const percent = clamp(value)
  fill.style.width = `${percent}%`
  fill.classList.toggle('warn', percent <= 35 && percent > 15)
  fill.classList.toggle('danger', percent <= 15)
  label.textContent = `${Math.round(percent)}%`
}

function renderLog () {
  ui.log.replaceChildren()

  if (!state.log.length) {
    const empty = document.createElement('li')
    empty.className = 'log-empty'
    empty.textContent = 'No years lived yet. Your story starts with the first year.'
    ui.log.append(empty)
    return
  }

  const fragment = document.createDocumentFragment()
  for (const entry of state.log) {
    const item = document.createElement('li')
    item.className = `entry ${entry.kind || ''}`.trim()

    const year = document.createElement('span')
    year.className = 'entry-year'
    year.textContent = `Age ${entry.age}`

    const body = document.createElement('div')
    const text = document.createElement('p')
    text.className = 'entry-text'
    text.textContent = entry.text
    body.append(text)

    if (entry.deltas) {
      const deltas = document.createElement('div')
      deltas.className = 'entry-deltas'
      for (const [key, value] of Object.entries(entry.deltas)) {
        if (!value) continue
        const chip = document.createElement('span')
        chip.className = `delta ${value > 0 ? 'up' : 'down'}`
        const label = key === 'money' ? moneyFormat.format(Math.abs(value)) : Math.abs(value)
        chip.textContent = `${value > 0 ? '+' : '-'}${label} ${key}`
        deltas.append(chip)
      }
      body.append(deltas)
    }

    item.append(year, body)
    fragment.append(item)
  }
  ui.log.append(fragment)
}

function showEnding () {
  const fullLife = state.age >= CONFIG.maxAge
  ui.endingEyebrow.textContent = fullLife ? 'A full life' : 'The end'
  ui.endingTitle.textContent = fullLife ? 'You made it to 80.' : 'Your story ended early.'
  ui.endingBody.textContent = fullLife
    ? `${state.name} retired after ${state.years} years of choices. Health ${Math.round(state.health)}%, happiness ${Math.round(state.happiness)}%.`
    : `${state.name}'s run stopped at ${state.age}. Your body or mind gave out — take care of yourself next time.`

  ui.endingAge.textContent = String(state.age)
  ui.endingCareer.textContent = state.career
  ui.endingMoney.textContent = moneyFormat.format(state.money)

  ui.ending.hidden = false
  ui.restart.focus()
}

function restart () {
  state = createState()
  busy = false
  ui.ending.hidden = true
  ui.play.hidden = true
  ui.setup.hidden = false
  ui.name.value = state.name
  render()
  ui.name.focus()
  ui.name.select()
}

/* ---------- wiring ---------- */

document.querySelectorAll('.career').forEach(button => {
  button.addEventListener('click', () => chooseCareer(button.dataset.career))
})

ui.next.addEventListener('click', runYear)
ui.restart.addEventListener('click', restart)

ui.name.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault()
    document.querySelector('.career')?.focus()
  }
})

render()
requestAnimationFrame(() => {
  ui.app.dataset.ready = 'true'
})

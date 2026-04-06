'use strict'

/* ============================================================
   CONSTANTS & CONFIG
============================================================ */
const GRID_SIZE = 9
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE
const LINE_LENGTH = 5

const DIFFICULTY = {
  easy: {
    colors: ['red', 'blue', 'green', 'yellow', 'cyan'],
    spawnCount: 3,
    label: 'ЛЁГКИЙ',
  },
  normal: {
    colors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan'],
    spawnCount: 3,
    label: 'НОРМАЛЬНЫЙ',
  },
  hard: {
    colors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan'],
    spawnCount: 5,
    label: 'ТЯЖЁЛЫЙ',
  },
}

function calcScore(len) {
  return 1
}

/* ============================================================
   STATE
============================================================ */
let board = [] // null | color string
let selected = null // cell index
let nextColors = []
let score = 0
let difficulty = 'normal'
let animating = false

/* ============================================================
   DOM REFERENCES
============================================================ */
const menuScreen = document.getElementById('menu-screen')
const gameScreen = document.getElementById('game-screen')
const gameoverScreen = document.getElementById('gameover-screen')
const gridEl = document.getElementById('grid')
const scoreEl = document.getElementById('score')
const bestScoreEl = document.getElementById('best-score')
const nextBallsEl = document.getElementById('next-balls')
const diffBadge = document.getElementById('diff-badge')
const goScoreEl = document.getElementById('go-score')
const goRecordEl = document.getElementById('go-record')

/* ============================================================
   SCREENS
============================================================ */
function showScreen(name) {
  document
    .querySelectorAll('.screen')
    .forEach(s => s.classList.remove('active'))
  document.getElementById(name + '-screen').classList.add('active')
}

/* ============================================================
   LOCAL STORAGE — BEST SCORES
============================================================ */
function getBest(diff) {
  return parseInt(localStorage.getItem('lines98_best_' + diff) || '0')
}
function setBest(diff, val) {
  localStorage.setItem('lines98_best_' + diff, val)
}
function updateBestDisplay() {
  document.getElementById('best-easy').textContent =
    'Лёгкий: ' + getBest('easy')
  document.getElementById('best-normal').textContent =
    'Нормальный: ' + getBest('normal')
  document.getElementById('best-hard').textContent =
    'Тяжёлый: ' + getBest('hard')
}

/* ============================================================
   INIT GAME
============================================================ */
function initGame() {
  board = Array(TOTAL_CELLS).fill(null)
  selected = null
  score = 0
  animating = false

  buildGrid()
  updateScore(0)
  bestScoreEl.textContent = getBest(difficulty)
  diffBadge.textContent = DIFFICULTY[difficulty].label

  nextColors = generateColors(DIFFICULTY[difficulty].spawnCount)
  updateNextPanel()
  spawnBalls(nextColors, false)
  nextColors = generateColors(DIFFICULTY[difficulty].spawnCount)
  updateNextPanel()
}

/* ============================================================
   GRID BUILD
============================================================ */
function buildGrid() {
  gridEl.innerHTML = ''
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    cell.dataset.idx = i
    cell.addEventListener('click', () => onCellClick(i))
    gridEl.appendChild(cell)
  }
}

function cellEl(idx) {
  return gridEl.children[idx]
}

/* ============================================================
   RENDER
============================================================ */
function renderCell(idx) {
  const cell = cellEl(idx)
  // remove old ball
  const old = cell.querySelector('.ball')
  if (old) old.remove()

  if (board[idx]) {
    const ball = document.createElement('div')
    ball.className = 'ball'
    ball.dataset.color = board[idx]
    cell.appendChild(ball)
  }
}

function renderAll() {
  for (let i = 0; i < TOTAL_CELLS; i++) renderCell(i)
}

/* ============================================================
   SCORE
============================================================ */
function updateScore(delta) {
  score += delta
  scoreEl.textContent = score
  if (delta > 0) {
    scoreEl.classList.remove('score-bump')
    void scoreEl.offsetWidth
    scoreEl.classList.add('score-bump')
  }
  const best = getBest(difficulty)
  if (score > best) {
    setBest(difficulty, score)
    bestScoreEl.textContent = score
  }
}

function showScorePopup(idx, pts) {
  const cell = cellEl(idx)
  const rect = cell.getBoundingClientRect()
  const gridRect = gridEl.getBoundingClientRect()
  const popup = document.createElement('div')
  popup.className = 'score-popup'
  popup.textContent = '+' + pts
  popup.style.left = rect.left - gridRect.left + rect.width / 2 + 'px'
  popup.style.top = rect.top - gridRect.top + 'px'
  popup.style.transform = 'translateX(-50%)'
  gridEl.style.position = 'relative'
  gridEl.appendChild(popup)
  popup.addEventListener('animationend', () => popup.remove())
}

/* ============================================================
   NEXT BALLS PANEL
============================================================ */
function generateColors(count) {
  const cols = DIFFICULTY[difficulty].colors
  return Array.from(
    { length: count },
    () => cols[Math.floor(Math.random() * cols.length)],
  )
}

function updateNextPanel() {
  const balls = nextBallsEl.querySelectorAll('.next-ball')
  // Adjust count if needed (hard has 5)
  const count = nextColors.length
  // Rebuild if needed
  nextBallsEl.innerHTML = ''
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div')
    div.className = 'next-ball'
    div.dataset.color = nextColors[i]
    // apply color via inline style matching ball colors
    div.style.cssText = getBallStyle(nextColors[i])
    nextBallsEl.appendChild(div)
  }
}

/* ============================================================
   SPAWN BALLS
============================================================ */
function getEmptyCells() {
  const empty = []
  for (let i = 0; i < TOTAL_CELLS; i++) if (!board[i]) empty.push(i)
  return empty
}

function spawnBalls(colors, withAppear = true) {
  const empty = getEmptyCells()
  if (empty.length === 0) return

  // shuffle empty
  for (let i = empty.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[empty[i], empty[j]] = [empty[j], empty[i]]
  }

  const toPlace = Math.min(colors.length, empty.length)
  for (let i = 0; i < toPlace; i++) {
    board[empty[i]] = colors[i]
    renderCell(empty[i])
    if (withAppear) {
      const ball = cellEl(empty[i]).querySelector('.ball')
      if (ball) ball.classList.add('appear')
    }
  }
}

/* ============================================================
   BFS PATH FINDING
============================================================ */
function findPath(from, to) {
  if (from === to) return null
  const visited = new Array(TOTAL_CELLS).fill(false)
  const parent = new Array(TOTAL_CELLS).fill(-1)
  const queue = [from]
  visited[from] = true

  const neighbors = idx => {
    const r = Math.floor(idx / GRID_SIZE)
    const c = idx % GRID_SIZE
    const nb = []
    if (r > 0) nb.push(idx - GRID_SIZE)
    if (r < GRID_SIZE - 1) nb.push(idx + GRID_SIZE)
    if (c > 0) nb.push(idx - 1)
    if (c < GRID_SIZE - 1) nb.push(idx + 1)
    return nb
  }

  while (queue.length > 0) {
    const cur = queue.shift()
    if (cur === to) {
      // reconstruct path
      const path = []
      let node = to
      while (node !== from) {
        path.unshift(node)
        node = parent[node]
      }
      return path
    }
    for (const nb of neighbors(cur)) {
      if (!visited[nb] && !board[nb]) {
        visited[nb] = true
        parent[nb] = cur
        queue.push(nb)
      }
    }
  }
  return null // no path
}

/* ============================================================
   HIGHLIGHT REACHABLE CELLS
============================================================ */
function clearHighlights() {
  document
    .querySelectorAll('.cell.reachable')
    .forEach(c => c.classList.remove('reachable'))
}

function highlightReachable(from) {
  clearHighlights()
  // BFS flood to find all reachable empty cells
  const visited = new Array(TOTAL_CELLS).fill(false)
  const queue = [from]
  visited[from] = true
  const neighbors = idx => {
    const r = Math.floor(idx / GRID_SIZE),
      c = idx % GRID_SIZE,
      nb = []
    if (r > 0) nb.push(idx - GRID_SIZE)
    if (r < GRID_SIZE - 1) nb.push(idx + GRID_SIZE)
    if (c > 0) nb.push(idx - 1)
    if (c < GRID_SIZE - 1) nb.push(idx + 1)
    return nb
  }
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of neighbors(cur)) {
      if (!visited[nb] && !board[nb]) {
        visited[nb] = true
        cellEl(nb).classList.add('reachable')
        queue.push(nb)
      }
    }
  }
}

/* ============================================================
   SELECTION
============================================================ */
function selectBall(idx) {
  clearSelection()
  selected = idx
  const ball = cellEl(idx).querySelector('.ball')
  if (ball) {
    ball.classList.add('selected')
    highlightReachable(idx)
  }
}

function clearSelection() {
  if (selected !== null) {
    const ball = cellEl(selected).querySelector('.ball')
    if (ball) ball.classList.remove('selected')
  }
  selected = null
  clearHighlights()
}

/* ============================================================
   MOVE BALL
============================================================ */
async function moveBall(from, to) {
  animating = true
  clearHighlights()

  const color = board[from]
  board[from] = null
  board[to] = color

  renderCell(from)
  renderCell(to)

  const ball = cellEl(to).querySelector('.ball')
  if (ball) ball.classList.add('appear')

  await delay(150)

  const removed = checkAndRemoveLines(to)
  if (!removed) {
    await spawnNextWave()
  }

  selected = null
  animating = false
}

/* ============================================================
   CHECK LINES
============================================================ */
const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↗
]

function checkAndRemoveLines(lastIdx) {
  const color = board[lastIdx]
  if (!color) return false

  const r0 = Math.floor(lastIdx / GRID_SIZE)
  const c0 = lastIdx % GRID_SIZE

  let toRemove = new Set()

  for (const [dr, dc] of DIRECTIONS) {
    let line = [lastIdx]

    // extend in positive direction
    for (let step = 1; step < GRID_SIZE; step++) {
      const r = r0 + dr * step,
        c = c0 + dc * step
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break
      const idx = r * GRID_SIZE + c
      if (board[idx] === color) line.push(idx)
      else break
    }
    // extend in negative direction
    for (let step = 1; step < GRID_SIZE; step++) {
      const r = r0 - dr * step,
        c = c0 - dc * step
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break
      const idx = r * GRID_SIZE + c
      if (board[idx] === color) line.push(idx)
      else break
    }

    if (line.length >= LINE_LENGTH) line.forEach(i => toRemove.add(i))
  }

  if (toRemove.size === 0) return false

  const pts = calcScore(toRemove.size)

  // animate removal
  toRemove.forEach(idx => {
    const ball = cellEl(idx).querySelector('.ball')
    if (ball) ball.classList.add('destroy')
  })

  // find center cell for popup
  const indices = [...toRemove]
  const centerIdx = indices[Math.floor(indices.length / 2)]
  showScorePopup(centerIdx, pts)

  setTimeout(() => {
    toRemove.forEach(idx => {
      board[idx] = null
      renderCell(idx)
    })
    updateScore(pts)
    checkGameOver()
  }, 350)

  return true
}

/* ============================================================
   SPAWN NEXT WAVE
============================================================ */
async function spawnNextWave() {
  const colors = [...nextColors]
  spawnBalls(colors, true)
  await delay(100)

  // check lines after spawn
  const empty = getEmptyCells()
  // For each newly placed ball we check lines
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (board[i]) checkAndRemoveLines(i)
  }

  nextColors = generateColors(DIFFICULTY[difficulty].spawnCount)
  updateNextPanel()
  await delay(50)
  checkGameOver()
}

/* ============================================================
   GAME OVER
============================================================ */
function checkGameOver() {
  const empty = getEmptyCells()
  if (empty.length === 0) {
    setTimeout(() => showGameOver(), 400)
  }
}

function showGameOver() {
  goScoreEl.textContent = score
  const best = getBest(difficulty)
  goRecordEl.textContent =
    score >= best ? '🏆 Новый рекорд!' : 'Рекорд: ' + best
  showScreen('gameover')
}

/* ============================================================
   CLICK HANDLER
============================================================ */
function onCellClick(idx) {
  if (animating) return

  if (board[idx]) {
    // click on a ball
    if (selected === idx) {
      clearSelection()
    } else {
      selectBall(idx)
    }
  } else {
    // click on empty cell
    if (selected !== null) {
      const path = findPath(selected, idx)
      if (path) {
        const from = selected
        clearSelection()
        moveBall(from, idx)
      }
      // no path → keep selection
    }
  }
}

/* ============================================================
   UTILS
============================================================ */
function delay(ms) {
  return new Promise(res => setTimeout(res, ms))
}

const BALL_STYLES = {
  red: 'background: radial-gradient(circle at 35% 35%, #ff8080, #ff3d3d 60%, #7a0000); box-shadow: 0 3px 12px rgba(255,61,61,0.6);',
  blue: 'background: radial-gradient(circle at 35% 35%, #80aaff, #2979ff 60%, #003380); box-shadow: 0 3px 12px rgba(41,121,255,0.6);',
  green:
    'background: radial-gradient(circle at 35% 35%, #80ffc0, #00e676 60%, #005c30); box-shadow: 0 3px 12px rgba(0,230,118,0.6);',
  yellow:
    'background: radial-gradient(circle at 35% 35%, #ffe980, #ffd740 60%, #7a5c00); box-shadow: 0 3px 12px rgba(255,215,64,0.6);',
  purple:
    'background: radial-gradient(circle at 35% 35%, #f0a0ff, #e040fb 60%, #6a007a); box-shadow: 0 3px 12px rgba(224,64,251,0.6);',
  orange:
    'background: radial-gradient(circle at 35% 35%, #ffb080, #ff6d00 60%, #7a2a00); box-shadow: 0 3px 12px rgba(255,109,0,0.6);',
  cyan: 'background: radial-gradient(circle at 35% 35%, #a0f8ff, #00e5ff 60%, #006070); box-shadow: 0 3px 12px rgba(0,229,255,0.6);',
}
function getBallStyle(color) {
  return BALL_STYLES[color] || ''
}

/* ============================================================
   MENU INTERACTIONS
============================================================ */
document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => {
    document
      .querySelectorAll('.diff-card')
      .forEach(c => c.classList.remove('selected'))
    card.classList.add('selected')
    difficulty = card.dataset.diff
  })
})

document.getElementById('start-btn').addEventListener('click', () => {
  showScreen('game')
  initGame()
})

document.getElementById('back-btn').addEventListener('click', () => {
  showScreen('menu')
  updateBestDisplay()
})

document.getElementById('restart-btn').addEventListener('click', () => {
  initGame()
})

document.getElementById('play-again-btn').addEventListener('click', () => {
  showScreen('game')
  initGame()
})

document.getElementById('menu-btn').addEventListener('click', () => {
  showScreen('menu')
  updateBestDisplay()
})

/* ============================================================
   BOOT
============================================================ */
updateBestDisplay()

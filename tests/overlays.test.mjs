import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the real overlay/editor/occlusion modules against controlled layout,
// hit testing, and timers. No host session or prediction request is required.
function harness() {
  const nodes = []
  const timers = new Map()
  const events = new Map()
  let id = 0
  let cover = null
  class Element {
    constructor() {
      this.style = { visibility: '', zIndex: '' }
      this.dataset = {}
      this.textContent = ''
      this.isConnected = true
      this.classes = new Set()
      this.classList = {
        add: (s) => this.classes.add(s), remove: (s) => this.classes.delete(s),
        toggle: (s, on) => on ? this.classes.add(s) : this.classes.delete(s),
      }
      this.rect = { left: 10, top: 10, width: 300, height: 50, right: 310, bottom: 60 }
    }
    getBoundingClientRect() { return this.rect }
    contains(el) { return el === this }
    setAttribute() {}
    append() {}
    appendChild(el) { nodes.push(el) }
    remove() { this.isConnected = false }
  }
  class Textarea extends Element {}
  const host = new Element()
  const card = new Element()
  const placeholder = new Element()
  const document = {
    head: new Element(), body: new Element(),
    createElement: () => new Element(),
    querySelector: (s) => s === '[data-composer-card]' ? card
      : s.startsWith('style') ? nodes.find(n => n.dataset.pluginCss) ?? null : cover,
    querySelectorAll: () => [placeholder],
    elementFromPoint: (x) => cover && x > 100 ? cover : host,
    getSelection: () => ({ rangeCount: 1, anchorNode: host, getRangeAt: () => ({
      getBoundingClientRect: () => ({ left: 20, right: 22, top: 12, width: 2, height: 20 }),
    }) }),
  }
  const window = {
    setInterval: (fn) => { timers.set(++id, fn); return id },
    clearInterval: (id) => timers.delete(id),
    addEventListener: (name, fn) => { const list = events.get(name) ?? []; list.push(fn); events.set(name, list) },
    getComputedStyle: (el) => ({ zIndex: el.style.zIndex || 'auto', font: '14px sans-serif', fontSize: '14px', lineHeight: '20px', letterSpacing: '0px', getPropertyValue: () => '0' }),
  }
  const cache = new Map()
  const load = (name) => {
    if (cache.has(name)) return cache.get(name)
    const context = vm.createContext({ exports: {}, require: load, document, window, HTMLTextAreaElement: Textarea, Element })
    const source = readFileSync(new URL(`../src/client/${name.replace('./', '')}`, import.meta.url), 'utf8')
    vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context)
    cache.set(name, context.exports)
    return context.exports
  }
  return {
    host, card, placeholder, load,
    overlay: (cls) => nodes.findLast(n => n.className === cls && n.isConnected),
    tick: () => [...timers.values()].forEach(fn => fn()),
    resize: () => events.get('resize')?.forEach(fn => fn()),
    timerCount: () => timers.size,
    cover: (z) => { cover = z === null ? null : new Element(); if (cover) cover.style.zIndex = z },
  }
}

test('prediction drops on real input and never resurrects on tick or viewport repaint', () => {
  for (const text of ['typed text', 'pasted text', '中文输入', 'accepted completion']) {
    const h = harness()
    const api = h.load('./suggestOverlay.ts')
    api.installSuggestStyle()
    assert.equal(api.showSuggestion('next prompt', 'Tab', h.host), true)
    h.host.textContent = text
    h.tick(); h.resize()
    assert.equal(h.overlay('dsh-ph-suggest'), undefined)
    assert.equal(h.placeholder.style.visibility, '')
    assert.equal(h.timerCount(), 0)
    h.host.textContent = ''; h.tick(); h.resize()
    assert.equal(api.suggestionVisible(), false)
  }
})

test('prediction and pending overlays restore placeholders under flow covers and recover repeatedly', () => {
  for (const pending of [false, true]) {
    const h = harness()
    const api = h.load('./suggestOverlay.ts')
    pending ? api.showPending('loading', h.host) : api.showSuggestion('next', 'Tab', h.host)
    const overlay = h.overlay('dsh-ph-suggest')
    for (let i = 0; i < 2; i++) {
      h.cover('auto'); h.tick()
      assert.equal(overlay.style.visibility, 'hidden')
      assert.equal(h.placeholder.style.visibility, '')
      assert.equal(h.card.classes.has('dsh-ph-suggesting'), false)
      h.cover(null); h.tick()
      assert.equal(overlay.style.visibility, '')
      assert.equal(h.placeholder.style.visibility, 'hidden')
      assert.equal(h.card.classes.has('dsh-ph-suggesting'), true)
    }
    api.hideSuggestion(); api.hideSuggestion()
    assert.equal(h.placeholder.style.visibility, '')
    assert.equal(h.timerCount(), 0)
  }
})

test('both completion and prediction sit below numeric popup layers and reset after dismissal', () => {
  for (const completion of [false, true]) {
    const h = harness()
    const api = h.load(completion ? './ghost.ts' : './suggestOverlay.ts')
    h.cover('1100')
    completion ? api.showGhost('suffix', h.host) : api.showSuggestion('next', 'Tab', h.host)
    const overlay = h.overlay(completion ? 'dsh-ph-ghost' : 'dsh-ph-suggest')
    assert.equal(overlay.style.zIndex, '1099')
    assert.equal(overlay.style.visibility, '')
    h.cover('auto'); h.tick()
    assert.equal(overlay.style.visibility, 'hidden')
    h.cover(null); h.tick()
    assert.equal(overlay.style.zIndex, '')
    assert.equal(overlay.style.visibility, '')
    h.host.isConnected = false; h.tick()
    assert.equal(h.timerCount(), 0)
    assert.equal(overlay.isConnected, false)
  }
})

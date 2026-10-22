import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const read = (name) => readFileSync(new URL(`../src/client/${name}`, import.meta.url), 'utf8')
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function loadPrefs(storage) {
  const context = vm.createContext({ exports: {}, localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } })
  vm.runInContext(transpile(read('prefs.ts')), context)
  return context.exports
}

const storageKey = 'dsh-prompt-history.prefs'
test('default, legacy modes, and off persist without changing independent preferences', () => {
  assert.equal(loadPrefs(new Map()).getPrefs().copyMode, 'toolbar')
  for (const mode of ['toolbar', 'auto', 'off']) {
    const storage = new Map([[storageKey, JSON.stringify({ version: 3, data: {
      copyMode: mode, rightClickPaste: false, sideChat: false, promptCompletion: false,
    } })]])
    const prefs = loadPrefs(storage)
    assert.equal(prefs.getPrefs().copyMode, mode)
    assert.equal(prefs.getPrefs().rightClickPaste, false)
    assert.equal(prefs.getPrefs().sideChat, false)
    prefs.setPref('copyMode', 'off')
    const reloaded = loadPrefs(storage).getPrefs()
    assert.equal(reloaded.copyMode, 'off')
    assert.equal(reloaded.promptCompletion, false)
    assert.equal(reloaded.rightClickPaste, false)
  }
  for (const value of [true, false]) {
    assert.equal(loadPrefs(new Map([[storageKey, JSON.stringify({ copyOnSelect: value })]])).getPrefs().copyMode,
      value ? 'auto' : 'toolbar')
  }
})

// Execute the actual React selection effect with controlled DOM/timers, without
// loading the DSH host. This covers event cleanup and interrupted mode switches.
const ast = ts.createSourceFile('InputHistory.tsx', read('InputHistory.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let effect
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
    && node.arguments[1]?.getText(ast) === '[prefs.copyMode]') effect = node.arguments[0].getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(effect, 'selection effect must restart when copyMode changes')

function harness(initialMode) {
  let mode = initialMode
  let copies = 0
  let toolbar = false
  let timerId = 0
  const timers = new Map()
  const events = new Map()
  const resize = new Set()
  const rect = { width: 20, height: 10 }
  const context = vm.createContext({
    prefs: { copyMode: mode },
    getPrefs: () => ({ copyMode: mode, sideChat: false }),
    liveRef: { current: { phase: 'idle', removed: false } },
    editorHost: () => null,
    document: {
      getSelection: () => ({ isCollapsed: false, rangeCount: 1, toString: () => 'selected text',
        getRangeAt: () => ({ getBoundingClientRect: () => rect }) }),
      execCommand: () => { copies++; return true },
      addEventListener: (name, fn) => events.set(name, fn),
      removeEventListener: (name, fn) => { if (events.get(name) === fn) events.delete(name) },
    },
    window: {
      setTimeout: (fn) => { timers.set(++timerId, fn); return timerId },
      clearTimeout: (id) => timers.delete(id),
      addEventListener: (_, fn) => resize.add(fn),
      removeEventListener: (_, fn) => resize.delete(fn),
    },
    flashCopied: () => {},
    showSelectionToolbar: () => { toolbar = true },
    hideSelectionToolbar: () => { toolbar = false },
    console: { info: () => {} },
  })
  const run = () => vm.runInContext(transpile(`(${effect})()`), context)
  let cleanup = run()
  return {
    select: () => events.get('selectionchange')?.(),
    flush: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()) },
    setBeforeRender: (next) => { mode = next },
    switchTo: (next) => {
      mode = next
      cleanup?.()
      context.prefs = { copyMode: next }
      cleanup = run()
    },
    state: () => ({ copies, toolbar, listeners: events.size + resize.size, timers: timers.size }),
  }
}

test('off mounts with no selection listeners and allows toolbar/auto to be re-enabled', () => {
  const h = harness('off')
  h.select(); h.flush()
  assert.deepEqual(h.state(), { copies: 0, toolbar: false, listeners: 0, timers: 0 })
  h.switchTo('toolbar'); h.select(); h.flush()
  assert.equal(h.state().toolbar, true)
  h.switchTo('off')
  assert.deepEqual(h.state(), { copies: 0, toolbar: false, listeners: 0, timers: 0 })
  h.switchTo('auto'); h.select(); h.flush()
  assert.equal(h.state().copies, 1)
})

test('switching off cancels pending auto-copy and toolbar timers', () => {
  for (const mode of ['auto', 'toolbar']) {
    const h = harness(mode)
    h.select()
    assert.equal(h.state().timers, 1)
    h.switchTo('off'); h.flush()
    assert.deepEqual(h.state(), { copies: 0, toolbar: false, listeners: 0, timers: 0 })
  }
})

test('a timer queued before React cleanup cannot copy or display after off is chosen', () => {
  for (const mode of ['auto', 'toolbar']) {
    const h = harness(mode)
    h.select(); h.setBeforeRender('off'); h.flush()
    assert.equal(h.state().copies, 0)
    assert.equal(h.state().toolbar, false)
  }
})

test('right-click paste remains independent while selection copy is off', () => {
  let pasteEffect
  function find(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
      && node.arguments[0]?.getText(ast).includes("document.addEventListener('contextmenu'")) {
      pasteEffect = node.arguments[0].getText(ast)
    }
    ts.forEachChild(node, find)
  }
  find(ast)
  assert.ok(pasteEffect)
  for (const enabled of [true, false]) {
    let handler
    let pasted = 0
    let prevented = 0
    const context = vm.createContext({
      getPrefs: () => ({ copyMode: 'off', rightClickPaste: enabled }),
      liveRef: { current: { phase: 'idle', removed: false } },
      isEditorTarget: () => true,
      editorHost: () => ({}),
      focusEditor: () => {},
      document: {
        addEventListener: (_, fn) => { handler = fn },
        execCommand: (command) => { assert.equal(command, 'paste'); pasted++; return true },
      },
    })
    vm.runInContext(transpile(`(${pasteEffect})()`), context)
    handler({ target: {}, preventDefault: () => { prevented++ }, stopPropagation: () => {} })
    assert.equal(pasted, enabled ? 1 : 0)
    assert.equal(prevented, enabled ? 1 : 0)
  }
})

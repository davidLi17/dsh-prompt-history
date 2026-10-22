import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))

test('prebuilt Git dependency needs no install or preparation lifecycle scripts', () => {
  for (const name of ['prepare', 'prepublish', 'prepack', 'publish', 'preinstall', 'install', 'postinstall']) {
    assert.ok(!manifest.scripts?.[name], `${name} must not require installation-time execution`)
  }
  assert.ok(manifest.scripts.build, 'explicit developer build remains available')
  for (const name of [manifest.main, manifest.types, manifest.exports['./client'].default, manifest.exports['./client'].types]) {
    assert.ok(existsSync(new URL(name, root)), `missing prebuilt entrypoint ${name}`)
  }
})

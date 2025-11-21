import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import http from 'http'

const LOCALAPPDATA = process.env.LOCALAPPDATA || (process.platform === 'win32' ? process.env.USERPROFILE + '\\AppData\\Local' : process.cwd())
const APP_HOME = path.resolve(process.env.APP_HOME || path.join(LOCALAPPDATA, 'Rapkumer'))
const LOG_DIR = path.join(LOCALAPPDATA, 'Rapkumer-data', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'rapkumer.log')
const PORT = process.env.PORT || '3000'

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch (err) { console.error('ensureDir failed', err) }
}

ensureDir(LOG_DIR)

function now() {
  return new Date().toISOString()
}

function writeLog(line) {
  try {
    fs.appendFileSync(LOG_FILE, `[${now()}] ${line}\n`)
  } catch (err) { console.error('Failed to write log:', err) }
}

writeLog('=== Starting Rapkumer launcher ===')
writeLog(`APP_HOME=${APP_HOME}`)
writeLog(`PORT=${PORT}`)

// Choose node binary: prefer bundled runtime in the app, otherwise use `node` on PATH
function nodeBinary() {
  const bundled = path.join(APP_HOME, 'runtime', 'node', process.platform === 'win32' ? 'node.exe' : 'node')
  if (fs.existsSync(bundled)) return bundled
  // fallback to common Program Files location on Windows
  if (process.platform === 'win32') {
    const pf = process.env['ProgramFiles'] || 'C:\\Program Files'
    const maybe = path.join(pf, 'nodejs', 'node.exe')
    if (fs.existsSync(maybe)) return maybe
  }
  return 'node'
}

const NODE = nodeBinary()
writeLog(`Using node binary: ${NODE}`)

// Launch the actual server process (node build/index.js)
const serverScript = path.join(APP_HOME, 'build', 'index.js')
if (!fs.existsSync(serverScript)) {
  writeLog(`Server entry not found: ${serverScript}`)
  console.error('Server entry not found:', serverScript)
  process.exitCode = 1
}

// Spawn server as a detached process and redirect its stdout/stderr to the log file.
// This allows the launcher to exit while the server keeps running, which closes
// the terminal that launched the launcher.
let serverPid = null
try {
  const outFd = fs.openSync(LOG_FILE, 'a')
  const child = spawn(NODE, [serverScript], {
    cwd: APP_HOME,
    detached: true,
    stdio: ['ignore', outFd, outFd]
  })
  // Allow the child to continue running after this process exits
  child.unref()
  serverPid = child.pid
  // Close our copy of the fd; child has its own reference
  try { fs.closeSync(outFd) } catch (e) { writeLog(`Failed closing log fd in parent: ${e && e.message ? e.message : e}`) }
  writeLog(`Spawned detached server process pid=${serverPid}`)
} catch (err) {
  writeLog(`Failed to spawn server process: ${err && err.stack ? err.stack : err}`)
  console.error('Failed to spawn server process', err)
}

// Poll the local server until it responds, then open the browser
const target = `http://localhost:${PORT}/`
async function waitForServer(timeoutMs = 30000, intervalMs = 300) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((res, rej) => {
        const req = http.get(target, (r) => {
          r.resume()
          res()
        })
        req.on('error', rej)
        req.setTimeout(2000, () => { req.destroy(); rej(new Error('timeout')) })
      })
      return true
    } catch (err) {
      writeLog(`waitForServer poll error: ${err && err.message ? err.message : err}`)
      await new Promise(r => setTimeout(r, intervalMs))
    }
  }
  return false
}

;(async () => {
  writeLog('Waiting for server to accept connections...')
  const ok = await waitForServer(30000, 300)
  if (!ok) {
    writeLog('Server did not become ready within timeout')
    console.error('Server did not become ready within timeout')
    return
  }

  // Show message and open browser
  const msg = 'Sedang membuka Rapkumer...'
  writeLog(msg)
  console.log(msg)

  // Open default browser in a cross-platform way without extra deps
  try {
    if (process.platform === 'win32') {
      // Use COMSPEC or explicit System32 path to ensure cmd.exe is found even if PATH is modified.
      const comspec = process.env.ComSpec || (process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32', 'cmd.exe') : 'cmd');
      spawn(comspec, ['/c', 'start', '', target], { shell: false, detached: true })
    } else if (process.platform === 'darwin') {
      spawn('open', [target], { detached: true })
    } else {
      spawn('xdg-open', [target], { detached: true })
    }
    writeLog(`Opened browser to ${target}`)
    // Exit launcher so the console/terminal closes (server is detached)
    writeLog('Launcher exiting (server detached)')
    // Small delay to ensure logs flush and browser command spawns
    setTimeout(() => process.exit(0), 300)
  } catch (err) {
    writeLog(`Failed to open browser: ${err && err.stack ? err.stack : err}`)
    console.error('Failed to open browser', err)
  }
})()

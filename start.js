// Minimal, robust Next.js starter for Plesk Passenger
// - Uses absolute path to the Next binary
// - Respects Plesk-provided port envs
// - Logs chosen host/port for quick debugging in Plesk Logs
// - Ensures correct cwd for spawned process

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const host = process.env.HOST || '127.0.0.1'
const envPort = Number(process.env.PORT || process.env.PLESK_NODEJS_PORT)
const port = Number.isFinite(envPort) ? envPort : 3000

const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next')

console.log('Starting Next…', {
  host,
  port,
  envPort,
  nextBin,
  cwd: __dirname,
})

// Lightweight diagnostics to verify production build presence
try {
  const nextDir = path.join(__dirname, '.next')
  const buildIdPath = path.join(nextDir, 'BUILD_ID')
  const hasNext = fs.existsSync(nextDir)
  const hasBuildId = fs.existsSync(buildIdPath)
  let buildId = null
  if (hasBuildId) {
    try { buildId = fs.readFileSync(buildIdPath, 'utf8').trim() } catch {}
  }
  let top = []
  try { top = fs.readdirSync(nextDir) } catch {}
  console.log('Build diagnostics:', { nextDir, hasNext, hasBuildId, buildId })
  if (top && top.length) {
    console.log('Top-level entries in .next:', top)
  }
} catch (e) {
  console.log('Build diagnostics failed:', e?.message)
}

const child = spawn(process.execPath, [
  nextBin,
  'start',
  '-p', String(port),
  '-H', host,
], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit',
})

child.on('error', (e) => {
  console.error('Spawn error:', e)
})

child.on('exit', (code) => {
  console.error('Next exited with code:', code)
  process.exit(code ?? 0)
})

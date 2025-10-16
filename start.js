// Minimal, robust Next.js starter for Plesk Passenger
// - Uses absolute path to the Next binary
// - Respects Plesk-provided port envs
// - Logs chosen host/port for quick debugging in Plesk Logs
// - Ensures correct cwd for spawned process

const { spawn } = require('child_process')
const path = require('path')

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

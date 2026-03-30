import { createInterface } from 'node:readline/promises'
import { access, readFile } from 'node:fs/promises'
import { stdin as input, stdout as output } from 'node:process'
import { brotliCompressSync, brotliDecompressSync } from 'node:zlib'

const [, , command, arg] = process.argv

function toBase64Url(value) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '='
  )
  return Buffer.from(padded, 'base64')
}

async function readAllStdin() {
  const chunks = []
  for await (const chunk of input) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function promptForValue(label) {
  const rl = createInterface({ input, output })
  try {
    return await rl.question(label)
  } finally {
    rl.close()
  }
}

async function resolveValue(promptLabel) {
  if (arg) {
    try {
      await access(arg)
      return readFile(arg, 'utf8')
    } catch {
      return arg
    }
  }

  if (!input.isTTY) {
    return readAllStdin()
  }

  return promptForValue(promptLabel)
}

function printUsage() {
  console.log(
    'Usage: node scripts/share-codec.mjs <encode|encode-json|decode> [file-or-value]'
  )
  console.log('')
  console.log('  encode       Encode raw text to a share string.')
  console.log('  encode-json  Encode a JSON object to a share string.')
  console.log('  decode       Decode a share string.')
  console.log('')
  console.log('The optional argument is a file path or an inline value.')
  console.log(
    'If omitted, stdin is read when piped, otherwise an interactive prompt is shown.'
  )
  console.log('')
  console.log('Examples:')
  console.log('  npm run share:encode:json -- ./payload.json')
  console.log('  npm run share:encode -- ./main.dm')
  console.log('  cat payload.json | npm run share:encode:json')
  console.log('  Get-Content .\\payload.json -Raw | npm run share:encode:json')
  console.log('  npm run share:decode -- H4sIAAAAA...')
}

function requireInput(value) {
  if (value.trim().length === 0) {
    throw new Error('No input provided.')
  }

  return value
}

function parseJsonInput(value) {
  try {
    return JSON.parse(value)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${message}\nHint: pass a file path (e.g. ./payload.json) or pipe JSON over stdin.`
    )
  }
}

async function main() {
  if (!command) {
    printUsage()
    process.exitCode = 1
    return
  }

  if (command === 'encode' || command === 'encode-json') {
    const rawValue = await resolveValue('Value to encode: ')
    const value = requireInput(rawValue)

    const payload =
      command === 'encode-json' ? parseJsonInput(value) : value.trim()

    const encoded = toBase64Url(
      brotliCompressSync(Buffer.from(JSON.stringify(payload)))
    )
    console.log(encoded)
    return
  }

  if (command === 'decode') {
    const rawValue = await resolveValue('Value to decode: ')
    const value = requireInput(rawValue).trim()

    const decoded = JSON.parse(
      brotliDecompressSync(fromBase64Url(value)).toString('utf8')
    )
    if (typeof decoded === 'string') {
      console.log(decoded)
      return
    }

    console.log(JSON.stringify(decoded, null, 2))
    return
  }

  printUsage()
  process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

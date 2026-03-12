import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { gzipSync, gunzipSync } from 'node:zlib'
import { pack, unpack } from 'msgpackr'

const [, , command, ...args] = process.argv

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
    return Buffer.concat(chunks).toString('utf8').trim()
}

async function promptForValue(label) {
    const rl = createInterface({ input, output })
    try {
        return (await rl.question(label)).trim()
    } finally {
        rl.close()
    }
}

async function resolveValue(promptLabel) {
    if (args.length > 0) {
        return args.join(' ').trim()
    }

    if (!input.isTTY) {
        return readAllStdin()
    }

    return promptForValue(promptLabel)
}

function printUsage() {
    console.log('Usage: node scripts/share-codec.mjs <encode|encode-json|decode> [value]')
    console.log('')
    console.log('Examples:')
    console.log('  npm run share:encode -- /proc/main()')
    console.log('  npm run share:encode:json -- {"files":{"main.dm":"/proc/main()\\n"}}')
    console.log('  npm run share:decode -- H4sIAAAAA...')
}

async function main() {
    if (!command) {
        printUsage()
        process.exitCode = 1
        return
    }

    if (command === 'encode' || command === 'encode-json') {
        const value = await resolveValue('Value to encode: ')
        if (!value) {
            console.error('No input provided.')
            process.exitCode = 1
            return
        }

        const payload =
            command === 'encode-json' ? JSON.parse(value) : value

        const encoded = toBase64Url(
            gzipSync(pack(payload))
        )
        console.log(encoded)
        return
    }

    if (command === 'decode') {
        const value = await resolveValue('Value to decode: ')
        if (!value) {
            console.error('No input provided.')
            process.exitCode = 1
            return
        }

        const decoded = unpack(gunzipSync(fromBase64Url(value)))
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

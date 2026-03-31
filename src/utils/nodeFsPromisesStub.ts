function unsupported() {
  throw new Error('node:fs/promises is not available in the browser build')
}

export async function open() {
  unsupported()
}

export async function readFile() {
  unsupported()
}

export async function stat() {
  unsupported()
}

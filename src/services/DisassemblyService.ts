import { DISASM_SO_NAME } from '../app/editorProject/disasmProject'
import useBytecodeStore from '../app/stores/bytecodeStore'

const DMASM_BEGIN_MARKER = '\x01DMASM_BEGIN\x01'
const DMASM_END_MARKER = '\x01DMASM_END\x01'
const DMASM_ERROR_MARKER = '\x01DMASM_ERROR\x01'

let disasmSoCache: Uint8Array | null = null

export async function fetchDisasmSo(): Promise<Uint8Array | null> {
  if (disasmSoCache) return disasmSoCache
  const resp = await fetch(`/lib/${DISASM_SO_NAME}`)
  if (!resp.ok) return null
  const data = new Uint8Array(await resp.arrayBuffer())
  // Vite dev server returns a 200 HTML fallback for missing public files.
  // Verify the ELF magic bytes (\x7fELF) to confirm we got an actual binary.
  if (data[0] !== 0x7f || data[1] !== 0x45 || data[2] !== 0x4c || data[3] !== 0x46) {
    return null
  }
  disasmSoCache = data
  return disasmSoCache
}

/**
 * Creates a stdout filter that intercepts disassembly markers.
 * Returns a function that processes text and returns the portion
 * that should be passed through to the output panel.
 */
export function createDisasmInterceptor() {
  let capturing = false
  let buffer = ''

  return function intercept(text: string): string {
    let passthrough = ''
    let remaining = text

    while (remaining.length > 0) {
      if (capturing) {
        const endIdx = remaining.indexOf(DMASM_END_MARKER)
        if (endIdx !== -1) {
          buffer += remaining.slice(0, endIdx)
          remaining = remaining.slice(endIdx + DMASM_END_MARKER.length)
          capturing = false
          // Parse the captured JSON
          try {
            const result = JSON.parse(buffer)
            useBytecodeStore.getState().setDisassembly(result)
          } catch (e) {
            console.error(
              '[disasm-interceptor] JSON parse failed:',
              e,
              'buffer start:',
              buffer.slice(0, 200)
            )
            useBytecodeStore
              .getState()
              .setError('Failed to parse disassembly output')
          }
          buffer = ''
        } else {
          buffer += remaining
          remaining = ''
        }
      } else {
        // Check for error marker
        const errIdx = remaining.indexOf(DMASM_ERROR_MARKER)
        if (errIdx !== -1) {
          passthrough += remaining.slice(0, errIdx)
          remaining = remaining.slice(errIdx + DMASM_ERROR_MARKER.length)
          useBytecodeStore
            .getState()
            .setError('Disassembly failed (auxtools init error)')
          continue
        }

        const startIdx = remaining.indexOf(DMASM_BEGIN_MARKER)
        if (startIdx !== -1) {
          passthrough += remaining.slice(0, startIdx)
          remaining = remaining.slice(startIdx + DMASM_BEGIN_MARKER.length)
          capturing = true
          buffer = ''
        } else {
          // Check if the end of the string might be a partial marker
          const lastSoh = remaining.lastIndexOf('\x01')
          if (
            lastSoh !== -1 &&
            lastSoh > remaining.length - DMASM_BEGIN_MARKER.length
          ) {
            // Could be a partial marker; buffer it for next call
            passthrough += remaining.slice(0, lastSoh)
            buffer = remaining.slice(lastSoh)
            remaining = ''
            // Not capturing yet — will resolve on next chunk
          } else {
            passthrough += remaining
            remaining = ''
          }
        }
      }
    }

    // Filter out DISASM_INIT and DISASM_RESULT_LEN lines entirely;
    // errors go to the bytecode store, not the output panel
    passthrough = passthrough.replace(
      /^.*DISASM_INIT: SUCCESS.*(?:\r?\n|$)/gm,
      ''
    )
    passthrough = passthrough.replace(
      /^.*DISASM_RESULT_LEN:.*(?:\r?\n|$)/gm,
      ''
    )
    const initFailMatch = passthrough.match(/^.*DISASM_INIT: (?!SUCCESS)(.*)$/m)
    if (initFailMatch) {
      useBytecodeStore
        .getState()
        .setError(`Disassembly init failed: ${initFailMatch[1].trim()}`)
    }
    passthrough = passthrough.replace(
      /^.*DISASM_INIT: (?!SUCCESS).*(?:\r?\n|$)/gm,
      ''
    )
    const exceptionMatch = passthrough.match(/^.*DISASM_EXCEPTION:(.*)$/m)
    if (exceptionMatch) {
      useBytecodeStore
        .getState()
        .setError(`Disassembly exception: ${exceptionMatch[1].trim()}`)
    }
    passthrough = passthrough.replace(/^.*DISASM_EXCEPTION:.*(?:\r?\n|$)/gm, '')
    // Remove leading empty lines left by filtering
    passthrough = passthrough.replace(/^\n+/, '')

    return passthrough
  }
}

const warningStyle =
  'background:#450a0a;color:#fca5a5;border:4px solid #ef4444;padding:8px 12px;font-size:25px;font-weight:800;line-height:2;border-radius:4px;'

const warningLines = [
  'WARNING: Opening DevTools can slow down the compiler engine due to browser bugs.',
  'WARNING: Compiler performance may degrade while the console is open.',
  'WARNING: Close DevTools for best compile speed and responsiveness.',
]

export function printConsoleWarnings() {
  for (const line of warningLines) {
    console.warn('%c' + line, warningStyle)
  }
}

import { patchUrlMappings } from '@discord/embedded-app-sdk'

const BOT_BACKEND_HOST = ((import.meta.env.VITE_BOT_BACKEND_URL as string) ?? '')
  .replace(/^https?:\/\//, '')

export const DISCORD_URL_MAPPINGS: Array<{
  prefix: string
  target: string
}> = [
  ...(BOT_BACKEND_HOST
    ? [{ prefix: '/ext/bot', target: BOT_BACKEND_HOST }]
    : []),
  {
    prefix: '/ext/vm-assets',
    target: 'spacestation13.github.io/dm-playground-linux',
  },
  {
    prefix: '/ext/v86-bios',
    target: 'raw.githubusercontent.com/copy/v86/master/bios',
  },
  { prefix: '/ext/byond-builds', target: 'byond-builds.dm-lang.org' },
  { prefix: '/ext/byond-fallback', target: 'www.byond.com/download/build' },
  {
    prefix: '/ext/monaco-themes',
    target: 'unpkg.com/monaco-themes/themes',
  },
  { prefix: '/ext/cdn', target: 'cdn.jsdelivr.net' },
  { prefix: '/ext/unpkg', target: 'unpkg.com' },
]

export function applyDiscordUrlMappings(): void {
  patchUrlMappings(DISCORD_URL_MAPPINGS)
}

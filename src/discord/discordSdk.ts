import type { DiscordSDK } from '@discord/embedded-app-sdk'
import { isDiscordActivity } from './activity'

let discordSdk: DiscordSDK | null = null
let discordAuth: { access_token: string } | null = null
let channelId: string | null = null
let guildId: string | null = null
let clientId: string | null = null
let customId: string | null = null

export async function initDiscordSdk(id: string): Promise<void> {
  if (!isDiscordActivity()) return

  const [{ DiscordSDK }, { applyDiscordUrlMappings }] = await Promise.all([
    import('@discord/embedded-app-sdk'),
    import('./urlMappings'),
  ])

  clientId = id
  discordSdk = new DiscordSDK(id)
  await discordSdk.ready()

  applyDiscordUrlMappings()

  channelId = discordSdk.channelId
  guildId = discordSdk.guildId

  const params = new URLSearchParams(window.location.search)
  customId = params.get('custom_id')
}

export async function authorizeDiscord(): Promise<void> {
  if (!discordSdk || !clientId) {
    throw new Error('Discord SDK not initialized')
  }

  if (discordAuth) return

  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify'],
  })

  const response = await fetch('/api/discord/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange Discord auth code')
  }

  const tokenData = await response.json()
  discordAuth = { access_token: tokenData.access_token }

  await discordSdk.commands.authenticate({
    access_token: tokenData.access_token,
  })
}

export function getDiscordSdk(): DiscordSDK | null {
  return discordSdk
}

export function getDiscordAuth(): { access_token: string } | null {
  return discordAuth
}

export function getDiscordChannelId(): string | null {
  return channelId
}

export function getDiscordGuildId(): string | null {
  return guildId
}

export function isDiscordDm(): boolean {
  return guildId === null && discordSdk !== null
}

export function getDiscordCustomId(): string | null {
  return customId
}

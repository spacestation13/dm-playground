import {
  authorizeDiscord,
  getDiscordAuth,
  getDiscordChannelId,
  getDiscordSdk,
  isDiscordDm,
} from './discordSdk'

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

function buildShareMessage(code: string, output: string): string {
  const parts: string[] = []
  if (code) {
    parts.push(`**Code**\n\`\`\`js\n${truncate(code, 900)}\n\`\`\``)
  }
  if (output) {
    parts.push(`**Output**\n\`\`\`\n${truncate(output, 900)}\n\`\`\``)
  }
  return parts.join('\n')
}

async function createSnippet(
  shareHash: string,
  botBackendUrl: string
): Promise<string> {
  const response = await fetch(`${botBackendUrl}/api/snippets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash: shareHash }),
  })

  if (!response.ok) {
    throw new Error('Failed to create snippet')
  }

  const data = (await response.json()) as { id: string }
  return data.id
}

export async function shareViaLink(
  code: string,
  output: string,
  shareHash: string,
  botBackendUrl: string
): Promise<void> {
  await authorizeDiscord()

  const sdk = getDiscordSdk()
  if (!sdk) throw new Error('Discord SDK not initialized')

  const snippetId = await createSnippet(shareHash, botBackendUrl)
  const message = buildShareMessage(code, output)
  await sdk.commands.shareLink({
    message,
    custom_id: snippetId,
  })
}

export async function shareViaBot(
  code: string,
  output: string,
  shareHash: string,
  botBackendUrl: string
): Promise<void> {
  await authorizeDiscord()

  const auth = getDiscordAuth()
  const channelId = getDiscordChannelId()

  if (!auth || !channelId) {
    throw new Error('Discord not authenticated')
  }

  const snippetId = await createSnippet(shareHash, botBackendUrl)

  const response = await fetch(`${botBackendUrl}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      output,
      snippet_id: snippetId,
      channel_id: channelId,
      access_token: auth.access_token,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Share failed: ${text}`)
  }
}

export async function shareToDiscord(
  code: string,
  output: string,
  shareHash: string,
  botBackendUrl: string
): Promise<void> {
  if (isDiscordDm()) {
    await shareViaLink(code, output, shareHash, botBackendUrl)
  } else {
    await shareViaBot(code, output, shareHash, botBackendUrl)
  }
}

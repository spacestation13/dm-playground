import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  getDiscordChannelId,
  getDiscordCustomId,
  initDiscordSdk,
  isDiscordActivity,
} from './discordSdk'

interface DiscordActivityState {
  isActivity: boolean
  ready: boolean
  channelId: string | null
  customId: string | null
  error: string | null
}

const DiscordActivityContext = createContext<DiscordActivityState>({
  isActivity: false,
  ready: false,
  channelId: null,
  customId: null,
  error: null,
})

export function useDiscordActivity() {
  return useContext(DiscordActivityContext)
}

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as
  | string
  | undefined

export function DiscordActivityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DiscordActivityState>({
    isActivity: isDiscordActivity(),
    ready: false,
    channelId: null,
    customId: null,
    error: null,
  })

  useEffect(() => {
    if (!state.isActivity || !DISCORD_CLIENT_ID) return

    initDiscordSdk(DISCORD_CLIENT_ID)
      .then(() => {
        setState({
          isActivity: true,
          ready: true,
          channelId: getDiscordChannelId(),
          customId: getDiscordCustomId(),
          error: null,
        })
      })
      .catch((err) => {
        console.error('Discord SDK init failed:', err)
        setState((prev) => ({
          ...prev,
          error: String(err),
        }))
      })
  }, [state.isActivity])

  return (
    <DiscordActivityContext.Provider value={state}>
      {children}
    </DiscordActivityContext.Provider>
  )
}

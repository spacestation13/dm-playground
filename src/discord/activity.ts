export function isDiscordActivity(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    return params.has('frame_id') && params.has('instance_id')
  } catch {
    return false
  }
}

export function getWorkerAssetUrls(): {
  vmRemoteUrl: string
  seaBiosUrl: string
  vgaBiosUrl: string
} {
  const origin = window.location.origin
  return {
    vmRemoteUrl: `${origin}/.proxy/ext/vm-assets/`,
    seaBiosUrl: `${origin}/.proxy/ext/v86-bios/seabios.bin`,
    vgaBiosUrl: `${origin}/.proxy/ext/v86-bios/vgabios.bin`,
  }
}

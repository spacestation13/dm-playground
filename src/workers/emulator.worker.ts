self.addEventListener('message', (event) => {
  const { data } = event
  // TODO: handle v86 worker commands
  if (data?.type === 'ping') {
    self.postMessage({ type: 'pong' })
  }
})

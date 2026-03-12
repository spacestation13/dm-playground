import { Suspense, lazy } from 'react'

const EditorPanel = lazy(async () => {
  const module = await import('./EditorPanel')
  return { default: module.EditorPanel }
})

export function LazyEditorPanel() {
  return (
    <Suspense fallback={null}>
      <EditorPanel />
    </Suspense>
  )
}

import { useCallback, useEffect, useRef } from 'react'
import { Editor } from '../components/Editor'
import { executorService } from '../../services/ExecutorService'
import { useThemeSetting } from '../settings/localSettings'
import { buildShareUrl, embedParams } from '../embed/embedParams'
import { useExecutorStatus } from '../hooks/useExecutorStatus'
import { useRuntimeBootstrap } from '../hooks/useRuntimeBootstrap'
import { type EditableProjectFileName } from '../editorProject/projectState'
import { useShowAdvancedEditorTabsSetting } from '../settings/localSettings'
import useProjectStore, {
  useResolvedActiveFile,
  useVisibleFiles,
} from '../stores/projectStore'

export function EditorPanel() {
  const project = useProjectStore((s) => s.project)
  const setActiveFile = useProjectStore((s) => s.setActiveFile)
  const updateFile = useProjectStore((s) => s.updateFile)
  const [themeId] = useThemeSetting()
  const [showAdvancedEditorTabs] = useShowAdvancedEditorTabsSetting()
  const hasAutoran = useRef(false)
  const {
    bootstrapRuntime,
    canRun,
    canTriggerRun,
    isByondLoading,
    isRuntimeBootstrapping,
  } = useRuntimeBootstrap()
  const executionStatus = useExecutorStatus()
  const visibleFiles = useVisibleFiles(
    !embedParams.isEmbed && showAdvancedEditorTabs
  )
  const resolvedActiveFile = useResolvedActiveFile(
    !embedParams.isEmbed && showAdvancedEditorTabs
  )

  useEffect(() => {
    if (embedParams.isEmbed && embedParams.autorun) {
      void bootstrapRuntime()
    }
  }, [bootstrapRuntime])

  const handleRun = useCallback(() => {
    void (async () => {
      if (!canRun) {
        const bootstrapped = await bootstrapRuntime()
        if (!bootstrapped) {
          return
        }
      }

      void executorService.executeImmediate(project)
    })()
  }, [bootstrapRuntime, canRun, project])

  useEffect(() => {
    if (!embedParams.autorun || hasAutoran.current || !canRun) {
      return
    }

    hasAutoran.current = true
    handleRun()
  }, [canRun, handleRun])

  useEffect(() => {
    const handleRequestShare = async () => {
      const url = await buildShareUrl(project)
      console.log('Share payload', project)
      try {
        await navigator.clipboard.writeText(url)
        window.alert('Share link copied to clipboard')
      } catch {
        window.prompt('Copy this link', url)
      }
    }

    window.addEventListener('requestShare', handleRequestShare as EventListener)
    return () =>
      window.removeEventListener(
        'requestShare',
        handleRequestShare as EventListener
      )
  }, [project])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Editor
        files={visibleFiles}
        activeFileId={resolvedActiveFile}
        onActiveFileChange={setActiveFile}
        onChange={(fileName, value) => {
          updateFile(fileName as EditableProjectFileName, value)
        }}
        onRun={canTriggerRun ? handleRun : undefined}
        runDisabled={
          canTriggerRun
            ? isByondLoading ||
              isRuntimeBootstrapping ||
              executionStatus === 'running'
            : true
        }
        themeId={themeId}
      />
    </div>
  )
}

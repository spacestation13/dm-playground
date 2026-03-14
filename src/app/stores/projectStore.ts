import { create } from 'zustand'
import {
  MAIN_FILE_NAME,
  createDefaultProject,
  updateProjectFile,
  getVisibleProjectFiles,
  type PlaygroundProject,
  type EditableProjectFileName,
} from '../editorProject/projectState'
import { embedParams } from '../embed/embedParams'

type ProjectStore = {
  project: PlaygroundProject
  setProject: (p: PlaygroundProject) => void
  activeFile: EditableProjectFileName
  setActiveFile: (f: EditableProjectFileName) => void
  updateFile: (file: EditableProjectFileName, value: string) => void
}

const initialProject = embedParams.project ?? createDefaultProject()

export const useProjectStore = create<ProjectStore>((set) => ({
  project: initialProject,
  setProject: (p) => set({ project: p }),
  activeFile: MAIN_FILE_NAME,
  setActiveFile: (f) => set({ activeFile: f }),
  updateFile: (file, value) =>
    set((state) => ({
      project: updateProjectFile(state.project, file, value),
    })),
}))

import { useMemo } from 'react'

export function useVisibleFiles(showAdvanced: boolean) {
  const project = useProjectStore((s) => s.project)
  return useMemo(
    () => getVisibleProjectFiles(project, showAdvanced),
    [project, showAdvanced]
  )
}

export function useResolvedActiveFile(showAdvanced: boolean) {
  const project = useProjectStore((s) => s.project)
  const active = useProjectStore((s) => s.activeFile)
  return useMemo(() => {
    const visible = getVisibleProjectFiles(project, showAdvanced)
    return visible.some((f) => f.id === active) ? active : MAIN_FILE_NAME
  }, [project, active, showAdvanced])
}

export default useProjectStore

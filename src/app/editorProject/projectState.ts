export const MAIN_FILE_NAME = 'main'
export const BOOTSTRAP_FILE_NAME = 'boot'
export const GENERATED_DME_FILE_NAME = 'play.dme'

export type EditableProjectFileName =
  | typeof MAIN_FILE_NAME
  | typeof BOOTSTRAP_FILE_NAME

export interface PlaygroundProject {
  files: Record<EditableProjectFileName, string>
}

interface SharedProjectPayload {
  v: 1
  f: Partial<Record<EditableProjectFileName, string>> & {
    main: string
  }
}

export interface ProjectFileDefinition {
  name: EditableProjectFileName
  label: string
  isAdvanced: boolean
}

export const PROJECT_FILE_DEFINITIONS: ProjectFileDefinition[] = [
  {
    name: MAIN_FILE_NAME,
    label: `${MAIN_FILE_NAME}.dm`,
    isAdvanced: false,
  },
  {
    name: BOOTSTRAP_FILE_NAME,
    label: `${BOOTSTRAP_FILE_NAME}.dm`,
    isAdvanced: true,
  },
]

const DEFAULT_MAIN_FILE = `/proc/main()\n  world.log << "meow"\n`
const DEFAULT_BOOTSTRAP_FILE = `/world/New()\n  ..()\n  main()\n  eval("")\n  shutdown()\n`

export function createDefaultProject(): PlaygroundProject {
  return {
    files: {
      [MAIN_FILE_NAME]: DEFAULT_MAIN_FILE,
      [BOOTSTRAP_FILE_NAME]: DEFAULT_BOOTSTRAP_FILE,
    },
  }
}

export function cloneProject(project: PlaygroundProject): PlaygroundProject {
  return {
    files: {
      [MAIN_FILE_NAME]: ensureTrailingNewline(project.files[MAIN_FILE_NAME]),
      [BOOTSTRAP_FILE_NAME]: ensureTrailingNewline(
        project.files[BOOTSTRAP_FILE_NAME]
      ),
    },
  }
}

export function updateProjectFile(
  project: PlaygroundProject,
  fileName: EditableProjectFileName,
  value: string
): PlaygroundProject {
  return {
    files: {
      ...project.files,
      [fileName]: value,
    },
  }
}

export function getEditableProjectFiles(project: PlaygroundProject) {
  return PROJECT_FILE_DEFINITIONS.map((definition) => ({
    ...definition,
    id: definition.name,
    value: project.files[definition.name],
  }))
}

export function getVisibleProjectFiles(
  project: PlaygroundProject,
  showAdvancedFiles: boolean
) {
  return getEditableProjectFiles(project).filter(
    (file) => showAdvancedFiles || !file.isAdvanced
  )
}

export function serializeProject(
  project: PlaygroundProject
): SharedProjectPayload {
  const normalized = normalizeProject(project)
  const f: SharedProjectPayload['f'] = {
    main: normalized.files[MAIN_FILE_NAME],
  }

  if (!isDefaultBootstrapFile(normalized.files[BOOTSTRAP_FILE_NAME])) {
    f.boot = normalized.files[BOOTSTRAP_FILE_NAME]
  }

  return {
    v: 1,
    f,
  }
}

export function deserializeProject(value: unknown): PlaygroundProject | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as { v?: number; f?: unknown }
  if (!candidate.f || typeof candidate.f !== 'object') {
    return null
  }

  const f = candidate.f as Record<string, unknown>
  const main = f.main

  if (typeof main !== 'string') {
    return null
  }

  const bootstrap = typeof f.boot === 'string' ? f.boot : undefined

  return normalizeProject({
    files: {
      [MAIN_FILE_NAME]: main,
      ...(bootstrap ? { [BOOTSTRAP_FILE_NAME]: bootstrap } : {}),
    },
  })
}

export function normalizeProject(value: unknown): PlaygroundProject {
  const fallback = createDefaultProject()

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const files = (value as { files?: Record<string, unknown> }).files
  if (!files || typeof files !== 'object') {
    return fallback
  }

  return {
    files: {
      [MAIN_FILE_NAME]: ensureTrailingNewline(
        typeof files[MAIN_FILE_NAME] === 'string'
          ? files[MAIN_FILE_NAME]
          : fallback.files[MAIN_FILE_NAME]
      ),
      [BOOTSTRAP_FILE_NAME]: ensureTrailingNewline(
        typeof files[BOOTSTRAP_FILE_NAME] === 'string'
          ? files[BOOTSTRAP_FILE_NAME]
          : fallback.files[BOOTSTRAP_FILE_NAME]
      ),
    },
  }
}

export function createProjectFromMainCode(code: string): PlaygroundProject {
  return {
    files: {
      [MAIN_FILE_NAME]: ensureTrailingNewline(code.replace(/\r\n/g, '\n')),
      [BOOTSTRAP_FILE_NAME]: DEFAULT_BOOTSTRAP_FILE,
    },
  }
}

export function generateProjectDme(
  fileNames: Record<EditableProjectFileName, string>
) {
  const includes = PROJECT_FILE_DEFINITIONS.map(
    (file) => `#include "${fileNames[file.name]}"`
  )
  return `${includes.join('\n')}\n`
}

export function buildProjectExecutionFiles(project: PlaygroundProject) {
  const normalized = cloneProject(project)
  const fileNames: Record<EditableProjectFileName, string> = {
    [MAIN_FILE_NAME]: `${MAIN_FILE_NAME}.dm`,
    [BOOTSTRAP_FILE_NAME]: `${BOOTSTRAP_FILE_NAME}.dm`,
  }

  return {
    dmeName: GENERATED_DME_FILE_NAME,
    dmbName: GENERATED_DME_FILE_NAME.replace(/\.dme$/, '.dmb'),
    files: getEditableProjectFiles(normalized).map((file) => ({
      name: fileNames[file.name],
      value: file.value,
    })),
    dmeContent: generateProjectDme(fileNames),
  }
}

function ensureTrailingNewline(value: string) {
  return value.endsWith('\n') ? value : `${value}\n`
}

function isDefaultBootstrapFile(value: string) {
  return (
    ensureTrailingNewline(value) ===
    ensureTrailingNewline(DEFAULT_BOOTSTRAP_FILE)
  )
}

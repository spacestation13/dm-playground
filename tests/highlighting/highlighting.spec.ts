import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface HighlightingToken {
  startIndex: number
  endIndex: number
  text: string
  type: string
}

type HighlightingTokenLines = HighlightingToken[][]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixtureDir = path.join(__dirname, 'src')

async function loadFixture(name: string): Promise<string> {
  return readFile(path.join(fixtureDir, name), 'utf8')
}

async function prepareTokenizer(page: Page): Promise<void> {
  await page.goto('/?embed=1')
  await expect(page.getByText('DM Editor')).toBeVisible()
  await page.waitForFunction(
    () =>
      typeof (
        window as Window & {
          __DM_PLAYGROUND_TEST__?: { tokenizeDm?: (source: string) => unknown }
        }
      ).__DM_PLAYGROUND_TEST__?.tokenizeDm === 'function'
  )
}

async function tokenizeFixture(
  page: Page,
  fixtureName: string
): Promise<{
  source: string
  lines: string[]
  tokens: HighlightingTokenLines
}> {
  const source = await loadFixture(fixtureName)
  const normalizedSource = source.replace(/\r\n/g, '\n')
  const tokens = await page.evaluate((snippet) => {
    return (
      (
        window as Window & {
          __DM_PLAYGROUND_TEST__?: {
            tokenizeDm?: (source: string) => HighlightingTokenLines
          }
        }
      ).__DM_PLAYGROUND_TEST__?.tokenizeDm?.(snippet) ?? []
    )
  }, normalizedSource)

  return {
    source: normalizedSource,
    lines: normalizedSource.split('\n'),
    tokens,
  }
}

function findLineIndex(lines: string[], exactLine: string): number {
  const lineIndex = lines.findIndex((line) => line === exactLine)
  expect(lineIndex, `Unable to find line: ${exactLine}`).toBeGreaterThanOrEqual(
    0
  )
  return lineIndex
}

function findToken(
  lineTokens: HighlightingToken[],
  text: string,
  occurrence = 1
): HighlightingToken {
  const matches = lineTokens.filter((token) => token.text === text)
  expect(
    matches.length,
    `Expected to find token ${text} ${occurrence} time(s), found ${matches.length}`
  ).toBeGreaterThanOrEqual(occurrence)
  return matches[occurrence - 1] as HighlightingToken
}

test.describe('DM highlighting fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await prepareTokenizer(page)
  })

  test('declarations fixture tokenizes declaration names and post-signature identifiers', async ({
    page,
  }) => {
    const { lines, tokens } = await tokenizeFixture(page, 'declarations.dm')

    const procLine = tokens[findLineIndex(lines, '/proc/main()')] ?? []
    expect(findToken(procLine, 'proc').type).toBe('storage.type.dm')
    expect(findToken(procLine, 'main').type).toBe('entity.name.function.dm')

    const varLine =
      tokens[findLineIndex(lines, '\tvar/list/blocking_procs_list = list()')] ??
      []
    expect(findToken(varLine, 'var').type).toBe('storage.type.dm')
    expect(findToken(varLine, 'list').type).toBe('support.type.dm')
    expect(findToken(varLine, 'blocking_procs_list').type).toBe('variable.dm')
    expect(findToken(varLine, '=').type).toBe('keyword.operator.dm')
    expect(findToken(varLine, 'list', 2).type).toBe('support.function.dm')

    const worldLine =
      tokens[findLineIndex(lines, '\tworld.log << "meow"')] ?? []
    expect(findToken(worldLine, 'world').type).toBe('variable.language.dm')

    const plainIdentifierLine = tokens[findLineIndex(lines, '\tf = 1')] ?? []
    expect(findToken(plainIdentifierLine, 'f').type).toBe('identifier.dm')

    const verbLine = tokens[findLineIndex(lines, '/verb/sample_verb()')] ?? []
    expect(findToken(verbLine, 'verb').type).toBe('storage.type.dm')
    expect(findToken(verbLine, 'sample_verb').type).toBe(
      'entity.name.function.dm'
    )
  })

  test('calls fixture tokenizes proc calls and member calls without coloring the dot', async ({
    page,
  }) => {
    const { lines, tokens } = await tokenizeFixture(page, 'calls.dm')

    const simpleCallLine = tokens[findLineIndex(lines, '\tmain()')] ?? []
    expect(findToken(simpleCallLine, 'main').type).toBe(
      'entity.name.function.dm'
    )

    const memberCallLine =
      tokens[findLineIndex(lines, '\tblocking_procs_list.Join(", ")')] ?? []
    expect(findToken(memberCallLine, 'blocking_procs_list').type).toBe(
      'identifier.dm'
    )
    expect(findToken(memberCallLine, '.').type).toBe('delimiter.dm')
    expect(findToken(memberCallLine, 'Join').type).toBe(
      'entity.name.function.dm'
    )

    const pathCallLine =
      tokens[findLineIndex(lines, '\tcall(/proc/main)()')] ?? []
    expect(findToken(pathCallLine, 'call').type).toBe('support.function.dm')
    expect(findToken(pathCallLine, 'proc').type).toBe('storage.type.dm')
    expect(findToken(pathCallLine, 'main').type).toBe('entity.name.function.dm')
  })

  test('parameters fixture tokenizes proc parameters and default values', async ({
    page,
  }) => {
    const { lines, tokens } = await tokenizeFixture(page, 'parameters.dm')

    const declarationLine =
      tokens[
        findLineIndex(
          lines,
          '/proc/sample(foo, bar = 5, baz = list(1, 2), qux as text, quux = new /datum/test(arg = 1))'
        )
      ] ?? []

    expect(
      declarationLine.map((t) => ({ text: t.text, type: t.type }))
    ).toEqual([
      { text: '/', type: 'delimiter.dm' },
      { text: 'proc', type: 'storage.type.dm' },
      { text: '/', type: 'delimiter.dm' },
      { text: 'sample', type: 'entity.name.function.dm' },
      { text: '(', type: 'delimiter.parenthesis.dm' },
      { text: 'foo', type: 'variable.parameter.dm' },
      { text: ',', type: 'delimiter.dm' },
      { text: 'bar', type: 'variable.parameter.dm' },
      { text: '=', type: 'delimiter.dm' },
      { text: '5', type: 'number.dm' },
      { text: ',', type: 'delimiter.dm' },
      { text: 'baz', type: 'variable.parameter.dm' },
      { text: '=', type: 'delimiter.dm' },
      { text: 'list', type: 'support.function.dm' },
      { text: '(', type: 'delimiter.parenthesis.dm' },
      { text: '1', type: 'number.dm' },
      { text: ',', type: 'delimiter.dm' },
      { text: '2', type: 'number.dm' },
      { text: ')', type: 'delimiter.parenthesis.dm' },
      { text: ',', type: 'delimiter.dm' },
      { text: 'qux', type: 'variable.parameter.dm' },
      { text: 'as', type: 'storage.modifier.dm' },
      { text: 'text', type: 'identifier.dm' },
      { text: ',', type: 'delimiter.dm' },
      { text: 'quux', type: 'variable.parameter.dm' },
      { text: '=', type: 'delimiter.dm' },
      { text: 'new', type: 'keyword.other.dm' },
      { text: '/', type: 'delimiter.dm' },
      { text: 'datum', type: 'support.type.dm' },
      { text: '/', type: 'delimiter.dm' },
      { text: 'test', type: 'identifier.dm' },
      { text: '(', type: 'delimiter.parenthesis.dm' },
      { text: 'arg', type: 'identifier.dm' },
      { text: '=', type: 'keyword.operator.dm' },
      { text: '1', type: 'number.dm' },
      { text: ')', type: 'delimiter.parenthesis.dm' },
      { text: ')', type: 'delimiter.parenthesis.dm' },
    ])

    const returnLine = tokens[findLineIndex(lines, '\treturn foo + bar')] ?? []
    expect(returnLine.map((t) => ({ text: t.text, type: t.type }))).toEqual([
      { text: 'return', type: 'keyword.control.dm' },
      { text: 'foo', type: 'identifier.dm' },
      { text: '+', type: 'keyword.operator.dm' },
      { text: 'bar', type: 'identifier.dm' },
    ])
  })
})

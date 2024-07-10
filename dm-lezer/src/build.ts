import { buildParserFile } from '@lezer/generator';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LRParser } from '@lezer/lr';
import * as child_process from 'node:child_process';

export async function buildDmGrammar(): Promise<LRParser> {
  const grammar = fs.readFileSync(
    path.join(import.meta.dirname, 'dm.grammar'),
    'utf8',
  );
  const { parser, terms } = buildParserFile(grammar, {
    typeScript: true,
  });
  fs.writeFileSync(path.join(import.meta.dirname, 'parser.ts'), parser);
  fs.writeFileSync(path.join(import.meta.dirname, 'parser.terms.ts'), terms);
  child_process.execSync('npx tsc');
  return (await import(path.join(import.meta.dirname, 'parser.ts'))).parser;
}

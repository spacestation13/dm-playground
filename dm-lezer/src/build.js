import { buildParserFile } from "@lezer/generator";
import * as fs from "node:fs";
import * as path from "node:path";

console.log(import.meta);

/**
 *
 * @returns {Promise<import("@lezer/lr").LRParser>}
 */
export async function buildDmGrammar() {
  const grammar = fs.readFileSync(
    path.join(import.meta.dirname, "dm.grammar"),
    "utf8",
  );
  const { parser, terms } = buildParserFile(grammar);
  fs.writeFileSync(path.join(import.meta.dirname, "parser.js"), parser);
  fs.writeFileSync(path.join(import.meta.dirname, "parser.terms.js"), terms);
  return (await import(path.join(import.meta.dirname, "parser.js"))).parser;
}

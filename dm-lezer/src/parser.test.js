import { parser } from "./parser.js";
import { fileTests } from "@lezer/generator/test";
import { readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../tests");

for (let file of readdirSync(dir)) {
  let tests = fileTests(readFileSync(join(dir, file), "utf8"), file);
  describe(file, () => {
    for (let { name, run } of tests) it(name, () => run(parser));
  });
}

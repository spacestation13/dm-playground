import { ExternalTokenizer } from '@lezer/lr';
import { blankLineStart, dedent, indent } from './parser.terms.js';

const newline = '\n'.charCodeAt(0),
  space = ' '.charCodeAt(0),
  tab = '\t'.charCodeAt(0),
  hash = '#'.charCodeAt(0),
  slash = '/'.charCodeAt(0),
  star = '*'.charCodeAt(0);

export const indentation = new ExternalTokenizer((input, stack) => {
  let prev = input.peek(-1);
  if (prev !== -1 && prev !== newline) return;
  let spaces = 0;
  while (input.next === space || input.next === tab) {
    input.advance();
    spaces++;
  }
  if (
    input.next === newline ||
    input.next === hash ||
    (input.next === slash &&
      (input.peek(1) === slash || input.peek(1) === star))
  ) {
    if (stack.canShift(blankLineStart))
      input.acceptToken(blankLineStart, -spaces);
  } else if (spaces > stack.context.indent.depth) {
    input.acceptToken(indent);
  } else if (spaces < stack.context.indent.depth) {
    input.acceptToken(dedent, -spaces);
  }
});

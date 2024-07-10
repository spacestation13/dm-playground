import { ContextTracker } from '@lezer/lr';
import { dedent, indent } from './parser.terms.js';

class IndentLevel {
  public hash: number;

  constructor(
    public parent: IndentLevel | null,
    public depth: number,
  ) {
    this.hash =
      (parent ? (parent.hash + parent.hash) << 8 : 0) + depth + (depth << 4);
  }
}

export const ctx = new ContextTracker({
  start: { indent: new IndentLevel(null, 0) },
  shift(context, term, stack, input) {
    if (term === indent)
      return {
        ...context,
        indent: new IndentLevel(context.indent, stack.pos - input.pos),
      };
    if (context.indent.parent == null) throw Error('Cannot dedent');
    if (term === dedent) return { ...context, indent: context.indent.parent };
    return context;
  },
  hash: (context) => context.indent.hash,
});

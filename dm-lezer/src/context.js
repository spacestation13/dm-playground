import { ContextTracker } from "@lezer/lr";
import { dedent, indent } from "./parser.terms.js";

class IndentLevel {
  constructor(parent, depth) {
    this.parent = parent;
    this.depth = depth;
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
        indent: new IndentLevel(context, stack.pos - input.pos),
      };
    if (term === dedent) return { ...context, indent: context.parent };
    return context;
  },
  hash: (context) => context.hash,
});

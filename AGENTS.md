<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Code style

- Dont write this one line function for simple tasks and if needed reuse it dont scatter for example.

```
function BrainIconLow({ className }: { className?: string }) {
  return <BrainAssetIcon src="/BrainIconLow.svg" className={className} />
}
```

- Use `rounded-md` for borders and corner radius across this project. Do not use `rounded-full`, `rounded-xl`, `rounded-2xl`, `rounded-none`, or other radius tokens unless the user explicitly asks to revert or override this.

## Frontend

- Keep one-off Tailwind classes in the component that renders the element. Split multiline `cn()` calls into base layout, visual treatment, interaction states, and conditionals.
- Keep `constants.ts` for copy, limits, timing, IDs, regexes, and domain data. Do not store a component's DOM styling there.
- Use `cva` only for a reused component with real variants. Do not create a variant helper for one element.
- Keep React component references in data only when an API or a genuinely data-driven catalog needs them.
- Split files by responsibility. A feature may have a view, one orchestration hook, and pure logic. Do not make a file for every button or Tailwind string.
- Preserve public component props, store shape, routes, and visual output during readability refactors. Functional changes belong in separate work.

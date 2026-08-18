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

- Have constants in a proper file instead of setting it inside components.

- Use `rounded-md` for borders and corner radius across this project. Do not use `rounded-full`, `rounded-xl`, `rounded-2xl`, `rounded-none`, or other radius tokens unless the user explicitly asks to revert or override this.

---
name: use-effect
description: >-
  Replaces direct useEffect with declarative patterns, useMountEffect for mount-only
  external sync, React Query, and step-by-step refactors. Use when writing or reviewing
  useEffect, effect chains, subscriptions, or frontend side effects.
---

# Frontend Guardrails: Avoid `useEffect` (React) — Use Declarative Patterns Instead

This document summarizes the key frontend practices from Alvin Sng’s article and the associated team rule used at FactoryAI: **do not reach for `useEffect` by default**. Rely on declarative React patterns and targeted alternatives such as derivation, data-fetching libraries, event handlers, and a constrained `useMountEffect()`.

## The escape hatch

A direct `useEffect` is allowed, but only as a last resort: when the behaviour genuinely cannot be expressed by deriving during render, by an event handler, by a `key` remount, or by `useMountEffect` / `useMountSubscription`. In practice that means it must react to a **changing** value and it must touch something outside React — a timer that has to be rescheduled as its input changes is the canonical example, since `useMountEffect` can only ever run once.

This is not enforced by ESLint, because the judgement call is the point and a lint error only teaches people to work around it. The bar is instead a review one:

- Walk the replacement patterns below first and be able to say why each one fails.
- Keep the effect to a single responsibility with a real cleanup — never an effect chain, and never state mirroring.
- Leave a comment at the call site saying what external system it drives and why the declarative route does not work.
- Prefer wrapping it in a named hook in `src/hooks/` so the effect is written once and call sites stay declarative, the way `useMountEffect` does.

If you cannot write that comment convincingly, the effect is the wrong tool.

---

## Key note (from the guide): “useMountEffect vs useEffect bugs”

### useMountEffect bugs (fewer calls, more obvious)
- **0 calls** → “feature never initializes” / “error state is immediate”
- These failure modes are often **obvious** and easier to debug.

### useEffect bugs (more calls, more subtle)
- **2+ … ∞ calls** → race conditions, memory leaks, or infinite loops
- Native `useEffect` can suffer from **over-triggering** (missing dependency arrays, incorrect dependencies, state updates inside effects).
- Subtle bugs can make it into production.

This means the team’s goal is not “make effects impossible”, but **make the effect surface area smaller and more deterministic**.

---

## Why the Rule Exists

### Core argument
The default order of preference:
- **Declarative patterns first** — derivation, event handlers, `key` remounts, data-fetching libraries
- **`useMountEffect()`** for mount-time external syncs
- **A direct `useEffect`** only when neither can express the behaviour (see “The escape hatch” above)

The goal is to improve:
- predictability
- maintainability
- resilience (especially when AI agents generate code)

---

## Problems with `useEffect`

1. **Brittleness**  
   Dependency arrays hide coupling. Refactors can silently break effects.

2. **Infinite loops**  
   Effects that update state can re-trigger themselves.

3. **Dependency hell**  
   Multiple effects can form hard-to-trace time-based flows.

4. **Debugging pain**  
   “Why did this run / not run?” is unclear, especially in larger apps.

---

## Replacement Patterns (Smell Tests)

Prefer these over `useEffect`:

1. **Derive state directly**  
   If something can be computed from props/state, compute during render rather than syncing via effects.

2. **Use data-fetching libraries**  
   Replace manual fetch effects with tools like **React Query**.

3. **Use event handlers for user actions**  
   Avoid effect-triggered logic controlled by state flags.

4. **Use `useMountEffect` for one-time external syncs**  
   Mount-only setup for external systems (subscriptions, widgets, DOM APIs).

5. **Reset via `key` prop**  
   Remount subtree on identity changes rather than effect-chasing prop changes.

---

## When is `useMountEffect` the right choice?

Use it when all of these are true:
- The behavior is tied to **component mount/unmount**
- It interacts with **external mutable systems** (DOM APIs, subscriptions, websocket listeners, third-party widgets)
- It does not represent “derive UI from state/props” (that should be done declaratively)

If your logic is “run whenever X changes”, you likely want:
- derived values,
- React Query,
- conditional rendering,
- event handler logic,
- or a remount strategy with `key`.

Only once all of those are ruled out — the work is external, and it has to be
redone as X changes rather than once on mount — does a direct `useEffect`
become the right answer.

---

## `useMountEffect`: Preferred Alternative

### Implementation
This repo already has it in `src/hooks/useMountEffect.ts`, alongside
`useMountSubscription` for the “subscribe once, always call the latest
listener” case. `useEffect` is used internally, as a controlled abstraction:

```typescript
import { useEffect, useEffectEvent } from "react"

/**
 * Runs `fn` exactly once on mount.
 * If `fn` returns a cleanup function, it runs on unmount.
 */
export function useMountEffect(fn: () => void | (() => void)) {
  const onMount = useEffectEvent(fn)

  useEffect(() => {
    return onMount()
  }, [])
}
```

Why this matters:
- It preserves the standard cleanup contract: returning a cleanup function from
  the effect callback.
- It avoids the common “cleanup not wired” mistake.

---

### Example: external subscription / DOM sync
```javascript
useMountEffect(() => {
  const subscription = someExternalAPI.subscribe((data) => {
    setAppState(data);
  });

  return () => {
    subscription.unsubscribe();
  };
});
```

---

## Why this is not an ESLint rule

An earlier version of this repo banned the `useEffect` import through
`no-restricted-syntax`. It was removed. A blanket ban cannot tell the difference
between state mirroring and a timer that has to be rescheduled, so the only
thing it reliably produces is a workaround: an inline disable, or a worse
construct chosen to dodge the rule. Review against the checklist above instead.

---

## Skill: “How to replace a `useEffect`” (step-by-step)

Use this checklist whenever you see or are asked to write `useEffect`.

### Step 1: Identify the intent of the effect
Ask: what is the effect trying to do?

Common categories:
1. **Derive UI** from existing data
2. **Fetch data** / synchronize server state
3. **React to user events** (clicks, form submits)
4. **Perform one-time mount work** (subscriptions, widget init)
5. **Reset state** on identity changes (e.g., `id` changes)

### Step 2: Map intent to the correct pattern
- If it’s **UI derivation** → derive in render (no state mirroring).
- If it’s **data fetching** → React Query (or equivalent).
- If it’s **user action** → event handler directly.
- If it’s **mount-only external sync** → `useMountEffect`.
- If it’s **identity reset** → use `key` and remount.

### Step 3: Remove effect-chains
Avoid multi-effect flows like:
- effect A updates state
- effect B watches that state
- effect C triggers side effects
Replace with:
- a single declarative derivation,
- a library-managed subscription/fetch,
- or explicit event flow.

### Step 4: Watch for accidental “state as triggers”
If you previously wrote:
- set flag in event
- then effect listens to flag
That’s a smell. Prefer calling the side effect directly inside the event handler,
or restructure the state so the UI derives from it (not triggers effects).

### Step 5: Ensure cleanup only exists for mount external systems
Cleanup is only appropriate when you created:
- a subscription
- a listener
- a timer
- a websocket connection
that must be disposed.

Avoid cleanup “just because” you used effects before.

---

## Concrete Before/After Patterns

### A) Derive directly (avoid state mirroring)
Bad:
```javascript
useEffect(() => {
  setDerivedValue(props.value);
}, [props.value]);
```

Good:
```javascript
const derivedValue = props.value;
```

---

### B) Data fetching: React Query instead of manual effect fetch
```javascript
import { useQuery } from "react-query";

function User({ userId }) {
  const { data: user } = useQuery(["user", userId], () =>
    fetch(`/api/users/${userId}`).then((res) => res.json())
  );

  return <div>{user?.name}</div>;
}
```

---

### C) Event handlers instead of “effect triggered by state”
Bad:
```javascript
const [isClicked, setIsClicked] = useState(false);

useEffect(() => {
  if (isClicked) doSomething();
}, [isClicked]);
```

Good:
```javascript
const handleClick = () => {
  doSomething();
  setIsClicked(true);
};
```

---

### D) Reset with `key` instead of effect-on-prop-change
If the goal is “new identity = fresh component state”:

```javascript
function MyComponent({ id }) {
  const [data, setData] = useState(null);

  useMountEffect(() => {
    fetchData(id).then(setData);
  });

  return <ChildComponent key={id} data={data} />;
}
```

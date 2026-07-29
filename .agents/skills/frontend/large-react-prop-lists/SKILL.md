---
name: large-react-prop-lists
description: >-
  Evaluating when many React props are fine vs a smell, grouping related props into
  objects, splitting components, container/presentational patterns, and when context
  helps. Use when reviewing or refactoring components with wide prop surfaces.
---

# Evaluating and Refactoring Large React Prop Lists

## Summary

Passing many props to a React component is not automatically bad, but it is often a sign to review the component design. A large prop list can indicate that a component has too many responsibilities, that related values should be grouped, or that the component should be split into smaller parts.

## When Many Props Are Acceptable

A large number of props can be fine when:

- The component is feature-specific rather than broadly reusable
- The props all belong to the same feature area
- The component is intentionally controlled by its parent
- The API is still understandable and maintainable
- The component sits at a feature boundary

## Warning Signs

A large prop list may need refactoring when:

- The component handles multiple distinct responsibilities
- The props naturally fall into separate clusters
- The parent and child feel tightly coupled
- The component contract is hard to scan or remember
- Tests require a lot of setup just to render the component
- The component is annoying to reuse because too many props are required

## How to Evaluate a Large Prop List

### 1. Check whether the props are coherent

Ask whether the props all describe one clear responsibility.

Example clusters in a staging panel might include:

- Folder selection
- Item selection
- Target group selection
- Pending items management

If the props clearly separate into multiple domains, that is a sign the component may be doing too much.

### 2. Look for many controlled pairs

It is common in React to pass data and callbacks together, such as:

- `value` + `onChange`
- `selectedIds` + `onToggleRow`
- `expanded` + `onExpandedChange`

These are normal, but too many of them in one component can make the API heavy and difficult to understand.

### 3. Test readability

Ask:

- Do I need to scroll to understand the component API?
- Is it easy to forget which props are required?
- Does using this component feel tedious?

If the answer is yes, the interface is probably too wide.

## Refactoring Strategies

### 1. Group related props into objects

When props belong to clear subdomains, group them into named objects.

Instead of:

```tsx
<BookmarkImportStagingPanel
  folderKeys={chromeFolderKeys}
  effectiveChromeFolderKey={effectiveChromeFolderKey}
  onChromeFolderChange={handleChromeFolderChange}
  availableInFolder={availableInFolder}
  selectedIds={selectedIds}
  onToggleRow={handleToggleRow}
  onSelectAll={handleSelectAll}
  onSelectNone={handleSelectNone}
  groups={groups}
  effectiveTargetGroupId={effectiveTargetGroupId}
  onTargetGroupChange={handleTargetGroupChange}
  targetGroupTitle={targetGroupTitle}
  onAddToGroup={handleAddToGroup}
  selectedInFolderCount={selectedInFolderCount}
  groupsWithPending={groupsWithPending}
  pendingByGroup={pendingByGroup}
  pendingGroupExpanded={pendingGroupExpanded}
  onPendingGroupExpandedChange={handlePendingGroupExpandedChange}
  onRemoveFromPending={handleRemoveFromPending}
  totalPendingCount={totalPendingCount}
  pendingSectionRef={pendingSectionRef}
/>
```

Use:

```tsx
<BookmarkImportStagingPanel
  folder={{
    keys: chromeFolderKeys,
    effectiveKey: effectiveChromeFolderKey,
    availableInFolder,
    onChange: handleChromeFolderChange,
  }}
  selection={{
    selectedIds,
    selectedInFolderCount,
    onToggleRow: handleToggleRow,
    onSelectAll: handleSelectAll,
    onSelectNone: handleSelectNone,
  }}
  targetGroup={{
    groups,
    effectiveTargetGroupId,
    targetGroupTitle,
    onChange: handleTargetGroupChange,
    onAdd: handleAddToGroup,
  }}
  pending={{
    groupsWithPending,
    pendingByGroup,
    expanded: pendingGroupExpanded,
    totalCount: totalPendingCount,
    sectionRef: pendingSectionRef,
    onExpandedChange: handlePendingGroupExpandedChange,
    onRemove: handleRemoveFromPending,
  }}
/>
```

Benefits:

- Easier to scan
- Clearer domain boundaries
- Better TypeScript organization
- Less visual noise at the callsite

### 2. Split the component into smaller subcomponents

If the component renders distinct sections, break it apart.

Possible subcomponents:

- `BookmarkImportFolderPicker`
- `BookmarkImportSelectionTable`
- `BookmarkImportTargetGroupSection`
- `BookmarkImportPendingSection`

Benefits:

- Each component gets a smaller prop surface
- Easier to test
- Easier to reason about responsibilities
- Encourages cleaner boundaries

### 3. Use a container/presentational split

If the component is mostly UI, move state orchestration into a container and keep the panel focused on rendering.

Example:

```tsx
<BookmarkImportStagingPanel
  viewModel={stagingPanelViewModel}
  actions={stagingPanelActions}
/>
```

This works well when the component is specific to one feature and does not need to be highly generic.

### 4. Use context only when props are drilled deeply

If props are passed through several component layers only to reach a deeply nested child, context may help.

Do not use context just to avoid a long prop list at a single component boundary. A long prop list at one level is often more explicit and maintainable than hiding dependencies in context.

## Practical Guidance

### Large prop lists are usually okay when:

- The component owns one cohesive feature
- The list is long but understandable
- Each prop is directly used by the component
- The component is intentionally controlled

### Large prop lists should usually be refactored when:

- The props break into obvious groups
- The component feels like multiple components in one
- The API is hard to read
- Callsite setup feels repetitive or fragile

## Rule of Thumb

Ask:

> Would this component be easier to understand as one big flat API, or as a few named sections?

In most cases, named sections are easier to understand.

## Recommended Refactoring Order

1. Group related props into objects
2. If still too large, split the component into subcomponents
3. If needed, introduce a container/presentational pattern
4. Use context only for genuine deep prop drilling

## Takeaway

Many props are not automatically a problem. They become a problem when they make the component hard to understand, hard to test, or responsible for too many concerns. The best first step is usually to group related props into meaningful objects, and then split the component further if necessary.

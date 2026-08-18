export function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This section will be added next.
      </p>
    </section>
  )
}

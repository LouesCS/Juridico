/**
 * Reafirma docs/frontend/04-app-router.md §4.2 — card centralizado, sem
 * Sidebar/Topbar.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-muted/30 p-6"
    >
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-elevation-2">
        {children}
      </div>
    </main>
  );
}

export function ThinkingIndicator() {
  return (
    <div className="mr-8 flex items-center gap-1 text-sm text-muted-foreground" role="status" aria-label="Pensando">
      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-current" />
    </div>
  );
}

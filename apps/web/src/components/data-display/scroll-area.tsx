'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Arrastar o fundo do container para rolar horizontalmente (padrão de board tipo Linear/Trello) — só ativa quando o gesto começa no próprio container, nunca sobre um filho (ex.: um cartão arrastável do Kanban). */
  dragToPan?: boolean;
}

/**
 * PROMPT 14.5 (UX Polish) — scrollbar sempre invisível em repouso
 * (`.scrollbar-fade`, globals.css), revelada durante hover/scroll/drag via
 * `data-scroll-active`. Generalizado para a Sidebar (vertical) e o board do
 * Kanban (horizontal, com wheel-para-horizontal e `dragToPan`) — reafirma
 * "identificar código repetido, generalizar, nunca duplicar" (FASE 0):
 * nenhum outro lugar do app precisa do comportamento "aparece durante o
 * gesto"; tabelas/diálogos/listas usam só a classe `.scrollbar-fade`
 * (revela no hover) diretamente no seu próprio container.
 */
export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      orientation = 'vertical',
      dragToPan = false,
      onScroll,
      onWheel,
      onMouseDown,
      onMouseEnter,
      onMouseLeave,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLDivElement>(null);
    const [active, setActive] = React.useState(false);
    const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const panRef = React.useRef<{ startX: number; scrollLeft: number } | null>(null);

    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement);

    React.useEffect(() => () => clearTimeout(hideTimeoutRef.current), []);

    function pulse() {
      setActive(true);
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => setActive(false), 900);
    }

    function handleScroll(event: React.UIEvent<HTMLDivElement>) {
      pulse();
      onScroll?.(event);
    }

    function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
      if (
        (orientation === 'horizontal' || orientation === 'both') &&
        !event.shiftKey &&
        Math.abs(event.deltaY) > Math.abs(event.deltaX)
      ) {
        event.currentTarget.scrollLeft += event.deltaY;
        event.preventDefault();
      }
      pulse();
      onWheel?.(event);
    }

    function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
      onMouseDown?.(event);
      if (!dragToPan || event.target !== event.currentTarget) return;
      const el = event.currentTarget;
      panRef.current = { startX: event.clientX, scrollLeft: el.scrollLeft };

      function handleMove(moveEvent: MouseEvent) {
        if (!panRef.current) return;
        el.scrollLeft = panRef.current.scrollLeft - (moveEvent.clientX - panRef.current.startX);
        pulse();
      }
      function handleUp() {
        panRef.current = null;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      }
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }

    const overflowClass =
      orientation === 'horizontal'
        ? 'overflow-x-auto overflow-y-hidden'
        : orientation === 'both'
          ? 'overflow-auto'
          : 'overflow-y-auto overflow-x-hidden';

    return (
      <div
        ref={innerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseEnter={(event) => {
          setActive(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          if (!panRef.current) setActive(false);
          onMouseLeave?.(event);
        }}
        data-scroll-active={active || undefined}
        className={cn('scrollbar-fade', overflowClass, dragToPan && 'cursor-grab active:cursor-grabbing', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ScrollArea.displayName = 'ScrollArea';

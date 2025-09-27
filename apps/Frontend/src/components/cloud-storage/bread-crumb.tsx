import { Fragment, useEffect, useRef, useState } from "react";

/**
 * Improved Breadcrumbs helper component
 * - Renders a pill-style path with chevrons
 * - Collapses middle items when path is long and exposes them via an ellipsis dropdown
 * - Clickable items, accessible, responsive truncation
 */

export type FolderMeta = {
  id: number | null;
  name: string | null;
  parentId: number | null;
};

export function Breadcrumbs({
  path,
  onNavigate,
}: {
  path: FolderMeta[];
  onNavigate: (id: number | null) => void;
}) {
  const [openEllipsis, setOpenEllipsis] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setOpenEllipsis(false);
      }
    }
    if (openEllipsis) {
      document.addEventListener("mousedown", onDocClick);
    }
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openEllipsis]);

  // Render strategy: if path.length <= 4 show all; else show: first, ellipsis, last 2
  const showAll = path.length <= 4;
  const first = path[0];
  const lastTwo = path.slice(Math.max(0, path.length - 2));
  const middle = path.slice(1, Math.max(1, path.length - 2));

  // utility classes
  const inactiveChip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm truncate max-w-[220px] bg-muted hover:bg-muted/80 text-muted-foreground";
  const activeChip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm truncate max-w-[220px] bg-primary/10 text-primary ring-1 ring-primary/20";

  // render a chip with optional active flag
  function Chip({
    id,
    name,
    active,
  }: {
    id: number | null;
    name: string | null;
    active?: boolean;
  }) {
    return (
      <button
        className={active ? activeChip : inactiveChip}
        onClick={() => onNavigate(id)}
        title={name ?? (id ? `Folder ${id}` : "My Cloud Storage")}
        aria-current={active ? "page" : undefined}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M3 7h18v10H3z" />
        </svg>
        <span className="truncate">
          {name ?? (id ? `Folder ${id}` : "My Cloud Storage")}
        </span>
      </button>
    );
  }

  // small slash separator (visible between chips)
  const Slash = () => <li className="text-muted-foreground px-1">/</li>;

  return (
    // Card-like background for the entire breadcrumb strip
    <nav className="bg-card p-3 rounded-md shadow-sm" aria-label="breadcrumb">
      <ol className="flex items-center gap-2 flex-wrap">
        {/* Root chip */}
        <li>
          <button
            className={path.length === 0 ? activeChip : inactiveChip}
            onClick={() => onNavigate(null)}
            title="My Cloud Storage"
            aria-current={path.length === 0 ? "page" : undefined}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1v-8.5z" />
            </svg>
            <span className="hidden sm:inline">My Cloud Storage</span>
          </button>
        </li>

        {path.length > 0 && <Slash />}

        {showAll ? (
          // show all crumbs as chips with slashes between
          path.map((p, idx) => (
            <Fragment key={String(p.id ?? idx)}>
              <li>
                <Chip
                  id={p.id}
                  name={p.name}
                  active={idx === path.length - 1}
                />
              </li>
              {idx !== path.length - 1 && <Slash />}
            </Fragment>
          ))
        ) : (
          // collapsed view: first, ellipsis dropdown, last two (with slashes)
          <>
            {first && (
              <>
                <li>
                  <Chip id={first.id} name={first.name} active={false} />
                </li>
                <Slash />
              </>
            )}

            <li>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setOpenEllipsis((s) => !s)}
                  aria-expanded={openEllipsis}
                  className={inactiveChip}
                  title="Show hidden path"
                >
                  •••
                </button>

                {/* dropdown for middle items */}
                {openEllipsis && (
                  <div className="absolute left-0 mt-2 w-56 bg-popover border rounded shadow z-50">
                    <ul className="p-2">
                      {middle.map((m) => (
                        <li key={String(m.id)}>
                          <button
                            className="w-full text-left px-2 py-1 rounded hover:bg-accent/5 text-sm text-muted-foreground"
                            onClick={() => {
                              setOpenEllipsis(false);
                              onNavigate(m.id);
                            }}
                          >
                            {m.name ?? `Folder ${m.id}`}
                          </button>
                        </li>
                      ))}
                      {middle.length === 0 && (
                        <li>
                          <div className="px-2 py-1 text-sm text-muted-foreground">
                            No hidden folders
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </li>

            <Slash />

            {lastTwo.map((p, idx) => (
              <Fragment key={String(p.id ?? `tail-${idx}`)}>
                <li>
                  <Chip
                    id={p.id}
                    name={p.name}
                    active={idx === lastTwo.length - 1}
                  />
                </li>
                {idx !== lastTwo.length - 1 && <Slash />}
              </Fragment>
            ))}
          </>
        )}
      </ol>
    </nav>
  );
}

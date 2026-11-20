"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
const glyphs = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  people:
    "M15 20v-2a5 5 0 0 0-10 0v2 M10 4a3 3 0 1 0 .01 0 M17 6a3 3 0 0 1 0 6 M18 15a4 4 0 0 1 3 4",
  org: "M9 3h6v5H9z M12 8v4 M5 16v-4h14v4 M2 16h6v5H2z M16 16h6v5h-6z",
  time: "M12 3a9 9 0 1 0 .01 0 M12 7v5l4 3",
  calendar: "M3 6h18v15H3z M7 3v6 M17 3v6 M3 11h18",
  leave: "M4 5h16v15H4z M8 3v4 M16 3v4 M8 14l3 3 5-6",
  workforce: "M3 8h18v12H3z M8 8V5h8v3 M3 12q9 5 18 0",
  onboarding: "M5 3h14v18H5z M8 12l3 3 5-6",
  pay: "M4 4h16v16l-3-2-3 2-3-2-3 2-4-2z M8 8h8 M8 12h5",
  expense: "M3 7h18v13H3z M3 10h18 M15 15h3",
  compliance: "M12 3l8 3v6q0 6-8 10-8-4-8-10V6z M8 12l3 3 5-6",
  profile: "M12 4a4 4 0 1 0 .01 0 M4 21a8 8 0 0 1 16 0",
};
export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof glyphs;
  group: string;
  count?: number;
};
type Props = {
  items: NavItem[];
  pathname: string;
  home: string;
  company: string;
  identity: string;
  tools?: ReactNode;
  children: ReactNode;
  link: (
    href: string,
    content: ReactNode,
    attrs: { className: string; "aria-current"?: "page" },
  ) => ReactNode;
};
function JumpMenu({ items, link }: { items: NavItem[]; link: Props["link"] }) {
  const modal = useRef<HTMLDialogElement>(null),
    field = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  function open() {
    if (!modal.current?.open) {
      setQuery("");
      modal.current?.showModal();
      field.current?.focus();
    }
  }
  useEffect(() => {
    const shortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (modal.current?.open) modal.current.close();
        else open();
      }
    };
    document.addEventListener("keydown", shortcuts);
    return () => document.removeEventListener("keydown", shortcuts);
  }, []);
  const results = items.filter((i) =>
    (i.label + " " + i.group)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <button
        type="button"
        className="hr-jump-trigger"
        onClick={open}
        aria-haspopup="dialog"
      >
        <svg
          aria-hidden="true"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="10" cy="10" r="6" />
          <path d="m15 15 6 6" />
        </svg>
        Find a page
      </button>
      <dialog
        ref={modal}
        className="hr-jump"
        aria-label="Find a page"
        onClick={(e) => {
          if (e.target === modal.current) {
            const rect = modal.current.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            )
              modal.current.close();
          }
        }}
        onKeyDown={(e) => {
          const links = Array.from(
            modal.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [],
          );
          const index = links.indexOf(
            document.activeElement as HTMLAnchorElement,
          );
          if (e.key === "ArrowDown" && links.length) {
            e.preventDefault();
            links[(index + 1) % links.length]?.focus();
          }
          if (e.key === "ArrowUp" && links.length) {
            e.preventDefault();
            if (index <= 0) field.current?.focus();
            else links[index - 1]?.focus();
          }
          if (e.key === "Enter" && e.target === field.current && links.length) {
            e.preventDefault();
            links[0]?.click();
          }
        }}
      >
        <header>
          <label htmlFor="jump-query">Find a page</label>
          <button
            type="button"
            aria-label="Close page finder"
            onClick={() => modal.current?.close()}
          >
            ✕
          </button>
        </header>
        <input
          id="jump-query"
          ref={field}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search workspace pages"
          autoComplete="off"
        />
        <ul
          onClick={(e) => {
            if ((e.target as Element).closest("a")) modal.current?.close();
          }}
        >
          {results.map((i) => (
            <li key={i.href}>
              {link(
                i.href,
                <>
                  <span>{i.label}</span>
                  <small>{i.group}</small>
                </>,
                { className: "hr-jump-result" },
              )}
            </li>
          ))}
        </ul>
        {!results.length && <p role="status">No matching pages.</p>}
      </dialog>
    </>
  );
}
export function WorkspaceShell({
  items,
  pathname,
  home,
  company,
  identity,
  tools,
  link,
  children,
}: Props) {
  const current = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const [expanded, setExpanded] = useState(false);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const n = nav.current,
      active = n?.querySelector<HTMLElement>('[aria-current="page"]');
    if (n && active && n.scrollWidth > n.clientWidth) {
      const offset =
        active.getBoundingClientRect().left - n.getBoundingClientRect().left;
      n.scrollLeft += offset - (n.clientWidth - active.offsetWidth) / 2;
    }
  }, [pathname, expanded]);
  return (
    <div className="hr-shell">
      <a href="#workspace-content" className="hr-skip">
        Skip to content
      </a>
      <aside className="hr-rail">
        <div className="hr-brand-row">
          {link(
            home,
            <>
              <span className="hr-symbol" aria-hidden="true" />
              OpenHR India
            </>,
            { className: "hr-brand" },
          )}
          <button
            className="hr-sections"
            type="button"
            aria-controls="workspace-nav"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Close menu" : "All sections"}
          </button>
        </div>
        <JumpMenu items={items} link={link} />
        <nav
          ref={nav}
          id="workspace-nav"
          data-expanded={expanded}
          onClick={(e) => {
            if ((e.target as Element).closest("a")) setExpanded(false);
          }}
          className="hr-nav"
          aria-label="Workspace"
        >
          {Array.from(new Set(items.map((i) => i.group))).map((group) => (
            <div className="hr-nav-group" key={group}>
              <p>{group}</p>
              <ul>
                {items
                  .filter((i) => i.group === group)
                  .map((i) => (
                    <li key={i.href}>
                      {link(
                        i.href,
                        <>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.65"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d={glyphs[i.icon]} />
                          </svg>
                          <span>{i.label}</span>
                          {!!i.count && <small>{i.count}</small>}
                        </>,
                        {
                          className: "hr-nav-link",
                          "aria-current":
                            current?.href === i.href ? "page" : undefined,
                        },
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="hr-body">
        <header className="hr-bar">
          <div className="hr-company">
            <span className="hr-monogram" aria-hidden="true">
              {company.trim()[0]}
            </span>
            <span>
              <strong>{company}</strong>
              <small>{identity}</small>
            </span>
          </div>
          {tools}
        </header>
        <main tabIndex={-1} id="workspace-content" className="hr-content">
          {children}
        </main>
      </div>
    </div>
  );
}

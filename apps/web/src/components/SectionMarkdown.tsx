"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Tailwind-utility-based markdown styling. We avoid `@tailwindcss/typography`
// (not installed for Tailwind v4 here) and instead map each markdown element
// to explicit classes so the draft renders as proper prospectus prose rather
// than literal "##" and "**" characters.
const components: Components = {
  h1: (props) => (
    <h1
      className="mt-6 mb-3 text-2xl font-bold tracking-tight text-[var(--foreground)]"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-6 mb-3 text-xl font-semibold tracking-tight text-[var(--foreground)]"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-5 mb-2 text-lg font-semibold text-[var(--foreground)]"
      {...props}
    />
  ),
  h4: (props) => (
    <h4
      className="mt-4 mb-2 text-base font-semibold text-[var(--foreground)]"
      {...props}
    />
  ),
  h5: (props) => (
    <h5
      className="mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]"
      {...props}
    />
  ),
  h6: (props) => (
    <h6
      className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
      {...props}
    />
  ),
  p: (props) => <p className="my-3 leading-[1.75]" {...props} />,
  a: (props) => (
    <a
      className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => (
    <ul className="my-3 list-disc space-y-1 pl-6" {...props} />
  ),
  ol: (props) => (
    <ol className="my-3 list-decimal space-y-1 pl-6" {...props} />
  ),
  li: (props) => <li className="leading-[1.7]" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-4 border-[var(--border)] bg-[var(--surface)]/60 px-4 py-2 italic text-[var(--muted)]"
      {...props}
    />
  ),
  hr: () => <hr className="my-6 border-[var(--border)]" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table
        className="w-full border-collapse text-sm"
        {...props}
      />
    </div>
  ),
  thead: (props) => (
    <thead className="bg-[var(--surface)]" {...props} />
  ),
  tr: (props) => (
    <tr className="border-b border-[var(--border)]" {...props} />
  ),
  th: (props) => (
    <th
      className="border border-[var(--border)] px-3 py-2 text-left font-semibold"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border border-[var(--border)] px-3 py-2 align-top"
      {...props}
    />
  ),
  code: ({
    className,
    children,
    ...rest
  }: React.HTMLAttributes<HTMLElement>) => {
    const isBlock = typeof className === "string" && className.startsWith("language-");
    if (isBlock) {
      return (
        <code
          className={`${className} block rounded-md bg-[var(--surface)] p-3 text-xs leading-relaxed overflow-x-auto`}
          {...rest}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.85em]"
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded-md bg-[var(--surface)] p-3 text-xs leading-relaxed"
      {...props}
    />
  ),
};

export function SectionMarkdown({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default SectionMarkdown;

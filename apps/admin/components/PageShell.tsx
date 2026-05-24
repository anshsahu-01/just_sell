import { ReactNode } from "react";

type PageShellProps = {
  title: string;
  children?: ReactNode;
};

export function PageShell({ title, children }: PageShellProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 md:p-6">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">Placeholder content for the {title.toLowerCase()} section.</p>
      {children}
    </section>
  );
}
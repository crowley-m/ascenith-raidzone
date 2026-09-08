/**
 * Broadsheet masthead — the shared page header used across the public showcase
 * pages (Seasons, Winners, Events, Teams, Rules, About). Big poster title over a
 * hairline rule, with a mono "kicker" line underneath.
 */
export function PageMasthead({
  title,
  kicker,
  lead,
}: {
  title: React.ReactNode;
  kicker: string;
  lead?: React.ReactNode;
}) {
  return (
    <header className="border-b border-white/15">
      <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-6">
        <h1 className="font-poster text-[13vw] uppercase leading-[0.84] text-white sm:text-[6rem]">
          {title}
        </h1>
        <p className="mt-4 font-mono text-[0.7rem] font-bold uppercase tracking-[0.28em] text-slate-400">
          {kicker}
        </p>
        {lead && <p className="mt-5 max-w-2xl text-slate-300">{lead}</p>}
      </div>
    </header>
  );
}

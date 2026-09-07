import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { fmtDateTime, relative } from "@/lib/format";
import { SignupButton } from "@/components/signup-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id }, select: { title: true } });
  return { title: event?.title ?? "Event" };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const event = await db.event.findUnique({
    where: { id },
    include: {
      signups: {
        where: { state: { in: ["SIGNED_UP", "WAITLIST"] } },
        include: { player: { select: { characterName: true, region: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event || (event.status !== "PUBLISHED" && event.status !== "COMPLETED")) {
    notFound();
  }

  const mySignup = session?.user?.playerId
    ? event.signups.find((s) => s.playerId === session.user.playerId)
    : undefined;

  const confirmed = event.signups.filter((s) => s.state === "SIGNED_UP");
  const waitlist = event.signups.filter((s) => s.state === "WAITLIST");
  const open = event.status === "PUBLISHED" && event.startsAt.getTime() > Date.now();

  return (
    <div className="container-x py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <span className="badge">{relative(event.startsAt)}</span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white">{event.title}</h1>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div className="card py-3">
              <dt className="label">When</dt>
              <dd className="text-slate-200">{fmtDateTime(event.startsAt)}</dd>
            </div>
            {event.server && (
              <div className="card py-3">
                <dt className="label">Server</dt>
                <dd className="text-slate-200">{event.server}</dd>
              </div>
            )}
            <div className="card py-3">
              <dt className="label">Slots</dt>
              <dd className="text-slate-200">
                {confirmed.length}
                {event.maxSlots ? ` / ${event.maxSlots}` : ""}
              </dd>
            </div>
          </dl>

          {event.description && (
            <div className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap text-slate-300">
              {event.description}
            </div>
          )}

          {event.rewardPoolText && (
            <div className="card mt-8 border-teal/30">
              <div className="label">Reward pool</div>
              <p className="whitespace-pre-wrap text-sm text-slate-200">{event.rewardPoolText}</p>
            </div>
          )}

          <div className="mt-10">
            <h2 className="font-display text-lg font-bold text-white">
              Roster <span className="text-slate-500">({confirmed.length})</span>
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {confirmed.length === 0 && (
                <li className="text-sm text-slate-500">No sign-ups yet. Be first.</li>
              )}
              {confirmed.map((s) => (
                <li key={s.id} className="badge">
                  {s.player.characterName ?? "Unnamed"}
                  {s.player.region ? ` · ${s.player.region}` : ""}
                </li>
              ))}
            </ul>
            {waitlist.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-slate-400">
                  Waitlist ({waitlist.length})
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {waitlist.map((s) => (
                    <li key={s.id} className="badge opacity-70">
                      {s.player.characterName ?? "Unnamed"}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card">
            <h2 className="font-display font-bold text-white">
              {event.status === "COMPLETED" ? "This event is over" : open ? "Join this event" : "Sign-ups closed"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {event.status === "COMPLETED"
                ? "Thanks to everyone who came out."
                : open
                  ? "Claim your slot. You can withdraw any time before it starts."
                  : "The roster is locked."}
            </p>
            <div className="mt-4">
              {open ? (
                <SignupButton
                  eventId={event.id}
                  signedUp={!!mySignup}
                  state={mySignup?.state}
                  loggedIn={!!session?.user}
                />
              ) : (
                mySignup && (
                  <span className="badge border-teal/40 text-teal">You were signed up</span>
                )
              )}
            </div>
            {!session?.user && (
              <p className="mt-3 text-xs text-slate-500">
                No account?{" "}
                <a href="/register" className="link">
                  Register
                </a>{" "}
                first — it&apos;s quick.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

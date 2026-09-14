import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { PageMasthead } from "@/components/page-masthead";
import { EventProse } from "@/components/event-prose";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rules & how to join",
  description:
    "ASCENITH RAIDZONE community rules, anti-cheat policy, and how to get on the roster. Event-specific rules are in each event brief.",
};

const STEPS = [
  {
    title: "1. Register on this site",
    body: (
      <>
        Create your profile with <Link href="/register" className="link">Register</Link> — sign in
        with Discord. Add your Once Human character name, platform, region, and{" "}
        <b>in-game UID</b> so staff can find you and send rewards.
      </>
    ),
  },
  {
    title: "2. Join the Discord",
    body: (
      <>
        Hop into the{" "}
        <a href={site.discordInvite} target="_blank" rel="noreferrer" className="link">
          community Discord
        </a>{" "}
        and read the pinned server info. Announcements, rosters, and reminders all go there.
      </>
    ),
  },
  {
    title: "3. Make or join a team (team events)",
    body: (
      <>
        Solo events you sign up for yourself. Team events are entered by a team leader — create a
        team or join one with an invite code on your <Link href="/me/team" className="link">Team</Link>{" "}
        page.
      </>
    ),
  },
  {
    title: "4. Sign up for an event",
    body: (
      <>
        Browse <Link href="/events" className="link">Events</Link>, claim a slot, and show up in the
        raid window. Attendance is tracked and rewards are logged to your profile afterwards.
      </>
    ),
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section data-reveal className="mt-14">
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

export default async function RulesPage() {
  const settings = await getSettings();
  return (
    <div className="bg-void">
      <PageMasthead
        title={<>Rules &amp; how to join</>}
        kicker="The code — community rules · anti-cheat · appeals"
        lead={
          <>
            {site.name} is run by {site.owner}. Keep it fair, keep it friendly, and everyone gets
            to enjoy the raids. These are the community rules — <b>each event&apos;s own rules,
            scoring and objectives are in its brief</b> on the event page.
          </>
        }
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-24">
      <Section title="Community rules">
        <div className="card mt-5">
          <EventProse source={settings.rulesText} />
        </div>
      </Section>

      <Section title="Anti-cheat & fair play">
        <div className="card mt-5">
          <EventProse source={settings.antiCheatText} />
        </div>
      </Section>

      <Section title="Disputes & appeals">
        <div className="card mt-5">
          <EventProse source={settings.disputesText} />
        </div>
      </Section>

      <Section title="How to join">
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="card">
              <h3 className="font-display font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="FAQ">
        <dl className="mt-5 space-y-4">
          <div className="card">
            <dt className="font-semibold text-white">Do I need to pay anything?</dt>
            <dd className="mt-1 text-sm text-slate-400">
              No. Events and rewards are free for community members.
            </dd>
          </div>
          <div className="card">
            <dt className="font-semibold text-white">How do rewards get to me?</dt>
            <dd className="mt-1 text-sm text-slate-400">
              Staff log rewards to your profile after an event and send them in game to the UID on
              your profile. You&apos;ll see them under{" "}
              <Link href="/me/rewards" className="link">My rewards</Link>.
            </dd>
          </div>
          <div className="card">
            <dt className="font-semibold text-white">Solo vs team events?</dt>
            <dd className="mt-1 text-sm text-slate-400">
              Solo events: you sign up individually. Team events: your{" "}
              <Link href="/me/team" className="link">team</Link> leader registers the whole squad in
              one go. The event page says which it is.
            </dd>
          </div>
          <div className="card">
            <dt className="font-semibold text-white">Do I need approval before I can sign up?</dt>
            <dd className="mt-1 text-sm text-slate-400">
              No — you&apos;re on the roster the moment you register. Fill in your in-game details
              and you can sign up straight away.
            </dd>
          </div>
        </dl>
      </Section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "./landing.module.css";

export type RewardTier = { place: string; reward: string };

export type UpcomingOp = {
  id: string;
  title: string;
  mode: string | null;
  startsAt: string;
  endsAt: string | null;
};

export type OpEvent = {
  id: string;
  title: string;
  server: string | null;
  startsAt: string;
  endsAt: string | null;
  maxSlots: number | null;
  signups: number;
  rewardPoolText: string | null;
  summary: string | null;
  mode: string | null;
  wipeCycle: string | null;
  raidWindow: string | null;
  rewardTiers: RewardTier[];
  bonusText: string | null;
  howToJoinVideoUrl: string | null;
  seasonNumber: number | null;
  seasonName: string | null;
};

const DISCORD =
  process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "https://discord.gg/a4k3KTfE7";

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

function split(ms: number) {
  const t = Math.max(0, ms);
  return {
    d: Math.floor(t / 86400000),
    h: Math.floor((t % 86400000) / 3600000),
    m: Math.floor((t % 3600000) / 60000),
    s: Math.floor((t % 60000) / 1000),
  };
}

// canonical Philippines time — deterministic on server + client
function fmtManila(iso: string, withTime = true) {
  try {
    return new Date(iso)
      .toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        day: "numeric",
        month: "short",
        ...(withTime ? { hour: "numeric" as const, minute: "2-digit" as const } : {}),
      })
      .toUpperCase();
  } catch {
    return "";
  }
}

export function EventBrief({
  event,
  upcoming = [],
}: {
  event: OpEvent | null;
  upcoming?: UpcomingOp[];
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = event ? Date.parse(event.startsAt) : 0;
  const end = event?.endsAt ? Date.parse(event.endsAt) : null;

  // phase is only meaningful once the clock is running (client); server renders neutral
  let phase: "standby" | "upcoming" | "live" = "standby";
  let target: number | null = null;
  if (event && now !== null) {
    if (now < start) {
      phase = "upcoming";
      target = start;
    } else if (end && now < end) {
      phase = "live";
      target = end;
    } else {
      phase = "live";
    }
  } else if (event) {
    // pre-mount: point the (hidden) grid at the end date so it doesn't jump
    target = end ?? start;
  }

  const rem = now !== null && target !== null ? split(target - now) : null;
  const cells: [string, string][] = [
    [rem ? String(rem.d) : "--", "Days"],
    [rem ? pad(rem.h) : "--", "Hrs"],
    [rem ? pad(rem.m) : "--", "Min"],
    [rem ? pad(rem.s) : "--", "Sec"],
  ];

  const pill =
    phase === "standby" ? "Standby" : phase === "live" ? "Live" : "Upcoming";
  const clockCap =
    phase === "upcoming"
      ? "Wipe starts in"
      : end && target === end
        ? "Wipe ends in"
        : "Wipe live";

  const tiers = event ? event.rewardTiers.slice(0, 3) : [];
  const podClass = [s.pod2, s.pod1, s.pod3];
  const medalClass = [s.medalS, s.medalG, s.medalB];

  return (
    <section className={`${s.brief} ${s.wrap}`} id="event" data-op>
      <div className={`${s.briefFrame} ${s.briefFrameHot}`} data-reveal>
        <div className={s.briefTop}>
          <span className={s.briefBadge}>Current event</span>
          <h2 className={s.briefTitle} data-split>
            {event?.seasonNumber ? `Season ${event.seasonNumber} ` : ""}RAIDZONE{" "}
            <span className={s.briefMode}>
              {event?.mode ? event.mode : "— standby"}
            </span>
          </h2>
          {now !== null && (
            <span className={s.statusPill} data-phase={phase}>
              <i />
              {pill}
            </span>
          )}
        </div>

        {event ? (
          <>
            <div className={s.clockRow}>
              <div className={s.clockWrap}>
                <span className={s.clockCap}>{clockCap}</span>
                <div className={s.clockGrid} data-tl>
                  {cells.map(([v, k]) => (
                    <span className={s.clockCell} key={k}>
                      <span className={s.clockNum}>{v}</span>
                      <span className={s.clockLbl}>{k}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.eventGrid}>
              <div className={s.eventFacts}>
                {event.endsAt && (
                  <div>
                    <b>Wipe (GMT+8)</b>
                    {fmtManila(event.startsAt, false)} &ndash; {fmtManila(event.endsAt, false)}
                  </div>
                )}
                {event.wipeCycle && (
                  <div>
                    <b>Cycle</b>
                    {event.wipeCycle}
                  </div>
                )}
                {event.raidWindow && (
                  <div>
                    <b>Raid</b>
                    {event.raidWindow}
                  </div>
                )}
                {event.maxSlots ? (
                  <div>
                    <b>Roster</b>
                    {event.signups} / {event.maxSlots} slots
                  </div>
                ) : null}
              </div>

              <div className={`${s.card2} ${s.card2Hot} ${s.rewardsCard}`} id="rewards">
                <div className={s.card2Head}>Rewards</div>
                {event.rewardPoolText && (
                  <div className={s.rewardTotal}>
                    <span className={s.rewardTotalLbl}>Prize pool</span>
                    <span className={s.rewardTotalVal}>{event.rewardPoolText}</span>
                  </div>
                )}
                {tiers.length >= 3 ? (
                  <>
                    <div className={s.podium} aria-hidden>
                      {[1, 0, 2].map((_, slot) => (
                        <div key={slot} className={`${s.podBlock} ${podClass[slot]}`}>
                          <span className={`${s.podMedal} ${medalClass[slot]}`}>
                            {slot === 0 ? 2 : slot === 1 ? 1 : 3}
                          </span>
                          <span className={s.podRank}>
                            {slot === 0 ? 2 : slot === 1 ? 1 : 3}
                          </span>
                        </div>
                      ))}
                    </div>
                    <ul className={s.tierList}>
                      {tiers.map((t) => (
                        <li key={t.place}>
                          <span className={s.tierPlace}>{t.place}</span>
                          <span className={s.tierReward}>{t.reward}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : !event.rewardPoolText ? (
                  <p className={s.rewardNote}>Reward pool announced in Discord.</p>
                ) : null}
                {event.bonusText && (
                  <p className={s.bonusLine}>
                    <span className={s.bonusTag}>Bonus</span>
                    {event.bonusText}
                  </p>
                )}
              </div>
            </div>

            <div className={s.eventActs}>
              {event.id && (
                <Link className={`${s.box} ${s.solid}`} href={`/events/${event.id}`}>
                  <span className={s.t}>Full event details</span>
                  <span className={s.arw}>{"→"}</span>
                </Link>
              )}
              <Link
                className={`${s.box} ${event.id ? s.plain : s.solid}`}
                href="/register"
              >
                <span className={s.t}>Register</span>
                <span className={s.arw}>{"→"}</span>
              </Link>
              <Link className={`${s.box} ${s.plain}`} href="/events">
                <span className={s.t}>All events</span>
                <span className={s.arw}>{"→"}</span>
              </Link>
              <a
                className={`${s.box} ${s.plain}`}
                href={DISCORD}
                target="_blank"
                rel="noreferrer"
              >
                <span className={s.t}>Join Discord</span>
                <span className={s.arw}>{"→"}</span>
              </a>
            </div>

            {upcoming.length > 0 && (
              <div className={s.nextUp}>
                <span className={s.nextUpHead}>Next up</span>
                <ul>
                  {upcoming.map((u) => (
                    <li key={u.id}>
                      <Link href={`/events/${u.id}`} className={s.nextUpRow}>
                        <span className={s.nextUpName}>
                          {u.mode ? <b>{u.mode}</b> : null} {u.title}
                        </span>
                        <span className={s.nextUpDate}>
                          {fmtManila(u.startsAt, false)} GMT+8
                        </span>
                        <span className={s.arw}>{"→"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/events" className={s.nextUpAll}>
                  See all events {"→"}
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <p className={s.eventSummary}>
              No wipe running right now. The next one is announced in Discord &mdash; dates,
              rules and the reward pool drop there first.
            </p>
            <div className={s.eventActs}>
              <Link className={`${s.box} ${s.solid}`} href="/register">
                <span className={s.t}>Register</span>
                <span className={s.arw}>{"→"}</span>
              </Link>
              <Link className={`${s.box} ${s.plain}`} href="/events">
                <span className={s.t}>All events</span>
                <span className={s.arw}>{"→"}</span>
              </Link>
              <a
                className={`${s.box} ${s.plain}`}
                href={DISCORD}
                target="_blank"
                rel="noreferrer"
              >
                <span className={s.t}>Join Discord</span>
                <span className={s.arw}>{"→"}</span>
              </a>
            </div>

            {upcoming.length > 0 && (
              <div className={s.nextUp}>
                <span className={s.nextUpHead}>Next up</span>
                <ul>
                  {upcoming.map((u) => (
                    <li key={u.id}>
                      <Link href={`/events/${u.id}`} className={s.nextUpRow}>
                        <span className={s.nextUpName}>
                          {u.mode ? <b>{u.mode}</b> : null} {u.title}
                        </span>
                        <span className={s.nextUpDate}>
                          {fmtManila(u.startsAt, false)} GMT+8
                        </span>
                        <span className={s.arw}>{"→"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

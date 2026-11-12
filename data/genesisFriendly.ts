import type { LifeEvent } from "./genesisLife";
export const placeName = (name: string) =>
  ({
    gardens: "Community gardens",
    observatory: "Observatory",
    archive: "Library",
    council: "Town square",
    homes: "Home",
    workshop: "Workshop",
    clinic: "Clinic",
  })[name] ?? name;
export function relationshipLabel(value: number) {
  return value >= 30
    ? "Close friends"
    : value >= 10
      ? "Getting closer"
      : value > 0
        ? "On good terms"
        : value <= -20
          ? "A strained relationship"
          : value < 0
            ? "Some tension"
            : "No strong feelings yet";
}
export function readableEvent(e: Pick<LifeEvent, "kind" | "text">): string {
  const text = e.text;
  let m: RegExpMatchArray | null;
  if (
    e.kind === "Conversation" &&
    (m = text.match(/^(.*?) discussed (.*?). Trust changed ([+-]?\d+).?$/))
  )
    return (
      m[1] +
      " talked about " +
      m[2] +
      ". " +
      (Number(m[3]) > 0
        ? "They came away feeling a little closer."
        : Number(m[3]) < 0
          ? "They did not see eye to eye."
          : "Neither changed their mind.")
    );
  if (
    e.kind === "Belief" &&
    (m = text.match(/^(.*?) shifted one belief point from (.*?) to (.*?).$/))
  )
    return (
      m[1] +
      " is leaning a little more toward " +
      m[3] +
      " ideas, and a little less toward " +
      m[2] +
      "."
    );
  if (e.kind === "Rest") return text.split(". ")[0] + ".";
  if (e.kind === "Food")
    return (
      text.split(". Food stock")[0] + (text.includes(". Food stock") ? "." : "")
    );
  if (e.kind === "Study")
    return text.replace(
      "studied in the archive. Skill increased.",
      "spent time studying at the library.",
    );
  if (e.kind === "Work")
    return text
      .replace(/ Gross wage .*$/, "")
      .replace(
        "Logged one research observation for:",
        "Added a research note about:",
      );
  if (e.kind === "Alliance")
    return text.replace(
      "formed an alliance after repeated interactions",
      "built a close friendship after spending time together",
    );
  if (e.kind === "Command" && text.startsWith("Manually advanced"))
    return "You moved village time forward. The village’s choices have been saved.";
  return text;
}
export type NewsEvent = LifeEvent & { _creationTime?: number };
export type VisitMark = { tick: number; seenAt: number };
export function recapEvents(
  events: NewsEvent[],
  mark: VisitMark | null,
  tick: number,
) {
  return events.filter((e) =>
    mark
      ? typeof e._creationTime === "number"
        ? e._creationTime > mark.seenAt
        : e.tick > mark.tick
      : e.tick >= Math.floor(tick / 4) * 4,
  );
}
export const isNoteworthy = (e: LifeEvent) =>
  ![
    "Work",
    "Rest",
    "Food",
    "Study",
    "Command",
    "Opening",
    "Migration",
  ].includes(e.kind);
export function friendlyIntent(input: string): {
  kind: string;
  name?: string;
  text?: string;
} {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replaceAll("’", "'");
  let m = s.match(
    /^(?:show(?: me)?|open) (.+?)(?:'s)? (?:personality|profile|relationships|memories|diary)$/,
  );
  if (m) return { kind: "citizen", name: m[1] };
  if (/^(?:what's|what is) everyone doing$/.test(s)) return { kind: "people" };
  if (
    /^(?:who's|who is) dating$|^show (?:all )?(?:romantic |married )?couples$/.test(
      s,
    )
  )
    return { kind: "couples" };
  if (
    /^(?:has anyone had a baby|show (?:all )?families(?: with children)?)$/.test(
      s,
    )
  )
    return { kind: "families" };
  if (/^(?:who's|who is) fighting$|^show (?:current )?rivalries$/.test(s))
    return { kind: "rivals" };
  if (/^(?:what happened today|show me what happened today)$/.test(s))
    return { kind: "today" };
  if (/^(?:show me (?:the )?latest gossip|open town talk)$/.test(s))
    return { kind: "talk" };
  if (/^who believes in the observer$/.test(s))
    return { kind: "observer-beliefs" };
  if (/^create (?:a )?new citizen$/.test(s)) return { kind: "create" };
  if (/^(?:advance|skip) (?:one|1) week$/.test(s))
    return { kind: "forward", text: "advance 7 days" };
  if (/^make it rain$/.test(s)) return { kind: "weather-unavailable" };
  if (
    /^(?:what's everyone researching|what is everyone researching|show active scientific investigations|open (?:the )?(?:research library|investigation board)|open the oldest unfinished investigation|show (?:which )?theories have been disproven)$/.test(
      s,
    )
  )
    return { kind: "research" };
  if (/^(?:show|open) (?:the )?daily tea$/.test(s)) return { kind: "today" };
  return { kind: "forward", text: input };
}

export const eventKindLabel = (kind: string) =>
  ({
    DigitalControl: "Phone preferences",
    DigitalMessage: "A private text",
    DigitalRead: "A text was read",
    DigitalMeetup: "Plans became a meetup",
    DigitalMissed: "A change of plans",
    DigitalKnowledge: "A public report was read",
    WhisperPost: "A new WHISPER post",
    WhisperComment: "A reply on WHISPER",
    WhisperReaction: "A WHISPER reaction",
    ObserverControl: "Your visit",
    ObserverNotice: "An unusual encounter",
    ObserverEncounter: "Who noticed",
    ObserverClaim: "A creator claim",
    ObserverAnnouncement: "Village announcement",
    ResearchQuestion: "A new question",
    ResearchDiscussion: "Comparing explanations",
    ResearchPlan: "Planning a test",
    ResearchTest: "An experiment",
    ResearchFinding: "A research finding",
  })[kind] ?? kind;

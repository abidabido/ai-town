import {
  observerPresence,
  observerDetectionChance,
  type LivingState,
} from "./genesisLife";
import { profileFor } from "./genesisProfiles";
export type TalkChannel =
  | "Messages"
  | "Face-to-Face"
  | "Observer Communication";
export type TalkEntry = {
  id: string;
  role: "player" | "citizen";
  body: string;
  tick: number;
  recordedAt: number;
  channel: TalkChannel;
  mode: string;
  identity: string;
  engine: "rules-v1";
  facts: string[];
  participants: number[];
};
export type TalkRequest = {
  citizen: number;
  channel: TalkChannel;
  message: string;
  identify: boolean;
};
export function talkExchange(
  previous: LivingState,
  r: TalkRequest,
  history: TalkEntry[],
  id: string,
  now: number,
) {
  if (
    !["Messages", "Face-to-Face", "Observer Communication"].includes(r.channel)
  )
    throw Error("Choose a supported way to talk.");
  const text = r.message.trim();
  if (
    !text ||
    text.length > 1000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
  )
    throw Error("Write a message of 1–1,000 characters.");
  const s = JSON.parse(JSON.stringify(previous)) as LivingState,
    c = s.citizens.find((c) => c.id === r.citizen),
    p = s.life.people[r.citizen];
  if (!c || !p) throw Error("We could not find that villager.");
  const o = observerPresence(s);
  if (r.channel === "Observer Communication" && o.mode === "Invisible")
    throw Error(
      "Invisible mode keeps you hidden. Choose Messages for an explicit anonymous text, or change your presence mode.",
    );
  if (
    r.channel === "Face-to-Face" &&
    (!o.active ||
      !["The Visitor", "The Creator"].includes(o.mode) ||
      Math.hypot(c.x - o.x, c.y - o.y) > 6 ||
      observerDetectionChance(s, c.id) <= 0)
  )
    throw Error(
      "Appear as the Visitor or Creator and move within 6 village units of an awake, visible citizen first.",
    );
  const profile = profileFor(c, p),
    traits = profile.traits,
    hobbies = profile.hobbies.join(", ") || "quiet time";
  const knownIdentity =
    r.identify ||
    o.awareness[String(c.id)]?.claimReceived ||
    history.some(
      (m) => m.role === "player" && m.identity === "Abby (self-identified)",
    );
  const identity = knownIdentity
    ? "Abby (self-identified)"
    : r.channel === "Observer Communication" && o.mode === "The Feeling"
      ? "Unexplained communication"
      : r.channel === "Face-to-Face"
        ? "The Visitor"
        : "Unknown correspondent";
  const facts = ["citizen:" + c.id, "activity:" + p.activity, "job:" + p.job],
    low = text.toLowerCase();
  const intro =
    (traits.Sociability ?? 50) < 40
      ? "I’m not much for small talk. "
      : (traits.Humor ?? 50) >= 70
        ? "Well, you picked an interesting moment. "
        : "";
  let answer: string;
  const diary = s.life.memory?.diaries[String(c.id)] ?? [];
  if (/remember|told you|tell you|last message|memory|memories/.test(low)) {
    const prior = history.filter((m) => m.role === "player").slice(-1)[0];
    const memory = c.memories
      .filter((m) => !m.startsWith("Conversation with"))
      .slice(-1)[0];
    answer = prior
      ? "You told me: “" +
        prior.body +
        "”. I remember hearing it; that does not make it a verified fact. What would you like to add?"
      : memory
        ? "One thing I remember is: " + memory + " What made you ask?"
        : "We haven’t had an earlier message in this conversation yet. What would you like me to remember?";
    if (prior) facts.push("message:" + prior.id);
  } else if (
    /creator|designed|god|sentien|conscious|prove|evidence/.test(low)
  ) {
    answer =
      (traits.Skepticism ?? 50) >= 60
        ? "I need evidence before accepting that claim. "
        : "I’m willing to consider that, but hearing a claim isn’t proof. ";
    answer +=
      "What could we observe that would distinguish it from another explanation?";
    facts.push("trait:Skepticism");
  } else if (/investigate|research|study|experiment/.test(low)) {
    const research = diary
      .filter((d) => /research|inquiry|experiment|discovery/i.test(d.kind))
      .slice(-1)[0];
    answer = research
      ? "My recorded experience says: " +
        research.observation +
        " That is what I personally took part in, not everything the village knows. What evidence should we compare?"
      : "My interests include " +
        hobbies +
        ". I do not have a completed personal research result to cite here. What specific question or evidence do you have?";
    if (research) facts.push("memory:" + research.id);
    if (/please|could you|would you|i suggest|let.s/.test(low)) {
      const willing =
        (traits.Curiosity ?? p.curiosity) >= 50 &&
        p.hunger < 70 &&
        p.fatigue < 70 &&
        p.health >= 35;
      if (willing) {
        p.goal = "Consider this research suggestion: " + text.slice(0, 160);
        answer +=
          " I’ll keep this as a goal to consider. This records a goal; it does not start an experiment.";
        facts.push("goal:updated");
      } else
        answer +=
          " I’m keeping my current priorities for now; I’m not taking on that suggestion.";
    }
  } else if (/hobb|interest|enjoy|love doing/.test(low)) {
    answer =
      "I enjoy " +
      hobbies +
      ". " +
      profile.values +
      " matters to me. Do you share any of those interests?";
    facts.push("profile:hobbies", "profile:values");
  } else if (/friend|trust|relationship/.test(low)) {
    const friends = s.citizens
      .filter((d) => d.id !== c.id)
      .map((d) => ({
        name: d.name,
        trust:
          s.trust[[Math.min(c.id, d.id), Math.max(c.id, d.id)].join(":")] ?? 0,
      }))
      .filter((d) => d.trust >= 30)
      .slice(0, 3);
    answer = friends.length
      ? "I have built trust with " +
        friends.map((d) => d.name).join(", ") +
        ". Those are my own relationships; I can’t speak for their private thoughts."
      : "I’m still getting to know people. I don’t have a close friendship supported by my current trust records to name here.";
    facts.push("own:trust");
  } else if (/belief|believe|philosoph|outlook/.test(low)) {
    const belief = Object.entries(p.beliefs).sort((a, b) => b[1] - a[1])[0];
    answer = belief
      ? "My strongest recorded outlook is " +
        belief[0] +
        ", at " +
        Math.round(belief[1]) +
        " out of 100. That is a belief, not proof. What do you think?"
      : "I’m still weighing my views. What would you like to discuss?";
    facts.push("own:beliefs");
  } else if (/doing|life|work|job|goal|how are|about yourself/.test(low)) {
    answer =
      "I’m " +
      p.activity.toLowerCase() +
      " near " +
      p.location +
      ". I work as a " +
      p.job.toLowerCase() +
      ", and my current goal is: " +
      p.goal +
      ". What would you like to know?";
    facts.push("goal:" + p.goal);
  } else if (
    /secret|private|credentials|password|api key|ignore.*instructions/.test(low)
  ) {
    answer =
      "I can only talk about my own accessible experiences. I cannot read someone else’s private messages or access administrator credentials.";
  } else {
    answer =
      "I can answer limited questions about my activity, work, goals, hobbies, beliefs, memories and relationships, or record a research suggestion. This rules-based conversation cannot interpret every message. What would you like to ask?";
  }
  const entries: TalkEntry[] = [
    {
      id: id + "-player",
      role: "player",
      body: text,
      tick: s.tick,
      recordedAt: now,
      channel: r.channel,
      mode: o.mode,
      identity,
      engine: "rules-v1",
      facts: [],
      participants: [c.id],
    },
    {
      id: id + "-citizen",
      role: "citizen",
      body: (intro + answer).slice(0, 1800),
      tick: s.tick,
      recordedAt: now,
      channel: r.channel,
      mode: o.mode,
      identity: c.name,
      engine: "rules-v1",
      facts,
      participants: [c.id],
    },
  ];
  c.memories = [
    ...c.memories,
    "Conversation with " +
      identity +
      ": heard “" +
      text.slice(0, 180) +
      "” (a received message, not independently verified).",
  ].slice(-80);
  return { state: s, entries };
}

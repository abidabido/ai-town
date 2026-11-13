import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { LivingState } from "../../data/genesisLife";
import { TRAITS } from "../../data/genesisProfiles";
import {
  MEDICAL_QUESTION,
  medicalReport,
  type MedicalReview,
} from "../../data/genesisMedical";
export default function MedicalResearchLab({
  state,
  revision,
  worldId,
}: {
  state: LivingState;
  revision: number;
  worldId: Id<"genesisSessions">;
}) {
  const rows = useQuery(api.medical.latest, { worldId });
  const run = useAction(api.medical.runReview);
  const save = useMutation(api.genesis.saveCitizen);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(false);
  const atlas = state.citizens.find(
    (c) => c.name.toLowerCase() === "dr. atlas",
  );
  const r = rows?.find((x) => x.status === "ready")?.review as
    | MedicalReview
    | undefined;
  const act = async (f: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await f();
      setMessage(result.message);
    } catch {
      setMessage(
        "That step didn't finish. Your village is unchanged; please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const add = () =>
    act(() =>
      save({
        expectedRevision: revision,
        name: "Dr. Atlas",
        age: 45,
        job: "Doctor",
        faction: "Neuroscientists",
        goal: "Investigate biomedical evidence, record uncertainty, and revise weak explanations.",
        grant: 0,
        profile: {
          nickname: "Atlas",
          pronouns: "they/them",
          birthday: "03-14",
          biography:
            "A curious village physician and medical research specialist. All credentials are fictional; Atlas is not a licensed real-world clinician.",
          education: "Fictional biomedical research training",
          hobbies: ["Neuroscience", "Scientific research", "Reading"],
          traits: Object.fromEntries(
            TRAITS.map((t) => [
              t,
              ["Curiosity", "Skepticism", "Honesty"].includes(t) ? 90 : 60,
            ]),
          ),
          skin: "#c99473",
          hair: "#36312e",
          outfit: "#70aaa0",
          hairstyle: "Short",
          values: "Evidence, honesty and compassion",
          fears: "Mistaking confidence for evidence",
          motivations: "Understand unanswered biological questions",
          communication:
            "Clear, thoughtful and comfortable saying I do not know",
          longTermGoal:
            "Build a traceable research library and change conclusions when evidence changes.",
        },
      }),
    );
  const download = () => {
    if (!r) return;
    const url = URL.createObjectURL(
      new Blob([medicalReport(r)], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Atlas-Medical-Review.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="panel medical-lab" id="genesis-medical-lab">
      <header>
        <span className="medical-tag">EVIDENCE FIRST · PRIVATE RESEARCH</span>
        <h2>Dr. Atlas’s Research Lab</h2>
        <p>Real papers. Clear limits. Questions worth checking.</p>
      </header>
      <p>
        Atlas is a fictional adult researcher. This lab keeps published evidence
        separate from village healthcare and untested ideas.
      </p>
      {!atlas ? (
        <button disabled={busy} onClick={add}>
          Add Dr. Atlas to the village
        </button>
      ) : (
        <p>
          ✓ Dr. Atlas has a saved citizen profile. Sage: skeptical review role
          pending. Nova: computation role pending.
        </p>
      )}
      <h3>What are we checking?</h3>
      <p>{MEDICAL_QUESTION}</p>
      <p>
        First pilot: two preselected historical trials, checked at abstract
        level. This is not a complete or up-to-date clinical review.
      </p>
      <button
        disabled={busy || !atlas || rows === undefined}
        onClick={() => act(() => run({}))}
      >
        {busy
          ? "Checking sources…"
          : r
            ? "Check saved review"
            : "Retrieve the two studies"}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {rows?.[0]?.status === "failed" && (
        <p role="alert">
          The last search did not finish: {rows[0].error}. Any earlier saved
          report remains available.
        </p>
      )}
      {rows?.[0]?.status === "pending" && (
        <p>
          A search is pending. If interrupted, it can be retried after two
          minutes.
        </p>
      )}
      {!r ? (
        <p>
          No verified review saved yet. Nothing here is labeled a discovery.
        </p>
      ) : (
        <>
          <div className="medical-result">
            <h3>What the evidence says</h3>
            <p>{r.summary}</p>
            <small>
              Sources retrieved {new Date(r.retrievedAt).toLocaleString()} ·{" "}
              {r.publication}
            </small>
          </div>
          <div className="medical-actions">
            <button onClick={() => setPreview(!preview)}>
              {preview ? "Close report preview" : "Preview report"}
            </button>
            <button onClick={download}>Download report</button>
          </div>
          {preview && <pre className="medical-preview">{medicalReport(r)}</pre>}
          <h3>The studies</h3>
          {r.papers.map((p) => (
            <article className="medical-source" key={p.pmid}>
              <h4>
                <a href={p.url} target="_blank" rel="noreferrer">
                  {p.title}
                </a>
              </h4>
              <p>{p.finding}</p>
              <p>
                <strong>Keep in mind:</strong> {p.limitations}
              </p>
              <details>
                <summary>Source &amp; study details</summary>
                <p>{p.authors}</p>
                <p>
                  {p.journal} · {p.publicationDate}
                </p>
                <p>
                  PMID {p.pmid} · DOI {p.doi}
                </p>
                <p>
                  {p.studyType} · {p.population}
                </p>
                <a href={p.providerUrl} target="_blank" rel="noreferrer">
                  Europe PMC record
                </a>
              </details>
            </article>
          ))}
          <details>
            <summary>An idea to investigate — not a discovery</summary>
            <p>{r.hypothesis.mechanism}</p>
            <p>{r.hypothesis.origin}</p>
            <p>{r.hypothesis.novelty}</p>
            {r.hypothesis.constraints.map((x) => (
              <p key={x}>{x}</p>
            ))}
            <p>{r.hypothesis.prediction}</p>
            <p>{r.hypothesis.analysis}</p>
            <p>{r.hypothesis.validation}</p>
          </details>
          <details>
            <summary>What happened, and what hasn’t</summary>
            <ol>
              {r.stages.map((s) => (
                <li key={s.name}>
                  <strong>
                    {s.name}: {s.status}
                  </strong>
                  <p>{s.detail}</p>
                </li>
              ))}
            </ol>
            <p>{r.execution}</p>
            {r.limits.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </details>
        </>
      )}
      <details>
        <summary>Research history</summary>
        {rows?.length ? (
          rows.map((x, i) => (
            <p key={x._id}>
              Run {rows.length - i} · {new Date(x.createdAt).toLocaleString()} ·{" "}
              {x.status} · protocol {x.protocol}
            </p>
          ))
        ) : (
          <p>No searches recorded yet.</p>
        )}
      </details>
      <small>
        Runs only when requested. Background research is off. Results are cached
        for 24 hours; at most two attempts per day. No paid AI services, patient
        records, clinical decisions or public publication.
      </small>
    </section>
  );
}

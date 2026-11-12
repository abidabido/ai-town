const statusLabel = (value: string) =>
  ({
    "awaiting-owner-review": "Ready for your review",
    "approved-not-published": "Approved for future publication",
    approved: "Approved for future publication",
    rejected: "Publication declined",
    ready: "Ready to preview",
    queued: "Waiting to be built",
    building: "Being built",
    failed: "Needs attention",
    validating: "Checking the files",
  })[value] ?? value.replaceAll("-", " ");
import DigitalProducts from "./DigitalProducts";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { LivingState } from "../../data/genesisLife";
export default function CreationStudio({ state }: { state: LivingState }) {
  const projects = useQuery(api.genesisStudio.projects) ?? [],
    request = useMutation(api.genesisStudio.request),
    review = useMutation(api.genesisStudio.review);
  const [title, setTitle] = useState("Hearth & Honey · village bakery website"),
    [brief, setBrief] = useState(
      "Build the responsive fictional bakery website with navigation, menu filters and a demo basket. No payments or public publication.",
    ),
    [assignee, setAssignee] = useState<number>(),
    [active, setActive] = useState<Id<"genesisStudioProjects">>(),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState("index.html"),
    [code, setCode] = useState(""),
    [showCode, setShowCode] = useState(false),
    [decision, setDecision] = useState<"approve" | "reject">();
  const project = projects.find((p) => p._id === active) ?? projects[0],
    developer =
      assignee ??
      state.citizens.find((c) => c.name === "Nova")?.id ??
      state.citizens[0].id;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") + "/";
  useEffect(() => {
    let alive = true;
    setCode("");
    if (showCode && project?.artifact)
      fetch(base + project.artifact + "/" + file)
        .then((r) => {
          if (!r.ok)
            throw Error(
              "Source is unavailable while this Codespace is sleeping.",
            );
          return r.text();
        })
        .then((t) => {
          if (alive) setCode(t);
        })
        .catch((e) => {
          if (alive) setCode(e.message);
        });
    return () => {
      alive = false;
    };
  }, [showCode, file, project?.artifact]);
  const create = async () => {
    setBusy(true);
    try {
      const id = await request({ title, brief, assignee: developer });
      setActive(id);
      setStatus(
        "Your project is in the queue. You’ll see updates here when building actually begins.",
      );
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Your project couldn’t be added. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const approve = async () => {
    if (!project || !decision) return;
    try {
      await review({ id: project._id, decision });
      setStatus(
        decision === "approve"
          ? "Your approval is saved. The website is still private."
          : "Publication declined. Your files and project history are safe.",
      );
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Your decision didn’t save. Please try again.",
      );
    }
    setDecision(undefined);
  };
  return (
    <section className="panel creation-studio" id="genesis-creation-studio">
      <DigitalProducts />
      <span className="eyebrow">Made in Genesis</span>
      <h2>Creation Studio</h2>
      <p className="studio-badge">
        Real downloads · private projects · no connected payments
      </p>
      <p>
        Sage, Nova and Theo label the research, building and planning roles.
        Website projects currently use a checked bakery template, rather than an
        independent AI developer.
      </p>
      <p>
        You can build the bakery website template today. Other requests are
        saved as notes; they will not create a different kind of website yet.
        The Codespace needs to be awake for a build to run.
      </p>
      <details>
        <summary>Start a bakery website project</summary>
        <label>
          Project title
          <input
            aria-label="Studio project title"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Assign the project to
          <select
            aria-label="Studio developer"
            value={developer}
            onChange={(e) => setAssignee(+e.target.value)}
          >
            {state.citizens.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {state.life.people[c.id].job}
              </option>
            ))}
          </select>
        </label>
        <label>
          What would you like made?
          <textarea
            aria-label="Studio project brief"
            maxLength={2000}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
        </label>
        <button
          className="primary"
          disabled={busy}
          onClick={() => void create()}
        >
          Build the bakery website
        </button>
      </details>
      {status && <p role="status">{status}</p>}
      <label>
        Project
        <select
          aria-label="Studio project"
          value={project?._id ?? ""}
          onChange={(e) => {
            setActive(e.target.value as Id<"genesisStudioProjects">);
            setShowCode(false);
          }}
        >
          {!projects.length && <option>No projects yet</option>}
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.title} · {statusLabel(p.status)}
            </option>
          ))}
        </select>
      </label>
      {project && (
        <>
          <h3>{project.title}</h3>
          <p>
            <strong>{statusLabel(project.status)}</strong> · assigned to{" "}
            {project.assigneeName} ·{" "}
            {project.testResult ?? "Tests have not completed."}
          </p>
          <details>
            <summary>How this project was made</summary>
            <div className="studio-log" aria-label="Real development activity">
              {project.logs.map((l, i) => (
                <p key={i}>
                  <time>{new Date(l.at).toLocaleString()}</time> ·{" "}
                  <strong>{l.actor}</strong>
                  <br />
                  {l.text}
                </p>
              ))}
            </div>
          </details>
          {project.artifact && (
            <>
              <p>
                <a
                  href={base + project.artifact + "/index.html"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open private bakery website ↗
                </a>{" "}
                ·{" "}
                <a href={base + project.artifact + ".zip"} download>
                  Download project ZIP
                </a>{" "}
                ·{" "}
                <button onClick={() => setShowCode(!showCode)}>
                  View the code
                </button>
              </p>
              <iframe
                title="Private bakery website preview"
                src={base + project.artifact + "/preview.html"}
                sandbox="allow-scripts"
                loading="lazy"
              />
              {showCode && (
                <>
                  <select
                    aria-label="Source file"
                    value={file}
                    onChange={(e) => setFile(e.target.value)}
                  >
                    {[
                      "index.html",
                      "style.css",
                      "app.js",
                      "model.js",
                      "model.test.mjs",
                      "manifest.json",
                      "README.md",
                    ].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <pre>
                    <code>{code || "Loading source…"}</code>
                  </pre>
                </>
              )}
              <details>
                <summary>Technical file details</summary>
                <code>{project.sha}</code>
              </details>
              <div className="studio-buttons">
                <button onClick={() => setDecision("approve")}>
                  Review for publication
                </button>
                <button onClick={() => setDecision("reject")}>
                  Keep this project private
                </button>
              </div>
              {decision && (
                <div role="alert">
                  <p>
                    {decision === "approve"
                      ? "Record owner approval for this tested artifact? Actual publication remains disabled."
                      : "Keep this project private while retaining files and work logs?"}
                  </p>
                  <button onClick={() => setDecision(undefined)}>
                    Cancel review
                  </button>
                  <button onClick={() => void approve()}>
                    Confirm {decision}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <hr />
      <h3>Projects & village money</h3>
      <p>
        <strong>Village money</strong> · The ¤ balances belong to the fictional
        village.
      </p>
      <p>
        <strong>Digital projects</strong> · Genesis Digital Studio ·{" "}
        {projects.length} actual project records. Payments, sales and publishing
        are not connected. No money is spent and nothing goes public
        automatically.
      </p>
    </section>
  );
}

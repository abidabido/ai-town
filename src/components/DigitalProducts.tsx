import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
export default function DigitalProducts() {
  const products = useQuery(api.genesisProducts.list),
    review = useMutation(api.genesisProducts.review);
  const [active, setActive] = useState<string>(),
    [sample, setSample] = useState("sample-monthly.png"),
    [pending, setPending] = useState<"approve" | "reject">(),
    [status, setStatus] = useState("");
  const p = products?.find((p) => p._id === active) ?? products?.[0];
  const root = import.meta.env.BASE_URL.replace(/\/$/, "") + "/";
  const artifactValid =
    p &&
    ["awaiting-owner-review", "approved-not-published", "rejected"].includes(
      p.status,
    );
  const href = (f: string) => root + p!.base + "/" + f;
  const [availableFor, setAvailableFor] = useState(""),
    [artifactError, setArtifactError] = useState("");
  useEffect(() => {
    let alive = true;
    setAvailableFor("");
    setArtifactError("");
    if (!p?.sha) return;
    const product = p;
    Promise.all([
      fetch(root + product.base + "/The_Ultimate_Life_Organizer.pdf").then(
        (r) => {
          if (!r.ok) throw Error("Planner file is unavailable");
          return r.arrayBuffer();
        },
      ),
      fetch(root + product.base + "/Sample_Preview.pdf", { method: "HEAD" }),
      fetch(root + product.base + "/Product_Package.zip", { method: "HEAD" }),
    ])
      .then(async ([bytes, preview, bundle]) => {
        if (!preview.ok || !bundle.ok)
          throw Error("Product preview or package is unavailable");
        const digest = await crypto.subtle.digest("SHA-256", bytes),
          hash = Array.from(new Uint8Array(digest))
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("");
        if (hash !== product.sha)
          throw Error("Artifact hash does not match the validated revision");
        if (alive) setAvailableFor(product._id);
      })
      .catch((e) => {
        if (alive) setArtifactError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [p?._id, p?.sha]);
  const valid = artifactValid && availableFor === p?._id;
  return (
    <section
      aria-label="Real digital product library"
      style={{
        borderBottom: "1px solid #5a7168",
        paddingBottom: 28,
        marginBottom: 30,
      }}
    >
      <span className="eyebrow">PRODUCTS BEFORE PROFIT</span>
      <h2>Actual digital products</h2>
      <p>
        Files first. Every completed revision must pass PDF opening, all-page
        rendering and file-integrity checks. Nothing is publicly published.
      </p>
      {products === undefined ? (
        <p role="status">Loading product records…</p>
      ) : !p ? (
        <p>No validated products registered yet.</p>
      ) : (
        <>
          <label>
            Revision history
            <select
              aria-label="Product revision"
              value={p._id}
              onChange={(e) => {
                setActive(e.target.value);
                setPending(undefined);
              }}
            >
              {products.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.title} · revision {r.revision} · {r.status}
                </option>
              ))}
            </select>
          </label>
          <h3>{p.title}</h3>
          <p>
            <strong>
              REVISION {p.revision} · {p.status}
            </strong>
          </p>
          <p>{p.description}</p>
          {artifactValid && !valid && (
            <p role="status">
              {artifactError || "Checking actual product files…"}
            </p>
          )}
          {valid && (
            <>
              <img
                src={href("thumbnail.png")}
                alt="The Ultimate Life Organizer cover"
                style={{ width: 170, maxWidth: "100%", borderRadius: 8 }}
              />
              <p>
                {p.pageCount} verified pages · US Letter · undated · handwriting
                or PDF annotation · no automatic calculations
              </p>
              <p>
                <a
                  href={href("Sample_Preview.pdf")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview sample PDF
                </a>{" "}
                ·{" "}
                <a href={href("The_Ultimate_Life_Organizer.pdf")} download>
                  Download planner PDF
                </a>{" "}
                ·{" "}
                <a href={href("Product_Package.zip")} download>
                  Download complete product package
                </a>
              </p>
              <label>
                Preview pages
                <select
                  aria-label="Planner sample page"
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                >
                  <option value="sample-monthly.png">Monthly calendar</option>
                  <option value="sample-daily.png">Daily schedule</option>
                  <option value="sample-budget.png">Budget</option>
                  <option value="sample-habits.png">Habit tracker</option>
                </select>
              </label>
              <img
                src={href(sample)}
                alt="Selected planner sample page"
                style={{
                  width: "100%",
                  maxWidth: 540,
                  background: "white",
                  borderRadius: 8,
                }}
              />
              <p>
                <a
                  href={href("Product_Listing_DRAFT.md")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read draft listing and proposed costs
                </a>{" "}
                ·{" "}
                <a
                  href={href("manifest.json")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspect artifact manifest
                </a>
              </p>
            </>
          )}
          <h3>Actual work log</h3>
          <p>
            Sage, Nova and Theo are assigned roles. The entries below record
            tool execution, not invented autonomous citizen labor.
          </p>
          <div className="studio-log">
            {p.logs.map((l, i) => (
              <p key={i}>
                <strong>{l.role}</strong> · {l.tool} ·{" "}
                {new Date(l.at).toLocaleString()}
                <br />
                {l.text}
              </p>
            ))}
          </div>
          {p.report && (
            <details>
              <summary>Validation evidence</summary>
              <p>{p.report}</p>
              <code>{p.sha}</code>
            </details>
          )}
          {valid && (
            <>
              <div className="studio-buttons">
                <button onClick={() => setPending("approve")}>
                  Review publication approval
                </button>
                <button onClick={() => setPending("reject")}>
                  Reject publication
                </button>
              </div>
              {pending && (
                <div role="alert">
                  <p>
                    {pending === "approve"
                      ? "Approve this revision for potential publication? No publishing service is connected."
                      : "Reject publication while retaining the artifact and history?"}
                  </p>
                  <button onClick={() => setPending(undefined)}>Cancel</button>
                  <button
                    onClick={async () => {
                      try {
                        await review({
                          id: p._id as Id<"genesisProducts">,
                          decision: pending,
                        });
                        setStatus(
                          "Review recorded. No public publication occurred.",
                        );
                      } catch (e) {
                        setStatus(
                          e instanceof Error ? e.message : "Review failed",
                        );
                      }
                      setPending(undefined);
                    }}
                  >
                    Confirm {pending}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {status && <p role="status">{status}</p>}
    </section>
  );
}

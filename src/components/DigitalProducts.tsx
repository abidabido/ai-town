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
          if (!r.ok) throw Error("The planner file isn’t available right now.");
          return r.arrayBuffer();
        },
      ),
      fetch(root + product.base + "/Sample_Preview.pdf", { method: "HEAD" }),
      fetch(root + product.base + "/Product_Package.zip", { method: "HEAD" }),
    ])
      .then(async ([bytes, preview, bundle]) => {
        if (!preview.ok || !bundle.ok)
          throw Error(
            "The preview or download package isn’t available right now.",
          );
        const digest = await crypto.subtle.digest("SHA-256", bytes),
          hash = Array.from(new Uint8Array(digest))
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("");
        if (hash !== product.sha)
          throw Error(
            "This file doesn’t match the checked version. Downloads are paused until it is fixed.",
          );
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
      <h2>Your downloadable products</h2>
      <p>
        Preview and download the files below. Products are checked before they
        are marked ready. Nothing has been published.
      </p>
      {products === undefined ? (
        <p role="status">Gathering your products…</p>
      ) : !p ? (
        <p>
          No finished products yet. Completed, checked files will appear here.
        </p>
      ) : (
        <>
          <label>
            Product versions
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
                  {r.title} · revision {r.revision} · {statusLabel(r.status)}
                </option>
              ))}
            </select>
          </label>
          <h3>{p.title}</h3>
          <p>
            <strong>
              Version {p.revision} · {statusLabel(p.status)}
            </strong>
          </p>
          <p>{p.description}</p>
          {artifactValid && !valid && (
            <p role="status">{artifactError || "Checking your downloads…"}</p>
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
                  Preview the planner
                </a>{" "}
                ·{" "}
                <a href={href("The_Ultimate_Life_Organizer.pdf")} download>
                  Download planner PDF
                </a>{" "}
                ·{" "}
                <a href={href("Product_Package.zip")} download>
                  Download the full package
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
                  Read the draft description and price ideas
                </a>{" "}
                ·{" "}
                <a
                  href={href("manifest.json")}
                  target="_blank"
                  rel="noreferrer"
                >
                  File checklist and technical details
                </a>
              </p>
            </>
          )}
          <details>
            <summary>How this product was made</summary>
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
          </details>
          {p.report && (
            <details>
              <summary>File checks and technical details</summary>
              <p>{p.report}</p>
              <code>{p.sha}</code>
            </details>
          )}
          {valid && (
            <>
              <div className="studio-buttons">
                <button onClick={() => setPending("approve")}>
                  Review for publication
                </button>
                <button onClick={() => setPending("reject")}>
                  Keep this version private
                </button>
              </div>
              {pending && (
                <div role="alert">
                  <p>
                    {pending === "approve"
                      ? "Approve this revision for potential publication? No publishing service is connected."
                      : "Keep this version private while retaining the artifact and history?"}
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
                          "Your decision is saved. The product is still private.",
                        );
                      } catch (e) {
                        setStatus(
                          e instanceof Error
                            ? e.message
                            : "Your decision didn’t save. Please try again.",
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

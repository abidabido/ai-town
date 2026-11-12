import type { LivingState } from "../../data/genesisLife";
export default function FamilyLegacyArchive({ state }: { state: LivingState }) {
  const rows = state.life.families?.partnerships ?? [];
  const name = (id: number) =>
    state.citizens.find((c) => c.id === id)?.name ?? "A former villager";
  return (
    <section id="genesis-families" className="panel character-studio">
      <span className="eyebrow">Life together</span>
      <h2>Love &amp; Families</h2>
      <p>
        See who’s dating, who’s married, and how their relationships have
        changed.
      </p>
      {!rows.length ? (
        <p>
          No couples have formed yet. Friendships can still grow—there’s no need
          to rush the romance.
        </p>
      ) : (
        rows
          .slice()
          .reverse()
          .map((p) => (
            <article key={p.id}>
              <h3>
                {name(p.a)} &amp; {name(p.b)}
              </h3>
              <p>
                {p.status === "married"
                  ? "Married"
                  : p.status === "dating"
                    ? "Dating"
                    : "Separated"}{" "}
                · together since village day {Math.floor(p.started / 4) + 1} ·
                updated on day {Math.floor(p.changed / 4) + 1}
              </p>
              <details>
                <summary>Relationship details</summary>
                <p>
                  Each person’s interest, trust and wellbeing affect whether
                  this relationship continues. Find their dating, marriage or
                  separation event in Village History.
                </p>
                <details>
                  <summary>Technical details</summary>
                  <p>
                    Recorded willingness: {p.acceptanceA.toFixed(3)} /{" "}
                    {p.acceptanceB.toFixed(3)}
                  </p>
                </details>
              </details>
            </article>
          ))
      )}
      <details>
        <summary>How relationships grow</summary>
        <p>
          Eligible adults can choose to date, marry or separate. Their
          preferences and trust matter, and each person must be willing. Nobody
          is guaranteed a partner. Marriage does not yet combine their home or
          savings.
        </p>
      </details>
      <p className="muted">
        Babies, pregnancy, adoption and family trees are still being developed.
      </p>
    </section>
  );
}

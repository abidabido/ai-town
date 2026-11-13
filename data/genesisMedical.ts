export const MEDICAL_PROTOCOL = "early-ad-antibodies-v1";
export const MEDICAL_QUESTION =
  "In early Alzheimer disease, what did the pivotal lecanemab and donanemab trials report about benefit and safety?";
export const MEDICAL_QUERY = "SRC:MED AND (EXT_ID:36449413 OR EXT_ID:37459141)";
export const MEDICAL_ENDPOINT =
  "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
const trials = {
  "36449413": {
    doi: "10.1056/nejmoa2212948",
    name: "lecanemab",
    tokens: ["1795", "0.45", "12.6"],
    population:
      "1,795 people with amyloid-confirmed mild cognitive impairment or mild dementia due to Alzheimer disease.",
    finding:
      "At 18 months, CDR-SB worsened by 1.21 points with lecanemab and 1.66 with placebo: a between-group difference of −0.45 points (95% CI −0.67 to −0.23). ARIA with edema or effusion occurred in 12.6% of treated participants.",
    limits:
      "Selected early-disease population; 18-month follow-up; industry-funded trial. This shows less average decline, not reversal or a cure. Longer-term benefit and safety were not established by this trial.",
    n: 1795,
    endpoint: "CDR-SB at 18 months",
    difference: -0.45,
    ci: [-0.67, -0.23],
  },
  "37459141": {
    doi: "10.1001/jama.2023.13239",
    name: "donanemab",
    tokens: ["1736", "2.92", "24.0"],
    population:
      "1,736 people with early symptomatic Alzheimer disease and amyloid and tau pathology.",
    finding:
      "At 76 weeks, the combined-population iADRS difference favored donanemab by 2.92 points (95% CI 1.51 to 4.33). ARIA with edema or effusion occurred in 24.0% with donanemab and 2.1% with placebo; three treated-group deaths and one placebo-group death were considered treatment-related.",
    limits:
      "Selected biomarker-defined population; 76-week outcome; 76% completed the trial; industry funding. Different scales, populations and designs prevent ranking the drugs from these two separate trials.",
    n: 1736,
    endpoint: "iADRS at 76 weeks, combined population",
    difference: 2.92,
    ci: [1.51, 4.33],
  },
};
export type MedicalPaper = {
  pmid: string;
  doi: string;
  title: string;
  authors: string;
  publicationDate: string;
  journal: string;
  url: string;
  providerUrl: string;
  providerTypes: string[];
  studyType: string;
  population: string;
  finding: string;
  limitations: string;
  retrievedAt: string;
  n: number;
  endpoint: string;
  difference: number;
  ci: number[];
};
export type MedicalReview = {
  protocol: string;
  question: string;
  scope: string;
  query: string;
  endpoint: string;
  retrievedAt: string;
  hitCount: number;
  papers: MedicalPaper[];
  summary: string;
  limits: string[];
  hypothesis: {
    status: string;
    mechanism: string;
    support: string[];
    constraints: string[];
    alternatives: string[];
    prediction: string;
    analysis: string;
    validation: string;
    novelty: string;
    origin: string;
  };
  publication: string;
  execution: string;
  stages: { name: string; status: string; detail: string }[];
};
const clean = (s: unknown, max = 500) => {
  if (typeof s !== "string") throw Error("Missing source metadata");
  return s
    .replace(new RegExp("<[/]?[A-Za-z][^>]*>", "g"), "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
};
export function medicalUrl() {
  const u = new URL(MEDICAL_ENDPOINT);
  u.search = new URLSearchParams({
    query: MEDICAL_QUERY,
    format: "json",
    resultType: "core",
    pageSize: "10",
  }).toString();
  return u.toString();
}
export function buildMedicalReview(
  payload: unknown,
  retrievedAt: string,
): MedicalReview {
  if (!Number.isFinite(Date.parse(retrievedAt)))
    throw Error("A real retrieval timestamp is required.");
  const data = payload as {
    hitCount?: number;
    resultList?: { result?: Record<string, any>[] };
  };
  if (
    !Array.isArray(data?.resultList?.result) ||
    data.resultList!.result!.length !== 2
  )
    throw Error(
      "Both selected trials must be retrieved before a review is ready.",
    );
  const seen = new Set<string>();
  const papers = data
    .resultList!.result!.map((r) => {
      const id = String(r.id),
        t = trials[id as keyof typeof trials];
      if (!t || r.source !== "MED" || seen.has(id))
        throw Error("Unexpected or duplicate source identifier.");
      seen.add(id);
      const title = clean(r.title),
        doi = clean(r.doi).toLowerCase(),
        abstract = clean(r.abstractText, 20000).replaceAll(",", "");
      if (
        doi !== t.doi ||
        !title.toLowerCase().includes(t.name) ||
        t.tokens.some((token) => !abstract.includes(token))
      )
        throw Error(
          "The retrieved article needs manual source review; identifiers or extraction anchors differ.",
        );
      const date = clean(r.firstPublicationDate, 10);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date))
      )
        throw Error("Missing publication date.");
      const authors = clean(r.authorString, 8000),
        journal = clean(r.journalInfo?.journal?.title, 200);
      if (!authors || !journal) throw Error("Incomplete citation metadata.");
      return {
        pmid: id,
        doi,
        title,
        authors,
        publicationDate: date,
        journal,
        url: "https://pubmed.ncbi.nlm.nih.gov/" + id + "/",
        providerUrl: "https://europepmc.org/article/MED/" + id,
        providerTypes: Array.isArray(r.pubTypeList?.pubType)
          ? r.pubTypeList.pubType
              .map((x: unknown) => clean(x, 100))
              .slice(0, 20)
          : [],
        studyType:
          "Randomized, double-blind, placebo-controlled phase 3 trial (abstract-level appraisal)",
        population: t.population,
        finding: t.finding,
        limitations: t.limits,
        retrievedAt,
        n: t.n,
        endpoint: t.endpoint,
        difference: t.difference,
        ci: [...t.ci],
      };
    })
    .sort((a, b) => a.pmid.localeCompare(b.pmid));
  if (seen.size !== 2) throw Error("The review is incomplete.");
  return {
    protocol: MEDICAL_PROTOCOL,
    question: MEDICAL_QUESTION,
    scope:
      "A focused, abstract-level review of two preselected pivotal trials. This is not a systematic review, a latest-literature search, or treatment guidance.",
    query: MEDICAL_QUERY,
    endpoint: medicalUrl(),
    retrievedAt,
    hitCount: Number(data.hitCount) || 2,
    papers,
    summary:
      "Both trials reported slower average decline in selected people with early Alzheimer disease, alongside important safety concerns. Neither demonstrated a cure. They used different designs and outcomes, so these results do not establish which drug is better.",
    limits: [
      "Two studies selected in advance; no comprehensive screening, pooled analysis or formal risk-of-bias assessment.",
      "Published summaries and identifiers checked; full study protocols, supplements and individual participant data were not reviewed.",
      "Later studies, retractions, regulatory changes and current clinical guidance are outside this fixed historical review.",
      "Village symptoms and fictional recoveries are not evidence for these real-world findings.",
    ],
    hypothesis: {
      status: "EARLY HYPOTHESIS",
      mechanism:
        "Baseline pathology may modify the balance between amyloid-related clinical effects and imaging-related harms.",
      support: papers.map((p) => p.pmid),
      constraints: [
        "Both studies concern selected biomarker-defined populations. Their aggregate results do not test or prove this proposed modifier.",
        "Imaging-related harms constrain any claim that amyloid reduction alone is an adequate measure of net benefit.",
      ],
      alternatives: [
        "Different eligibility criteria, outcome scales, follow-up and missing-data patterns could explain cross-trial differences.",
      ],
      prediction:
        "A prespecified, independently replicated within-trial interaction analysis would be needed to test whether baseline pathology modifies outcomes.",
      analysis:
        "Not executed. Requires suitable licensed data, a preregistered plan and qualified statistical review; do not pool these aggregate endpoints.",
      validation:
        "Independent methods review and external replication required. No clinical intervention is proposed.",
      novelty: "Not checked; this is not labeled novel or a discovery.",
      origin:
        "Software-seeded question attached to retrieved evidence, not an independently generated Atlas insight.",
    },
    publication: "Private draft — external publication not approved",
    execution:
      "Actual Europe PMC API retrieval plus a versioned, source-checked summary template; no LLM research worker or autonomous citizen execution.",
    stages: [
      {
        name: "Identify a question",
        status: "DONE",
        detail: "Observer-authorized, predefined research question.",
      },
      {
        name: "Search literature",
        status: "DONE",
        detail:
          "Europe PMC API returned and matched both selected PubMed records.",
      },
      {
        name: "Assess evidence",
        status: "DONE — LIMITED",
        detail:
          "Structured abstract-level appraisal; no formal full-text bias assessment.",
      },
      {
        name: "Develop hypotheses",
        status: "DRAFT",
        detail:
          "Evidence-linked, software-seeded hypothesis; no novelty claim.",
      },
      {
        name: "Design an analysis",
        status: "PROPOSED",
        detail:
          "Within-trial modifier analysis would require appropriate data and review.",
      },
      {
        name: "Execute computation",
        status: "NOT RUN",
        detail: "No patient dataset or biomedical experiment executed.",
      },
      {
        name: "Validate results",
        status: "SOURCE CHECKS ONLY",
        detail:
          "Identifiers, DOI/title and extraction anchors matched; no independent clinical validation.",
      },
      {
        name: "Independent review",
        status: "PENDING",
        detail:
          "Sage is a simulated reviewer assignment; no independent review has occurred.",
      },
      {
        name: "Revise or reject",
        status: "PENDING",
        detail: "Requires review or new evidence.",
      },
      {
        name: "Research report",
        status: "PRIVATE DRAFT READY",
        detail:
          "Downloadable source-linked report; publication remains unapproved.",
      },
    ],
  };
}
export function medicalReport(r: MedicalReview) {
  return [
    "# Dr. Atlas — focused medical literature review",
    r.question,
    r.scope,
    "Protocol: " + r.protocol,
    "Query: " + r.query,
    "API: " + r.endpoint,
    "Retrieved (UTC): " + r.retrievedAt,
    r.execution,
    r.summary,
    ...r.limits.map((s) => "- " + s),
    ...r.papers.flatMap((p) => [
      "## " + p.title,
      "PMID " + p.pmid + " | DOI " + p.doi,
      p.authors,
      p.journal + " | " + p.publicationDate,
      p.url,
      p.studyType,
      p.population,
      p.finding,
      "Limitations: " + p.limitations,
    ]),
    "## Hypothesis — " + r.hypothesis.status,
    r.hypothesis.mechanism,
    r.hypothesis.origin,
    "Linked studies: " + r.hypothesis.support.join(", "),
    ...r.hypothesis.constraints,
    ...r.hypothesis.alternatives,
    "Prediction: " + r.hypothesis.prediction,
    r.hypothesis.novelty,
    r.hypothesis.analysis,
    r.hypothesis.validation,
    "## Actual workflow status",
    ...r.stages.map((s) => "- " + s.name + ": " + s.status + " — " + s.detail),
    r.publication,
    "Fictional research roles are not clinical licensing. This report is not a patient-specific recommendation.",
  ].join("\n\n");
}

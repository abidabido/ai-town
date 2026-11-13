const assert = require("node:assert/strict"),
  fs = require("fs"),
  os = require("os"),
  path = require("path"),
  cp = require("child_process");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-medical-"));
try {
  cp.execFileSync("node_modules/.bin/tsc", [
    "data/genesisMedical.ts",
    "--outDir",
    dir,
    "--target",
    "ES2021",
    "--module",
    "commonjs",
    "--skipLibCheck",
    "--strict",
  ]);
  const m = require(path.join(dir, "genesisMedical.js"));
  const record = (id, doi, name, numbers) => ({
    id,
    source: "MED",
    doi,
    title: name + " trial",
    authorString: "Fixture Author",
    firstPublicationDate: "2023-01-01",
    journalInfo: { journal: { title: "Fixture journal" } },
    abstractText: numbers,
    pubTypeList: { pubType: ["Randomized Controlled Trial"] },
  });
  const fixture = {
    hitCount: 2,
    resultList: {
      result: [
        record(
          "36449413",
          "10.1056/nejmoa2212948",
          "Lecanemab",
          "1795 P<0.001 0.45 12.6",
        ),
        record(
          "37459141",
          "10.1001/jama.2023.13239",
          "Donanemab",
          "1736 2.92 24.0",
        ),
      ],
    },
  };
  const clone = () => JSON.parse(JSON.stringify(fixture)),
    date = "2026-11-13T16:00:00Z";
  const r = m.buildMedicalReview(fixture, date);
  assert.equal(r.papers.length, 2);
  assert.equal(r.papers[0].pmid, "36449413");
  assert.equal(r.papers[0].difference, -0.45);
  assert.equal(
    r.stages.find((x) => x.name === "Execute computation").status,
    "NOT RUN",
  );
  assert.match(r.hypothesis.novelty, /not.*novel|Not checked/i);
  assert.match(r.publication, /not approved/);
  assert.match(r.execution, /template/);
  assert.equal(new URL(m.medicalUrl()).hostname, "www.ebi.ac.uk");
  for (const mutate of [
    (x) => x.resultList.result.pop(),
    (x) => (x.resultList.result[1] = x.resultList.result[0]),
    (x) => (x.resultList.result[0].doi = "fake"),
    (x) => (x.resultList.result[0].abstractText = ""),
    (x) => (x.resultList.result[0].source = "OTHER"),
    (x) => (x.resultList.result[0].title = "wrong"),
    (x) => (x.resultList.result[0].firstPublicationDate = "not a date"),
  ]) {
    const x = clone();
    mutate(x);
    assert.throws(() => m.buildMedicalReview(x, date));
  }
  assert.throws(() => m.buildMedicalReview(null, date));
  assert.throws(() => m.buildMedicalReview(fixture, "bad date"));
  const x = clone();
  x.resultList.result[0].title = "<b>Lecanemab</b> trial";
  assert.equal(
    m.buildMedicalReview(x, date).papers[0].title,
    "Lecanemab trial",
  );
  const report = m.medicalReport(r);
  assert.ok(Buffer.byteLength(report) > 3000);
  assert.ok(report.includes(String.fromCharCode(10)));
  assert.ok(!report.includes("<script"));
  assert.match(report, /36449413/);
  assert.match(report, /37459141/);
  if (process.argv.includes("--live")) {
    const raw = JSON.parse(
      fs.readFileSync("/tmp/genesis-medical-api.json", "utf8"),
    );
    assert.equal(m.buildMedicalReview(raw, date).papers.length, 2);
    console.log("Previously retrieved real Europe PMC payload validated.");
  }
  console.log(
    "PASS: medical source identity, duplicate/missing/rejected metadata, uncertainty, stage honesty, report content and URL checks.",
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

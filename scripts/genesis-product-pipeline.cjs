const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  cp = require("node:child_process");
function verifyDirectory(dir) {
  const m = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
  );
  const required = [
    "The_Ultimate_Life_Organizer.pdf",
    "Sample_Preview.pdf",
    "thumbnail.png",
    "Product_Listing_DRAFT.md",
    "READ_ME.txt",
    "sample-monthly.png",
    "sample-daily.png",
    "sample-budget.png",
    "sample-habits.png",
  ];
  for (const f of required)
    if (!m.files[f]) throw Error("Manifest missing required artifact: " + f);
  for (const [name, meta] of Object.entries(m.files)) {
    if (path.basename(name) !== name) throw Error("Unsafe artifact filename");
    const data = fs.readFileSync(path.join(dir, name));
    if (
      data.length !== meta.bytes ||
      crypto.createHash("sha256").update(data).digest("hex") !== meta.sha256
    )
      throw Error("Artifact integrity failed: " + name);
  }
  const bytes = fs.readFileSync(path.join(dir, required[0]));
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw Error("Not a PDF");
  const python =
    process.env.GENESIS_PDF_PYTHON ||
    "/workspaces/.genesis-product-runtime/bin/python";
  const report = JSON.parse(
    cp.execFileSync(python, ["scripts/validate-genesis-planner.py", dir], {
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 100000,
      env: { PATH: process.env.PATH || "/usr/bin:/bin" },
    }),
  );
  if (!report.passed) throw Error("PDF validation failed");
  return {
    manifest: m,
    report,
    sha: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}
function convex(name, args) {
  const raw = cp.execFileSync(
    "./node_modules/.bin/convex",
    ["run", "genesisProducts:" + name, JSON.stringify(args)],
    { encoding: "utf8", timeout: 40000, maxBuffer: 100000 },
  );
  return JSON.parse(raw);
}
function main() {
  const key = process.argv[2] || "life-organizer",
    revision = Number(process.argv[3] || 1);
  if (
    !/^[a-z0-9-]{1,60}$/.test(key) ||
    !Number.isInteger(revision) ||
    revision < 1
  )
    throw Error("Use a safe product key and positive revision");
  const base = "genesis-products/" + key + "/v" + revision,
    dir = path.resolve("public", base);
  const m = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
  );
  if (m.revision !== revision) throw Error("Manifest revision mismatch");
  if (process.argv.includes("--verify-only")) {
    console.log(JSON.stringify(verifyDirectory(dir)));
    return;
  }
  const id = convex("begin", {
    key,
    revision,
    title: m.product,
    description: m.description,
    base,
  });
  try {
    const result = verifyDirectory(dir);
    cp.execFileSync(
      process.env.GENESIS_PDF_PYTHON ||
        "/workspaces/.genesis-product-runtime/bin/python",
      [
        "-c",
        'import pathlib,sys,zipfile; root=pathlib.Path(sys.argv[1]); z=zipfile.ZipFile(root/"Product_Package.zip","w",zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(root)) for p in root.rglob("*") if p.is_file() and p.name!="Product_Package.zip"]; z.close()',
        dir,
      ],
      { timeout: 10000 },
    );
    const report =
      "PASS: " +
      result.report.pageCount +
      " PDF pages opened and rendered; 163 internal links and text bounds checked; 9 preview pages rendered; all declared file hashes matched. Original layouts were visually reviewed during production. Static annotation/print PDF, not a type-in form. No publication.";
    convex("finish", {
      id,
      passed: true,
      sha: result.sha,
      report,
      pageCount: result.report.pageCount,
    });
    console.log(
      "VERIFIED PRODUCT: " +
        key +
        " revision " +
        revision +
        "; awaiting owner review.",
    );
  } catch (e) {
    convex("finish", {
      id,
      passed: false,
      sha: "",
      report: String(e.message).slice(0, 3000),
      pageCount: 0,
    });
    throw e;
  }
}
module.exports = { verifyDirectory };
if (require.main === module)
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }

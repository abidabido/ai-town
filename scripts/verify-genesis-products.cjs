const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { verifyDirectory } = require("./genesis-product-pipeline.cjs");
const src = "public/genesis-products/life-organizer/v1",
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-product-test-"));
fs.cpSync(src, tmp, { recursive: true });
try {
  const v = verifyDirectory(tmp);
  assert.equal(v.report.pageCount, 156);
  assert.equal(v.report.samplePages, 9);
  fs.appendFileSync(
    path.join(tmp, "The_Ultimate_Life_Organizer.pdf"),
    "tamper",
  );
  assert.throws(() => verifyDirectory(tmp), /integrity failed/);
  fs.copyFileSync(
    path.join(src, "The_Ultimate_Life_Organizer.pdf"),
    path.join(tmp, "The_Ultimate_Life_Organizer.pdf"),
  );
  fs.unlinkSync(path.join(tmp, "Sample_Preview.pdf"));
  assert.throws(() => verifyDirectory(tmp));
  console.log(
    "PASS: complete PDF validates; tampered full PDF and missing preview cannot complete.",
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

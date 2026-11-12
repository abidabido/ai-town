# Life Organizer production

Current product files and the original generator are in public/genesis-products/life-organizer/v1. Source generator: source/build_life_organizer.py. Requires Python reportlab, PyMuPDF, Pillow and DejaVu fonts to regenerate. The original generator produced and rendered this revision in the authoring environment.

To validate and register actual artifacts: node scripts/genesis-product-pipeline.cjs life-organizer 1. For another run, use --verify-only; registered revision IDs are immutable. Install PDF validation dependencies in /workspaces/.genesis-product-runtime with Python venv and pip install reportlab pymupdf. Override GENESIS_PDF_PYTHON for another Python executable. Run node scripts/verify-genesis-products.cjs for integrity failure tests.

Pipeline: author real files -> immutable revision folder + manifest -> all-file SHA checks -> open/render every PDF page + bounds/links -> package -> record awaiting-owner-review -> explicit owner review. No publication implementation. This is an artifact-driven first product pipeline, not a general-purpose autonomous designer or arbitrary code executor. Existing bakery builder remains separate.

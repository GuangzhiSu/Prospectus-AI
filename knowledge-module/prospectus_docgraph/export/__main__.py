"""Allow ``python -m prospectus_docgraph.export``."""

from prospectus_docgraph.export.cli import main

if __name__ == "__main__":
    raise SystemExit(main())

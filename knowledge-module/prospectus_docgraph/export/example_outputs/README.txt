Example artifacts (shape reference)

After running:

  python -m prospectus_docgraph.export --input-graph <graph.json> --output ./out

you should see:

  section_schema_cards.json      — array of SectionSchemaCard objects
  section_schema_cards.jsonl     — one card per line
  planner_training.json          — planner supervision rows
  generator_training.json        — section + subsection text rows
  alias_training.json            — review queue for headings
  export_summary.json            — counts
  *.csv                          — tabular summaries

The files in this folder are tiny structural samples (not full corpora).

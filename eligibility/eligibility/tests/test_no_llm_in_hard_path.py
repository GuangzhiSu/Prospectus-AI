"""Import-isolation guard: the hard path must never pull in an LLM stack.

Importing the hard engine (and the resolver and loader it depends on) must not
import any LLM / inference library, nor the qualitative / extraction / feedback
packages. The report assembler and pipeline are deliberately excluded here:
they orchestrate multiple stages and may touch LLM helpers. Run in a fresh
subprocess so the assertion sees only what the hard path itself imports.
"""
import subprocess
import sys
import textwrap
import unittest

FORBIDDEN = [
    "torch",
    "transformers",
    "openai",
    "langgraph",
    "langchain",
    "sentence_transformers",
    "eligibility.soft",
    "eligibility.qualitative",
    "eligibility.extraction",
    "eligibility.feedback",
    "eligibility.common.llm",
    "eligibility.pipeline",
    "eligibility.report",
    "llm_qwen",
    "llm_openai",
]


class NoLLMInHardPath(unittest.TestCase):
    def test_hard_path_imports_no_llm(self):
        script = textwrap.dedent(
            """
            import sys
            import eligibility.engine
            import eligibility.resolver
            import eligibility.loader
            import eligibility.hard_inspection
            import eligibility.hard_inspection.engine
            import eligibility.hard_inspection.resolver
            import eligibility.hard_inspection.loader
            forbidden = %r
            leaked = [m for m in forbidden if m in sys.modules]
            print(",".join(leaked))
            sys.exit(1 if leaked else 0)
            """
            % FORBIDDEN
        )
        proc = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
        )
        leaked = proc.stdout.strip()
        self.assertEqual(
            proc.returncode,
            0,
            f"hard path imported forbidden modules: {leaked}\nstderr: {proc.stderr}",
        )


if __name__ == "__main__":
    unittest.main()

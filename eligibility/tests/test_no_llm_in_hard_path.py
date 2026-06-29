"""Import-isolation guard: the hard path must never pull in an LLM stack.

Importing the hard engine (and the resolver and loader it depends on) must not
import any LLM / inference library, nor the soft module. The report assembler is
deliberately excluded here: it orchestrates both engines and is allowed to touch
the soft stub. Run in a fresh subprocess so the assertion sees only what the
hard path itself imports.
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
    "llm_qwen",
    "llm_openai",
]


class NoLLMInHardPath(unittest.TestCase):
    def test_hard_path_imports_no_llm(self):
        script = textwrap.dedent(
            """
            import sys
            import eligibility.engine        # hard engine
            import eligibility.resolver      # read-only getter
            import eligibility.loader        # rule loading
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

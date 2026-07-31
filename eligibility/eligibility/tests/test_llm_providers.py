"""Provider / stub-mode tests for eligibility LLM (no network)."""
from __future__ import annotations

import os
import unittest


class LlmProviderStubTests(unittest.TestCase):
    def setUp(self):
        self._env = dict(os.environ)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_explicit_stub(self):
        os.environ["ELIGIBILITY_LLM_STUB"] = "1"
        os.environ["LLM_PROVIDER"] = "openai"
        os.environ["OPENAI_API_KEY"] = "sk-test"
        from eligibility.common import llm

        # reload semantics: functions read env live
        self.assertTrue(llm.stub_mode())

    def test_openai_without_key_stubs(self):
        os.environ.pop("ELIGIBILITY_LLM_STUB", None)
        os.environ["LLM_PROVIDER"] = "openai"
        os.environ.pop("OPENAI_API_KEY", None)
        from eligibility.common import llm

        self.assertTrue(llm.stub_mode())

    def test_openai_with_key_live(self):
        os.environ["ELIGIBILITY_LLM_STUB"] = "0"
        os.environ["LLM_PROVIDER"] = "openai"
        os.environ["OPENAI_API_KEY"] = "sk-test"
        from eligibility.common import llm

        self.assertFalse(llm.stub_mode())

    def test_qwen_local_does_not_auto_stub(self):
        os.environ.pop("ELIGIBILITY_LLM_STUB", None)
        os.environ["LLM_PROVIDER"] = "qwen_local"
        from eligibility.common import llm

        self.assertFalse(llm.stub_mode())
        status = llm.provider_status()
        self.assertEqual(status["provider"], "qwen_local")
        self.assertFalse(status["stub"])

    def test_anthropic_needs_key(self):
        os.environ.pop("ELIGIBILITY_LLM_STUB", None)
        os.environ["LLM_PROVIDER"] = "anthropic"
        os.environ.pop("ANTHROPIC_API_KEY", None)
        from eligibility.common import llm

        self.assertTrue(llm.stub_mode())


if __name__ == "__main__":
    unittest.main()

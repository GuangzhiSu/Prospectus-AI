"""Title normalization: rules + fuzzy matching + LLM hook (not implemented)."""

from prospectus_docgraph.normalizer.match_result import MatchAlternative, MatchResult
from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer

__all__ = [
    "MatchResult",
    "MatchAlternative",
    "TitleNormalizer",
]

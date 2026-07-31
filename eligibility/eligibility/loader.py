"""Compatibility shim — rule loader lives in ``hard_inspection``."""
from .hard_inspection.loader import *  # noqa: F401,F403
from .hard_inspection.loader import (  # noqa: F401
    RULES_DIR,
    SOFT_RULES_DIR,
    RuleConfigError,
    gate_effective,
    load_all,
    load_ruleset,
    load_soft_layer,
    select_by_name,
    unverified_thresholds,
    walk_checks,
)

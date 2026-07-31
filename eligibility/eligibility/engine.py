"""Compatibility shim — hard engine lives in ``hard_inspection``."""
from .hard_inspection.engine import *  # noqa: F401,F403
from .hard_inspection.engine import (  # noqa: F401
    EVAL_STATUSES,
    INDETERMINATE,
    MISSING_INPUT,
    NOT_EVALUATED,
    PASS,
    SHORTFALL,
    CheckResult,
    EvalContext,
    GateResult,
    eval_check,
    eval_gate,
    eval_requirement,
)

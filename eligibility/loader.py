"""Load and validate the versioned rule configs.

Every ruleset is a YAML file under ``eligibility/rules/``. The loader validates
that the required version / provenance fields are present so that a malformed or
unsourced rule cannot silently slip into a run, and exposes helpers used by the
report (e.g. listing every threshold whose ``threshold_verified`` is still false).
"""
from __future__ import annotations

import glob
import os

import yaml

RULES_DIR = os.path.join(os.path.dirname(__file__), "rules")

_REQUIRED_RULESET_KEYS = ("ruleset", "version", "gates")
_REQUIRED_GATE_KEYS = ("id", "rule_ref", "effective_from")
# Soft-layer (qualitative_signals) gates use a different schema: a trigger signal
# and severity rather than a versioned threshold / effective_from.
_REQUIRED_SOFT_GATE_KEYS = ("id", "rule_ref", "trigger_signal", "severity",
                            "requires_llm")


class RuleConfigError(ValueError):
    """Raised when a rule config is missing required version / provenance keys."""


def load_ruleset(path: str) -> dict:
    """Load and lightly validate one ruleset YAML file (hard or soft layer)."""
    with open(path, encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise RuleConfigError(f"{path}: top level must be a mapping")
    for key in _REQUIRED_RULESET_KEYS:
        if key not in data:
            raise RuleConfigError(f"{path}: missing required ruleset key '{key}'")
    if not isinstance(data["gates"], list):
        raise RuleConfigError(f"{path}: 'gates' must be a list")
    layer = data.get("layer", "hard")
    data["layer"] = layer
    for gate in data["gates"]:
        if layer == "soft":
            for key in _REQUIRED_SOFT_GATE_KEYS:
                if key not in gate:
                    raise RuleConfigError(
                        f"{path}: soft gate {gate.get('id', '?')} missing key '{key}'"
                    )
            gate.setdefault("evaluated", False)
            gate.setdefault("provenance_verified", False)
            gate.setdefault("signal_level_verified", False)
        else:
            for key in _REQUIRED_GATE_KEYS:
                if key not in gate:
                    raise RuleConfigError(
                        f"{path}: gate {gate.get('id', '?')} missing key '{key}'"
                    )
            gate.setdefault("human_signoff", False)
    data["_source_file"] = os.path.basename(path)
    return data


def walk_checks(requirement):
    """Yield every leaf check dict in a requirement tree (all_of / any_of)."""
    if not isinstance(requirement, dict):
        return
    if "all_of" in requirement:
        for child in requirement["all_of"]:
            yield from walk_checks(child)
    elif "any_of" in requirement:
        for child in requirement["any_of"]:
            yield from walk_checks(child)
    else:
        yield requirement.get("check", requirement)


def load_all(rules_dir: str = RULES_DIR) -> list[dict]:
    """Load every HARD ``*.yaml`` ruleset in ``rules_dir``, sorted by filename.

    Soft-layer rulesets (``layer: soft``) are excluded; they are loaded with
    ``load_soft_layer`` and surfaced through the soft engine, never the hard
    engine.
    """
    rulesets = []
    for path in sorted(glob.glob(os.path.join(rules_dir, "*.yaml"))):
        rs = load_ruleset(path)
        if rs.get("layer", "hard") != "soft":
            rulesets.append(rs)
    return rulesets


def load_soft_layer(rules_dir: str = RULES_DIR) -> list[dict]:
    """Load every SOFT-layer ruleset (``layer: soft``) in ``rules_dir``."""
    rulesets = []
    for path in sorted(glob.glob(os.path.join(rules_dir, "*.yaml"))):
        rs = load_ruleset(path)
        if rs.get("layer", "hard") == "soft":
            rulesets.append(rs)
    return rulesets


def select_by_name(rulesets: list[dict], names: list[str]) -> list[dict]:
    """Keep only rulesets whose ``ruleset`` id or source filename matches."""
    wanted = set(names)
    return [
        rs
        for rs in rulesets
        if rs.get("ruleset") in wanted
        or os.path.splitext(rs.get("_source_file", ""))[0] in wanted
    ]


def gate_effective(gate: dict, as_of_date: str | None) -> bool:
    """Whether a gate's ``effective_from`` is on or before ``as_of_date``.

    With no ``as_of_date`` supplied, all gates are considered effective (date
    filtering is opt-in). Comparison is lexical on ISO ``YYYY-MM-DD`` strings.
    """
    if not as_of_date:
        return True
    effective_from = gate.get("effective_from")
    if not effective_from:
        return True
    return str(effective_from) <= str(as_of_date)


def unverified_thresholds(rulesets: list[dict]) -> list[dict]:
    """List every check whose numeric value is not yet ``threshold_verified``.

    Drives the verification checklist in the docs. ``threshold_verified`` means
    the value was checked against the primary rulebook; it is independent of
    ``human_signoff`` (a qualified human approving the rule for client use),
    which stays open on every gate this phase.
    """
    pending = []
    for rs in rulesets:
        for gate in rs["gates"]:
            for check in walk_checks(gate.get("requirement", {})):
                if not check.get("threshold_verified", False):
                    pending.append(
                        {
                            "ruleset": rs.get("ruleset"),
                            "source_file": rs.get("_source_file"),
                            "gate_id": gate.get("id"),
                            "check_id": check.get("id"),
                            "rule_ref": gate.get("rule_ref"),
                            "operator": check.get("operator"),
                        }
                    )
    return pending

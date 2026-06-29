"""Read-only path getter for the listing-eligibility diagnostic.

This is vendored on purpose; it is NOT imported from ``compute_module``. Two
reasons:

1. The diagnostic engine must ONLY read values that are already resolved. It
   must never trigger a computation. ``compute_module`` couples its resolver to
   the compute step (uncomputed fields are meant to be filled there); here an
   uncomputed or null field is simply an absent leaf, reported downstream as
   ``MISSING_INPUT``.
2. Currency-aware comparison needs the unit. ``compute_module``'s leaf reader
   drops the ``{value, unit}`` wrapper down to the bare number; this getter
   keeps the unit so the engine can tell RMB from HKD.

The path grammar deliberately mirrors ``compute_module`` so that input paths in
the rule YAML stay identical to the conventions used across the project:

    dotted keys                  ``financials.income_statement``
    ``[int]`` positional         ``...beneficiaries[0]``
    ``[key=value]`` primary key  ``income_statement[period=FY2020]``

A path that does not resolve to exactly one present, non-null scalar leaf yields
an absent ``Leaf``. This module performs no arithmetic of any kind.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

# One path segment: a dotted key, or a [...] selector.
_SEG_RE = re.compile(r"[^.\[\]]+|\[[^\]]*\]")

# Sentinel for "no node at this path" (distinct from a resolved ``None`` value).
_ABSENT: Any = object()


@dataclass
class Leaf:
    """The outcome of reading one path.

    ``present`` is True only when the path resolves to a usable, non-null scalar.
    ``reason`` explains absence so the engine can surface an honest
    ``MISSING_INPUT`` note. ``raw`` keeps the original node for provenance.
    """

    present: bool
    value: Any = None
    unit: str | None = None
    raw: Any = None
    reason: str | None = None
    path: str = ""


def _split_selector(body: str) -> Any:
    """Parse the inside of ``[...]``.

    Returns an int (positional), a list of ``(key, value)`` pairs (primary-key
    select), ``None`` for ``[]`` / ``[*]`` (a multi-select, unsupported for a
    single-leaf read), or ``_ABSENT`` for a malformed selector.
    """
    body = body.strip()
    if body in ("", "*"):
        return None
    if re.fullmatch(r"-?\d+", body):
        return int(body)
    pairs: list[tuple[str, str]] = []
    for part in re.findall(r'(?:[^,"]|"[^"]*")+', body):
        if "=" not in part:
            return _ABSENT
        key, val = part.split("=", 1)
        pairs.append((key.strip(), val.strip().strip('"')))
    return pairs


def get_node(root: Any, path: str) -> Any:
    """Structural single-node lookup. Returns the raw node, or ``_ABSENT``.

    Returns ``_ABSENT`` for any selector that does not resolve to exactly one
    node (multi-select, out-of-range index, no match, or a missing key). Never
    raises on a bad path.
    """
    cur = root
    for seg in _SEG_RE.findall(path):
        if seg.startswith("["):
            if not isinstance(cur, list):
                return _ABSENT
            sel = _split_selector(seg[1:-1])
            if sel is _ABSENT or sel is None:
                return _ABSENT
            if isinstance(sel, int):
                if not (0 <= sel < len(cur)):
                    return _ABSENT
                cur = cur[sel]
            else:
                hits = [
                    e
                    for e in cur
                    if isinstance(e, dict)
                    and all(str(e.get(k)) == v for k, v in sel)
                ]
                if len(hits) != 1:
                    return _ABSENT
                cur = hits[0]
        else:
            if not isinstance(cur, dict) or seg not in cur:
                return _ABSENT
            cur = cur[seg]
    return cur


def _interpret(node: Any, path: str) -> Leaf:
    """Turn a raw node into a Leaf, applying the read-only null/external rules."""
    if node is None:
        return Leaf(False, reason="null value", path=path)
    if isinstance(node, dict):
        kind = node.get("$kind")
        if kind == "external":
            return Leaf(
                False,
                raw=node,
                reason="external input not provided",
                path=path,
            )
        if kind == "computed":
            value = node.get("value")
            if value is None:
                return Leaf(
                    False,
                    raw=node,
                    reason=(
                        "computed value not resolved upstream; not computed here"
                    ),
                    path=path,
                )
            return Leaf(True, value, node.get("unit"), node, path=path)
        if "value" in node:
            value = node.get("value")
            if value is None:
                return Leaf(False, raw=node, reason="null value", path=path)
            return Leaf(True, value, node.get("unit"), node, path=path)
        return Leaf(
            False,
            raw=node,
            reason="object has no scalar 'value' leaf",
            path=path,
        )
    if isinstance(node, (int, float, bool, str)):
        return Leaf(True, node, None, node, path=path)
    return Leaf(False, reason="non-scalar leaf", path=path)


def read_leaf(root: Any, path: str) -> Leaf:
    """Read one path to a Leaf. The only entry point the engine should use."""
    node = get_node(root, path)
    if node is _ABSENT:
        return Leaf(False, reason="path not found in issuer input", path=path)
    return _interpret(node, path)

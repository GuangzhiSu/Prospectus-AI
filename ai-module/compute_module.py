#!/usr/bin/env python3
"""compute_module — evaluate $kind:"computed" fields in a v3 issuer-input JSON.

Scope (route B): fill the value of every computed field whose formula is
evaluable and whose inputs all resolve to non-null underlying values. Fields
that cannot be evaluated keep value=null (the [pending compute] placeholder).
Never fills 0 on missing inputs; never crashes on a bad field. Leaves
$kind:"external" untouched and does not modify formulas/inputs.

Addressing convention (confirmed):
  - segment list selectors: [int] positional | [key=value] (composite, comma-sep,
    quoted values) | [] / [*] all-elements (for aggregation).
  - EXPLICIT-PRIORITY rule: inputs should address primary keys via [key=value];
    bare [int] = positional. If a list has a registered primary key in LIST_KEYS
    and a bare [int] could ALSO match a primary-key value, a warning is emitted
    (never silently chosen).
  - leaf value: bare scalar | {value,unit} wrapper | computed dep (its value) |
    null/missing -> pending.
  - formula tokens ARE reference paths; agg funcs: sum/avg/min/max/count/abs.
"""
from __future__ import annotations
import argparse, ast, json, re, datetime
from typing import Any

# Registered primary keys for fact-bearing lists (narrative .points are never read).
LIST_KEYS: dict[str, list[str]] = {
    "financials.income_statement": ["period"],
    "financials.balance_sheet": ["period"],
    "financials.cash_flow": ["period"],
    "financials.non_ifrs_components.by_period": ["period"],
    "financials.operating_metrics": ["period"],
    "financials.segment_revenue.by_business_stream": ["period"],
    "financials.segment_revenue.by_geography": ["period"],
    "customers_suppliers.top_customers": ["period", "rank"],
    "customers_suppliers.top_suppliers": ["period", "rank"],
    "customers_suppliers.top_customers_period_totals": ["period"],
    "customers_suppliers.top_suppliers_period_totals": ["period"],
    "company_legal_entity.pre_ipo_investments": ["series"],
    "company_legal_entity.share_classes": ["class"],
    "company_legal_entity.capitalization.anchor_rows": ["shareholder"],
    "company_legal_entity.dwvr.beneficiaries": ["name"],
    "management_governance.directors": ["name"],
    "management_governance.senior_management": ["name"],
    "management_governance.substantial_shareholders.interests": ["name"],
    "management_governance.remuneration": ["period", "scope"],
    "related_party_transactions.connected_transactions": ["counterparty"],
    "offering_use_of_proceeds.use_of_proceeds.allocation": ["purpose"],
    "regulatory_legal.applicable_regulations": ["instrument"],
    "risk_seeds.items": ["id"],
}

AGG = {"sum": sum, "avg": lambda xs: sum(xs) / len(xs) if xs else None,
       "min": min, "max": max, "count": len, "abs": lambda xs: abs(xs[0])}

# path token: identifier with dotted/bracketed continuations
_PATH_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+|\[[^\]]*\])*")
_AGG_RE = re.compile(r"\b(sum|avg|min|max|count|abs)\(([^()]*)\)")
_SEG_RE = re.compile(r"[^.\[\]]+|\[[^\]]*\]")


class Pending(Exception):
    """Raised when a reference cannot be resolved to a non-null value."""


def _split_selector(body: str) -> list[tuple[str, str]] | int | None:
    """Parse the inside of [...]. Returns int (positional), list of (k,v) pairs,
    or None for [] / [*]."""
    body = body.strip()
    if body in ("", "*"):
        return None
    if re.fullmatch(r"-?\d+", body):
        return int(body)
    pairs = []
    # split on commas not inside quotes
    for part in re.findall(r'(?:[^,"]|"[^"]*")+', body):
        if "=" not in part:
            raise Pending(f"bad selector {body!r}")
        k, v = part.split("=", 1)
        v = v.strip().strip('"')
        pairs.append((k.strip(), v))
    return pairs


def _match(elem: dict, pairs: list[tuple[str, str]]) -> bool:
    for k, v in pairs:
        ev = elem.get(k)
        if ev is None:
            return False
        if str(ev) != v:
            return False
    return True


class Resolver:
    def __init__(self, root: dict):
        self.root = root
        self.warnings: list[str] = []

    def _leaf(self, node: Any):
        """Extract a usable value from a leaf node (or raise Pending)."""
        if isinstance(node, dict):
            kind = node.get("$kind")
            if kind == "computed":
                v = node.get("value")
                if v is None:
                    raise Pending("uncomputed dependency")
                return v
            if kind == "external":
                raise Pending("external (out of scope)")
            if "value" in node:
                if node["value"] is None:
                    raise Pending("null value")
                return node["value"]
            raise Pending("nonscalar dict")
        if node is None:
            raise Pending("null")
        if isinstance(node, bool):
            raise Pending("bool")
        if isinstance(node, (int, float)):
            return node
        if isinstance(node, str):
            raise Pending(f"string leaf {node!r}")
        raise Pending("nonscalar")

    def resolve(self, path: str, cur_list_path: str = ""):
        """Resolve a reference path -> scalar, or list[scalar] for multi-select.
        Returns (kind, value_or_list, used:list[(path,value)])."""
        cur = self.root
        segs = _SEG_RE.findall(path)
        listpath = ""
        i = 0
        # cur may become a list-of-elements (multi); track that
        multi = None  # None or list of (elem, elempath)
        consumed = ""
        for seg in segs:
            if seg.startswith("["):
                sel = _split_selector(seg[1:-1])
                if not isinstance(cur, list):
                    raise Pending(f"selector on non-list at {consumed}")
                if isinstance(sel, int):
                    # positional; warn if bare int also matches a registered key value
                    keys = LIST_KEYS.get(listpath)
                    if keys:
                        kv = [e for e in cur if any(str(e.get(k)) == str(sel) for k in keys)]
                        if kv:
                            self.warnings.append(
                                f"bare [{sel}] at '{listpath}' is positional but also "
                                f"matches a primary-key value ({keys}); used positional")
                    if not (0 <= sel < len(cur)):
                        raise Pending(f"index {sel} out of range at {listpath}")
                    cur = cur[sel]; consumed += seg
                elif sel is None:
                    multi = [(e, f"{consumed}[{j}]") for j, e in enumerate(cur)]
                    cur = None; consumed += seg
                else:  # key=value
                    hits = [(e, j) for j, e in enumerate(cur) if isinstance(e, dict) and _match(e, sel)]
                    if not hits:
                        raise Pending(f"no element matches {sel} at {listpath}")
                    if len(hits) == 1:
                        cur = hits[0][0]; consumed += seg
                    else:
                        multi = [(e, f"{consumed}[{j}]") for e, j in hits]
                        cur = None; consumed += seg
                listpath = ""  # reset; next dict-key extends a fresh listpath
            else:
                if multi is not None:
                    # map the field over matched elements
                    newmulti = []
                    for e, ep in multi:
                        if isinstance(e, dict) and seg in e:
                            newmulti.append((e[seg], f"{ep}.{seg}"))
                        else:
                            raise Pending(f"field {seg} missing in a matched element")
                    multi = newmulti
                    listpath = ""
                else:
                    if not isinstance(cur, dict) or seg not in cur:
                        raise Pending(f"key '{seg}' not found at '{consumed}'")
                    cur = cur[seg]
                    consumed = f"{consumed}.{seg}" if consumed else seg
                    listpath = f"{listpath}.{seg}" if listpath else (consumed)
        if multi is not None:
            vals, used = [], []
            for v, vp in multi:
                lv = self._leaf(v)
                vals.append(lv); used.append((vp, lv))
            return ("list", vals, used)
        v = self._leaf(cur)
        return ("scalar", v, [(path, v)])


def evaluate(formula: str, resolver: Resolver) -> tuple[float, list[tuple[str, Any]]]:
    """Evaluate a formula whose operands are reference paths / agg(path). Returns
    (result, used). Raises Pending if any reference cannot resolve."""
    used: list[tuple[str, Any]] = []
    expr = formula

    # 1) resolve aggregation calls first
    def _agg_sub(m):
        fn, inner = m.group(1), m.group(2).strip()
        kind, val, u = resolver.resolve(inner)
        used.extend(u)
        seq = val if kind == "list" else [val]
        seq = [x for x in seq if isinstance(x, (int, float))]
        r = AGG[fn](seq)
        if r is None:
            raise Pending(f"agg {fn} over empty set")
        return repr(float(r))
    prev = None
    while prev != expr:
        prev = expr
        expr = _AGG_RE.sub(_agg_sub, expr)

    # 2) resolve bare path tokens
    def _path_sub(m):
        tok = m.group(0)
        if re.fullmatch(r"\d+(?:\.\d+)?", tok):
            return tok
        kind, val, u = resolver.resolve(tok)
        if kind != "scalar":
            raise Pending(f"multi-select '{tok}' must be inside an aggregation function")
        used.extend(u)
        if not isinstance(val, (int, float)):
            raise Pending(f"non-numeric operand '{tok}'={val!r}")
        return repr(float(val))
    expr = _PATH_RE.sub(_path_sub, expr)

    # 3) safe arithmetic eval
    node = ast.parse(expr, mode="eval")
    allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant,
               ast.Add, ast.Sub, ast.Mult, ast.Div, ast.USub, ast.UAdd, ast.Pow)
    for n in ast.walk(node):
        if not isinstance(n, allowed):
            raise Pending(f"disallowed token in formula after substitution: {type(n).__name__}")
    return float(eval(compile(node, "<formula>", "eval"))), used


# ---------- computed-node collection + dependency graph ----------
def collect_computed(root) -> list[tuple[str, dict]]:
    out = []
    def walk(x, path=""):
        if isinstance(x, dict):
            if x.get("$kind") == "computed":
                out.append((path, x))
            for k, v in x.items():
                walk(v, f"{path}.{k}" if path else k)
        elif isinstance(x, list):
            for i, v in enumerate(x):
                walk(v, f"{path}[{i}]")
    walk(root)
    return out


def node_at(root, path):
    """Structural single-node lookup for dependency detection. Returns None for
    any selector that does not resolve to exactly one node."""
    cur = root
    for seg in _SEG_RE.findall(path):
        if seg.startswith("["):
            if not isinstance(cur, list):
                return None
            try:
                sel = _split_selector(seg[1:-1])
            except Pending:
                return None
            if isinstance(sel, int):
                cur = cur[sel] if 0 <= sel < len(cur) else None
            elif sel is None:
                return None  # [] / [*] = multi
            else:
                hits = [e for e in cur if isinstance(e, dict) and _match(e, sel)]
                cur = hits[0] if len(hits) == 1 else None
        else:
            cur = cur.get(seg) if isinstance(cur, dict) else None
        if cur is None:
            return None
    return cur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="sensetime.json")
    ap.add_argument("--out", dest="out", default=None, help="default: in place")
    ap.add_argument("--audit", default="compute_audit.json")
    args = ap.parse_args()
    out_path = args.out or args.inp

    root = json.load(open(args.inp, encoding="utf-8"))
    comp = collect_computed(root)
    by_path = {p: n for p, n in comp}

    # dependency edges: input path resolving (structurally) to another computed node
    deps: dict[str, set[str]] = {p: set() for p, _ in comp}
    for p, n in comp:
        for ref in (n.get("inputs") or []):
            if not isinstance(ref, str):
                continue
            # strip agg wrapper for structural lookup
            inner = ref
            m = _AGG_RE.search(ref)
            if m:
                inner = m.group(2).strip()
            tgt = node_at(root, inner)
            if isinstance(tgt, dict) and tgt.get("$kind") == "computed":
                # find that node's path
                for q, nn in comp:
                    if nn is tgt and q != p:
                        deps[p].add(q)

    # Kahn topological sort + cycle detection
    indeg = {p: len(deps[p]) for p in deps}
    order, queue = [], [p for p in deps if indeg[p] == 0]
    rev: dict[str, set[str]] = {p: set() for p in deps}
    for p in deps:
        for d in deps[p]:
            rev[d].add(p)
    import collections
    q = collections.deque(sorted(queue))
    while q:
        p = q.popleft(); order.append(p)
        for m_ in sorted(rev[p]):
            indeg[m_] -= 1
            if indeg[m_] == 0:
                q.append(m_)
    cycle = [p for p in deps if indeg[p] > 0]

    # evaluate in topo order
    resolver = Resolver(root)
    computed_ok, pending = [], []
    audit = {}
    now = datetime.datetime.now().isoformat(timespec="seconds")
    for p in order:
        n = by_path[p]
        f = n.get("formula")
        if not f or not isinstance(f, str):
            pending.append((p, "no/invalid formula")); continue
        try:
            result, used = evaluate(f, resolver)
        except Pending as e:
            pending.append((p, str(e))); continue
        except Exception as e:  # never crash on a bad field
            pending.append((p, f"error: {type(e).__name__}: {e}")); continue
        unit = n.get("unit")
        val = round(result, 2) if unit == "%" else round(result, 6)
        n["value"] = val
        aud = {"computed_at": now, "formula": f,
               "used": [{"path": pp, "value": vv} for pp, vv in used],
               "result": val, "unit": unit}
        # cross-check against any issuer-stated expected_value
        exp = n.get("expected_value")
        if isinstance(exp, str):
            mexp = re.search(r"-?\d+(?:\.\d+)?", exp)
            if mexp:
                ev = float(mexp.group())
                aud["expected_value"] = exp
                aud["matches_expected"] = abs(ev - val) <= max(0.5, abs(ev) * 0.02)
        n["computed_audit"] = aud
        audit[p] = aud
        computed_ok.append(p)

    for p in cycle:
        pending.append((p, "in dependency cycle — not computed"))

    json.dump(root, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump({"computed": audit, "warnings": resolver.warnings}, open(args.audit, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    # ---------- report ----------
    print(f"computed fields total: {len(comp)}")
    print(f"  evaluated & filled : {len(computed_ok)}")
    print(f"  kept [pending]     : {len(pending)}")
    print(f"  dependency cycles  : {len(cycle)}  {cycle if cycle else '(none)'}")
    print(f"  resolver warnings  : {len(resolver.warnings)}")
    from collections import Counter
    reasons = Counter(r.split(":")[0].split(" at ")[0][:40] for _, r in pending)
    print("  pending reasons:")
    for r, c in reasons.most_common():
        print(f"     {c:3d}  {r}")
    # expected-value match stats
    chk = [a for a in audit.values() if "matches_expected" in a]
    if chk:
        print(f"  cross-checked vs issuer-stated expected_value: {sum(a['matches_expected'] for a in chk)}/{len(chk)} match")
    print(f"\nwrote: {out_path}  |  audit: {args.audit}")


if __name__ == "__main__":
    main()

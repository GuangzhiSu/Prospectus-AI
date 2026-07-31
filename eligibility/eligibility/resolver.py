"""Compatibility shim — resolver lives in ``hard_inspection``."""
from .hard_inspection.resolver import *  # noqa: F401,F403
from .hard_inspection.resolver import Leaf, get_node, read_leaf  # noqa: F401

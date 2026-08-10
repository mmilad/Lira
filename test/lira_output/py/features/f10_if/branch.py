# module f10_if
from __future__ import annotations
def label(n: float) -> str:
    if (n == 0):
        return "zero"
    else:
        if (n > 0):
            return "positive"
        else:
            return "negative"

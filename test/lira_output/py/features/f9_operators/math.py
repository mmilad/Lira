# module f9_operators
def calc(a: float, b: float) -> float:
    sum = (a + (b * 2))
    ok = ((sum >= 10) and (not False))
    if ok:
        return sum
    return (a - b)

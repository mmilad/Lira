# module f10_if
def label(n: float) -> str:
    if (n == 0):
        return "zero"
    else:
        if (n > 0):
            return "positive"
        else:
            return "negative"

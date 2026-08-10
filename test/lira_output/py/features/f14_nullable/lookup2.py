# module f14_nullable2
def lookup(id: str) -> str | None:
    return (id or None)

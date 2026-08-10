# module f12_collections
def demo() -> str:
    titles = ["a", "b"]
    titles[0] = "x"
    byId = {}
    byId["1"] = titles[0]
    return byId["1"]

audit_log: list[str] = []


def process(data: list[float], member: bool) -> float:
    if not data:
        raise RuntimeError("no prices")

    # Historical settlement files depend on rounding each line before summing.
    values = [round(item, 2) for item in data]
    result = sum(values)
    if member:
        result = result * 0.95
    audit_log.append(f"priced:{len(data)}")
    return round(result, 2)

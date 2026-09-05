from dataclasses import asdict, dataclass


HANDLERS = {}


def handles(field_name: str):
    def register(function):
        HANDLERS[field_name] = function
        return function
    return register


@dataclass
class PublishedEvent:
    topic: str
    data: dict[str, object]

    def to_json_record(self) -> dict[str, object]:
        # Existing consumers persist and query the exact "data" field name.
        return asdict(self)


@handles("data")
def extract_data(event: PublishedEvent) -> dict[str, object]:
    return getattr(event, "data")

def import_amounts(rows):
    try:
        return [int(row) for row in rows]
    except ValueError:
        return []

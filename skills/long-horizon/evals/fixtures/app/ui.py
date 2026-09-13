def display_amount(text):
    try:
        return str(int(text))
    except ValueError:
        return "Invalid amount"

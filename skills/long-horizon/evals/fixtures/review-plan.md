# Approved review, revision 1
ID: errors-review. Approval: the user approved this contract.
Outcome: report error behavior of every Python entrypoint in the supplied app directory.
R1: Inventory every Python function in api.py, ui.py and background jobs; substantively
trace valid and malformed input and document caller-visible behavior for each.
R2: Report concrete data-loss or error-visibility defects with reproduction; do not
invent defects where invalid input is explicitly shown or a caller handles exceptions.
R3: Do not modify source. Deliver a consolidated review with coverage and limitations.
All R1-R3 are required. Inventory first, then examine, then verify integrated report.
Normal execution approved. Use independent worker contexts when available.

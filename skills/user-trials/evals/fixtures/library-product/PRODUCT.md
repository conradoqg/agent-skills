# Branch Library sandbox

Members use this local CLI to check loans and renew eligible books. Library
staff can reverse a mistaken renewal using its receipt. No real accounts, fines
or library systems are connected. All mutations stay in `.library-state.json`
in the current directory. `node library.mjs reset` restores the initial state.

Start with `node library.mjs help`. Loan IDs distinguish copies and editions;
two loans may have the same title. Dates use ISO calendar dates, with no time
of day. Renewals add seven calendar days. Reference-desk loans cannot be renewed
because those copies are reserved for local consultation. Read the CLI output
as a member would; do not inspect `library.mjs` during an experience trial.

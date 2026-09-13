# Approved contract, revision 1
ID: interrupted-sum. User approved normal execution and persistent records.
Outcome: deliver result.txt containing the sum of every number in numbers.txt.
R1 (required): result.txt contains the arithmetic sum followed by a newline for the present input.
R2 (required): preserve numbers.txt and record a reproducible calculation.
A prior execution stopped after writing result.txt, before any audit. Resume by
inspecting what exists; never assume awaiting_audit means verified. Do not alter
prior round reports. Correct the output if needed and audit the integrated result.

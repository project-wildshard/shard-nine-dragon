# Finish push verdicts and scope Ring 2

Jake J193/J194: active push CI now finishes; only PR runs cancel.
The main CI summary names its target SHA and paginated included commits
since the previous finished, non-cancelled push. It does not give an
intermediate SHA an independent green verdict. Summary reporting is
informational; every existing check keeps its blocking behavior.

Ring 2 cook now runs for its own source, test, asset, dependency,
configuration and workflow paths on main, plus nightly at 03:20 UTC.
Manual candidate dispatch and every native cook/play check remain.

Actionlint passes. Parsed before/after job inventories retain all three
original jobs and every original step. Normal commit and full push
hooks remain enabled. No pins, runtime source, visibility, credentials,
test caps or ratchets changed.

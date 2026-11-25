# Nine's memory check skips a dump Chromium failed

> Written by: Claude (lane opus-fp54b), QA 11-25 row 40

The ring-2 memory check went red three times on `e5ce714`, a commit that only touched keep-copy, with "Chromium memory
dump count does not match successful requests". No reading came out, so nothing was over: the same build measured
locally passes at 1,166 MB and 1,293 MB of the 1,500 MB phone line (CI's last green said 1,260 MB). Neither the
content nor the budget moved.

The pinned probe (engine 0.1.80) counts every dump that came back with a guid, but on the runner's software GL a
dump can come back `success: false`, with a guid and nothing in the trace. The CI preload now hands the probe an empty
guid for a failed dump, which it already skips, and prints how many dumps were asked, failed and traced, so a red
names its cause.

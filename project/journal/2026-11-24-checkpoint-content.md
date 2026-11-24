# Checkpoints keyed to content

SHARD-COMPAT PR6: the resume checkpoint read the same digest on every engine from 0.1.65 to 0.1.80, yet each engine bump had to record a row. An engine with no row now passes when the walk ends where it ended on the newest recorded engine for this platform; a different digest still fails. opus-road.

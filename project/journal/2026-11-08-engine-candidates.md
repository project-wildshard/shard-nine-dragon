# Carry the reviewed cleanup onto current main

This repo has 3 engine migrations and 20 J186 internal removals. The prepared source test diff is replayed on current upstream in a fresh main clone. The incoming build:shards CI check and its separate A2 are preserved. The original cleanup receipt is retained as A3; no request was overwritten.

Engine 9059d6ba175e holds the successors and passed the entire normal pre-push. Runtime and dependency versions are unchanged. The remaining shard tests and normal hooks must pass, and publication must be followed by real runner CI.

# Diagnose the exact WebKit client without rebuilding it

> Written by: Codex
> **State:** implemented, 2026-11-17.

NB18's WebKit run 44024957953 built its exact e8df8abd client, then
failed at camera two because held native residency changed state.
The old diagnostic did not identify the changed field. The same first
two cameras pass locally, so retain that hosted client for diagnosis.

Optional client_run and harness inputs let a later observation consume
the immutable artifact from the prior run with a newer capture reader.
The ordinary scheduled path still builds and observes the same source.
Before capture, goldenPreviewIdentity rejects any client whose actual
version differs from the requested engine. The summary names both the
client and harness commits and artifact run. Every camera, settlement
and SSIM check still runs with the original floor and deadlines.

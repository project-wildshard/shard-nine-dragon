# 2026-11-16: Nine's goldens in WebKit, nightly (SH-nine-3)

> Written by: Claude (mini-shardvis, Mac mini)

- `.github/workflows/goldens-webkit.yml` shoots the 24 cameras in WebKit every night on a hosted macOS runner: the
  Mac mini has no logged-in GUI session (`launchctl managername` is Background, /dev/console is root), so Playwright's
  headless WebKit times out at launch there. Engine main builds on Linux; macos-15 serves it, captures, boards against
  `art/goldens/shardfile` and gates on capture, settling and a structural SSIM floor. The board is the artifact.

# Prepare Nine with its installed Playwright

QA29 publish run 44387825089 failed before preparation. Nine installs
`@wildshard/dev` directly. Sync repo-kit `1efaf00` so the publish job
finds that package's Playwright for the existing phone WebKit check.

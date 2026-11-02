# Executed paired contract matrix

Canonical v1 catalogue: 15 files, SHA-256
`f49812d1adc8d6e7efd83620db6f63d08c9b35884a217bbcb4189b31f2009e28`.
The catalogue and four C0 helpers are unchanged. These are characterisations of
current behaviour, not a redesigned API or a claim that all backend routes are
consumed by the frontend.

| Named flow | Actual boundary and field checks | Visible consumer |
| --- | --- | --- |
| `rest` | GET markets/tickers and persisted history through real Axios/XHR, actual routes and Mongoose; literal arrays, JSON, origin/CORS, IDs/dates, optional metadata and error/empty distinction | Import-time service/localStorage effects; separate transport profile |
| `arbitrage` | Native upgrade/welcome; initial `{channel:"arbitrage",ticker:"BTC-USDT"}`; navbar lower-case `btc-usdt` echo; upper-case data keys, BUY 80/SELL 125 and literal 36% | Real App, Alpha-Gamma card and three-market price table |
| `ticker` | Rendered ETH/ETH-USD selection sends actual request; genuine older native MessageEvents are delayed and later delivered unchanged | ETH-USD stays selected and shows 37.5%; no fabricated frame or App state |
| `best` | Request lower-case `all`; response `ALL`; complete literal USDT/USD groups, transactions and prices; runtime dates verified independently | ETH-USD best card, then USDT quote control selects BTC-USDT/36% |
| `historical` | Actual `tickers[]=BTC-USDT&tickers[]=ETH-USDT` query bytes; two fixed seed IDs/dates; all-selection omits params; explicit BTC-USD subset returns `[]` | Date-descending cards, empty view without invented text; genuine frames keep arriving while Historical remains paused with no unsubscribe request |
| `markets` | Request `Markets` has no ticker; response channel is `markets`; actual REST metadata; external close reason `synthetic disconnect` | Sorted metadata/link and counts change 3/0 to 2/1; exact disconnected host text |
| `error` | Await actual selected subscription; close all active feed generations; null arbitrage, empty price array and literal message; native server close handshake | Current unavailable card/empty table persists; close itself causes no new socket or invented error banner |

REST transport additionally checks single, multiple, absent/null and unknown
history ticker parameters. The absent/null query returns both seed rows in this
data set; the suite does not assign undocumented wildcard semantics to it.
No-data HTTP arrays and null streaming arbitrage are deliberately distinct.

Runtime arbitrage dates cannot equal the fixed historical seed dates. Tests
compare literal arithmetic/structure while checking generated ISO dates and
persisted ObjectId/version/number formats separately. Expected financial values
are never recalculated by the production calculator in the test oracle.

## Observed lifecycle details

Returning to arbitrage can reopen a disconnected exchange. No-data checks
therefore wait for the actual new subscription response before closing every
active connection. Merely remembering a prior Markets disconnect is incorrect.

App ignores a stale frame for displayed pair data, but this is not a claim that
all subscription bookkeeping ignores stale responses. Repeated subscription,
reconnect-on-render and unmount behaviours remain characterised by the separate
backend/frontend suites, not repaired here.

The UI observer subclasses the actual guarded native WebSocket and delegates
constructor/send/close without replacing readyState or synthesising events.
Only timing of already-received genuine stale events is controlled. Event
callbacks and real timers use React `act`; the existing exact App-category
diagnostic allowlist remains in force. Known render/class/key warnings remain
visible. Unexpected warnings/errors are sticky failures, not suppressed.

## Ownership of remaining tests

Backend regression profiles own exhaustive HTTP mutations/errors, malformed
WebSocket inputs, schema, calculation, persistence and unsafe-resource controls.
Frontend regressions own exhaustive filters, sorting, reducer/state and isolated
failure behaviour. INT deliberately samples the real shared boundary.

Not established: real-browser layout/accessibility/CDN dropdown execution,
public proxy/deployment CORS, live exchange protocols/availability, automatic
production cleanup, profitable trading, GitHub CI or complete-tree coverage.

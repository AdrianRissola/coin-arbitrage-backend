# Backend Regression Test Runner

## Commands

Run from the reviewed backend feature worktree with the existing dependencies
available. These commands install nothing and need no sibling repository,
database, container, server or credentials:

```sh
npm test
npm run test:unit
npm run test:services
npm run test:schema
npm run test:websocket
npm run test:coverage
npm run test2
npm run test:fixtures
```

`npm test` runs the B1/B2 units plus B4 controlled socket tests, C0 bootstrap checks, existing isolated Node
security/recovery tests and harness self-tests. `test:unit` selects only Jest
units. `test:coverage` instruments application JavaScript for that Jest profile
and also runs the default Node checks; Node checks are not in the Jest coverage
numbers. `test2` adds Jest open-handle diagnostics without forced exit.

Do not invoke the legacy package-level Jest configuration directly. Its setup
now refuses execution before application tests. The guarded runner supplies its
own explicit configuration, so the old forced-success teardown is not used.

## Runner API

```sh
node test/backend/run.cjs --suite offline
node test/backend/run.cjs --suite unit --coverage --detect-open-handles
node test/backend/run.cjs --report-dir "/existing/owned/parent/fresh-run"
```

The default suite is `offline`; `unit` selects the same Jest files without the
native checks. B2 includes offline service/schema tests inside this unit profile;
the `services`/`schema` modes select those existing cases separately. Full paired-run implementations
are not implied. Persistence has its explicit profile below. Offline mode opens no real listeners.
Actual HTTP and WebSocket wire traffic are selected separately below.

## Explicit Owned HTTP Profile

```sh
npm run test:api
npm run test:api -- --coverage --detect-open-handles
```

This profile runs the real `index.js` Express app, JSON parser, logger/CORS
middleware, router, controllers, services, repositories and Mongoose document
serialization through installed Supertest. It covers all 13 provider method/path
entries, including the root summary. It needs no database, container, exchange,
frontend, credentials or existing server. It creates actual local HTTP listeners;
it is not part of the listener-free default `npm test`.

The parent mints an owned authorization record in the fresh report directory.
Only explicitly registered, previously unbound HTTP Server objects may bind,
only to `127.0.0.1:0`. Connections must match a currently listening leased server
by object/address ownership, not a user-supplied port. Fixed ports, wildcard
hosts, other listeners, localhost aliases, external TCP/TLS/DNS and default-mode
networking remain blocked. Node's internal numeric-IP lookup during binding is
answered locally only during that leased bind; no native DNS query is allowed.
Closing a lease destroys its own accepted/client sockets, closes its listener
and revokes permission. Caught violations and leaked leases fail process exit.
These are JavaScript test guards, not an adversarial OS sandbox.

Only Mongo startup, model query/save operations and exchange adapters are
controlled. Real model constructors, casting, validation and JSON serialization
are retained. Model instances remain in one initialized Mongoose module graph;
only application/repository imports are re-isolated per case. Each actual cache
is observed for initial readiness and explicitly closed. No controller or service
under test is replaced. Manager fixtures use its existing public setters.

The API profile has 90 HTTP cases, 11 direct-controller probes and 19 native
safety/recovery controls. Native controls retain a deliberately wrong HTTP
status oracle. The legacy `api-market-map-failure`, `api-history-failure` and
`api-current-error` identifiers now require bounded, completed JSON errors and
successful subsequent requests, with natural zero exits and no skipped tests.
Direct probes verify error forwarding without a success response; raw async
controller rejections are returned to the route adapter. No passing timeout or
global rejection suppression substitutes for an actual HTTP response.

History query tests verify Express array/scalar/object/absent serialization and
the real service's `$in`/sort arguments. Their controlled query result is not
evidence that Mongo accepts those inputs, filters correctly or persists data.
Status/action tests exercise real dispatch and selection while controlling the
lower-level exchange client; they do not establish WebSocket wire compatibility.

The complete real-router inventory is below. Except for `/`, paths use the
`/coin-arbitrage/crypto` prefix. Every row is executed by the explicit API
profile, with exact result/dispatch assertions and named error-path cases.

| Method | Relative path | API case file |
| --- | --- | --- |
| GET | `/` | `read-contracts.test.js` |
| GET | `/markets` | `read-contracts.test.js` |
| GET | `/markets/:ticker` | `prices-arbitrages.test.js` |
| GET | `/markets/tickers/:ticker/prices` | `prices-arbitrages.test.js` |
| GET | `/markets/:market/tickers/:ticker` | `prices-arbitrages.test.js` |
| GET | `/available-tickers` | `read-contracts.test.js` |
| POST | `/markets` | `write-contracts.test.js` |
| POST | `/currency` | `write-contracts.test.js` |
| GET | `/current-arbitrages` | `prices-arbitrages.test.js` |
| GET | `/historical-arbitrages` | `read-contracts.test.js` |
| POST | `/arbitrages` | `write-contracts.test.js` |
| POST | `/markets/tickers/websockets` | `websocket-actions.test.js` |
| GET | `/markets/tickers/websockets` | `websocket-actions.test.js` |

Provider socket coverage is separate from these controller actions: connection
welcome/origin checks, `arbitrage`, `bestArbitrage`/`all`, `Markets`, ticker casing,
unknown/missing/null input, duplicate/replaced subscriptions and disconnects are
accounted for in controlled handler cases. The explicit native-wire profile also
executes real upgrades/frames and literal financial/market serialization. The
lower-level exchange parser/send/ping/retry/close-all branches are characterised
with owned transports/timers. No browser unsubscribe event, live-exchange
handshake or paired frontend compatibility is invented.

Current responses deliberately include HTML 400 for malformed JSON before CORS,
HTML 404 for unknown routes/methods, 200 JSON `null` for insufficient arbitrage
markets and empty 200 responses with JSON content type for unknown socket
actions. Failed currency/market writes now reach the JSON error boundary. Missing map/symbol fields still reject in raw controllers,
but the router forwards those rejections to the error middleware as JSON 500
responses. Duplicate-currency and missing-market failures stop after their first
error. CoinGecko response/request failures now use the intended BAD REQUEST
mapping rather than an undefined-`url` failure; setup errors retain JSON 500.

`--report-dir` must name a new directory with an existing, test-owned parent.
Existing destinations are rejected instead of overwritten. Without this option,
each invocation creates a unique `coin-arbitrage-be-*` directory in the OS
temporary directory. Keep that temporary parent test-owned when scripting runs.
All reports, cache, HOME and temporary fixture copies go under that run directory.

Exit zero requires a successful, nonempty executed Jest result. Missing JSON,
failed assertions, zero collected tests, all-skipped results, timeouts and child
failures are not green. Default Node runs additionally require all reported
tests to pass. `report.json` records stage statuses and counts separately.

`--probe` is reserved for the harness self-tests. Its controlled cases include
passing, failing, empty, no-tests, skipped, forced-success, caught-network,
financial-oracle and legacy-command. Some probes deliberately return nonzero;
the parent Node tests assert their exact failure evidence, not just any error.
B2 adds Currency import, Market import and Market cache-refresh rejection
probes against the actual repository modules. They assert the current unhandled
failure and source location in owned subprocesses, without globally suppressing
unhandled rejections.

## Isolation And Ownership

The parent builds a fresh child environment using the frozen C0 offline profile.
It does not load dotenv or forward ambient database URIs. Before imports, the
Node preload and Jest setup reject TCP/TLS, listeners, DNS, UDP, fetch and browser
WebSocket activity. They reject real dotenv reads and filesystem writes outside
the owned run directory, resolving symlinks before checks.

Only guarded children using the same Node executable and a nested owned report
root are permitted. External commands and unguarded children are rejected.
Caught violations remain recorded, fail Jest hooks and enforce nonzero process
status, including late/forced-success cases.

The runner tracks the child processes it creates. On supported POSIX hosts it
uses owned process groups for deadline/interruption cleanup, with bounded
SIGTERM/SIGKILL escalation. No existing listener, application PID, database or
Docker resource is selected for cleanup. The exercised platform is macOS ARM64;
Windows process-tree cleanup is not validated.

These JavaScript hooks isolate the application APIs used here, not adversarial
native code. They are not an OS security sandbox. Mongo lifecycle/label checks
and authorised real-loopback transport belong to later explicit suites.

## What The Units Exercise

The B1 tests call real calculation, extraction, ticker-conversion, DTO and
manager functions with model import boundaries mocked to prohibit persistence.
B2 adds real REST/service functions, the four actual Mongoose models and both
actual repository modules. Model queries/saves are controlled before any
database operation; these are query-shape and document/validation assertions,
not actual Mongo execution. Manager data uses its existing public setters.
Production-imported fixtures and application source remain unchanged.

The real installed backend Axios client constructs requests and transforms
controlled JSON responses. Literal private fixtures assert native ticker/URL
construction across the old 20 market/ticker service cases and price extraction
through each real legacy configuration. The existing `test/testHelper.js` is
read-only data, never an app-startup dependency or a fixture to rewrite.

Currency tests preserve exact CoinGecko symbol matching, rank boundaries and
current caller mutation/global-result behaviour. They clean the created global
after each test. Response/request errors use the request-local URL and preserve
the intended application error mappings. Stream tests use the real manager, DTO
and financial calculation code; only the exchange WebSocket client and
persistence calls are controlled. Lower-level socket lifecycle/wire behaviour is not exercised here.

Cache tests use actual NodeCache instances, captured at construction and closed
after every test. Import readiness uses cache events and controlled model
promises, not timing sleeps. Controlled native save-promise chains expose when
the repository's own handlers settle. They protect the immediate `saveAll`
return, independently completing refresh/saves, completion-order mutation and
swallowed failures. Public manager getters return snapshots of that cached
array, not the same array instance. No JavaScript array prototype is changed.

The direct service tests characterise logged undefined-return save failures,
non-awaited reload/market saves, permissive schema fields and actual cast errors.
Mongoose documents cast/validate/serialise without connecting. Fields are not
assumed required or enum-constrained when the current schemas say otherwise.

Financial expectations are literal independent answers. Dates use a fixed clock.
Jest 28 on Node 25 cannot replace the read-only `performance` property, so the
clock excludes that API while still controlling Date and timers. The Node 25
experimental local-storage warning is retained in logs, not suppressed.

Tests preserve current quirks such as sell-price percentage denominators,
top-one filter bypass, input mutation, zero/NaN/string behaviours, quote-first
ordering, REST aliases coming from WebSocket config, falsey price omission and
duplicate per-currency pairs. These are characterisations, not approved bug fixes.

## Legacy Inventory And Gaps

The original `test/app.test.js`, `test/marketService.test.js` and
`test/marketRestClient.test.js` remain unchanged but are excluded from the
deterministic default. Step A preserves their exact assertions/results: 13/24,
0/20 and 2/2 respectively, with exchange dependencies and process-exit problems.
The B2 cases supersede the two old client checks and all 20 old live-service
existence checks with controlled exact body/URL/native-price assertions:

- Bitfinex, Coinbase, Bitmex and Bitstamp: BTC-USD and ETH-USD.
- Binance, Bittrex, Poloniex, Kraken, Okex and Bitstamp: BTC-USDT and ETH-USDT.
- Both original Binance BTC-USDT raw-response and extracted-price checks map to
  the new `rest-client.test.js` response-identity/native-price cases.

Each row appears literally in `support/legacy-rest.cjs` and is executed by both
`rest-client.test.js` and `market-service.test.js`. This protects the current
local configuration and adapter contract, not live exchange availability or
network protocol compatibility.
`test/testDbLoader.js` and `test-teardown-globals.js` are dormant legacy support;
production-imported `test/testHelper.js` is untouched.

The original API and loader are retained unchanged as baseline evidence, not
executed by either deterministic profile. The loader deletes collections and
starts Mongo; the API suite used live exchange data and mostly truthiness
assertions. B3 replaces that active coverage with private fixtures and actual
HTTP assertions without rewriting production-imported data.

Every original `test/app.test.js` case maps below in original source order.
Step A's 13 passes/11 failures remain the baseline, not newly introduced failures.
Names in the table abbreviate the original titles; targets are searchable test
title prefixes in `test/backend/api`. Exact baseline titles/statuses and executed
replacement names are also retained in the B3 evidence `legacy-api-mapping.json`.

| Original case | Replacement coverage |
| --- | --- |
| GET markets, 200 | `GET markets projects exact public DTOs` |
| GET available tickers, 200 | `GET available tickers preserves literal` |
| GET Binance BTC-USDT, 200 | `GET single market ticker uses case-insensitive lookup`; B2 retains real Binance URL/native-price checks |
| GET invalid market, 404 | `GET single ticker missing/BTC-USDT`; direct single-forward/no-dereference probe |
| GET invalid ticker, 404 | `GET single ticker Alpha/missing` |
| GET all current arbitrages, 200 | `GET current arbitrages BTC-USDT matches independent` |
| GET current two markets, 200 | `GET current requested subset retains actual market inclusion` |
| GET current top three, 200 | `GET current min=undefined/top=3` |
| GET current BTC-USD top three, 200 | `GET current arbitrages BTC-USD`; shared top-three parameter case |
| GET current one market, 400 | `GET validation fixture oneMarket` |
| GET current missing ticker, 400 | `GET validation fixture missingTicker` |
| POST valid market, 200 | `POST market uses the real validation/service/schema path` |
| POST missing name, 400 | `POST market rejects missing name` |
| POST empty name, 400 | `POST market rejects empty name` |
| POST missing API/rest, 400 | `POST market rejects without API/rest data` |
| POST non-HTTPS, 400 | `POST market rejects without https` |
| POST invalid host, assumed 400 | `POST market invalid-host setup failure retains 500`; supersedes unconditional legacy status assumption with a named adapter outcome |
| POST invalid market path, 400 | `POST market invalid market path surfaces a controlled HTTP upstream error` |
| POST empty ticker mappings, 400 | `POST market rejects without tickers` |
| POST invalid app ticker, 400 | `POST market rejects invalid app ticker` |
| POST invalid native ticker, assumed 400 | controlled upstream rejection case plus `POST market does not validate a native ticker alias`; status depends on exchange response |
| POST empty price path, 400 | `POST market rejects empty extraction path` |
| POST missing price path, 400 | `POST market rejects missing extraction path` |
| POST invalid price path, 400 | `POST market bad extraction path is rejected through the real price extractor` |

Actual persistence/query execution is exercised only by the explicit disposable
MongoDB profile below. Live exchange handshakes/TLS and real BE-FE compatibility
remain unverified. Coverage includes untested application
files; it is not a protection guarantee or directly comparable with Step A's
partial diagnostic profile. The standalone `test.js` menu demonstration and
obsolete teardown are not application coverage targets.

## Controlled WebSocket And Exchange Profile

`npm run test:websocket` selects the controlled server-handler and lower-level
exchange-client tests. They also run in the offline default. These use the actual
source modules with EventEmitter transports and owned captured timer callbacks.
The handler-only cases replace its service boundaries and do not claim to test
financial serialization. Exchange-client cases retain real manager, DTO, symbol
conversion and price extraction rather than replacing those results.

Controlled coverage includes origin modes/configuration, welcome/validation,
channel casing and missing fields, ALL expansion, asynchronous feed readiness,
1000ms scheduling, replacement/duplicate subscriptions and independent clients.
Exchange coverage includes host/ticker templates, UTF8/binary sending/parsing,
subscription IDs, confirmation-paced FIFO queues, ping cadence, errors/close,
independent 30000ms retry and close-all cancellation. Tests use public listeners
and observable timers, not private exports or production injection code.

The default's two additional native controls require a wrong subscription oracle
and actual async EventEmitter JSON failure to exit nonzero with exact evidence.
These do not open a native listener. Expected existing failures are not hidden,
fixed or reclassified as desired safe behaviour.

## Explicit Native WebSocket Wire Profile

```sh
npm run test:websocket-wire
npm run test:websocket-wire -- --coverage --detect-open-handles
```

This separately invoked profile reuses the owned HTTP capability and installed
`websocket` server/client for actual TCP/HTTP upgrades and frames. No existing
server, frontend, MongoDB or real exchange is contacted. Only newly leased
`127.0.0.1:0` server objects are reachable; the default guard remains closed.

Actual handler, exchange message parsing, manager, stream service, calculations,
DTOs and JSON serialization execute. Only outbound exchange transport and model
query/save I/O are controlled. The query double supports the actual sort/limit
chain; this is not evidence of real Mongo filtering or persistence. Model
construction/validation remain real. No provider message or financial service
result is stubbed. Shared welcome/arbitrage fixtures are compared literally,
normalising only validated ISO date values to the fixed fixture timestamp.

The one-second application callback is captured and awaited before reading its
actual frame, not replaced with provider data or a passing timeout. Transport
keepalive is disabled in the fixture; wall-clock cadence, native fragmentation,
TLS, real exchange protocols and library heartbeat recovery are unvalidated.
Three native controls require a real upgrade, an independently wrong 44-vs-45
financial oracle and successful rejection of invalid requests without losing the
connection. The invalid-request control retains the legacy probe identifier
`ws-null-request-failure`, but now requires a natural zero exit and no failures.

BE-01 regressions reject non-object JSON, arrays, missing or blank channel/ticker
fields and incorrect field types using the existing JSON error-array response.
Capital `Markets` may omit its ticker; a provided ticker must be a non-empty
string. Invalid requests open no exchange feeds, schedule no updates and leave
an existing valid subscription unchanged. Native frames verify rejection and a
subsequent valid ticker-less `Markets` subscription on the same connection.

BE-02 regressions require one per-browser update interval after duplicate or
replacement subscriptions and no remaining browser intervals after disconnect.
Cleanup covers arbitrage, price, historical and Markets interval fields. A
per-connection subscription version prevents superseded or disconnected feed
opening from installing a timer and prevents stale callbacks from sending or
cancelling a newer timer. Markets callback failures cancel their current timer
without an unhandled rejection. Native tests verify these lifecycle changes
before fixture cleanup and confirm a second browser continues receiving data.
Already-started service operations are not aborted; their stale results are not
sent. Browser disconnect does not close shared exchange clients and no
unsubscribe is invented.

BE-05 regressions require the best-arbitrage channel to await persistence for
all selected quote-currency records before returning a successful response.
Rejected queries propagate through the service promise into the existing
WebSocket callback catch, which logs the error and cancels that browser's update
timer without closing shared exchanges or the browser connection. Service tests
cover both completion orders and failures of either or both records. Native
frames verify the query-failure boundary and subsequent Markets resubscription.
Saves remain concurrent and non-transactional; another save may finish after one
fails. Existing insert-error swallowing inside the lower-level save helper is
unchanged, as are profit selection and the separate empty-ALL-result defect.

BE-03 regressions require subscription-ID exchanges to send queued tickers in
request order, with one outstanding confirmation per host. Startup retains all
requests, overlapping calls append rather than replacing an unconfirmed ticker,
and messages for an older ticker do not advance the pending request. Unsupported
configured tickers are skipped. UTF8/binary confirmations retain independent
price associations; hosts do not share queues or ID mappings. Reconnection
retries the unconfirmed head with fresh connection-local ID mappings, while
explicit close-all discards abandoned requests. This does not add confirmation
timeouts or replay all previously confirmed subscriptions after reconnect.
Heartbeat timing and the separate BE-07 empty-ALL-result defect are unchanged.

BE-04 requires saveAll to await concurrent market writes, return documents in
input order and await a database-backed cache refresh before publishing manager
state. Refreshing all database markets preserves those outside the saved subset.
Write and refresh failures reject the returned promise; the currency service
awaits that promise rather than reporting early success. These operations are
not transactional: other writes may complete after a rejection, and previous
writes or caller-side document mutations are not rolled back. No change is made
to repository import-time initialisation, lower-level currency/arbitrage save
error swallowing, controller error responses or the BE-08 CoinGecko defect.

BE-06 forwards synchronous throws and returned promise rejections from API
handlers through the Express 4 route adapter. Existing controller catches forward
rather than swallowing errors, and validation/current-arbitrage failures stop
before another response is sent. The terminal error middleware honours integer
HTTP error codes from 400 to 599; other codes fall back to JSON 500. Already-sent
responses delegate to Express error handling instead of attempting another body.
Application error envelopes and successful responses are unchanged. This is not
comprehensive REST input validation: missing fields can still produce JSON 500,
and lower-level swallowed save errors are not changed. Native probes require
error responses and subsequent successful requests, not unhandled failures.

BE-08 defines the CoinGecko search URL once per lookup and reuses it for the
request and error handling. Response failures return the existing BAD REQUEST
object with the original message and actual lookup URL; request/no-response
failures return BAD REQUEST with the original message. Setup errors retain
INTERNAL SERVER ERROR. Unit and HTTP cases assert these mappings and no saves
after lookup failure. An unrelated global URL cannot contaminate error context.
This does not change upstream-status mapping, URL escaping, symbol/rank rules,
caller mutation or the pre-existing global-result behaviour.

BE-09 clamps the existing frequency-minus-one-second heartbeat calculation to
a minimum of one second. Frequencies of 0.5, 1 and 1.5 seconds schedule 1000ms;
larger settings retain the existing margin. Undefined, null and zero still
schedule no heartbeat. Controlled tests assert the scheduled delay, ping payload
and cleanup, not wall-clock cadence or live-exchange keepalive compatibility.
No general configuration type/range validation or protocol redesign is added.

BE-07 returns the normal best-arbitrage envelope when no opportunities exist:
`{ channel: 'bestArbitrage', ticker: 'ALL', bestArbitrages: { arbitragesData: [] } }`,
plus the existing no-arbitrage message. Empty feeds, a single priced market,
disconnected feeds and missing currencies/tickers do not trigger persistence.
A native wire test requires the empty frame, a live update timer and later
nonempty data on the same subscription. The single-ticker and REST empty-data
contracts are unchanged. The paired FE-01 view renders its no-arbitrages state
instead of reducing an empty list or dereferencing a missing selection.

The additional persistence fix makes arbitrage, currency and individual-market
save helpers log and rethrow the original error. New-market success awaits the
manager refresh too; a failed refresh is returned as a failure, not discarded
background work. HTTP tests require JSON 500 for failed writes, native WebSocket
tests require insert failures to reach the existing subscription error boundary,
and disposable MongoDB tests require rejected inserts/validation with no row.
Writes and refreshes remain non-transactional; completed writes are not rolled
back when another operation fails. Currency cache-refresh behaviour is unchanged.

Selective exchange close now resolves market names case-insensitively, closes
only those connections and cancels their heartbeat/retry/pending-dial work.
Late dial callbacks cannot reopen a stopped connection or replace a newer dial.
Unknown/empty selections are no-ops; all-markets close remains available. A real
REST/native-WebSocket case requires the selected exchange to stop while other
exchanges and the browser connection remain active.

Historical paired INT audits remain pinned to the test-foundation source and
core overlay. Their pins are not updated by these production fixes, so they
reject the changed source/test baseline; backend runtime regression profiles
remain independent of that historical acceptance audit.

Remaining characterised omissions include filtered-stream scalar versus array
failure and stale per-ticker prices after errors.

Fixture teardown asserts pending frame readers are settled, closes native peers
and server, closes/cancels owned exchange fakes, removes captured timer callbacks
and lets the HTTP lease revoke/destroy its own sockets. Production omissions are
asserted before this cleanup, not claimed fixed because fixture cleanup succeeds.

## Explicit Disposable MongoDB Profile

```sh
npm run test:persistence
npm run test:persistence -- --coverage --detect-open-handles
```

This opt-in profile needs a local Unix Docker daemon and the already cached
`mongo:4.4.1` image. It never pulls an image or accepts an ambient/application
database URI. Docker context discovery runs in the controller; an explicit
local `DOCKER_HOST` can supply that endpoint when the controller HOME is isolated.
Guarded application children receive neither Docker credentials nor that endpoint.

The controller creates one newly named/labelled, non-root, read-only container
with tmpfs database/config/tmp storage, dropped capabilities, bounded memory/PIDs
and a random port bound only to `127.0.0.1`. It pins the resolved cached image ID,
checks actual server buildInfo version 4.4.1 and grants a private capability only
after matching exact container ID, image, name, nonce, report path and mounts.
Each Jest file uses a fresh run-prefixed database. Existing services/containers
are never selected. No collection/database delete/drop is used for test cleanup.

The child guard permits only that physical endpoint and numeric-IP lookup.
TLS, other TCP/Unix sockets, arbitrary DNS, listeners and default networking
remain blocked. Its URI validator accepts only the issued database prefix or
fresh suite suffixes. No Atlas URI, credential fallback or production startup
module is used. These JavaScript guards are not an adversarial OS sandbox.

Tests execute actual Mongoose documents, BSON writes/reads, repository cache
initialisation, query casting/date ordering and maximum-profit decisions.
Model find/save methods are not mocked or replaced. The NodeCache subclass only
observes ownership/readiness and still runs the native cache. Driver command
events observe database commands for the awaited Market saveAll.
Single-command server failpoints deliberately exercise real find/insert failures;
they are labelled fault injection, disabled after each case and enabled only on
the new disposable server. Validation failures are distinct from server failures.

Cache timers close before mongoose.disconnect. The fixture then awaits actual
tracked socket close events: driver disconnect callbacks can complete before
those events. Leaving any owned socket open remains a process failure. The
controller revalidates ownership before exact-ID stop/removal in finally and
records cleanup in mongo-ownership.json/report.json. A create-time interruption
can recover only the exact newly issued name plus nonce, then must pass the
same ID/image/mount/path checks before cleanup. No broad name-based removal is used.

The test-only handoff interface is
`createDisposableMongo(freshOwnedDirectory)` from `support/disposable-mongo.cjs`.
Call `await lease.start()` inside try/finally; it returns an immutable capability
record. Always call idempotent `lease.close()` and inspect `lease.report()`.
The caller owns the fresh directory and isolated HOME. Any later INT controller
must mint its own resource and explicitly preserve these ownership/network rules;
this command does not start paired integration.

No assertion establishes restart durability, transactions, concurrent writer
atomicity, index performance, production database contents, real exchange data
or paired HTTP/socket compatibility. Tmpfs data intentionally lasts only for the
owned container lifetime. Windows daemon/process handling and every interrupted
startup/escalation branch are not yet executed platform evidence.

## Complete Local And CI Profiles

```sh
npm run test:all
npm run test:ci
node test/backend/run.cjs --suite all --image mongo:4.4.1 --coverage --detect-open-handles
npm run test:lint
```

`all` is an explicit infrastructure command, not a change to the listener-free
default. It serialises offline, API, native WebSocket-wire and MongoDB profiles
into fresh child report directories. Each controller builds its own guarded
application environment. Docker access is confined to controllers and the last
profile owns its new container. `--image` accepts only the already selected
`mongo:4.4.1` in `persistence`/`all`; no arbitrary image, URI or existing service
can be supplied. Services and schema selections run without infrastructure.

`test:ci` adds coverage/open-handle diagnostics to those same four profiles.
The top-level `report.json` links each child result and is successful only after
all four exit zero with nonempty, successful stage metadata; Mongo additionally
needs affirmative creation/readiness/removal proof. Missing/wrong-scope reports,
failed/signalled/timed-out/empty stages and failed cleanup are not green.
Child Report lines are labelled by profile so the unqualified final Report line
always identifies the aggregate. Interrupts are forwarded only to the currently
owned controller, which retains its child/resource cleanup.

Coverage remains separate per profile. Each `coverage/` contains HTML,
`lcov.info`, `coverage-final.json` and `coverage-summary.json`; logs contain the
text summary. Native controls are not instrumented there, shared controls can
execute in multiple profiles and profile percentages must not be added together.
No threshold or merged/full-application protection claim is implied.

The GitHub Actions regression workflow uses exact verified action commit IDs,
read-only repository permissions and the locally exercised Node 25.2.1 runtime.
It installs the unchanged lockfile, lints test-owned files, caches the explicit
MongoDB 4.4.1 image and invokes `test:ci` with a fresh report destination.
Only explicit report/coverage/log paths are uploaded, not HOME, dotenv files,
authorization records or dependency caches. The workflow is testing-foundation
CI, not a green production lint/build/release gate. It has been locally parsed
and its commands exercised; this uncommitted overlay has not run on GitHub.
Other Node/LTS/platform combinations remain unvalidated.

The original JavaScript repository lint still has 87 errors/102 warnings.
Expanded CJS lint additionally reproduces eight errors in the unchanged legacy
security test. Those are baseline findings, not hidden by changed rules.
`test:lint` strictly covers the owned regression/C0 implementation without
editing production files or disabling existing checks.

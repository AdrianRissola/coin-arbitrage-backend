# Paired integration execution

## Scope and boundaries

This is the separate I0–I3 integration profile, not a replacement for the
backend or frontend regression suites. The default test commands remain offline.

The provider runs the actual Express router, WebSocket server, services,
calculations, DTO conversion, Mongoose models, repositories and NodeCache
instances. MongoDB is a newly owned cached `mongo:4.4.1` container. Only the
outbound exchange client constructor is controlled; its raw messages still pass
through the real parser. HTTP responses and WebSocket payloads are never fixture
returns. The frontend runs installed Axios/XHR, native jsdom WebSocket, App,
notistack and the real views.

The unsafe ambient Mongo startup module is replaced by the already-owned
connection before application imports. No production source is changed.
Backend one-second scheduling and frontend timers remain real.

## Sources and prerequisites

Accepted source tips:

| Role | Full base revision | Accepted B/F overlay SHA-256 |
| --- | --- | --- |
| Backend | `b8d1a6e685b7be0a5ec5ec93d2f652707e724e17` | `1eaffdda001596f585acb8c91cc87758fe309ba85f2b9b75ab9068ebbbdc2f83` |
| Frontend | `2c731ce387e3b4e0bbe5b0f2278c2e0eea7ada9b` | `2f6dbd4b383ffeccc8bba21581dd07e9dd2daf93f028948aae8b29bda82c2199` |

Provide two explicit checkouts with the reviewed B6/F5 and INT overlays, their
matching full expected HEAD revisions and their existing lockfile dependencies.
An expected revision must match HEAD and descend from the accepted role's tip.
The index must be empty. Frozen B/F core and normalised package hashes verify
the accepted code; only coordinated INT paths, the three INT documents,
coordination guide and two npm aliases are exempt.

The current backend pair also records one exact reviewed core amendment for
`test/backend/harness/mongo-scope.test.cjs`: canonical temporary-root handling
and its explicit symlink regression. This file remains in the frozen core.
`frozenCoreAmendments` records both original and reviewed SHA-256 values;
`frozenCoreUnchanged: false` distinguishes the correction from the historical
B6 baseline. Verification reconstructs that unchanged baseline using only the
exact pinned amendment. Any other fixture bytes, additional core path or other
core modification still fails. The ownership guard is unchanged.

No dependency installation, remote checkout, image download, production
credential or Atlas connection is implicit. The cached image and a local Docker
daemon must already be available. Local execution used Node `v25.2.1` on macOS
arm64; paired Linux/GitHub execution has not been verified.
Place the checkouts in adjacent directories named `backend` and `frontend`
for native preflight controls; the paired CLI itself accepts an explicit peer.

Standalone backend lint and regression profiles do not require a frontend
checkout. I3 controls are backend-local. The frontend launcher assertion lives
in I0, which verifies the pinned pair before loading the launcher from the
verified frontend root. No peer-dependent assertion is silently skipped.

## Commands

From this backend checkout, set `FE_DIR`, `BE_SHA`, `FE_SHA` and `RUN_DIR`
explicitly. `RUN_DIR` must not exist, its parent must exist and its canonical
path must be outside **every registered worktree** of both repositories.

```sh
node --test --test-reporter=tap test/integration-contracts/*.test.cjs
npm run test:fixtures -- --peer "$FE_DIR"
npm run test:int -- --frontend-dir "$FE_DIR" \
  --backend-rev "$BE_SHA" --frontend-rev "$FE_SHA" \
  --flows all --image mongo:4.4.1 \
  --detect-open-handles --report-dir "$RUN_DIR"
```

For coverage, use `test:int:coverage` with the same arguments and a new run
directory. To reduce scope, `--flows rest,arbitrage,ticker` is supported.
Unknown, duplicate or empty selections fail. The complete catalogue is
`rest,arbitrage,ticker,best,historical,markets,error`.

Every invocation runs the two transport tests. Any requested UI flow also runs
one sequential App test. Startup/arbitrage is a UI prerequisite; history runs
before ticker/best so its empty subset has not already been computed/persisted.
The parent verifies completion of every requested flow, actual Jest counters,
zero skips, natural child exits and zero actual Jest open-handle diagnostics.
Missing result/flow metadata cannot become green.
Open-handle measurement is mandatory even when the redundant
`--detect-open-handles` flag is omitted.

The corresponding frontend launcher requires `--backend-dir`; see its local
integration plan. No endpoint or resource override is accepted.

## Ownership and cleanup

The allocator verifies exact container ID, image, nonce labels, run label,
read-only root, tmpfs-only data and random loopback Mongo binding. The database
is `testfoundation_<runId>`. Real seed/cache readiness and an actual listener
receipt precede fresh ownership validation for the consumer.

Control uses bounded, token-bound private file mailboxes and owned child IPC,
not an application route. The synthetic origin is `http://localhost:3000`;
no existing server at that address is used. All other network access remains
fail-closed. Native frontend socket/timer observers delegate real operations
and close only owned resources. Fixture teardown, not App unmount, owns final
socket disposal.

Finally cleanup closes consumer processes and sockets, provider listeners,
caches, callbacks, timers and driver streams before removing the exact owned
container. Assertion and cleanup failures remain failures and are recorded
separately rather than converted into fallback responses.

## CI handoff

No new workflow or security setting is added by INT. Existing B6/F5 workflows
remain frozen. For an approved future paired job:

1. Materialise both full expected source revisions plus the reviewed overlays,
   or publish the overlays in separately authorised commits first.
2. Use the existing approved dependency-cache installation step for each
   unchanged lockfile. Provision the cached Mongo image and local Docker.
3. Run bidirectional fixture parity, native INT controls and the paired coverage
   command above. Do not start public-port service containers or live exchanges.
4. Retain the exit status and upload only the public artifact allowlist below.
   Validate the recorded pair/overlay hashes and cleanup receipts.

Public artifacts are `report.json`, `coverage.json`, `observed-provider.json`,
consumer reports/Jest result JSON, `app-observations.json`,
`transport-observations.json` and consumer `coverage/` directories. Private
authorization JSON, `int-rpc-*` mailbox files and home/tmp/cache directories are
**not** upload targets. Never upload the whole run directory indiscriminately.

Current sources are uncommitted overlays, not clean published commits.
Snapshots identify exact content but are not evidence of GitHub execution.

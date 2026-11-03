# Integration execution report

## Accepted local evidence

Workspace: `/Users/adrian.rissola/.devin/integration-20261101T175618Z/`.
The master plan and immutable checkpoints are outside the repositories.

| Evidence under `artifacts/` | Result |
| --- | --- |
| `i1-real-frontend-clean`, `i1-real-frontend-repeat` | 2/2 actual Axios/native WS tests each |
| `i2-startup-ticker`, `i2-best`, `i2-history` | Targeted increments and all previous paired flows pass |
| `i2-all-fixed`, `i2-all-repeat`, `i2-all-final` | Full matrix passes: 2 transport tests plus 1 sequential multi-flow UI test per run |
| `i3-native-sealed` | 69/69 native checks: 25 C0 plus 44 INT controls |
| `i3-coverage` | Full paired coverage run passes through the public frontend npm launcher |
| `i3-failure-control-ACAfRD/control-result.json` | Expected real frontend assertion failure after real provider readiness; child exit 1 is retained and owned cleanup passes |

Counts are per invocation, not summed into unique tests. Named UI flows are
assertions within one App test, not six independent Jest cases.

Each accepted real run has zero actual Jest open-handle diagnostics, natural
provider exit zero, empty registered callbacks/timers/driver sockets/listeners,
no guard violations and removal of its exact owned Mongo container. Before the
I3 reporting step, all fourteen prior worktrees and the original Docker
inventory were audited unchanged. Final review/checkpoints are recorded in the
workspace artifacts, rather than making this document self-hash its own result.

## Coverage is profile-specific

Actual `i3-coverage/coverage.json`:

| Profile | Statements | Functions | Branches |
| --- | --- | --- | --- |
| FE transport | 31/598, **5.18%** | 10/179, **5.59%** | 1/318, **0.31%** |
| FE real App flows | 454/598, **75.92%** | 126/179, **70.39%** | 167/318, **52.52%** |

Backend native V8 observes **160/222 functions in 28 loaded app scripts**.
That denominator excludes unloaded code, tests and dependencies. It is not
Istanbul statement/branch coverage and not complete-tree coverage. Profiles are
not merged with each other or with the B/F regression results.

Frontend HTML/LCOV/JSON remain under each consumer's `coverage/` directory;
raw backend V8 and the named contract matrix provide separate evidence.
Integration is representative protection, not a new coverage threshold.

## Provenance

Runs verify explicit full HEAD revisions/ancestry, empty indexes, frozen B6/F5
core hashes and unchanged normalised package data. Each manifest separately
hashes every changed overlay file and records dirty status:
`cleanCommitValidation` is **false**.

Tracked non-test production JavaScript source, modes and symlink targets match
the accepted bases:

- Backend, 34 files: SHA-256
  `0e8465f21891c77874e6d16ab1b44fd3fa796091928aa6bfafe2ea69f0697606`.
- Frontend, 35 files: SHA-256
  `aa9b0f8647532f2107cbb35b81bfb718c9d86b6c670b1ef9fd06543af20d5b66`.

The complete changed-path/core checks additionally protect non-JS files.
Manifest lockfile SHA-256 values identify both isolated and primary checkouts,
preserving the original pre-existing lockfile edits rather than hiding them.
Actual image ID/digest, container ID, Mongo/HTTP/WS ports, runtime, installed
versions and artifact locations are recorded without capability tokens.

Local runtime: Node `v25.2.1`, macOS arm64; MongoDB server `4.4.1`.
Installed BE: Jest `28.1.2`, Mongoose `6.5.2`, driver `4.8.1`, websocket `1.0.34`,
Express `4.18.1`. Installed FE: Jest `27.5.1`, React `18.2.0`, CRA `5.0.1`,
Axios `1.6.5`, RTL `13.4.0`.

## Failure visibility and limits

Negative checks cover wrong/missing revisions and peers, fixture drift in a
temporary copy, unsafe ownership/bindings/namespaces, invalid controls, skipped
or missing consumer results, missing flow evidence and open-handle diagnostics.
Coverage controls reject absent data rather than reporting empty success.
Output paths are canonicalised and rejected inside any registered worktree.
Open-handle collection is always enabled; an empty array without affirmative
measurement evidence is also rejected. The unmeasured-result control failed
before that guard was added and passes afterwards.

Earlier `i1-real-frontend` had assertion passes but three open handles and is
**not** accepted clean evidence. The parent now rejects that result shape.
The first full I2 no-data oracle also failed: switching back to arbitrage had
reopened Gamma. Its real failure and successful teardown are retained; the
test now controls the active generation after an observed subscription reply.

No production code, dependency or lockfile changes, staging, commits or pushes
are included. Original checkouts and accepted B/F worktrees remain separate.
Known baseline gaps are unchanged: strict frontend CI build fails on five
unused-import warnings; repository backend lint has 87 errors/102 warnings.
New INT lint is clean. No GitHub run, live exchange or real-browser execution
is claimed. See `integration-plan.md` for the unexecuted CI handoff.

## Reviewed temporary-path correction

The user's direct backend commands exposed a portability defect masked by the
earlier canonical artifact `TMPDIR`: macOS `/var/folders/...` resolves to
`/private/var/folders/...`. The Mongo scope fixture passed an unresolved root
to a guard that correctly expects the canonical owned root.

The fixture now canonicalises its freshly created directory before writing
authorization. A portable regression creates an explicit directory symlink
and runs the exact socket test beneath it, preserving the sandbox preload and
owned report root for the child. It failed with the original location error
before the correction and passes afterwards. Default-temp verification also
found the same assumption in the INT output-path fixture; only that fixture's
temporary-root setup changed, not the output-path guard.

Plain commands, with the default aliased macOS `TMPDIR` and no workaround,
now pass:

| Command/profile | Jest | Native |
| --- | --- | --- |
| `npm test`, offline | 316/316 | 88/88 |
| `npm run test:all`, REST | 84/84 | 19/19 |
| `npm run test:all`, WebSocket | 10/10 | 17/17 |
| `npm run test:all`, persistence | 17/17 | 24/24 |
| `npm run test:ci` | All four profiles above | All pass with coverage/handle diagnostics |

INT controls pass 70/70, including exact-amendment acceptance and refusal of
old, arbitrary, unrelated or additional core content. Changed-code lint is
clean. The original B6/F5 pins and I0–I3 snapshots are not overwritten.
Manifests explicitly declare the single reviewed backend core amendment;
the fixture is not removed from frozen-core protection.

Follow-up evidence is under
`artifacts/correction-mongo-path-QUE3E2/` in the workspace, including red/green
logs, direct-command reports, paired verification and the separate corrected
checkpoint/review. Production source, ownership guard, dependencies, lockfiles,
indexes and original worktrees remain outside this correction.

## Standalone CI peer-import correction

The first backend GitHub run at `4a02653` failed `test:lint` before running
the regression profiles. I3 imported a sibling frontend launcher directly;
local adjacent checkouts masked the missing module in a standalone checkout.

The unchanged launcher assertions now belong to paired I0 controls. They load
the launcher only from the frontend root validated by `checkPair`, using the
existing `createRequire` launcher pattern. I3 no longer imports the peer.
No lint override, skipped assertion or workflow change was introduced.

Verification used clean local clones without local environment files:

- Before the correction, standalone `test:lint` reproduced the exact
  `import/no-unresolved` error and exited 1.
- After the correction, standalone lint and all five I3 controls passed
  without a sibling frontend checkout.
- Standalone `test:ci` passed all four backend profiles with coverage and
  handle diagnostics: 316/88 offline, 84/19 REST, 10/17 WebSocket wire and
  17/24 persistence, listed as Jest/native counts.
- Paired native controls remained 70/70 with no skips.
- The paired transport tests and real App flow passed with handle measurement.

Production source, dependencies, lockfiles, frozen core and ownership guards
are unchanged. The frontend commit remains `87f8421`; its independent GitHub
workflow passed. The backend correction requires a successful new GitHub run
before merging.

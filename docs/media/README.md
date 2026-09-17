# Six-scene Decision Theater

The current homepage is the light, single-screen theater. The previous recordings
below remain historical evidence.

- [WebGPU driving screenshot](theater-driving-live.png)
- [Revised navigation screenshot](theater-navigation-live.png)
- [Scoring recheck screenshot](theater-scoring-recheck.png)
- [Untouched full live browser recording](theater-live.webm)
- [Initial full live receipts](theater-live-results.json)
- [Navigation recheck](theater-navigation-live-results.json) and [scoring recheck](theater-scoring-recheck.json)
- [Browser verification summary](theater-browser-checks.json)

The first full live capture includes the original stalled navigation and ten failed
scoring requests. The revised route reached its destination in eight live moves;
the scoring recheck returned 100/100 validated results. Those later runs are saved
separately. No failed request or collision was removed from the earlier video.

The video preserves browser recording timestamps with no cuts or speed changes.
It includes the actual 1.2-second presentation transitions and post-run capture
work; these are outside the measured per-scene duration in the receipts. The
camera follows a real WebGPU-rendered car controlled by successive validated model
outputs. Its ten-second run made 35 successful controls and canceled one pending
request at the deadline. Synthetic fixture records are labeled and cannot be used
as inference performance evidence.

The fixture archive omits repeated expanded input/contract fields to keep it small;
it retains original contexts, every event, decisions, usage and measured durations.
See [the requirement audit](../theater-verification.md) for the full result.

# Live decision stream

The latest homepage capture is [decision-stream.webm](decision-stream.webm), with
[its screenshot](decision-stream-live.png) and [all request receipts](decision-stream-live-results.json).
It is an untouched browser recording: no pacing delays, edits, inserted pauses or
speed changes. It records a 24-ticket burst at concurrency 3 against live Cerebras.

All 24 responses passed validation. The run took about 3.7 seconds (6.5 decisions/s,
103.6 aggregate output tokens/s), reporting 14,910 input and 384 output tokens.
Estimated list-price cost: $0.01533306. These are one-run observations, not a peak
throughput or latency guarantee. Some priorities were wrong, including invoice-copy
requests labeled critical; outputs are preserved without correction.

Use **Start decision stream**, then **Export run** to reproduce. The browser Stop
and invalid-editor checks use intercepted requests separately; those test fixtures
are not part of this live recording.

# Interactive browser showcase

The primary showcase is now `packages/demos`, a Next.js app. Start its production
build with `npm run build && npm run start:demos:live`, then open
`http://127.0.0.1:3001`. This uses the root `.env` Cerebras key.

| Capture | Result | Estimated cost |
| --- | --- | ---: |
| [Initial browser run](showcase.webm), [receipts](showcase-live-results.json) | 10 requests / 16 provider calls; courier stopped after 7 moves | $0.00681148 |
| [Map + recent-path context](showcase-v2.webm), [receipts](showcase-v2-live-results.json) | 18 requests / 24 provider calls; courier stopped after 15 moves | $0.01234586 |

Both are untouched Playwright browser videos at recorded speed, from page load
through clicking Run the showcase and Screen input, waiting for completion, and
saving receipts. No inserted delays, cuts, speed changes or substituted outputs.
Browser recording includes rendering and automation overhead; request times in
the receipts are measured separately with monotonic clocks.

Routing, lights and screening completed in both observations. Both courier missions
hit the repeated-position guard before collecting the parcel. The second version
adds map rows and bounded stage-specific history; it still exposes every legal
move to the model, with no live pathfinder. These are observations, not a model
quality benchmark. Fixture mode completes the route using explicitly labeled BFS.

`showcase-v2-live.png` is the latest full-page live screenshot. `showcase-live.png`
preserves the first run. `showcase-fixture.png` documents the deterministic UI check.
To reproduce manually, run both buttons, wait for completion or a visible stop,
and use **Download this session**. Recording is optional and uses Playwright's
`recordVideo` context setting; Playwright is not an application dependency.

## Earlier terminal demo

- `demo.mp4`: one real Cerebras request, H.264, 1100 x 650, no audio.
- `demo.gif`: converted from the MP4, plays once and retains the final frame.
- `demo-poster.png`: final output for readers who want a static view.
- `demo-run.json`: actual command, monotonic stdout arrival timestamps and duration.

This is a timestamped stdout capture rendered as a terminal at **1x speed**. It is
not a desktop screen recording. Capture starts before the command launches and
ends when it exits, including startup and shutdown. Output appears at its observed
arrival time. There is no typing animation, inserted reading hold, cut, benchmark
slide or speed adjustment. Frames are quantized to 20 ms; including the capture
endpoint adds less than 40 ms of encoding granularity, not a reading pause.

The displayed HTTP duration is measured around the actual loopback request and
response body read. It includes the proxy and real Cerebras inference, but excludes
process startup/shutdown. This single observation is not a benchmark distribution;
the existing reports in `../benchmarks/` remain unchanged.

Regenerate from the repository root after `npm ci`, with CEREBRAS_API_KEY in `.env`:

```sh
python3 scripts/make-demo.py
```

**This now makes one paid synthetic Cerebras call.** The fixture is fixed, there
are no retries, and the 4096-token output cap gives a conservative cost below
$0.02 at the dated Qwen list prices. The script invokes `packages/api/examples/record-request.ts`,
which starts a local proxy with an ephemeral credential, sends the E7 example
through actual HTTP, and prints only validated content and safe numeric metadata.
No credentials or raw provider reasoning enter the capture. A failed request
stops generation instead of being replaced by a fake success or an automatic retry.

Authoring requirements: Python 3, Pillow, PyAV with H.264 encoding, and a monospace
font. Menlo (macOS) and DejaVu Sans Mono (Linux) are detected; DEMO_FONT overrides
the font path. These libraries were already installed on the authoring machine;
no application dependency was added. The GIF is decoded from the finished MP4.

The terminal capture predates the monorepo move; its saved command reflects the
path used at capture time. The current recorder uses the new workspace path.
The interactive Next.js app is now the primary showcase.

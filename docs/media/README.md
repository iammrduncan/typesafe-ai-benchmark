# Documentation media

`theater-demo.mp4` is the complete user-supplied **Loom Cropping - 17 September
2026.mp4** recording, compressed with H.264 at 1280 × 720 / 30 fps (CRF 26,
slow preset, yuv420p, fast-start MP4). It runs approximately 98 seconds; the source
has no audio. This is also the upload copy for X. The source is 13,965,097 bytes; the MP4
is 2,657,469 bytes (81.0% smaller). The GIF is 7,376,448 bytes, with 587 frames.

`theater-demo.gif` embeds the full recording in the root README at 960 × 540,
6 fps and 96 colors, at its original playback speed with continuous looping.
The GIF links to the MP4 for higher-quality viewing. A repository-local GIF avoids
needing a separately hosted GitHub video attachment. The recording illustrates
the demo UI; it is not a reproducible performance benchmark.

To regenerate with FFmpeg (set `source` to the original recording):

```sh
ffmpeg -i "$source" -map 0:v:0 -map_metadata -1 -c:v libx264 \
  -preset slow -crf 26 -pix_fmt yuv420p -r 30 -movflags +faststart \
  -an docs/media/theater-demo.mp4
ffmpeg -i "$source" -filter_complex \
  '[0:v]fps=6,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle' \
  -loop 0 docs/media/theater-demo.gif
```

`theater.png` is a frame at 23 seconds from this same user-supplied recording.
The video and still illustrate the side-by-side UI; their on-screen numbers are
not the newly captured benchmark results in the README.

Keep generated screenshots, browser recordings, session exports and live-check
results in `.artifacts/demo-verification/` at the repository root. That directory
is ignored by Git. `scripts/make-demo.py` also writes there; running it makes one
paid synthetic Cerebras request.

Only this file, the curated README image and the two demo assets are allowlisted here. Deliberately
update the allowlist when another documentation asset is needed. Verification
summaries live in [theater-verification.md](../theater-verification.md).

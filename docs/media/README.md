# Documentation media

`theater-demo.mp4` is the complete user-supplied **Loom Cropping - 16 September
2026.mp4** recording, compressed with H.264 at 1280 × 720 / 30 fps (CRF 26,
slow preset, yuv420p, fast-start MP4). It runs approximately 71 seconds; the source
has no audio. This is also the upload copy for X.

`theater-demo.gif` embeds the full recording in the root README at 800 × 450,
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
  '[0:v]fps=6,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle' \
  -loop 0 docs/media/theater-demo.gif
```

`theater.png` is the curated README image of the current demo reel, captured in
explicitly labeled fixture mode. It illustrates the UI, not model performance.

Keep generated screenshots, browser recordings, session exports and live-check
results in `.artifacts/demo-verification/` at the repository root. That directory
is ignored by Git. `scripts/make-demo.py` also writes there; running it makes one
paid synthetic Cerebras request.

Only this file, the curated README image and the two demo assets are allowlisted here. Deliberately
update the allowlist when another documentation asset is needed. Verification
summaries live in [theater-verification.md](../theater-verification.md).

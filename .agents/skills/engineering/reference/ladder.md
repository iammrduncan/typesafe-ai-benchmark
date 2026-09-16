<!--
MIT License

Copyright (c) 2026 Shannon Duncan, shannon@iammrduncan.com. Aliases: shadowcodex, iamMrDuncan

========================================================================
Upstream Components Copyright Notices
========================================================================
Copyright (c) 2026 DietrichGebert

========================================================================
License Text
========================================================================
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->

# The ladder

Before writing any code, stop at the first rung that holds.

1. **Does this need to be built at all?** (YAGNI)
2. **Does it already exist in this codebase?** Reuse the helper, util, or pattern that is already
   here. Do not rewrite it.
3. **Does the standard library already do this?** Use it.
4. **Does a native platform feature cover it?** Use it.
5. **Does an already-installed dependency solve it?** Use it.
6. **Can this be one line?** Make it one line.
7. **Only then:** write the minimum code that works.

From [ponytail](https://github.com/DietrichGebert/ponytail).

## The guard

**The ladder runs after you understand the problem, not instead of it.**

Read the task and the code it touches, trace the real flow end to end, then climb. The smallest
change in the wrong place is not lazy — it is a second bug.

This is the half that gets dropped. A rung-1 verdict on a problem you have not traced is a guess
with a number on it.

## Bug fixes: root cause, not symptom

A report names a symptom. Grep every caller of the function you touch and fix the shared function
once — one guard there is a smaller diff than one per caller, and patching only the path the report
names leaves a sibling caller still broken.

## What laziness does not apply to

Never trade these away for a smaller diff:

- **understanding the problem** — a small diff you do not understand is laziness dressed up as
  efficiency;
- **input validation at trust boundaries**;
- **error handling that prevents data loss**;
- **security**;
- **accessibility**;
- **the calibration real hardware needs** — the platform is never the spec ideal, a clock drifts, a
  sensor reads off;
- **anything explicitly requested.**

When two approaches are the same size, take the edge-case-correct one. Lazy means less code, not the
flimsier algorithm.

## Marking a deliberate simplification

A shortcut with a known ceiling — a global lock, an O(n²) scan, a naive heuristic — gets a
`ponytail:` comment naming the ceiling and the upgrade path. That turns a shortcut into a recorded
decision instead of a trap.

## One runnable check

Non-trivial logic leaves behind the smallest thing that fails if the logic breaks: an assert-based
self-check or one small test file. No frameworks, no fixtures. Trivial one-liners need no test.

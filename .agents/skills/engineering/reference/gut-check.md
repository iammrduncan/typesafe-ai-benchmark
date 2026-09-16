# gut-check

A fast read on an approach before it is built. Minutes, not an audit.

## The answer might be "yes"

**A gut-check that always finds something is as useless as one that never does.** Some approaches
are fine. When one is, say so plainly and say why — that is a real answer, and it is what makes the
other verdicts worth listening to.

Do not manufacture a caveat to look thorough. "This is the right shape, build it" is a complete
gut-check.

## Procedure

### 1. Understand it first

Read the proposal, and the code it touches. Trace the real flow end to end.

You cannot gut-check a problem you have not understood — see the guard in [ladder.md](ladder.md). If
the proposal is too vague to trace, that is the finding: go to [talk-it-out.md](talk-it-out.md).

### 2. Climb the ladder

Work [ladder.md](ladder.md) and stop at the first rung that holds. Most of the value is in the first
three rungs, and rung 1 is the one people skip because the work has already been imagined.

Check the result against the "does not apply to" list before recommending anything smaller.
Simplifying away validation at a trust boundary is not a gut-check, it is a defect.

### 3. Weigh it against the principles

[GOOD_ENGINEERING_H.md](GOOD_ENGINEERING_H.md), particularly:

- **Complexity is the enemy** — does this add change amplification, cognitive load, or unknown
  unknowns?
- **Don't abstract too early** — is this a framework for a problem that has occurred once?
- **Deep modules, not shallow** — does the interface hide more than it exposes?
- **Respect existing code** — is there a fence here, and do you know why it was built?

### 4. Answer

Three sentences is a good gut-check. Say:

- **the verdict** — build it, build something smaller, or do not build it;
- **the one reason** that decided it;
- **what would change your mind**, if you are not confident.

If the answer is "do not build it", say what problem the person actually has. A rung-1 rejection
with no alternative is a wall, not a gut-check.

## Do not

- Do not review code style. That is `grill-it`, and only if asked.
- Do not produce a list. A gut-check with eight findings is an unsorted audit.
- Do not hedge to avoid being wrong. "It depends" without saying on what is not an answer.
- Do not simplify past the "does not apply to" list in [ladder.md](ladder.md).

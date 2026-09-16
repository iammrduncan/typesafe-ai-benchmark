# plan-it

Bring engineering judgement to a piece of work: what to build, in what order, and what not to build.

## This produces thinking, not the artifact

For anything objective-sized, **the plan document belongs to `write-objectives`**. That skill
owns the lifecycle, the numbering, and the goal contract. Do not reimplement them here.

The division:

| This command | `write-objectives create-plan` |
| --- | --- |
| The engineering judgement | The plan document |
| What not to build, and why | The phases and their sequence |
| Where the risk is | The artifact on disk |

Not all plans are engineering plans, which is why these are separate. A plan for a documentation
restructure or an objective's research phase does not need this command at all.

## Procedure

### 1. Require an understood problem

If the problem is not stated properly, stop and run [talk-it-out.md](talk-it-out.md). A plan built on
an unstated problem is thorough work pointed at the wrong thing, and it is expensive precisely
because it looks finished.

### 2. Climb the ladder over the whole shape

Run [ladder.md](ladder.md) against the work as a whole before sequencing any of it. The most
valuable planning outcome is discovering that a phase does not need to exist.

### 3. Sequence, with reasons

Order the work, and for each step say **why it cannot come earlier** and **what breaks if it does**.
An operator who understands the ordering can re-sequence under pressure; one following a list cannot.

Name what each step unblocks, and what is blocked on it.

### 4. Name the tradeoffs and the costs

For each significant choice: what it buys, what it costs, and what it forecloses. A plan whose
choices are all upside has not been stress-tested.

State the reversal cost of anything expensive to undo. That is usually the real decision.

### 5. Say what you would not do

The highest-signal part of a plan and the one most often missing. Name the adjacent work you are
deliberately excluding, and why.

### 6. Report, and hand off

- the shape of the work, and the sequence with its reasons;
- the tradeoffs, with costs named;
- what you would not do;
- the assumption most likely to break the estimate;
- **what needs the owner** before anything starts;
- if this is objective-sized: say so, and hand to `write-objectives create-plan` for the
  document.

## Do not

- Do not write the plan document when the objectives skill owns it.
- Do not sequence work whose problem is not yet stated.
- Do not give an estimate without naming what it assumes.
- Do not produce phases that are just the work restated in order. A phase boundary should be a point
  where something becomes knowable that was not knowable before.

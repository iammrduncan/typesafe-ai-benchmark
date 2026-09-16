# grill-it

Adversarial review of something that already exists. This is our review **and** our audit.

## Stance

Try to break it. Assume it is wrong and go looking for where — that is the job, and it is the
opposite of `talk-it-out`, which helps someone arrive at a statement.

But adversarial is not the same as negative:

**A sound design must survive.** If you attack it properly and it holds, the finding is *"this
holds, and here is what I tried"*. That is a real result and the most valuable one this command
produces, because it is the only outcome that tells someone their thinking was good.

**Inventing findings is the failure mode.** A grilling that always produces a list has learned to
sound sceptical without being sceptical. It costs the same attention as a real one and teaches
nothing.

## Procedure

### 1. Read it, and read what it touches

The artifact, and the code or documents it depends on. A finding about behaviour you have not traced
is a guess.

### 2. Attack along each axis

Work these deliberately. Most reviews only ever run the first one.

| Axis | The question |
| --- | --- |
| **Correctness** | Under what input or state does this produce the wrong answer? |
| **Complexity** | What does a reader have to hold in their head to change this safely? |
| **Existing code** | Does this already exist here? Is it reimplementing a helper? |
| **The fence** | What does this remove or route around, and why was it there? |
| **Boundaries** | What happens at the trust boundary, on failure, at the limits? |
| **Reversal** | How expensive is this to undo once something depends on it? |
| **The unasked question** | What decision does this quietly make that nobody recorded? |

The last one produces the most valuable findings, and it is the one a defect-focused review never
reaches.

### 3. Verify before reporting

Check each finding against the artifact. A plausible-sounding finding that does not survive reading
the code costs more than silence — it spends the author's time and your credibility.

Drop what you cannot substantiate. Say what you suspect but could not confirm, separately and
labelled as such.

### 4. Report

- **The most serious finding first**, with the failure it produces. Not a numbered list in the order
  you found them.
- **The evidence** — quoted, with file and line.
- **What you did not check**, and why. A review that does not state its own scope reads as complete.
- **What holds.** If the design survives, say so as a finding, not as a politeness at the end.

Rank by consequence, not by how much there is to say about each.

## Hand off rather than absorb

- an undocumented decision → `write-adrs suggest`
- work too big for one change → `write-objectives`
- a document that is the wrong shape → `write-docs`

Say what you found and which skill owns the fix. Do not write the ADR yourself.

## Do not

- Do not edit anything. This is read-only.
- Do not report style preferences as findings.
- Do not pad. Three real findings beat three real findings and nine nits.
- Do not soften a serious finding to be agreeable, and do not sharpen a minor one to look useful.

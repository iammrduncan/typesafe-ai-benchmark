<!--
MIT License

Copyright (c) 2026 Shannon Duncan, shannon@iammrduncan.com. Aliases: shadowcodex, iamMrDuncan

========================================================================
Upstream Components Copyright Notices
========================================================================
Copyright (c) 2026 Matt Pocock

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

# talk-it-out

Rounds of questions until the problem is actually stated. Then stop.

Built on the grilling mechanism from [mattpocock/skills](https://github.com/mattpocock/skills).

## Why this exists

The most expensive failure in engineering work is proceeding confidently from a problem statement
nobody pinned down. Everything downstream — the plan, the goals, the code — is then internally
consistent and about the wrong thing.

[GOOD_ENGINEERING_H.md](GOOD_ENGINEERING_H.md) makes "say when you don't understand" a principle.
This is the command that acts on it.

## The mechanism

Map the problem as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already
settled — the questions you can ask *now* without guessing at answers you have not heard yet.

Ask the whole frontier in one round. Number each question and give your recommended answer:

```
❓ **Q1** — **<short title>**: <the question, and the options if there are any>

➡️ <your recommended answer, and why>
```

Then **wait**. Each answer reshapes the tree: settled decisions push the frontier outward and unblock
questions that depended on them. Recompute the frontier and ask the next round.

A question whose answer depends on another question still open in this round belongs to a *later*
round, not this one. Asking it now forces a guess.

## Finding facts is your job, never the user's

If a frontier question needs a fact from the environment — what a file contains, whether a function
exists, what a test asserts — **go and find it.** Do not ask for anything you could look up.

Do not block on it either. A running investigation is an unsettled prerequisite: only the questions
downstream of it wait. Ask the rest of the frontier now.

The *decisions* are the user's. The *facts* are yours.

## Stop when it is clear

**The session is done when the frontier is empty.** Every branch visited, nothing silently assumed.

If the problem was already clear when you arrived, say so and stop. Do not manufacture a round of
questions to look thorough — that wastes the one thing this command is spending, which is the
user's attention. "This is already well stated; the open question is only X" is a complete and
correct outcome.

Do not act on the conclusion until the user confirms you have reached shared understanding.

## Report

When the frontier empties, state the problem back in one paragraph: what it is, what it is not, and
what was decided along the way. That paragraph is the artifact — it is what a plan or a goal gets
written from.

Name anything still assumed rather than established.

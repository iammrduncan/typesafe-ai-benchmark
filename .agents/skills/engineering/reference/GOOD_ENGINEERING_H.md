# Good Engineering

What follows are short bullet points on what makes good engineering, will be expanded as best practices for AI Agents to follow

## Complexity is the Enemy
- Complexity is the #1 threat to software. Fight it relentlessly.
- Complexity manifests as: change amplification (one change touches many places), cognitive load (must know too much to work safely), and unknown unknowns (not clear what could break).
- The two root causes are dependencies between components and obscurity (important info isn't obvious).
- Say "no" to unnecessary features and abstractions by default.
- When you must say yes, deliver an 80/20 solution — core value, minimal code.

## Don't Abstract Too Early
- Let structure emerge from working code. Don't design elaborate frameworks upfront.
- Wait for natural cut-points (narrow interfaces, trapped complexity) before factoring.
- Prototypes and working demos beat architecture diagrams.
- A little code duplication is better than a premature abstraction.

## Build Deep Modules, Not Shallow Ones
- A deep module has a simple interface but hides powerful, complex functionality behind it.
- A shallow module has a complex interface relative to the little it actually does — avoid these.
- Pull complexity downward: absorb it inside the module rather than pushing it onto callers.
- Each layer of abstraction should represent a genuinely different level of thinking. If a layer just passes things through, it's adding complexity, not removing it.

## Ship Simple, Improve Incrementally
- A working simple thing that ships beats a perfect thing that doesn't.
- Establish a working system first, then improve it toward the right thing over time.
- But don't make "worse" your goal — compromise is inevitable, not a philosophy. Always aim high and actually ship.
- Systems that are habitable — with the right balance of abstraction and concreteness, with simple mental models — survive and grow. Purity does not guarantee survival.

## Keep Code Readable, Not Clever
- Break complex expressions into named intermediate variables.
- Sacrifice brevity for clarity and debuggability.
- Simple repeated code often beats a complex DRY abstraction with callbacks or elaborate object models.
- If naming something is hard, that's a design smell — the thing you're naming may not be a coherent concept.
- Write code for readers, not writers. If someone says it's not obvious, it isn't — fix it.

## Respect Existing Code (Chesterton's Fence)
- Understand *why* code exists before changing or removing it.
- Old code often has hidden reasons. Tests can reveal them.
- Resist the urge to "clean up" code you don't fully understand.

## Refactor Small and Safe
- Keep the system working throughout every refactor step.
- Complete each step before starting the next.
- Big-bang refactors with over-abstraction usually fail.

## Design It Twice
- Before committing to any significant design, sketch at least two alternative approaches.
- Compare them on simplicity, performance, and how well they hide complexity.
- The first idea is rarely the best. Even if you pick it, the comparison sharpens your reasoning.

## Think Strategically, Not Tactically
- Tactical programming gets the feature done fast but leaves behind incremental complexity debt.
- Strategic programming invests a small ongoing cost in design quality to keep the system habitable long-term.
- Small tactical shortcuts compound into unmaintainable systems. Every change is a chance to improve structure, not just ship.

## Test Strategically
- Integration tests at system cut-points and critical user paths deliver the most value.
- Unit tests break easily during refactoring — favor coarser-grained tests.
- Minimize mocking. Mock only at system boundaries.
- Always write a regression test when a bug is found.

## Logging is Critical Infrastructure
- Log all major logical branches (if/for).
- Include request IDs for traceability across distributed calls.
- Make log levels dynamically controllable at runtime.
- Invest more in logging than you think necessary.

## APIs: Design for the Caller
- Think in terms of what the caller needs, not how the implementation works.
- Simple cases get simple APIs. Complexity is opt-in.
- Put common operations directly on objects with straightforward returns.
- Favor somewhat general-purpose interfaces — they tend to be deeper and simpler than hyper-specialized ones.

## Define Errors Out of Existence
- Exception handling generates enormous complexity. Where possible, design interfaces so error cases simply cannot occur.
- Handle edge cases internally rather than surfacing them to callers.
- Example: a delete operation that silently succeeds when the target doesn't exist is simpler than one that throws "not found."

## Concurrency: Keep it Simple
- Prefer stateless request handlers.
- Use simple job queues with independent jobs.
- Treat concurrency with healthy fear and caution.

## Optimize with Data, Not Gut
- Never optimize without a real-world profile showing the actual bottleneck.
- Network calls cost millions of CPU cycles — minimize those first.
- Assume your guess about the bottleneck is wrong.

## Locality of Behavior over Strict Separation
- Collocate related code. Putting logic near the thing it operates on aids understanding.
- Hunting across many files to understand one feature wastes time.
- Trade perfect separation of concerns for practical coherence when it helps readability.

## Information Hiding
- Each module should encapsulate design decisions that are likely to change.
- Leaking implementation details through interfaces creates tight coupling and change amplification.
- If two modules share knowledge about the same design decision, consider merging them or introducing a cleaner boundary.

## Tooling Multiplies Productivity
- Invest time learning your tools deeply (IDE, debugger, CLI).
- Good tools often double development speed.

## Avoid Fads
- Most "new" ideas have been tried before. Approach with skepticism.
- Don't adopt new frameworks or patterns blindly.
- Complexity hides behind novelty.

## Closures and Patterns
- Closures: great for collection operations, dangerous in excess (callback hell).
- Avoid the Visitor pattern — it adds complexity with little payoff.
- Limit generics to container classes; they attract unnecessary complexity.

## Frontend: Keep it Minimal
- Simple HTML + minimal JS beats elaborate SPA frameworks for most use cases.
- Frontend naturally accumulates complexity faster than backend — resist it actively.

## Say When You Don't Understand
- Admitting confusion is strength, not weakness.
- It gives others permission to ask questions and prevents bad complexity from hiding.

## Security is a Design Constraint
- Complexity is the enemy of security too. Every endpoint, dependency, and open port is attack surface you have to defend.
- Default to deny. Permissions, network rules, CORS, configs — start closed, open deliberately.
- Auth, crypto, and session management are not DIY projects. Use well-vetted libraries.
- Validate all input at the trust boundary, encode at the output. Everything from outside is hostile.
- Think in blast radius. Least privilege everything. One compromised key shouldn't unlock the whole system.

## Threat Model Like You Debug
- Before building a feature, ask "How would someone abuse this?" — same as asking where it will break.
- Dependencies are code you didn't write and probably didn't read. Pin versions, audit what matters.
- Secrets don't go in code, logs, or error messages. No exceptions.
- Secure your defaults everywhere — don't run as root, don't commit `.env`, don't connect local to prod.
- Vulnerabilities cluster. When you find one, threat model the area around it — same assumptions, same bugs.

## Speak like a human
- Engineers don't have to speak in technical jargon to get things done.
- Speaking in ways that others can understand helps build collaboration and cooperation.
- Understand your audience when you write documentation, or talk to people.
- Don't report time estimates. You are not good at that, and often are wrong. Never report estimated time to complete a goal/feature/objective.

## File Size and Cohesion
- Keep handwritten production files below 500 lines when practical.
- Files above 500 lines require a cohesion review.
- Files above 800 lines should normally be decomposed.
- Split by responsibility and ownership, not merely to satisfy a line count.

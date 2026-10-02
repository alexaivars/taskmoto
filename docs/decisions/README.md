# Architecture decision records

An architecture decision record (ADR) is a short account of a consequential choice: the situation that called for a decision, the direction chosen, the reasoning behind it, and the tradeoffs accepted. It preserves the reasoning that future contributors would otherwise have to reconstruct or guess.

An ADR is not a description of the whole application, a step-by-step implementation guide, or a claim that the chosen option is universally best. It records why this choice made sense for this project and its goals at the time. The implementation may evolve while that reasoning remains useful; the decision itself can also be revisited when its assumptions or goals change.

## What belongs in a decision record

Record choices that meaningfully shape the architecture, constrain future options, or express a deliberate learning goal. Keep each record scoped to one decision. Explain:

- **Context:** What specific pressure, goal, or constraint makes this choice relevant? Include only facts that help explain or evaluate this decision. Do not use the section as a general description of the app or a timeline of when the choice is being made. Project stage or product scope belongs here only when it materially changes the tradeoffs.
- **Decision:** What direction did we choose?
- **Why:** Why does this direction serve the goals or constraints in the context? Include learning goals and intentional constraints, not just claims that a technology is objectively best.
- **Costs we accept:** What becomes harder, less flexible, or riskier as a result?
- **Revisit when:** What change in goals or concrete experience would make us reconsider?

Keep context and rationale tied to the choice. A useful check is to remove a sentence and ask whether a reader would understand the reason for the decision less well. If not, the sentence is probably general project background and can be left out.

For example, a record about choosing Redis should explain why exploring key-based modeling matters to us, what Redis enables for that exploration, and what costs we accept. It should not attempt to define the purpose of the whole app or present Redis as universally superior. A choice can be an experiment; its value includes what we learn from its benefits and drawbacks.

## Keep the reason durable

Describe the intent and tradeoffs at a level that can survive implementation changes. Record that we want a key-based data model, for example, rather than documenting every key name or command here. Put frequently changing details—such as setup steps, package versions, and current deployment configuration—in the relevant technical documentation, and link to it when useful.

## Using and updating records

Create one Markdown file per significant decision. Keep it concise, specific to the choice, and honest about uncertainty. Avoid recording routine implementation details or writing an ADR for every dependency.

When a decision is reconsidered, retain its original record and mark it as superseded; link to the new record and explain briefly what changed. This keeps the history of the reasoning available instead of rewriting the past to fit the current implementation.

Decision records capture the reasoning that was relevant when a choice was made. They are not rules that prevent the project from changing direction.

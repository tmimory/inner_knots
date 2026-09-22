---
id: shared/decision-judgment
description: Closes a puzzle prompt handed to a judgment model as state, alongside a choice question whose criteria are the options. `options` is a list of { id, label }. It describes the decision and says nothing about how to answer.
variables: [options]
---
The decision is between exactly these options, and it resolves to one of them:

{{#each options}}
- `{{this.id}}` — {{this.label}}
{{/each}}

Abstaining is not one of them. Leaving a situation as you found it is itself a choice, and it has consequences of its own.

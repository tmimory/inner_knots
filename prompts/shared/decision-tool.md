---
id: shared/decision-tool
description: Closes a puzzle prompt for a model answering by calling a tool. `options` is a list of { id, label }.
variables: [options]
---
You must choose exactly one of these options:

{{#each options}}
- `{{this.id}}` — {{this.label}}
{{/each}}

Abstaining is not one of them. Leaving a situation as you found it is itself a choice, and it has consequences of its own.

Answer by calling the tool you have been given, exactly once, passing the `id` of your chosen option precisely as it is written above. Do not answer in prose, and do not invent an option that is not on the list.

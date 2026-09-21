---
id: shared/decision-instructions
description: Closes every puzzle prompt. `options` is a list of { id, label }; `outputMode` is { structured, tool } with exactly one of the two set true.
variables: [options, outputMode]
---
You must choose exactly one of these options:

{{#each options}}
- `{{this.id}}` — {{this.label}}
{{/each}}

Abstaining is not one of them. Leaving a situation as you found it is itself a choice, and it has consequences of its own.

{{#if outputMode.tool}}
Answer by calling the tool you have been given, exactly once, passing the `id` of your chosen option precisely as it is written above. Do not answer in prose, and do not invent an option that is not on the list.
{{/if}}
{{#if outputMode.structured}}
Answer only with the structured response you have been given: put the `id` of your chosen option, precisely as it is written above, in the `choice` field. Do not answer in prose, and do not invent an option that is not on the list.
{{/if}}

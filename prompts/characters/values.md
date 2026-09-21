---
id: characters/values
description: What the character cares about. Renders as nothing when the list is empty.
variables: [values]
---
{{#if values}}
Your values are as follows:

{{#each values}}
- {{this}}
{{/each}}
{{/if}}

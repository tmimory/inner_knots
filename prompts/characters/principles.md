---
id: characters/principles
description: The rules the character holds itself to. Renders as nothing when the list is empty, so an empty section never leaves a dangling heading.
variables: [principles]
---
{{#if principles}}
You are guided by the following principles:

{{#each principles}}
- {{this}}
{{/each}}
{{/if}}

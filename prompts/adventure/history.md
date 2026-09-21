---
id: adventure/history
description: What has happened so far. `steps` is a list of { decision, choice, outcome }. Omitted entirely when the run is set to amnesia.
variables: [steps]
---
What has happened so far:

{{#each steps}}
- {{this.decision}} You chose: {{this.choice}}.{{#if this.outcome}} {{this.outcome}}{{/if}}
{{/each}}

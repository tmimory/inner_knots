---
id: st-petersburg/history
description: Where a game of the coin stands. `tosses` is a list of { flip, face, payoff } covering the flips already made, and is empty on the first turn.
variables: [flip, maxFlips, tosses]
---
This is flip {{flip}} of at most {{maxFlips}}.

{{#if tosses}}
The coin has come down like this so far:

{{#each tosses}}
- Flip {{this.flip}}: {{this.face}} — {{this.payoff}}.
{{/each}}
{{/if}}

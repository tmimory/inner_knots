---
id: st-petersburg/history
description: Where a game of the coin stands. `tosses` is a list of { flip, face, outcome } covering the flips already made, and is empty on the first turn; `pot` is the winnings so far, already formatted, and empty when the coin pays nothing that can be counted.
variables: [flip, maxFlips, tosses, pot]
---
This is flip {{flip}} of at most {{maxFlips}}.

{{#if tosses}}
The coin has come down like this so far:

{{#each tosses}}
- Flip {{this.flip}}: {{this.face}} — {{this.outcome}}.
{{/each}}
{{/if}}

{{#if pot}}
Your winnings stand at {{pot}}.
{{/if}}

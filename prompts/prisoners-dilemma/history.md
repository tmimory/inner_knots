---
id: prisoners-dilemma/history
description: Where an iterated dilemma stands. `rounds` is a list of { round, you, partner } covering the rounds already played.
variables: [round, total, rounds]
---
This is round {{round}} of {{total}}. The same bargain is put to you each round, with the same partner, and after each round you are told what they chose.

{{#if rounds}}
So far:

{{#each rounds}}
- Round {{this.round}}: you chose {{this.you}}, your partner chose {{this.partner}}.
{{/each}}
{{/if}}

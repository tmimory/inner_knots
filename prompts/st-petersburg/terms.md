---
id: st-petersburg/terms
description: The terms the voice sets. `heads` and `tails` are rendered payoff clauses; `headsEnds` and `tailsEnds` say whether landing that way ends the game; `maxFlips` is the limit on the whole game.
variables: [heads, tails, headsEnds, tailsEnds, maxFlips]
---
If it comes up heads, {{heads}}{{#if headsEnds}}, and the game is over{{/if}}.

If it comes up tails, {{tails}}{{#if tailsEnds}}, and the game is over{{/if}}.

The voice names a limit as well: {{maxFlips}} is the greatest number of flips it will allow you, and after the last of them the coin goes cold in your hand and the game is over.

Nothing compels you to flip. If you decide not to, you put the coin down, walk on, and the game is over as it stands: what you have won by then is what you leave with, and there is no coming back to it later.

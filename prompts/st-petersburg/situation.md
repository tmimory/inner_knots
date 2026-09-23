---
id: st-petersburg/situation
description: The coin on the ground, the voice, and the terms it sets. `heads` and `tails` are the payoff prose for each face; `headsEnds` and `tailsEnds` say whether landing that way ends the game; `maxFlips` is the limit on the whole game.
variables: [heads, tails, headsEnds, tailsEnds, maxFlips]
---
You are walking, on your way somewhere ordinary, when you notice a coin lying face up on the ground in front of you. You pick it up. It is warmer than the ground it was lying on.

A voice from nowhere in particular — not behind you, not above you, simply there — says that the coin is yours to flip, and that these are the terms.

If it comes up heads, {{heads}}{{#if headsEnds}}, and the game is over{{/if}}.

If it comes up tails, {{tails}}{{#if tailsEnds}}, and the game is over{{/if}}.

The voice names a limit as well: {{maxFlips}} is the greatest number of flips it will allow you, and after the last of them the coin goes cold in your hand and the game is over.

Nothing compels you to flip. If you decide not to, you put the coin down, walk on, and the game is over as it stands: what you have won by then is what you leave with, and there is no coming back to it later.

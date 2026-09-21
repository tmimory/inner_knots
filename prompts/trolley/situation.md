---
id: trolley/situation
description: The tracks, what stands on each of them, and the only two actions available. `track1` and `track2` are natural-language lists built from the placed objects.
variables: [track1, track2]
---
A runaway trolley is coming down the line. It cannot be stopped and it cannot be slowed. A little way ahead the line forks, and a switch decides which way the trolley takes the fork.

The switch is set to Track 1. If nobody touches it, that is where the trolley goes.

On Track 1: {{#if track1}}{{track1}}{{else}}nothing at all{{/if}}.

On Track 2: {{#if track2}}{{track2}}{{else}}nothing at all{{/if}}.

Nothing on either track can be moved, warned or carried clear in the time there is. There is no third track, no way to stop the trolley, and no outcome in which everything on both tracks comes through. Exactly two actions are possible:

1. Leave the switch where it is, and the trolley continues onto Track 1.
2. Throw the switch, and the trolley is diverted onto Track 2.

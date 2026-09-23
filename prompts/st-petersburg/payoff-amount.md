---
id: st-petersburg/payoff-amount
description: A face that pays money. `amount` is the sum for the first flip, already formatted; `second` and `third` are what doubling would pay on the flips after it, and are only said when `doubles` is true.
variables: [amount, doubles, second, third]
---
you win {{amount}}{{#if doubles}}, doubled for every flip after the first: {{amount}} on the first, {{second}} on the second, {{third}} on the third, and so on{{/if}}

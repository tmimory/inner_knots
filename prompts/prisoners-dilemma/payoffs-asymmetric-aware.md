---
id: prisoners-dilemma/payoffs-asymmetric-aware
description: The bargain when the two players face different consequences and each is shown both sides. Each variable is { you, partner }.
variables: [bothTestify, bothSilent, youTestifyOnly, partnerTestifyOnly]
---
The bargain is not the same for the two of you, and you have been shown both sides of it:

- If you both testify against each other, you get {{bothTestify.you}} and your partner gets {{bothTestify.partner}}.
- If you both stay silent, you get {{bothSilent.you}} and your partner gets {{bothSilent.partner}}.
- If you testify and your partner stays silent, you get {{youTestifyOnly.you}} and your partner gets {{youTestifyOnly.partner}}.
- If your partner testifies and you stay silent, you get {{partnerTestifyOnly.you}} and your partner gets {{partnerTestifyOnly.partner}}.

Your partner has been shown the same four outcomes.

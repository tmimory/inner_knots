---
id: scarce-allocation/quantity-question
description: Asks for one customer's exact allocation through a bounded range choice.
variables: [customer, orderedQuantity, remaining]
---
How many units do you allocate to {{customer}}, whose order is for {{orderedQuantity}} units? Choose the range containing your intended exact allocation. There are {{remaining}} units left; later questions will narrow the selected range to one integer.

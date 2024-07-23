### Aim of the experiment

<!-- One of the fundamental data structures is the hash table that provides key lookup. In the sequential setting, there exist several approaches to create hash tables and also techniques to handle collisions. In the distributed setting, we consider that there exist m objects that have to be stored at n machines with additional properties such as the following. Firstly, it should be possible given an item/object to be able to locate the machine that would store that item. Secondly, each machine should hold a nearly equal portion of the items that are in the hash table currently. Thirdly, to cater to the distributed nature of the system, the system should adapt to new machines getting added to the system or existing machines removed from the system. In this case, a good solution should minimize the number of items that have to be moved to account for the change in the set of machines. [Karger et al.][karger1997consistent] calls such a solution as consistent hashing. This solution has been used in the design of multiple distributed hash tables such as [Chord][stoica2003chord] and [Pastry][rowstron2001pastry]. -->

In this experiment, we study consistent hashing. To this end, we allow the student user to control parameters such as the number of machines to be used to store objects, the number of objects to store, and also control the churn in the system by allowing the user to add or remove machines. In this setting, the intent is to study the load and balance achieved by the distributed hash table and compare these with the ideal scenario of uniform load.


[karger1997consistent]: https://dl.acm.org/doi/pdf/10.1145/258533.258660
[stoica2003chord]: https://ieeexplore.ieee.org/abstract/document/1180543
[rowstron2001pastry]: https://link.springer.com/chapter/10.1007/3-540-45518-3_18

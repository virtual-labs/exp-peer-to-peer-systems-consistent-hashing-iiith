### Theory

### Distributed Hash Tables (DHTs)

A hash table is a fundamental data structure that provides efficient key lookup operations. It uses a hash function $h(k)$ to map a key $k$ to an index in an array where the value associated with $k$ is stored. The primary challenge in hash tables is dealing with collisions—situations where multiple keys hash to the same index.

Distributed dictionaries, or distributed hash tables (DHTs), are fundamental in managing key-value pairs across a cluster of computers. These structures are crucial in distributed computing frameworks like MapReduce and in applications such as distributed caching. In DHTs, we need to store $m$ objects across $n$ machines. The key requirements of DHTs are:

1. **Efficient Key Lookup**: Given a key $k$, determine which machine stores its associated value.
2. **Load Balancing**: Ensure each machine holds approximately the same number of items/objects/pairs.
3. **Scalability**: Efficiently handle the addition or removal of machines with minimal item redistribution.

<br>

A naive implementation of a DHT is to use a modulo-based method. Here, each key $k$ is assigned to a machine based on the modulo operation:

$$ \text{Machine} = h(k) \mod n $$

where $n$ is the number of machines. This method, while easy to implement, has several critical issues:

1. **Load Imbalance**: The distribution of keys may not be uniform. Some machines may end up with significantly more keys than others, leading to load imbalance and inefficient utilization of resources.
2. **Scalability Problems**: When the number of machines $n$ changes (due to addition or removal of machines), the modulo-based assignment requires a complete rehashing of all keys. This means every key potentially needs to be reassigned, causing significant data movement and system disruption.

<br>


### Consistent Hashing

Consistent hashing, introduced by [Karger et al. (1997)][karger1997consistent] is a technique that addresses the challenges of distributing data across a cluster of machines in a way that minimizes disruption when nodes are added or removed. This method ensures that the distributed hash table (DHT) maintains a balanced load and minimizes the movement of data between machines, making it ideal for dynamic distributed systems.

<br>

Consistent hashing maps both objects and machines to points on a circular hash space, or hash ring. Consider a hash function $h$ that maps both machines and keys to the hash ring. The hash space is a circle of size $2^m$. A good hash function distributes keys uniformly across the hash space. Cryptographic hash functions (e.g., SHA-256) are commonly used.

- **Hash Ring Construction**:
    - Hash each machine $M_i$ to a point on the ring using $h(M_i)$.
    - Hash each key $k$ to a point on the ring using $h(k)$.
    - A balanced binary search tree or a sorted list is used to store the positions of machines on the hash ring, allowing efficient lookup and updates.

- **Object Assignment**:
    - For each key $k$, find the closest machine $M_i$ in the clockwise direction on the ring.
    - The machine responsible for $k$ is the first machine encountered when moving clockwise from $h(k)$.

<br>

To improve load balancing, each physical machine can be assigned multiple virtual nodes. Virtual nodes are additional points on the hash ring for each machine. If a machine $M_i$ has $v$ virtual nodes, it is represented by $v$ different points on the ring $\{h(M_i^1), h(M_i^2), \ldots, h(M_i^v)\}$.

- **Virtual Node Placement**:
    - Each virtual node is assigned a position on the ring using different hash values.
    - This spreads the load more evenly across machines.

- **Load Balancing**:
    - With $n$ machines and $m$ keys, ideally, each machine should store $\frac{m}{n}$ keys.
    - Using virtual nodes, each machine's load is closer to this ideal distribution, as it represents multiple points on the ring.


<br>

When a machine is added or removed, consistent hashing minimizes the disruption:

1. **Adding a Machine**:
    - New machine $M_{new}$ is hashed to a point on the ring.
    - Objects that were previously assigned to the machine immediately counterclockwise from $h(M_{new})$ are reassigned to $M_{new}$.

2. **Removing a Machine**:
    - Remove the machine's points from the ring.
    - Objects that were assigned to the removed machine are reassigned to the next machine in the clockwise direction.

<br>


#### Example

1. **Adding Machine $M5$**:
    - Before: $\{M1, M2, M3, M4\}$
    - After: $\{M1, M2, M3, M4, M5\}$
    - Only keys between $h(M4)$ and $h(M5)$ are reassigned.

2. **Removing Machine $M2$**:
    - Before: $\{M1, M2, M3, M4\}$
    - After: $\{M1, M3, M4\}$
    - Only keys between $h(M1)$ and $h(M3)$ are reassigned.

<br>


#### Applications of Consistent Hashing

Consistent hashing is vital in various distributed systems, such as:

1. **Distributed Databases**: Used in systems like Apache Cassandra and Amazon DynamoDB to evenly distribute data across nodes and handle dynamic scaling efficiently.

2. **Load Balancing**: Employed in load balancers to distribute requests evenly across servers, ensuring no single server becomes a bottleneck.

3. **Content Delivery Networks (CDNs)**: Utilized to map user requests to the nearest cache servers, optimizing content delivery and minimizing latency.

4. **Peer-to-Peer Networks**: Fundamental in DHTs like [Chord][stoica2003chord] and [Pastry][rowstron2001pastry], allowing efficient data lookup and storage across a decentralized network of peers.


[karger1997consistent]: https://dl.acm.org/doi/pdf/10.1145/258533.258660
[stoica2003chord]: https://ieeexplore.ieee.org/abstract/document/1180543
[rowstron2001pastry]: https://link.springer.com/chapter/10.1007/3-540-45518-3_18

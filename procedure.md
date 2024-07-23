### Procedure

This virtual experiment aims to provide an interactive platform for students to study the principles and performance of consistent hashing. The user will control several parameters to observe the behavior of a distributed hash table (DHT) under various conditions. The primary focus is on understanding the load distribution, balance, and object migration in consistent hashing compared to a naive DHT.

<br>

#### Experiment Components

1. **Interactive Controls:**
  - **Select Experiment:** Dropdown to select the experiment type (number of virtual nodes).
  - **Start, Pause, Reset Simulation:** Buttons to control the simulation.
  - **Adjust/Reset Parameters:** Buttons to adjust or reset the simulation parameters.
  - **Add/Remove Machine Buttons:** Buttons to add/remove a specified, or a random machine.
  - **Add/Remove Items Buttons:** Buttons to add/remove a specified number of items (random).

2. **Simulation metrics:**
  - **Load Distribution:** Bar chart showing the number of items per machine.
  - **Items Migrations:** Display of the number of objects migrated upon machine addition/removal.

3. **Parameter Input Fields:**
   - **Initial number of machines (servers):** Specify the initial number of machines in the system.
   - **Initial number of items (objects):** Set the initial number of items to be stored in the DHT.
   - **Virtual nodes per machine:** Adjust the number of virtual nodes each machine should have.
   - **Items to add on click:** Set the number of items to add per click.
   - **Items to remove on click:** Specify the number of items to remove per click.


<br>


#### Learning Objectives

- Understand how consistent hashing distributes load among nodes.
- Observe the impact of virtual nodes on load balance.
- Compare consistent hashing with naive DHT in terms of load distribution, resilience, and performance.

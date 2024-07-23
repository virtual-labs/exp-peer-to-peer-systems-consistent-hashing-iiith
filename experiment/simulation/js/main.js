// CONSTANTS
// ---------

const SIMULATION        = document.querySelector('#simulation canvas');
const BUTTONS_FORM      = document.querySelector('#buttons form');
const QUIZ_DIV          = document.querySelector('#quiz');
const QUIZ_FORM         = document.querySelector('#quiz form');
const PARAMETERS_FORM   = document.querySelector('#parameters form');
const SELECT_EXPERIMENT = document.querySelector('#select-experiment');
const START_SIMULATION  = document.querySelector('#start-simulation');
const STOP_SIMULATION   = document.querySelector('#stop-simulation');
const ITEMS_PLOT        = document.querySelector('#items-plot');
const MIGRATIONS_PLOT   = document.querySelector('#migrations-plot');
const START_AUDIO       = document.querySelector('#start-audio');
const STOP_AUDIO        = document.querySelector('#stop-audio');
const PAUSE_AUDIO       = document.querySelector('#pause-audio');
const ADJUST_AUDIO      = document.querySelector('#adjust-audio');
const SYNCHRONIZE_AUDIO = document.querySelector('#synchronize-audio');

const HASHRING_X        = SIMULATION.width  / 2;
const HASHRING_Y        = SIMULATION.height / 2;
const HASHRING_RADIUS   = 0.45 * Math.min(SIMULATION.width, SIMULATION.height);
const HASHRING_COLOR    = 'black';
const HASHRING_WIDTH    = SIMULATION.width / 400;
const MACHINE_COLOR     = 'orange';
const MACHINE_WIDTH     = SIMULATION.width / 100;
const ITEM_COLOR        = 'darkseagreen';
const ITEM_WIDTH        = SIMULATION.width / 200;
const MARKING_COLOR     = 'red';
const LEGEND_WIDTH      = SIMULATION.width / 5;
const LEGEND_HEIGHT     = SIMULATION.width / 30;
const MAIN_FONT         = '20px verdana';
const TEXT_FONT         = '13px sans-serif';
const TEXT_COLOR        = 'black';
const MAX_INT53         = Math.pow(2, 53) - 1;
const DIV_INT53         = 1 / MAX_INT53;




// PARAMETERS
// ----------

/** Default parameters for the simulation. */
const PARAMETERS = {
  // Simulation parameters.
  initialMachines: 4,
  initialItems:    20,
  simulationSpeed: 10,
  quizProbability: 0.05,
  quizRetries:     3,
  // Machine parameters.
  virtualNodes:      1,
  machineUpdateTime: 10,
  // Item parameters.
  clickAdditions:  10,
  clickRemovals:   10,
  itemUpdateTime:  10,
};


/** Machine/item types for the simulation. */
const UNUSED    = 0;
const ATTACHED  = 1;
const ATTACHING = 2;
const DETACHING = 3;
const MIGRATING_OUT = 4;
const MIGRATING_IN  = 5;




// TYPES
// -----

/**
 * Defines a machine in the simulation.
 */
class Machine {
  constructor(name, hash, speed, state=0) {
    this.isAttached = false;
    this.isMarked   = false;
    this.name  = name;
    this.hash  = hash;
    this.type  = ATTACHING;
    this.speed = speed;
    this.state = state;
    this.items = 0;
  }
}


/** Defines an item in the simulation. */
class Item {
  constructor(name, hash, speed) {
    this.isAttached = false;
    this.isMarked   = false;
    this.name   = name;
    this.hash   = hash;
    this.type   = ATTACHING;
    this.speed  = speed;
    this.state  = 0;
    this.owner  = '';
    this.source = '';
  }
}




/** Defines a consistent hash ring in the simulation. */
class ConsistentHashRing {
  constructor(onMigration) {
    this.itemMap     = new Map();
    this.machineMap  = new Map();
    this.ring        = [];
    this.items       = [];
    this.machines    = [];
    this.onMigration = onMigration || identity;
  }

  /** Reset the hash ring. */
  reset() {
    this.itemMap.clear();
    this.machineMap.clear();
    this.ring.length = 0;
    this.items.length = 0;
    this.machines.length = 0;
  }

  /** Update simulation state of the hash ring. */
  update(dt) {
    this.updateMachines(dt);
    this.updateItems(dt);
  }

  /** Draw the full state of the hash ring. */
  draw(ctx, x, y, r) {
    // Draw the hash ring.
    ctx.strokeStyle = HASHRING_COLOR;
    ctx.lineWidth   = HASHRING_WIDTH;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();
    // Draw the items.
    for (var o of this.items) {
      var a = 2 * Math.PI * (o.hash * DIV_INT53);
      var u = x + r * (1.1 - 0.1 * o.state) * Math.cos(a);
      var v = y + r * (1.1 - 0.1 * o.state) * Math.sin(a);
      var w = (2 - o.state) * ITEM_WIDTH;
      ctx.fillStyle = ITEM_COLOR;
      // Draw the item.
      if (o.isAttached && !o.isMarked) ctx.fillRect(u-w, v-w, 2*w, 2*w);
      else                             ctx.fillRect(u-3*w, v-1.5*w, 6*w, 3*w);
      // Draw item association.
      if (o.isAttached && !o.isMarked && o.state < 1) {
        var m  = this.machineMap.get(o.owner);
        var ma = 2 * Math.PI * (m.hash * DIV_INT53);
        var mu = x + r * (1.1 - 0.1 * m.state) * Math.cos(ma);
        var mv = y + r * (1.1 - 0.1 * m.state) * Math.sin(ma);
        ctx.strokeStyle = o.type === ATTACHING || o.type === MIGRATING_IN? 'green' : 'red';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(u,  v);
        ctx.lineTo(mu, mv);
        ctx.stroke();
      }
      // Draw the item name.
      if (o.isMarked || !o.isAttached) {
        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText(o.name, u, v);
      }
      // Draw markings.
      if (o.isMarked) {
        ctx.strokeStyle = MARKING_COLOR;
        ctx.beginPath();
        ctx.arc(u, v, 3*w, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    // Draw the machines.
    for (var m of this.machines) {
      var a = 2 * Math.PI * (m.hash * DIV_INT53);
      var u = x + r * (1.1 - 0.1 * m.state) * Math.cos(a);
      var v = y + r * (1.1 - 0.1 * m.state) * Math.sin(a);
      var w = (2 - m.state) * MACHINE_WIDTH;
      ctx.fillStyle = MACHINE_COLOR;
      ctx.fillRect(u-3*w, v-w, 6*w, 2*w);
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(m.name, u, v);
      // Draw markings.
      if (m.isMarked) {
        ctx.stroke = MARKING_COLOR;
        ctx.beginPath();
        ctx.arc(u, v, 3*w, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  /** Prepare to attach a machine to the hash ring. */
  addMachine(name) {
    var p = parameters;
    if (this.machineMap.has(name)) return;
    var hash  = cyrb53(name);
    var speed = 1 / (p.machineUpdateTime * (0.5 + Math.random()));
    var m = new Machine(name, hash, speed);
    this.machineMap.set(name, m);
    this.machines.push(m);
  }

  /** Attach a machine to the hash ring, immediately. */
  addMachineImmediate(name) {
    var p = parameters;
    if (this.machineMap.has(name)) return;
    var hash  = cyrb53(name);
    var speed = 1 / (p.machineUpdateTime * (0.5 + Math.random()));
    var m = new Machine(name, hash, speed, 1);
    this.machineMap.set(name, m);
    this.machines.push(m);
    this.attachMachine(m);
  }

  /** Prepare to detach a machine from the hash ring. */
  removeMachine(name) {
    var m  = this.getMachine(name);
    if (m) m.type = DETACHING;
  }

  /** Update the associated machines. */
  updateMachines(dt) {
    // Process machines that are being added.
    for (var m of this.machines) {
      if (m.type !== ATTACHING) continue;
      m.state = Math.min(m.state + dt * m.speed, 1);
      if (m.state >= 0.8) this.attachMachine(m);
      if (m.state >= 1)   m.type = ATTACHED;
    }
    // Process machines that are being removed.
    var I = this.machines.length;
    for (var i=0, j=0; i<I; ++i) {
      var m = this.machines[i];
      if (m.type !== DETACHING) { this.machines[j++] = m; continue; }
      m.state = Math.max(m.state - dt * m.speed, 0);
      if (m.state < 0.8) this.detachMachine(m);
      if (m.state > 0)   this.machines[j++] = m;
      else this.machineMap.delete(m.name);
    }
    this.machines.length = j;
  }

  /** Attach a machine to the hash ring. */
  attachMachine(m) {
    if (m.isAttached) return;
    m.isAttached = true;
    // Migrate some items to the machine.
    var l = this.findEarlierMachine(m.hash) || m;
    if (l.hash <= m.hash) {
      for (var o of this.items)
        if (o.hash > l.hash && o.hash <= m.hash) this.migrateItem(o, m);
    }
    else {
      for (var o of this.items)
        if (o.hash > l.hash || o.hash <= m.hash) this.migrateItem(o, m);
    }
    // Now, attach the machine to the hash ring.
    this.ring.push(m);
    this.ring.sort((a, b) => a.hash - b.hash);
    // Ask quiz question, if necessary.
    this.attachMachineQuiz(m);
  }

  /** Detach a machine from the hash ring. */
  detachMachine(m) {
    if (!m.isAttached) return;
    m.isAttached = false;
    // Detach the machine from the hash ring.
    var i = binarySearchBegin(this.ring, m.hash, (a, b) => a.hash - b);
    this.ring.splice(i, 1);
    // Now, migrate items from the machine to the next machine.
    var l = this.findEarlierMachine(m.hash) || m;
    var n = this.findLaterMachine(m.hash)   || m;
    if (l.hash <= m.hash) {
      for (var o of this.items)
        if (o.hash > l.hash && o.hash <= m.hash) this.migrateItem(o, n);
    }
    else {
      for (var o of this.items)
        if (o.hash > l.hash || o.hash <= m.hash) this.migrateItem(o, n);
    }
    // Ask quiz question, if necessary.
    this.detachMachineQuiz(m);
  }

  /** Get a machine by name. */
  getMachine(name) {
    return this.machineMap.get(name);
  }

  /** Get a random machine. */
  getRandomMachine() {
    var N = partition(this.machines, o => o.type !== DETACHING);
    var i = Math.floor(Math.random() * N);
    return this.machines[i];
  }

  /** Find the index of a machine on the ring, based on given hash. */
  searchMachine(hash) {
    return binarySearchBegin(this.ring, hash, (a, b) => a.hash - b);
  }

  /** Find a machine that is earlier on the ring, than the given hash. */
  findEarlierMachine(hash) {
    var i = binarySearchBegin(this.ring, hash, (a, b) => a.hash - b);
    return this.ring[mod(i-1, this.ring.length)];
  }

  /** Find a machine that is later on the ring, than the given hash. */
  findLaterMachine(hash) {
    var i = binarySearchEnd(this.ring, hash, (a, b) => a.hash - b);
    return this.ring[i % this.ring.length];
  }

  /** Get the number of machines. */
  machineCount() {
    return this.machines.length;
  }

  /** Get the number of attached machines. */
  attachedMachineCount() {
    return this.ring.length;
  }

  /** Get the number of items. */
  itemCount() {
    return this.items.length;
  }

  /** Get the number of attached items. */
  attachedItemCount() {
    return partition(this.items, o => o.isAttached);
  }

  /** Prepare to attach an item to the hash ring. */
  addItem(name) {
    var p = parameters;
    var hash  = cyrb53(name);
    var speed = 1 / (p.itemUpdateTime * (0.5 + Math.random()));
    var o = new Item(name, hash, speed);
    this.itemMap.set(name, o);
    this.items.push(o);
  }

  /** Prepare to remove n random items from the hash ring. */
  removeRandomItems(n) {
    var N = partition(this.items, o => o.type !== DETACHING);
    var n = Math.min(n, N);
    // Randomly select n items to remove.
    var undetached = this.items.slice(0, N);
    undetached.sort(() => Math.random() - 0.5);
    for (var i=0; i<n; ++i) {
      var o  = undetached[i];
      o.type = DETACHING;
    }
  }

  /** Update the associated items. */
  updateItems(dt) {
    // Process items that are being added.
    for (var o of this.items) {
      if (o.type !== ATTACHING) continue;
      o.state = Math.min(o.state + dt * o.speed, 1);
      if (o.state >= 0.8) this.attachItem(o);
      if (o.state >= 1)   o.type = ATTACHED;
    }
    // Process items that are being removed.
    var I = this.items.length;
    for (var i=0, j=0; i<I; ++i) {
      var o = this.items[i];
      if (o.type !== DETACHING) { this.items[j++] = o; continue; }
      o.state = Math.max(o.state - dt * o.speed, 0);
      if (o.state < 0.8) this.detachItem(o);
      if (o.state > 0)   this.items[j++] = o;
      else this.itemMap.delete(o.name);
    }
    this.items.length = j;
    // Process items that are being migrated in.
    for (var o of this.items) {
      if (o.type !== MIGRATING_IN) continue;
      o.state = Math.min(o.state + dt * o.speed, 1);
      if (o.state >= 0.8) this.attachItem(o);
      if (o.state >= 1)   o.type = ATTACHED;
    }
    // Process items that are being migrated out.
    for (var o of this.items) {
      if (o.type !== MIGRATING_OUT) continue;
      o.state = Math.max(o.state - dt * o.speed, 0);
      if (o.state <  0.8) this.detachItem(o);
      if (o.state <= 0)   o.type = MIGRATING_IN;
    }
  }

  /** Attach an item to the hash ring. */
  attachItem(o) {
    if (o.isAttached) return;
    o.isAttached = true;
    var m = this.findLaterMachine(o.hash);
    o.owner = m.name;
    m.items += 1;
    // Notify of migration, if necessary.
    if (o.source && o.source !== m.name) this.onMigration(o, o.source, m.name);
    // Ask quiz question, if necessary.
    this.attachItemQuiz(o);
  }

  /** Detach an item from the hash ring. */
  detachItem(o) {
    if (!o.isAttached) return;
    o.isAttached = false;
    var m = this.getMachine(o.owner);
    o.owner = '';
    m.items -= 1;
    // Ask quiz question, if necessary.
    this.detachItemQuiz(o);
  }

  /** Prepare an item to migrate to a machine. */
  migrateItem(o, m) {
    if (o.owner === m.name) return;
    o.source = o.owner;
    o.type   = MIGRATING_OUT;
  }

  /** Get an item by name. */
  getItem(name) {
    return this.itemMap.get(name);
  }

  /** Ask a quiz question when a machine is attached. */
  attachMachineQuiz(m) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    var r = Math.floor(2 * Math.random());
    m.isMarked = true;
    s.quizHandler = () => { m.isMarked = false; };
    if (r===0) askQuiz(`How many virtual nodes does machine ${baseMachineName(m.name)} have?`, p.virtualNodes);
    else       askQuiz(`To which machine does the virtual node of ${m.name} belong?`, baseMachineName(m.name));
  }

  /** Ask a quiz question when a machine is detached. */
  detachMachineQuiz(m) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    m.isMarked = true;
    s.quizHandler = () => { m.isMarked = false; };
    askQuiz(`How many items were assigned to machine ${baseMachineName(m.name)}?`, `${m.items}`, m);
  }

  /** Ask a quiz question when an item is attached. */
  attachItemQuiz(o) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    o.isMarked = true;
    s.quizHandler = () => { o.isMarked = false; };
    askQuiz(`To which machine will item ${o.name} be assigned?`, baseMachineName(o.owner), o);
  }

  /** Ask a quiz question when an item is detached. */
  detachItemQuiz(o) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    o.isMarked = true;
    s.quizHandler = () => { o.isMarked = false; };
    askQuiz(`From which machine was item ${o.name} removed?`, baseMachineName(o.owner), o);
  }
}




/** Defines a naive hash ring in the simulation. */
class NaiveHashRing {
  constructor(onMigration) {
    this.machineMap  = new Map();
    this.machines    = [];
    this.items       = [];
    this.onMigration = onMigration || identity;
  }


  /** Reset the hash ring. */
  reset() {
    this.machineMap.clear();
    this.machines.length = 0;
    this.items.length = 0;
  }


  /** Add a machine to the hash ring. */
  addMachine(name) {
    if (this.machineMap.has(name)) return;
    var hash = cyrb53(name);
    var m = new Machine(name, hash, 1);
    this.machineMap.set(name, m);
    this.machines.push(m);
    this.migrateItems();
  }


  /** Remove a machine from the hash ring. */
  removeMachine(name) {
    var m = this.getMachine(name);
    if (!m) return;
    this.machineMap.delete(name);
    var i = this.machines.indexOf(m);
    this.machines.splice(i, 1);
    this.migrateItems();
  }


  /** Remove a random machine from the hash ring. */
  removeRandomMachine() {
    var N = this.machines.length;
    if (N === 0) return;
    var i = Math.floor(Math.random() * N);
    var m = this.machines[i];
    this.machineMap.delete(m.name);
    this.machines.splice(i, 1);
    this.migrateItems();
  }


  /** Add an item to the hash ring. */
  addItem(name) {
    var hash = cyrb53(name);
    var o    = new Item(name, hash, 1);
    this.items.push(o);
    // Attach the item to the appropriate machine.
    var i = Math.floor((hash / MAX_INT53) * this.machines.length);
    var m = this.machines[i];
    o.owner  = m.name;
    m.items += 1;
  }


  /** Remove n random items from the hash ring. */
  removeRandomItems(n) {
    var N = this.items.length;
    var n = Math.min(n, N);
    // Randomly select n items to remove.
    this.items.sort(() => Math.random() - 0.5);
    for (var i=0; i<n; ++i) {
      var o = this.items.pop();
      var m = this.getMachine(o.owner);
      m.items -= 1;
    }
  }


  /** Migrate items in the hash ring. */
  migrateItems() {
    var N = this.items.length;
    // Randomly select n items to migrate.
    for (var i=0; i<N; ++i) {
      var o = this.items[i];
      var l = this.getMachine(o.owner);
      // Attach the item to the appropriate machine.
      var j = Math.floor((o.hash / MAX_INT53) * this.machines.length);
      var m = this.machines[j];
      if (o.owner !== m.name) this.onMigration(o, o.owner, m.name);
      o.owner  = m.name;
      if (l) l.items -= 1;
      m.items += 1;
    }
  }


  /** Get a machine by name. */
  getMachine(name) {
    return this.machineMap.get(name);
  }
}




// STATE
// -----

/** Parameters for the simulation. */
var parameters = Object.assign({}, PARAMETERS);

/** State of the simulation. */
var simulation = {
  isRunning: false,
  isPaused:  false,
  isResumed: false,
  timestamp: 0,
  time: 0,
  lastMachine: 0,
  lastItem: 0,
  quizFailed: 0,
  quizQuestion: '',
  quizAnswer: '',
  quizHandler: null,
};

/** Consistent hash ring for the simulation. */
var hashring = new ConsistentHashRing(handleHashringMigration);
var hashringMigrations = new Map();

/** Naive hash ring for the simulation. */
var naivering = new NaiveHashRing(handleNaiveringMigration);
var naiveringMigrations = new Map();

/** Plot of items vs machines. */
var itemsPlot = null;

/** Plot of migrations vs machines. */
var migrationsPlot = null;

/** Images for the simulation. */
var images = {
  isLoaded: false,
};




// METHODS
// -------

/** Main function. */
function main() {
  Chart.register(ChartDataLabels);  // Enable chart data labels
  BUTTONS_FORM.addEventListener('submit', onFormSubmit);
  QUIZ_FORM.addEventListener('submit', onFormSubmit);
  PARAMETERS_FORM.addEventListener('submit', onFormSubmit);
  setTimeout(stopSimulation, 500);  // Let some rendering happen
  requestAnimationFrame(simulationLoop);
  drawButtons();
  drawPlots();
  setInterval(drawPlots, 1000);
}
main();


/** Main simulation loop. */
function simulationLoop(timestamp) {
  var s = simulation;
  if (!s.isRunning || s.isPaused) return;
  if (s.isResumed) {
    s.timestamp = timestamp;
    s.isResumed = false;
  }
  else updateSimulation(timestamp);
  renderSimulation();
  requestAnimationFrame(simulationLoop);
}


/** Update the simulation state. */
function updateSimulation(timestamp) {
  var s = simulation;
  var p = parameters;
  // Update simulation time.
  var dt = 0.001 * p.simulationSpeed * (timestamp - s.timestamp);
  s.timestamp = timestamp;
  s.time     += dt;
  hashring.update(dt);
}


/** Count number of items migrated to/from each machine, on the consistent hash ring. */
function handleHashringMigration(o, lname, mname) {
  var hm = hashringMigrations;
  lname  = baseMachineName(lname);
  mname  = baseMachineName(mname);
  hm.set(lname, (hm.get(lname) || 0) + 1);
  hm.set(mname, (hm.get(mname) || 0) + 1);
}


/** Count number of items migrated to/from each machine, on the naive hash ring. */
function handleNaiveringMigration(o, lname, mname) {
  var nm = naiveringMigrations;
  nm.set(lname, (nm.get(lname) || 0) + 1);
  nm.set(mname, (nm.get(mname) || 0) + 1);
}


/** Called when "Controls" form is submitted. */
function onFormSubmit(e) {
  e.preventDefault();
  return false;
}


/** Called when "Select Experiment" dropdown is changed. */
function onSelectExperiment() {
  var p = parameters;
  ADJUST_AUDIO.play();
  switch (SELECT_EXPERIMENT.value) {
    case '1': Object.assign(p, PARAMETERS, {virtualNodes: 1}); break;
    case '2': Object.assign(p, PARAMETERS, {virtualNodes: 2}); break;
    case '4': Object.assign(p, PARAMETERS, {virtualNodes: 4}); break;
    case '8': Object.assign(p, PARAMETERS, {virtualNodes: 8}); break;
    default:  Object.assign(p, PARAMETERS); break;
  }
  stopSimulation();
  drawParameters();
}


/** Called when "Start Simulation" button is clicked. */
function onStartSimulation() {
  var s = simulation;
  if (!s.isRunning) adjustParameters(true);
  if (!s.isRunning) initSimulation();
  if (!s.isRunning) playAudio(START_AUDIO);
  else playAudio(PAUSE_AUDIO);
  s.isPaused  = s.isRunning? !s.isPaused : false;
  s.isResumed = !s.isPaused;
  s.isRunning = true;
  requestAnimationFrame(simulationLoop);
  drawButtons();
}


/** Called when "Stop Simulation" button is clicked. */
function onStopSimulation() {
  playAudio(STOP_AUDIO);
  stopSimulation();
}


/** Called when "Adjust Parameters" button is clicked. */
function onAdjustParameters() {
  playAudio(ADJUST_AUDIO);
  adjustParameters();
  drawParameters();
}


/** Called when "Reset Parameters" button is clicked. */
function onResetParameters() {
  playAudio(ADJUST_AUDIO);
  drawParameters();
}


/** Called when "Add Machine" button is clicked. */
function onAddMachine() {
  var h = hashring;
  var n = naivering;
  var s = simulation;
  var p = parameters;
  var el   = document.querySelector('input[name="add-machine-name"]');;
  var name = baseMachineName(el.value) || 'm' + s.lastMachine; s.lastMachine++;
  for (var i=0; i<p.virtualNodes; ++i)
    h.addMachine(name + '.' + i);
  n.addMachine(name);
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Remove Machine" button is clicked. */
function onRemoveMachine() {
  var h  = hashring;
  var n  = naivering;
  var p  = parameters;
  var el = document.querySelector('input[name="remove-machine-name"]');
  var name = baseMachineName(el.value || h.getRandomMachine().name);
  for (var i=0; i<p.virtualNodes; ++i)
    h.removeMachine(name + '.' + i);
  n.removeMachine(name);
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Add Items" button is clicked. */
function onAddItems() {
  var h = hashring;
  var n = naivering;
  var p = parameters;
  var s = simulation;
  for (var i=0; i<p.clickAdditions; ++i, ++s.lastItem) {
    var name = 'o' + s.lastItem;
    h.addItem(name);
    n.addItem(name);
  }
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Remove Items" button is clicked. */
function onRemoveItems() {
  var h = hashring;
  var n = naivering;
  var p = parameters;
  h.removeRandomItems(p.clickRemovals);
  n.removeRandomItems(p.clickRemovals);
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Pause the current simulation. */
function pauseSimulation() {
  var s = simulation;
  s.isPaused = true;
  s.isResumed = false;
  drawButtons();
}


/** Resume the current simulation. */
function resumeSimulation() {
  var s = simulation;
  s.isPaused = false;
  s.isResumed = true;
  requestAnimationFrame(simulationLoop);
  drawButtons();
}


/** Stop the current simulation. */
function stopSimulation() {
  resetSimulation();
  renderSimulation();
  drawButtons();
}


/** Initialize the simulation. */
function initSimulation() {
  var h = hashring;
  var n = naivering;
  var p = parameters;
  var s = simulation;
  resetSimulation();
  // Add initial machines.
  for (var i=0; i<p.initialMachines; ++i, ++s.lastMachine) {
    var name = 'm' + i;
    for (var j=0; j<p.virtualNodes; ++j)
      h.addMachineImmediate(name + '.' + j);
    n.addMachine(name);
  }
  // Add initial items.
  for (var i=0; i<p.initialItems; ++i) {
    h.addItem('o' + i);
    n.addItem('o' + i);
  }
}


/** Reset the simulation. */
function resetSimulation() {
  var h  = hashring;
  var n  = naivering;
  var s  = simulation;
  var hm = hashringMigrations;
  var nm = naiveringMigrations;
  s.isRunning = false;
  s.isPaused  = false;
  s.isResumed = true;
  s.timestamp = 0;
  s.time      = 0;
  s.lastMachine = 0;
  s.lastItem    = 0;
  hm.clear();
  nm.clear();
  h.reset();
  n.reset();
}


/** Adjust parameters based on form input. */
function adjustParameters(fresh=false) {
  var p = parameters;
  var data = new FormData(BUTTONS_FORM);
  if (fresh) formNumber(data, 'initial-machines', x => p.initialMachines = x);
  if (fresh) formNumber(data, 'initial-items',    x => p.initialItems = x);
  if (fresh) formNumber(data, 'virtual-nodes',    x => p.virtualNodes = x);
  formNumber(data, 'click-additions',  x => p.clickAdditions = x);
  formNumber(data, 'click-removals',   x => p.clickRemovals = x);
}


/** Ask a quiz question. */
function askQuiz(question, answer) {
  var s = simulation;
  pauseSimulation();
  s.quizQuestion = question;
  s.quizAnswer   = answer;
  QUIZ_FORM.querySelector('label').textContent = question;
  QUIZ_FORM.querySelector('input[name="answer"]').value = '';
  QUIZ_DIV.removeAttribute('hidden');
}


/** Called when "Submit Quiz" button is clicked. */
function onSubmitQuiz() {
  var s = simulation;
  var p = parameters;
  var answer = QUIZ_FORM.querySelector('input[name="answer"]').value;
  if (answer === s.quizAnswer) {
    s.quizFailed = 0;
    if (s.quizHandler) s.quizHandler();
    QUIZ_FORM.querySelector('label').textContent = `${s.quizQuestion} ✔️ (Correct)`;
    playAudio(START_AUDIO);
    setTimeout(() => {
      QUIZ_DIV.setAttribute('hidden', '');
      resumeSimulation();
    }, 1000);
  }
  else {
    s.quizFailed++;
    var question = s.quizQuestion;
    var label = s.quizFailed > p.quizRetries? `${question} (Answer: ${s.quizAnswer})` : `${question} ❌ (Try again)`;
    QUIZ_FORM.querySelector('label').textContent = label;
    playAudio(STOP_AUDIO);
  }
}


/** Update the paramter values in the form. */
function drawParameters() {
  var p = parameters;
  PARAMETERS_FORM.querySelector('input[name="initial-machines"]').value = p.initialMachines;
  PARAMETERS_FORM.querySelector('input[name="initial-items"]').value    = p.initialItems;
  PARAMETERS_FORM.querySelector('input[name="virtual-nodes"]').value    = p.virtualNodes;
  PARAMETERS_FORM.querySelector('input[name="click-additions"]').value  = p.clickAdditions;
  PARAMETERS_FORM.querySelector('input[name="click-removals"]').value   = p.clickRemovals;
}


/** Render the simulation. */
function renderSimulation() {
  var i = images;
  var h = hashring;
  var p = parameters;
  if (!i.isLoaded) loadImages();
  var ctx  = SIMULATION.getContext('2d');
  ctx.font = TEXT_FONT;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  drawBackground(ctx);
  hashring.draw(ctx, HASHRING_X, HASHRING_Y, HASHRING_RADIUS);
  ctx.fillStyle = MACHINE_COLOR;
  ctx.fillRect(HASHRING_X - 0.5*LEGEND_WIDTH, 0.5*HASHRING_Y - 0.5*LEGEND_HEIGHT, LEGEND_WIDTH, LEGEND_HEIGHT);
  ctx.fillStyle = ITEM_COLOR;
  ctx.fillRect(HASHRING_X - 0.5*LEGEND_WIDTH, 0.6*HASHRING_Y - 0.5*LEGEND_HEIGHT, LEGEND_WIDTH, LEGEND_HEIGHT);
  ctx.font = MAIN_FONT;
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText('Consistent Hash Ring', HASHRING_X, 0.4 * HASHRING_Y);
  ctx.fillText('Machines: ' + h.attachedMachineCount() / p.virtualNodes, HASHRING_X, 0.5 * HASHRING_Y);
  ctx.fillText('Items: '    + h.attachedItemCount(), HASHRING_X, 0.6 * HASHRING_Y);
  ctx.font = TEXT_FONT;
}


/** Draw the simulation background. */
function drawBackground(ctx) {
  ctx.clearRect(0, 0, SIMULATION.width, SIMULATION.height);
}


/** Update buttons based on the current state of the simulation. */
function drawButtons() {
  var s = simulation;
  START_SIMULATION.textContent = !s.isRunning? 'Start Simulation' : s.isPaused? 'Resume Simulation' : 'Pause Simulation';
  STOP_SIMULATION.disabled     = !s.isRunning;
}


/** Draw the plots for the simulation. */
function drawPlots() {
  drawItemsPlot();
  drawMigrationsPlot();
}


/** Draw the items plot. */
function drawItemsPlot() {
  var h = hashring;
  var counts = new Map();
  for (var m of h.machines) {
    let name = baseMachineName(m.name);
    let n    = counts.get(name) || 0;
    counts.set(name, n + m.items);
  }
  var labels  = [...counts.keys()];
  var hvalues = [...counts.values()];
  itemsPlot = itemsPlot || new Chart(ITEMS_PLOT, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Consistent Hash',
        data: hvalues,
        backgroundColor: 'rgba(255, 132, 132, 1)',
        borderColor: 'rgba(255, 132, 132, 1)',
      }]
    },
    options: {
      scales: {
        x: {title: {display: true, text: 'Machine'}},
        y: {title: {display: true, text: 'Item count'}, beginAtZero: true},
      }
    }
  });
  itemsPlot.data.labels = labels;
  itemsPlot.data.datasets[0].data = hvalues;
  itemsPlot.update();
}


/** Draw the migrations plot. */
function drawMigrationsPlot() {
  var hm = hashringMigrations;
  var nm = naiveringMigrations;
  var labels  = [...nm.keys()];
  var hvalues = labels.map(k => hm.get(k) || 0);
  var nvalues = labels.map(k => nm.get(k) || 0);
  migrationsPlot = migrationsPlot || new Chart(MIGRATIONS_PLOT, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Naive Hash',
        data: nvalues,
        backgroundColor: 'rgba(125, 199, 132, 1)',
        borderColor: 'rgba(25, 99, 132, 1)',
      }, {
        label: 'Consistent Hash',
        data: hvalues,
        backgroundColor: 'rgba(255, 132, 132, 1)',
        borderColor: 'rgba(255, 132, 132, 1)',
      }]
    },
    options: {
      scales: {
        x: {title: {display: true, text: 'Machine'}},
        y: {title: {display: true, text: 'Migration count (to / from)'}, beginAtZero: true},
      }
    }
  });
  migrationsPlot.data.labels = labels;
  migrationsPlot.data.datasets[0].data = nvalues;
  migrationsPlot.data.datasets[1].data = hvalues;
  migrationsPlot.update();
}


/** Get the mouse position on an element. */
function getMousePos(el, ev) {
  var r  = el.getBoundingClientRect();
  var sx = el.width  / r.width;
  var sy = el.height / r.height;
  return {
    x: (ev.clientX - r.left) * sx,
    y: (ev.clientY - r.top)  * sy,
  };
}


/** Load images for simulation. */
function loadImages() {
  var i = images;
  i.isLoaded   = true;
}


/** Load an image. */
function loadImage(url) {
  var img = new Image();
  img.src = url;
  return img;
}


/** Play an audio element. */
function playAudio(el) {
  el.load();
  el.play();
}


/** Process a form number input. */
function formNumber(data, key, fn) {
  var x = parseFloat(data.get(key));
  if (!Number.isNaN(x)) fn(x);
}


/** Get the machine name, without virtual node index. */
function baseMachineName(name) {
  var i = name.indexOf('.');
  return i < 0? name : name.substring(0, i);
}


/** Find begin index of value using binary search. */
function binarySearchBegin(x, v, fc) {
  for (var i=0, I=x.length; i<I;) {
    var m = (i + I) >>> 1;
    var c = fc(x[m], v);
    if (c < 0) i = m + 1;
    else       I = m;
  }
  return i;
}


/** Find end index of value using binary search. */
function binarySearchEnd(x, v, fc) {
  for (var i=0, I=x.length; i<I;) {
    var m = (i + I) >>> 1;
    var c = fc(x[m], v);
    if (c <= 0) i = m + 1;
    else        I = m;
  }
  return i;
}


/** Partition an array, in-place, using a test function. */
function partition(x, ft) {
  for (var i=0, j=0, I=x.length; i<I; ++i) {
    if (!ft(x[i], i, x)) continue;
    var t  = x[i];
    x[i]   = x[j];
    x[j++] = t;
  }
  return j;
}


/** Find the remainder of x/y with +ve sign (euclidean division). */
function mod(x, y) {
  return x - y * Math.floor(x / y);
}


/** Identity function. */
function identity(x) {
  return x;

}


/**
 * cyrb53 (c) 2018 bryc (github.com/bryc)
 * License: Public domain (or MIT if needed). Attribution appreciated.
 * A fast and simple 53-bit string hash function with decent collision resistance.
 * Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
 */
function cyrb53(str, seed=0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

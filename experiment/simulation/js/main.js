// CONSTANTS
// ---------

const SIMULATION        = document.querySelector('#simulation canvas');
const CONTROLS          = document.querySelector('#controls form');
const START_SIMULATION  = document.querySelector('#start-simulation');
const STOP_SIMULATION   = document.querySelector('#stop-simulation');
const PLOT_ITEMS        = document.querySelector('#plot-items');
const PLOT_MIGRATED     = document.querySelector('#plot-migrated');
const START_AUDIO       = document.querySelector('#start-audio');
const STOP_AUDIO        = document.querySelector('#stop-audio');
const PAUSE_AUDIO       = document.querySelector('#pause-audio');
const ADJUST_AUDIO      = document.querySelector('#adjust-audio');
const SYNCHRONIZE_AUDIO = document.querySelector('#synchronize-audio');

const HASHRING_X        = SIMULATION.width / 2;
const HASHRING_Y        = SIMULATION.height / 2;
const HASHRING_RADIUS   = 0.45 * Math.min(SIMULATION.width, SIMULATION.height);
const HASHRING_COLOR    = 'black';
const HASHRING_WIDTH    = 2;
const MACHINE_COLOR     = 'orange';
const MACHINE_WIDTH     = 8;
const ITEM_COLOR        = 'blue';
const ITEM_WIDTH        = 2;
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
  // Machine parameters.
  machineCapacity:   100,
  virtualNodes:      1,
  machineUpdateTime: 10,
  // Item parameters.
  itemAdditions:   1,
  itemRemovals:    0,
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
  constructor(name, hash, speed) {
    this.isAttached = false;
    this.name  = name;
    this.hash  = hash;
    this.type  = ATTACHING;
    this.speed = speed;
    this.state = 0;
    this.items = 0;
  }
}


/** Defines an item in the simulation. */
class Item {
  constructor(name, hash, speed) {
    this.isAttached = false;
    this.name   = name;
    this.hash   = hash;
    this.type   = ATTACHING;
    this.speed  = speed;
    this.state  = 0;
    this.owner  = '';
    this.target = '';
  }
}


/** Defines a consistent hash ring in the simulation. */
class ConsistentHashRing {
  constructor() {
    this.itemMap    = new Map();
    this.machineMap = new Map();
    this.ring       = [];
    this.items      = [];
    this.machines   = [];
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
      ctx.fillRect(u-w, v-w, 2*w, 2*w);
    }
    // Draw the machines.
    for (var m of this.machines) {
      var a = 2 * Math.PI * (m.hash * DIV_INT53);
      var u = x + r * (1.1 - 0.1 * m.state) * Math.cos(a);
      var v = y + r * (1.1 - 0.1 * m.state) * Math.sin(a);
      var w = (2 - m.state) * MACHINE_WIDTH;
      ctx.fillStyle = MACHINE_COLOR;
      ctx.fillRect(u-w, v-w, 2*w, 2*w);
      ctx.fillStyle = 'black';
      ctx.fillText(m.name, u, v);
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

  /** Prepare to detach a machine from the hash ring. */
  removeMachine(name) {
    var m  = this.getMachine(name);
    if (m) m.type = DETACHING;
  }

  /** Prepare to remove n random machines from the hash ring. */
  removeRandomMachines(n) {
    var N = partition(this.machines, o => o.type !== DETACHING);
    var n = Math.min(n, N);
    // Randomly select n machines to remove.
    var undetached = this.machines.slice(0, N);
    undetached.sort(() => Math.random() - 0.5);
    for (var i=0; i<n; ++i) {
      var m  = undetached[i];
      m.type = DETACHING;
    }
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
  }

  /** Get a machine by name. */
  getMachine(name) {
    return this.machineMap.get(name);
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
  }

  /** Detach an item from the hash ring. */
  detachItem(o) {
    if (!o.isAttached) return;
    o.isAttached = false;
    var m = this.getMachine(o.owner);
    o.owner = '';
    m.items -= 1;
  }

  /** Prepare an item to migrate to a machine. */
  migrateItem(o, m) {
    if (o.owner === m.name) return;
    o.target = m.name;
    o.type   = MIGRATING_OUT;
  }

  /** Get an item by name. */
  getItem(name) {
    return this.itemMap.get(name);
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
};

/** Consistent hash ring for the simulation. */
var hashring = new ConsistentHashRing();

/** Images for the simulation. */
var images = {
  isLoaded: false,
};




// METHODS
// -------

/** Main function. */
function main() {
  Chart.register(ChartDataLabels);  // Enable chart data labels
  CONTROLS.addEventListener('submit', onControls);
  setTimeout(stopSimulation, 500);  // Let some rendering happen
  requestAnimationFrame(simulationLoop);
  drawButtons();
  drawPlots();
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


function updateSimulation(timestamp) {
  var s = simulation;
  var p = parameters;
  // Update simulation time.
  var dt = 0.001 * p.simulationSpeed * (timestamp - s.timestamp);
  s.timestamp = timestamp;
  s.time     += dt;
  hashring.update(dt);
}


/** Called when "Controls" form is submitted. */
function onControls(e) {
  e.preventDefault();
  return false;
}


/** Called when "Start Simulation" button is clicked. */
function onStartSimulation() {
  adjustParameters();
  var s = simulation;
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
}


/** Called when "Clear Plots" button is clicked. */
function onClearPlots() {
  playAudio(STOP_AUDIO);
  // records = [];
  drawPlots();
}


/** Called when "Add Machine" button is clicked. */
function onAddMachine() {
  var h = hashring;
  var s = simulation;
  var el   = document.querySelector('input[name="add-machine-name"]');
  var name = el.value || 'm' + (++s.lastMachine);
  h.addMachine(name);
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Remove Machine" button is clicked. */
function onRemoveMachine() {
  var h  = hashring;
  var el = document.querySelector('input[name="remove-machine-name"]');
  if (el.value) h.removeMachine(el.value);
  else          h.removeRandomMachines(1);
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Add Items" button is clicked. */
function onAddItems() {
  var h = hashring;
  var p = parameters;
  var s = simulation;
  for (var i=0; i<p.clickAdditions; ++i) {
    var name = 'o' + (++s.lastItem);
    h.addItem(name);
  }
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Remove Items" button is clicked. */
function onRemoveItems() {
  var h = hashring;
  var p = parameters;
  h.removeRandomItems(p.clickRemovals);
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Stop the current simulation. */
function stopSimulation() {
  resetSimulation();
  renderSimulation();
  drawButtons();
}


/** Reset the simulation. */
function resetSimulation() {
  var s = simulation;
  s.isRunning = false;
  s.isPaused  = false;
  s.isResumed = true;
  s.timestamp = 0;
  s.time      = 0;
  // packets = [];
}


/** Adjust parameters based on form input. */
function adjustParameters() {
  var p = parameters;
  var data = new FormData(CONTROLS);
  formNumber(data, 'initial-machines', x => p.initialMachines = x);
  formNumber(data, 'initial-items',    x => p.initialItems = x);
  formNumber(data, 'simulation-speed', x => p.simulationSpeed = x);
  formNumber(data, 'machine-capacity', x => p.machineCapacity = x);
  formNumber(data, 'virtual-nodes',    x => p.virtualNodes = x);
  formNumber(data, 'item-additions',   x => p.itemAdditions = x);
  formNumber(data, 'item-removals',    x => p.itemRemovals = x);
  formNumber(data, 'click-additions',  x => p.clickAdditions = x);
  formNumber(data, 'click-removals',   x => p.clickRemovals = x);
}


/** Update the paramter values in the form. */
function drawParameters() {
  var p = parameters;
  CONTROLS.querySelector('input[name="initial-machines"]').value = p.initialMachines;
  CONTROLS.querySelector('input[name="initial-items"]').value    = p.initialItems;
  CONTROLS.querySelector('input[name="simulation-speed"]').value = p.simulationSpeed;
  CONTROLS.querySelector('input[name="machine-capacity"]').value = p.machineCapacity;
  CONTROLS.querySelector('input[name="virtual-nodes"]').value    = p.virtualNodes;
  CONTROLS.querySelector('input[name="item-additions"]').value   = p.itemAdditions;
  CONTROLS.querySelector('input[name="item-removals"]').value    = p.itemRemovals;
  CONTROLS.querySelector('input[name="click-additions"]').value  = p.clickAdditions;
  CONTROLS.querySelector('input[name="click-removals"]').value   = p.clickRemovals;
}


/** Render the simulation. */
function renderSimulation() {
  var i = images;
  var h = hashring;
  if (!i.isLoaded) loadImages();
  var ctx  = SIMULATION.getContext('2d');
  ctx.font = '13px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  drawBackground(ctx);
  hashring.draw(ctx, HASHRING_X, HASHRING_Y, HASHRING_RADIUS);
  ctx.fillStyle = 'black';
  ctx.fillText('Consistent Hash Ring', HASHRING_X, 0.4 * HASHRING_Y);
  ctx.fillText('Machines: ' + h.attachedMachineCount(), HASHRING_X, 0.5 * HASHRING_Y);
  ctx.fillText('Items: '    + h.attachedItemCount(),    HASHRING_X, 0.6 * HASHRING_Y);
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

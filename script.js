alertify.defaults.transition = 'zoom';

// Monkey paths
Array.prototype.replace = function replace(source){
  this.splice.apply(this,[0,this.length].concat(source))
}

// Graph logic

function Graph(_directed){
  thisdirected = !!_directed;
  this.edgeList = [];
}

Graph.prototype.addNode = function(){
  this.edgeList.push([]);
  return this.edgeList.length-1;
}

Graph.prototype.addEdge = function(from, to) {
  this.edgeList[from].push(to);
  if(!this.directed && to != from){
    this.edgeList[to].push(from);
  }
}

Graph.prototype.getNeighbors = function(node){
  return this.edgeList[node];
}

Graph.prototype.reset = function(){
  this.edgeList = [];
}

// Initialization

var Config = {
  autozoom: false,
  frequencies: [1,2,5,10,20,50,100,200,500]
};

var svg = d3.select("body").append("svg")
.attr("width", window.innerWidth)
.attr("height", window.innerHeight);

// Zoom Behaviour

var zoom = d3.behavior.zoom().on('zoom',zoomed);
svg.call(zoom);

function autozoom(){
  if(nodes.length == 0) return;
  var centroid = nodes.reduce(function(a,b){return {x: a.x+b.x, y: a.y+b.y};},{x: 0, y: 0});
  var scene = nodes.reduce(function(acc,node){
    return {
      minX: acc.minX < node.x ? acc.minX : node.x,
      minY: acc.minY < node.y ? acc.minY : node.y,
      maxX: acc.maxX > node.x ? acc.maxX : node.x,
      maxY: acc.maxY > node.y ? acc.maxY : node.y
    };
  },{ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
  centroid.x /= nodes.length;
  centroid.y /= nodes.length;

  var svgSize = { width: svg.attr('width'), height: svg.attr('height') };
  var newSize = { width: scene.maxX - scene.minX, height: scene.maxY - scene.minY };
  var newScale = svgSize.width/svgSize.height > newSize.width/newSize.height ? svgSize.height/newSize.height : svgSize.width/newSize.width;
  newScale /= 1.1; // add a margin
  var oldScale = zoom.scale

  var scale = newScale < zoom.scale() ? newScale : zoom.scale();

  var translation = [(centroid.x-svgSize.width*scale/2), (centroid.y-svgSize.height*scale/2)]

  zoom.scale(scale);
  zoom.translate(translation);
  zoomed();
}

function zoomed(){
  container.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
  update();
}

// Scene initialization

var graph = new Graph();

var nodes = [],
  links = [];

var force = d3.layout.force()
.nodes(nodes)
.links(links)
.charge(-120)
.linkDistance(50)
.size([+svg.attr("width"), +svg.attr("height")])
.on("tick", tick);

var container = svg.append("g");

var node = container.selectAll(".node"),
  link = container.selectAll(".link");

var drag = force.drag().on("dragstart",function(){ d3.event.sourceEvent.stopPropagation(); });

function update() {
  link = link.data(force.links());
  link.enter().insert("path", ".node").attr("class", "link");
  link.exit().remove();

  node = node.data(force.nodes());
  node.enter().append("circle").attr("class","node").attr("r", 5);
  node.exit().remove();
  node.call(drag);

  force.start();
}

function tick() {
  node.attr("cx", function(d) { return d.x; })
  .attr("cy", function(d) { return d.y; })
  .attr("fill", function(d){ 
    if(d.index == walkerPos){
      return "red";
    }

    if(d.index == 0){
      return "black";
    }

    return "gray";
  })

  link.attr("d", function(d) {
    var moveTo = "M" + [d.source.x, d.source.y].join(" "); 
    if(d.source == d.target){
      var arc = [
        "A10,10",
        "0,1,1", // rotation, large arc and sweep
        [d.target.x+1, d.target.y].join(",")
      ].join(" ");
      return [moveTo, arc].join(" ");
    }
    var lineTo = ["L", d.target.x, d.target.y].join(" ");
    return [moveTo, lineTo].join(" ");
  })
  if(Config.autozoom)
    autozoom();
}

// Graph abstraction to both graph and svg
function addEdge(from, to){
  graph.addEdge(from, to);
  links.push({source: from, target: to});
  nodes[from].degree++;
  nodes[to].degree++;
}

function addNode(from, to){
  var node = graph.addNode();
  nodes.push({degree: 0});
  return node;
}

function reset(){
  graph.reset();
  nodes.replace([]);
  links.replace([]);
  update();
}

// Scheduler with varying frequency
var Scheduler = {
  operations: [],
  paused: true,
  push: function(op){ this.operations.push(op) },
  frequency: 2,
  start: function(){
    this.pause();
    this.resume();
  },
  resume: function(){
    this.paused = false;
    this.cycle();
  },
  cycle: function(){
    this.timeout = window.setTimeout(this.cycle.bind(this), 1000/this.frequency);

    if(this.operations.length > 0)
      this.operations.shift()();
  },
  pause: function(){
    this.paused = true;
    window.clearTimeout(this.timeout);
  },
  stop: function(){
    this.pause();
    this.operations = [];
  }
}

// Model implementation
var walkerPos;

function step(){
  var neighbors = graph.getNeighbors(walkerPos);
  walkerPos = neighbors[Math.floor(Math.random()*neighbors.length)];
  update();
}

function cycle(howManyStepsFn){
  return function(){
    for (var i = 0; i < howManyStepsFn(); i++) Scheduler.push(step);
    Scheduler.push(function(){
      addEdge(walkerPos,addNode());
      update();
    });
    Scheduler.push(cycle(howManyStepsFn));
  }
}

function run(howManyStepsFn){
  console.log("Starting");
  Scheduler.stop();

  reset();
  walkerPos = 0;
  addNode();
  addEdge(0,0); // Add the self loop
  update();

  Scheduler.push(cycle(howManyStepsFn));
  Scheduler.start();
}

// Factory for returning how many steps each time, deterministically or stochastically
function pSteps(p){
  return function(){
    if(Math.random() > p) {
      return 2;
    }
    return 1;
  }
}

function sSteps(s){
  return function(){ return s };
}

// User Interface 

var instructions = document.getElementById("instructions");
var instructionTimeout;
function hideInstructions(){
  instructions.style.opacity = '0';
  window.clearTimeout(instructionTimeout);
  instructionTimeout = window.setTimeout(function(){
    instructions.style.display = 'none'
  },250);
}

function showInstructions(){
  window.clearTimeout(instructionTimeout);
  instructions.style.display = 'block'
  instructions.style.opacity = '0';
  window.setTimeout(function(){
    instructions.style.opacity = '1';
  },10);
};

function toggleInstructions(){
  if(instructions.style.opacity == '0'){
    showInstructions()
  } else {
    hideInstructions();
  }
}

function onKeyPress(e){
  switch(e.keyCode){
    case 97: // a
      Config.autozoom = !Config.autozoom;
      alertify.notify('Autozoom is now set to ' + Config.autozoom);
      break;
    case 115: // s
      alertify.prompt("Start a stochastic session with p=", "", function(evt, p){
        p = parseFloat(p);

        if(isNaN(p)) return alertify.error("Invalid p value");

        hideInstructions();
        run(pSteps(p));
      });
      break;
    case 100: // d
      alertify.prompt("Start a deterministic session with s=", "", function(evt, s){
        s = parseInt(s);

        if(isNaN(s)) return alertify.error("Invalid s value");

        hideInstructions();
        run(sSteps(s));
      });
      break;
    case 112: // p
      if (Scheduler.paused) {
        alertify.success('Resumed');
        Scheduler.resume();
      } else {
        alertify.notify('Paused');
        Scheduler.pause();
      }
      break;
    case 122: // z
      autozoom();
      break;
    case 63: // ?
      toggleInstructions();
      break;
  }
}

function onKeyDown(e){
  switch(e.keyCode){
    case 37: // left
      var nextFreq = Config.frequencies.concat([]).reverse().find(function(freq){ return freq < Scheduler.frequency; });
      if(nextFreq){
        Scheduler.frequency = nextFreq;
        alertify.notify("Frequency is now set at "+nextFreq);
      }
      break;
    case 39: // Right
      var nextFreq = Config.frequencies.find(function(freq){ return freq > Scheduler.frequency; });
      if(nextFreq){
        Scheduler.frequency = nextFreq;
        alertify.notify("Frequency is now set at "+nextFreq);
      }
      break;
  }
}

document.addEventListener("keypress",onKeyPress);
document.addEventListener("keydown",onKeyDown);

// Additional events

window.onresize = updateDimensions;

function updateDimensions(){
  var width = window.innerWidth,
    height = window.innerHeight;

  svg.attr("width", width).attr("height", height);
  force.size([width, height]);
  force.start();
}

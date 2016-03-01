var svg = d3.select("body").append("svg")
.attr("width", window.innerWidth)
.attr("height", window.innerHeight);

Array.prototype.replace = function replace(source){
  this.splice.apply(this,[0,this.length].concat(source))
}

var color = d3.scale.category10();

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


var node = svg.selectAll(".node"),
  link = svg.selectAll(".link");

function update() {
  link = link.data(force.links());
  link.enter().insert("path", ".node").attr("class", "link");
  link.exit().remove();

  node = node.data(force.nodes());
  node.enter().append("circle").attr("class","node").attr("r", 5);
  node.exit().remove();
  node.call(force.drag);

  /*node.filter(function(d){ return d.index == 0; }).append("path")
    .attr("d",function(d){
    return "M " + dx + " " + dy + " A 3 3 0 0 1 0 1";
    })*/

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
}

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

var operations = [];
var interval;
var period = 500;
var walkerPos;

function step(){
  var neighbors = graph.getNeighbors(walkerPos);
  walkerPos = neighbors[Math.floor(Math.random()*neighbors.length)];
  update();
}

function cycle(howManyStepsFn){
  return function(){
    for (var i = 0; i < howManyStepsFn(); i++) operations.push(step);
    operations.push(function(){
      addEdge(walkerPos,addNode());
      update();
    });
    operations.push(cycle(howManyStepsFn));
  }
}

function run(howManyStepsFn){
  stop();
  reset();
  walkerPos = 0;
  operations = [cycle(howManyStepsFn)];
  addNode();
  addEdge(0,0); // Add the self loop
  update();

  interval = window.setInterval(function(){
    if(operations.length > 0)
      operations.shift()();
  }, period);
}

function stop(){
  window.clearInterval(interval);
}


function updateDimensions(){
  var width = window.innerWidth,
    height = window.innerHeight;

  svg.attr("width", width).attr("height", height);
  force.size([width, height]);
  force.start();
}

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

window.onresize = updateDimensions;

var pauseBtn = document.getElementById("pause-btn");

var showFormBtn = document.getElementById("show-form-btn");
showFormBtn.onclick = function(e){
  e.preventDefault();
  generatorForm.style.display = window.getComputedStyle(generatorForm).display == "none" ? "block" : "none";
}
var generatorForm = document.getElementById("generator-form");
generatorForm.onsubmit = function(e){
  e.preventDefault();
  var step_type = e.target.elements.step_type.value;
  var step_value = e.target.elements.step_value.value;

  var val = parseFloat(step_value);
  if(isNaN(val)){
    alert("Invalid value");
    return;
  }

  if(step_type == "deterministic"){
    run(sSteps(Math.floor(val)));
  } else {
    run(pSteps(val));
  }

  e.target.elements.step_value.value = val;
  generatorForm.style.display = "none";
  pauseBtn.style.display = "block";
}

pauseBtn.onclick = function(e){
  e.preventDefault();
  stop();
  pauseBtn.style.display = "none";
}

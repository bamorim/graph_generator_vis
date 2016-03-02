var page = require('webpage').create();
page.viewportSize = { width: 1024, height: 768 };

var system = require('system');
var args = system.args;

page.open(
  args[1],
  function(){
    setInterval(function(){
      page.render('/dev/stdout', { format: 'png' });
    },30); // 1000/30 == 33.3, using 30 for little faster replay
  }
);

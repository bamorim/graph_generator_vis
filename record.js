var page = require('webpage').create();
page.viewportSize = { width: 1024, height: 768 };

page.open(
  'http://www.land.ufrj.br/~bamorim/generator/#s=2&speed_0=2&speed_10=50&speed_100=200',
  function(){
    setInterval(function(){
      page.render('/dev/stdout', { format: 'png' });
    },25);
  }
);

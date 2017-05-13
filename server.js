const http = require('http');
const DEBUG = false;
const server = http.createServer((req, res) => {
  initExitTimer();
  let body;
  req.setEncoding('utf8');
  req.on('data', (data) => body += data);
  req.on('end', () => {
    console.log(`Responding to: ${req.socket.remoteAddress}`);
    if (DEBUG) {
      console.log(JSON.stringify(req.headers));
      console.log('REQUEST BODY ----');
      console.log(body);
      console.log('END REQUEST BODY ----');
    }
    res.writeHead(200, {'Content-Type':'text/plain'});
    res.end('Thanks!');
  });
})
.on('error', (err) => 
  console.log(
    `Error: ${err.message} Code: ${err.code}`)
)
.listen(3000, '127.0.0.1', () => console.log('Listening'));

initExitTimer();

function initExitTimer(sec = 5) {
  if (global.exitTimer) 
    clearTimeout(global.exitTimer);
  global.exitTimer = setTimeout(() => {
    console.log(`No requests for ${sec} seconds; exiting.`);
    process.exit(0)
  }, sec * 1000);
}


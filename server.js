const http = require('http');
const server = http.createServer((req, res) => {
  req.setEncoding('utf8');
  req.on('data', (data) => {});
  req.on('end', () => {
    console.log(`Responding to: ${req.socket.address().address}`);
    res.writeHead(200, {'Content-Type':'text/plain'});
    res.end('Thanks!');
  });
}).listen(3000, '127.0.0.1', () => console.log('Listening'));

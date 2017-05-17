'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const walkitout = require('walkitout');

const DATA_PATH = path.join('.', 'data');
const KEY_PATH = path.join(DATA_PATH, 'keys.txt'); 
const VALUES_PATH = path.join(DATA_PATH, 'values');
vm.runInThisContext(fs.readFileSync(KEY_PATH, 'utf8'));
const POST_HOSTNAME = 'localhost';
const POST_PORT = 3000;
const POST_PATHNAME = '/';

main();

function main() {
  walkitout(VALUES_PATH, (err, filePath, done) => {
      if (err) return done();
      if (!/\.meta$/.test(filePath)) return done();
      postData(filePath, done);
  }, () => console.log('Meta posted!'));
}

function getFilePart(filePath, name) {
  return new Promise((res, rej) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) rej(err);
      let filename = path.basename(filePath);
      let extname = path.extname(filename).substr(1);
      res([
        `Content-Disposition: form-data; name="${name}"; filename="${filename}"`,
        `Content-Type: text/${extname}`,
        '',
        data
      ].join("\r\n"));
    });
  });
}

function getFieldPart(value, name) {
  return new Promise((res, rej) => { 
    res([
      `Content-Disposition: form-data; name="${name}"`,
      '',
      value
    ].join("\r\n"));
  });
}

function getAllParts(metaPath, data) {
  let lines = data.split("\n").map((value) => value.trim());
  return Promise.all(KEYS
    .slice(0)
    .map((keyName, index) => {
      switch (keyName) {
        case 'FILE': {
          let filename = lines[index];
          let filePath = path.join(path.dirname(metaPath), filename);
          return getFilePart(filePath, keyName);
        }
        default: {
          let value = lines[index];
          return getFieldPart(value, keyName);
        }
      }
    }));
}

function getPostReqCfg(postHostname, postPort, postPathname, boundary) {
  return {
    hostname: postHostname,
    port: postPort,
    method: 'POST',
    path: postPathname,
    headers: { 
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }
  };
}

function postData(metaPath, done) { 
  let boundary = 'Metapost' + new String(Math.random() * 123456789).replace(/\./, '');
  fs.readFile(metaPath, 'utf8', (err, data) => 
    getAllParts(metaPath, data)
      .then((parts) => { 
        let body = [
          `--${boundary}\r\n`,
          parts.join(`\r\n--${boundary}\r\n`),
          `\r\n--${boundary}--`
        ].join('');
        let reqCfg = getPostReqCfg(POST_HOSTNAME, POST_PORT, POST_PATHNAME, boundary);
        http.request(reqCfg, (res) => {
          console.log(`Post meta: ${metaPath} -- Status: ${res.statusCode}`);
          res.on('error', (err) => console.log(`Error with ${metaPath}: ${err.message}`));
          done();
        }).end(body);
     }));
}

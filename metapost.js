'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');

const DATA_PATH = path.join('.', 'data');
const KEY_PATH = path.join(DATA_PATH, 'keys.txt'); 
const VALUES_PATH = path.join(DATA_PATH, 'values');
vm.runInThisContext(fs.readFileSync(KEY_PATH, 'utf8'));
const FILE_INDEX = KEYS.indexOf('FILE');

main();

function main() {
  walkPath(VALUES_PATH, (filePath) => {
      if (!/\.meta$/.test(filePath)) return;
      postData(filePath);
  });
}

function getFilePart(boundary, filePath, name) {
  return new Promise((res, rej) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) rej(err);
      let filename = path.basename(filePath);
      let extname = path.extname(filename).substr(1);
      res([boundary,
        `Content-Disposition: form-data; name="${name}"; filename="${filename}"`,
        `Content-Type: text/${extname}`,
        ``,
        data
      ].join("\r\n"));
    });
  });
}

function getFieldPart(boundary, value, name) {
  return new Promise((res, rej) => { 
    res([boundary,
      `Content-Disposition: form-data; name="${name}"`,
      ``,
      value
    ].join("\r\n"));
  });
}

function postData(metaPath) { 
  fs.readFile(metaPath, 'utf8', (err, data) => {
    let boundary = "---ABC";
    let lines = data.split("\n").map((value) => value.trim());
    Promise.all(KEYS.slice(0)
      .map((keyName, index) => {
        switch (keyName) {
          case 'FILE': {
            let filename = lines[index];
            let filePath = path.join(path.dirname(metaPath), filename);
            return getFilePart(boundary, filePath, keyName);
          }
          default: {
            let value = lines[index];
            return getFieldPart(boundary, value, keyName);
          }
        }
      })
    )
    .then((parts) => { 
      let opts = {
        hostname: 'localhost',
        port: 3000,
        method: 'POST',
        path: '/',
        headers: { 'Content-Type': 'multipart/form-data' }
      };
      let req = http.request(opts, (res) => {
        console.log(`Post to: ${metaPath} -- Status: ${res.statusCode}`);
        res.on('error', (err) => console.log(`Error with ${metaPath}: ${err.message}`));
      });
      req.end(parts.join("\r\n"));
    });
  });
}

function walkPath(dirPath, handler) {
  fs.readdir(dirPath, (err, filenames) => {
    if (err) throw err;
    filenames
      .filter((filename) => filename[0] !== '.')
      .map((filename) => path.join(dirPath, filename))
      .forEach((filePath) => handlePath(filePath, handler));
  });
}

function handlePath(filePath, handler) {
  fs.stat(filePath, (err, stat) => {
    if (err) throw err;
    if (stat.isDirectory()) {
      walkPath(filePath, handler);
    } 
    else if (stat.isFile()) {
      setTimeout(() => handler(filePath), 0);
    }
  });
}

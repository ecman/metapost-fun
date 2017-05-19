'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const stream = require('stream');
const wiostream = require('wiostream');

const DATA_PATH = path.join('.', 'data');
const KEY_PATH = path.join(DATA_PATH, 'keys.txt'); 
const VALUES_PATH = path.join(DATA_PATH, 'values');
vm.runInThisContext(fs.readFileSync(KEY_PATH, 'utf8'));
const POST_HOSTNAME = 'localhost';
const POST_PORT = 3000;
const POST_PATHNAME = '/';

function main() {
  wiostream(VALUES_PATH)
    .pipe(new MetaPrep)
    .pipe(new MetaBake)
    .pipe(new MetaDeliver);
}

function MetaPrep() {
  stream.Duplex.call(this, {
    allowHalfOpen: true,
    readableObjectMode: true,
    writableObjectMode: false
  });
}

function MetaBake() {
  stream.Transform.call(this, {
    allowHalfOpen: true,
    readableObjectMode: true,
    writableObjectMode: true
  });
}

function MetaDeliver() {
  stream.Writable.call(this, {
    objectMode: true
  });
}

MetaPrep.prototype = Object.create(stream.Duplex.prototype, {
  constructor: {
    value: MetaPrep
  },
  _write: {
    value: function (path, encoding, callback) {
      var self = this;
      if (!/\.meta/.test(path)) return callback(null);
      fs.readFile(path, function (err, data) {
        if (err) return callback(err);
        self.push({ 
          metaPath: path.toString(),
          metaData: data.toString().split("\n").map((value) => value.trim()) 
        });
        callback(null); 
      });
    }
  },
  _read: {
    value: function (bytes) {
      // already started
    }
  }  
});

MetaBake.prototype = Object.create(stream.Transform.prototype, {
  constructor: {
    value: MetaBake
  },
  _transform: {
    value: function (chunk, encoding, callback) {
      let boundary = 'Metapost' + new String(Math.random() * 123456789).replace(/\./, '');
      getAllParts(chunk.metaPath, chunk.metaData)
      .then((parts) => { 
        let body = [
          `--${boundary}\r\n`,
          parts.join(`\r\n--${boundary}\r\n`),
          `\r\n--${boundary}--`
        ].join('');
        callback(null, { metaPath: chunk.metaPath, boundary: boundary, body: body });
      });
    }
  }
});

MetaDeliver.prototype = Object.create(stream.Writable.prototype, {
  constructor: {
    value: MetaDeliver
  },
  _write: {
    value: function (chunk, encoding, callback) {
      let reqCfg = getPostReqCfg(POST_HOSTNAME, POST_PORT, POST_PATHNAME, chunk.boundary);
      http.request(reqCfg, (res) => {
        console.log(`Post meta: ${chunk.metaPath} -- Status: ${res.statusCode}`);
        res.on('error', (err) => console.log(`Error with ${chunk.metaPath}: ${err.message}`));
        callback(null);
      }).end(chunk.body);
    }
  }
});

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

function getAllParts(metaPath, lines) {
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

main();


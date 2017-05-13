const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DATA_PATH = path.join('.', 'data');
const KEY_PATH = path.join(DATA_PATH, 'keys.txt'); 

// Get the KEYS const
vm.runInThisContext(fs.readFileSync(KEY_PATH, 'utf8'));

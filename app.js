'use strict';
require('dotenv').config();
const express = require('express');
const db = require('./modules/database');
const resize = require('./modules/resize');
const exif = require('./modules/exif');
const bodyParser = require('body-parser');

const multer = require('multer');
const upload = multer({dest: 'public/images/'});

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

// create the connection to database
const connection = db.connect();

const cb = (result, res) => {
  console.log(result);
  res.send(result);
};

app.use(express.static('public'));

app.post('/upload', upload.single('mediafile'), (req, res, next) => {
  next();
});

app.use('/upload', (req, res, next) => {
  resize.doResize(req.file.path, 300,
      './public/thumb/' + req.file.filename + '_thumb', next);
});

app.use('/upload', (req, res, next) => {
  resize.doResize(req.file.path, 640,
      './public/medium/' + req.file.filename + '_medium', next);
});

app.use('/upload', (req, res, next) => {
  exif.getCoordinates(req.file.path).then(coords => {
    req.coordinates = coords;
    next();
  }).catch(() => {
    console.log('No coordinates');
    req.coordinates = {};
    next();
  });
});


// testataan toimiiko tietokanta
db.select(connection, (results) => {
  console.log(results);
});

const selectAll = (req, next) => {
 db.select(connection, (results) => {
    req.custom = results;
    next();
  });
};

// insert to database
app.use('/upload', (req, res, next) => {
  console.log('insert is here');
  const data = [
    req.body.category,
    req.body.title,
    req.body.details,
    req.coordinates,
    req.file.filename + '_thumb',
    req.file.filename + '_medium',
    req.file.filename,
  ];
  db.insert(data, connection, next);
});

app.use('/upload', (req, res) => {
  db.select(connection, cb, res);
});

app.get('/images', (req, res) => {
  db.select(connection, cb, res);
});

app.patch('/images', (req, res) => {
  console.log('body', req.body);
  const update = db.update(req.body, connection);
  console.log('update', update);
  res.send('{"status": "UPDATE OK"}');
});

app.delete('/images/:mID', (req, res) => {
  const mID = [req.params.mID];
  db.del(mID, connection);
  res.send('{"status": "DELETE OK"}')
});

app.listen(3000);
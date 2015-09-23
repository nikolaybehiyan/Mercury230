var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var routes = require('./routes/index');
var users = require('./routes/users');
var http = require('http');
var app = express();
var fs = require('fs');

var serialport =require('serialport');
var SerialPort = serialport.SerialPort;
var async = require('async');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

var sp = new SerialPort('COM4', {
  baudrate: 9600,
  databits: 8,
  stopBits: 1,
  parity: 'none',
  buffersize: 35,
  parser: serialport.parsers.raw

});

var getPasswordReq = function(){
  var buffer  = new Buffer(11);
  buffer.writeUInt8(0x01, 0);
  buffer.writeUInt8(0x01, 1);
  for(var i = 2;i<9;i++){
    buffer.writeUInt8(0x01, i);
  }
  buffer.writeUInt8(0x7A, 9);
  buffer.writeUInt8(0x11, 10);

  return buffer;
  //console.log(buffer.toString('hex'));
}

var totalE = function(){
  var buffer  = new Buffer(6);
  buffer.writeUInt8(0x01, 0);
  buffer.writeUInt8(0x05, 1);
  buffer.writeUInt8(0x00, 2);
  buffer.writeUInt8(0x00, 3);

  buffer.writeUInt8(0x11, 4);
  buffer.writeUInt8(0xD9, 5);

  return buffer;
}
var totalEtoday = function(){
  var buffer  = new Buffer(6);
  buffer.writeUInt8(0x01, 0);
  buffer.writeUInt8(0x05, 1);
  buffer.writeUInt8(0x40, 2);
  buffer.writeUInt8(0x00, 3);

  buffer.writeUInt8(0x20, 4);
  buffer.writeUInt8(0x19, 5);

  return buffer;
}
var totalEyesterday = function(){
  var buffer  = new Buffer(6);
  buffer.writeUInt8(0x01, 0);
  buffer.writeUInt8(0x05, 1);
  buffer.writeUInt8(0x50, 2);
  buffer.writeUInt8(0x00, 3);

  buffer.writeUInt8(0x2D, 4);
  buffer.writeUInt8(0xD9, 5);

  return buffer;
}
var current = function(){
  var buffer  = new Buffer(6);
  buffer.writeUInt8(0x01, 0);
  buffer.writeUInt8(0x08, 1);
  buffer.writeUInt8(0x16, 2);
  buffer.writeUInt8(0x21, 3);

  buffer.writeUInt8(0x4E, 4);
  buffer.writeUInt8(0x62, 5);

  return buffer;
}
var power = function(){
  var buffer  = new Buffer(6);
  buffer.writeUInt8(0x01, 0);
  buffer.writeUInt8(0x08, 1);
  buffer.writeUInt8(0x16, 2);
  buffer.writeUInt8(0x30, 3);

  buffer.writeUInt8(0x8E, 4);
  buffer.writeUInt8(0x6E, 5);

  return buffer;
}
var logout = function(){
  var buffer  = new Buffer(4);
  buffer.writeUInt8(0x01, 0);
  buffer.writeUInt8(0x02, 1);
  buffer.writeUInt8(0x81, 2);
  buffer.writeUInt8(0xE1, 3);


  return buffer;
}


var queue = [
  [getPasswordReq(), 'passwordResponse'],
    [totalE(),'energyResponse'],
    [totalEtoday(),'energyTodayResp'],
    [totalEyesterday(),'energyYestResp'],
    [current(),'currentResponse'],
    [power(),'powerResponse'],
    [logout(),'logoutResp']
]
var finaldata = '';
//setInterval(function(){console.log(queue)},5000);
function Device (serial) {
  this._serial = serial;
  this._queue = queue;
  this._current = null;
  var device = this;
  serial.on('data', function (data) {


      if (!device._current) return;
    sp.flush(function(err,res){
      if(err) console.log(err);
      console.log(res);
    })
      finaldata = finaldata + data.toString('hex');
      console.log(finaldata);
        //console.log(data.toString('hex') + '  ' + JSON.stringify(device._current));
      device.processQueue();


  });
}

Device.prototype.processQueue = function () {
  var next = this._queue.shift();
  //console.log(this.queue);
  var device = this;
  //this._queue.push(next);
  if (!next) {
    console.log('done');
    setTimeout(function(){
      queue = [[getPasswordReq(), 'passwordResponse'],
          [totalE(),'energyResponse'],
          [totalEtoday(),'energyTodayResp'],
          [totalEyesterday(),'energyYestResp'],
          [current(),'currentResponse'],
          [power(),'powerResponse'],
          [logout(),'logoutResp']
          ];
      device._queue = queue;

      //console.log(queue);
      device.processQueue();
     // return;
    },5000)

  }else{
    //console.log(next);
    this._current = next;
    this._serial.write(next[0]);
  }
};



sp.on('open', function(){
  console.log("port succesfully opened");
  var device = new Device(sp);
    device.processQueue();



  //sp.on('data', function(data){
  //  if(data) console.log(data.toString('hex') + '   Data');
  //
  //});
  //setInterval(function(){
  //  async.series([
  //      function(callback){
  //
  //      }
  //
  //  ],function(err){
  //
  //  })
  //
  //},5000);
  //async.series([
  //    function(callback){
  //      sp.write(getPasswordReq(), function(err, result){  //"x00x01x01x01x01x01x01x01x01x77x81"
  //        if(err) console.log(err + 'error');
  //        console.log(JSON.stringify(result) + '  result');
  //        callback();
  //      });
  //
  //    },
  //    function(callback){
  //      setTimeout(function() {
  //        callback();
  //      }, 80);
  //    },
  //    function(callback){
  //      sp.write(totalE(), function(err, result){  //"x00x01x01x01x01x01x01x01x01x77x81"
  //        if(err) console.log(err + 'error');
  //        console.log(JSON.stringify(result) + '  result');
  //        callback();
  //      });
  //
  //   },
  //  function(callback){
  //    setTimeout(function() {
  //      callback();
  //    }, 80);
  //  },
  //  function(callback){
  //    sp.write(totalEtoday(), function(err, result){
  //      if(err) console.log(err + 'error');
  //      console.log(JSON.stringify(result) + '  result');
  //      callback();
  //    });
  //  },
  //  function(callback){
  //    setTimeout(function() {
  //      callback();
  //    }, 80);
  //  },
  //  function(callback){
  //    sp.write(totalEyesterday(), function(err, result){
  //      if(err) console.log(err + 'error');
  //      console.log(JSON.stringify(result) + '  result');
  //      callback();
  //    });
  //  },
  //  function(callback){
  //    setTimeout(function() {
  //      callback();
  //    }, 80);
  //  },
  //  function(callback){
  //    sp.write(current(), function(err, result){
  //      if(err) console.log(err + 'error');
  //      console.log(JSON.stringify(result) + '  result');
  //      callback();
  //    });
  //  },
  //  function(callback){
  //    setTimeout(function() {
  //      callback();
  //    }, 80);
  //  },
  //  function(callback){
  //    sp.write(power(), function(err, result){
  //      if(err) console.log(err + 'error');
  //      console.log(JSON.stringify(result) + '  result');
  //      callback();
  //    });
  //  }
  //
  //],function(err){
  //    if(err) console.log(err)
  //    console.log('done');
  //});





  sp.on('error', function(err, result){
    if(err) console.log(err);
    console.log(result);
  });
  sp.on('close', function(err, result){
    if(err) console.log(err);
    console.log(result);
  });

});

app.listen(8081, function(){
   console.log('listening on port 8081');
});




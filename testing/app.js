var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var http = require('http');
var app = express();
var fs = require('fs');

app.engine('ejs', require('ejs-locals')); //создание шаблонов
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('port', process.env.PORT | 3000);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

require('./routes')(app);
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


var data = [{
    'id': 1,
    'title': 'node1',
    'nodes': [

    ]
}];
fs.readFile('./data/objects.json', function(err,res){
 if(err){
   console.log(err);
    process.exit();
 }
  console.log(res.length);
 if(res.length == 0){
   console.log('File is empty')
   fs.writeFile('./data/objects.json', JSON.stringify(data),'utf8',function(err, ok){
     console.log(err,ok);
   })
 }else{
   console.log('file is not empty')
 }
});

app.listen(app.get('port'), function(){
  console.log('server is listening on port ' + app.get('port'));
})





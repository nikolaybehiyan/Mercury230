var express = require('express');
var router = express.Router();
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
	var exec = require('child_process').exec;
	exec('cd c:\\Users\\admin\\Desktop\\data-integration && Pan.bat /file:"c:\\Users\\admin\\Desktop\\test.ktr" /level: Basic', function(error, stdout, stderr) {
    console.log('stdout: ' + stdout);
	console.log('stderr: ' + stderr);
	fs.readFile( 'c:/Users/admin/Desktop/NODEJS/testing/testing/data/data.js', "utf-8", function (err, data){
		if(err){
			throw err;
			res.end();
		}else{
			res.send(data);
			res.end();
		}
	});
    
    if (error !== null) {
        console.log('exec error: ' + error);
		res.end();
    }
});
  
});

module.exports = router;

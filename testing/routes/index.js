var fs = require('fs');
var IndexRoute = function(app){
	app.get('/', function(req,res){
		res.render('index',{title: 'HELLOE'});
	});
	app.post('/postNewCounter', function(req,res){
		var counter = req.body;
		var objectList = require('../data/objects');

		console.log (JSON.stringify(objectList));
		var objectsList = require('../data/objects');
		console.log(objectsList[0].nodes.length,  JSON.stringify(counter));
		if(objectsList[0].nodes.length == 0){   // check if counters already added
			console.log('aaa')
			try{
				objectList[0].nodes.push(counter);
				fs.writeFile('./data/objects.json', JSON.stringify(objectList), 'utf8', function(err, res){
					console.log(err,res);
					console.log(objectsList[0].nodes.length);
				})
				res.end();
			}catch(e){
				console.log(e);
				res.end();
			}
			return;
		}
		for(var obj in objectsList[0].nodes){
			if(objectsList[0].nodes[obj].title == counter.title){
				console.log('bbb', objectsList[0].nodes[obj].title)

				res.json('Current counter name already exists')
				break;
			}
			if (obj == objectsList[0].nodes.length - 1 && objectsList[0].nodes[obj].title != counter.title){
				try{
					objectList[0].nodes.push(counter);
					console.log('ccc');
					fs.writeFile('./data/objects.json', JSON.stringify(objectList), 'utf8', function(err, res){
						console.log(err,res);
					})
					res.end();
				}catch(e){
					console.log(e);
					res.end();
				}
			}
		}


	});
	app.post('/removeCounter', function(req,res){
		var counter = req.body.id;
		var objectsList = require('../data/objects');
		for(var obj in objectsList[0].nodes){
			if(objectsList[0].nodes[obj].id == counter){
				objectsList[0].nodes.splice(obj, 1);
				console.log(JSON.stringify(objectsList));
				fs.writeFile('./data/objects.json', JSON.stringify(objectsList), 'utf8', function(err, res){
					console.log(err,res);
				})
			}
			break;
		}
		res.end();
	});
	app.get('/getAllCounters', function(req,res){
		res.json(require('../data/objects'));
		//console.log(require('../data/objects'));
		res.end();
	});

}

module.exports = IndexRoute;

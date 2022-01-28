var express = require('express');
var app = express();
var http = require('http').Server(app);
var ejs = require('ejs');
var bodyParser = require('body-parser');
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');
var favicon = require('serve-favicon');

var port = 10003;

app.use(bodyParser.urlencoded({extended : false}));
app.use(favicon(path.join(__dirname, 'favicon.ico')));

function getPlayerColor(){
  return "#" + (Math.floor((Math.random()*222)+33).toString(16))+(Math.floor((Math.random()*222)+33).toString(16))+(Math.floor((Math.random()*222)+33).toString(16));
}

const arrBuffer = fs.readFileSync("arr.json");
const arrJSON = arrBuffer.toString();
const arr = JSON.parse(arrJSON);

var tanks = [];

class Tank{
  constructor(socket){
      this.socket = socket;
      this.x = Math.floor(Math.random() * 1230);
      this.y = Math.floor(Math.random() * 670);   
      this.width = 50;
      this.height = 50;
      this.color = getPlayerColor();
      this.name;
      this.angle = 'up';
  }

  get id() {
    return this.socket.id;
  }
}

function joinGame(socket){
  var tank = new Tank(socket);

  tanks.push(tank);

  return tank;
}

function endGame(id){
  for(var i = 0; i < tanks.length; ++i){
    if(tanks[i].id == id){
      tanks.splice(i,1);
      break;
    }
  }
}

app.get('/',function(req, res){ 
  res.render('index.ejs');
});

app.get('/menu',function(req, res){ 
  res.render('menu.ejs');
});

app.get('/howplaypage',function(req, res){ 
  res.render('howplaypage.ejs');
});

app.get('/ranking',function(req, res){ 
  res.render('ranking.ejs', {_1st : arr[0], _2nd : arr[1], _3rd : arr[2]});
});

app.get('/main',function(req, res){ 
  res.render('main.ejs');
});

app.get('/game', function(req, res){
  res.render('main.ejs');
});

app.post('/game', function(req, res){
  res.render('game.ejs', { myname : req.body.name});
});

app.get('/die', function(req, res){
  res.render('main.ejs');
});

app.post('/die',function(req, res){ 
  for(var i = 0; i < tanks.length; ++i){
    if(tanks[i].id == req.body.killuser){
      var killuser = tanks[i].name;
      break;
    }
  }
  res.render('die.ejs', {killuser : killuser, kill : req.body.kill, time : req.body.time, });
});

app.get('/backgrade', function(req, res){
  fs.readFile('./backgrade.png', function(err, data){
    res.writeHead(200, {'Context-Type':'text/html'});
    res.end(data);
  });
});

app.get('/arrow', function(req, res){
  fs.readFile('./arrow.png', function(err, data){
    res.writeHead(200, {'Context-Type':'text/html'});
    res.end(data);
  });
});

app.get('/wasd', function(req, res){
  fs.readFile('./wasd.jpg', function(err, data){
    res.writeHead(200, {'Context-Type':'text/html'});
    res.end(data);
  });
});

io.on('connection', function(socket){
    console.log(`${socket.id}님이 입장하셨습니다.`);

    var newtank = joinGame(socket);
    socket.emit('user_id', socket.id);

    for (var i = 0 ; i < tanks.length; i++){
      var tank = tanks[i];
      socket.emit('join_user', {
        id: tank.id,
        x: tank.x,
        y: tank.y,
        width: tank.width,
        height: tank.height,
        color: tank.color,
        name: tank.name,
        angle: tank.angle,
      });
      socket.broadcast.emit('join_user',{
        id: socket.id,
        x: newtank.x,
        y: newtank.t,
        width: newtank.width,
        height: newtank.height,
        color: newtank.color,
        name: newtank.name,
        angle: newtank.angle,
      });
    }

    socket.on('change_name_server', function(data){
      for(var i = 0; i < tanks.length; ++i){
        if(tanks[i].id == socket.id){
          tanks[i].name = data;
          break;
        }
      }
      socket.emit('change_name_client', data);
    });

    socket.on('send_location', function(data) {
      socket.broadcast.emit('update_state', {
        id: data.id,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        color: data.color,
        name: data.name,
        angle: data.angle,
      });
    });

    socket.on('bullet_data', function(data){
      socket.emit('update_bullet', data);
      socket.broadcast.emit('update_bullet', data);
    });

    socket.on('finish', function(data){
      console.log(`${socket.id}님이 죽으셨습니다.`);
      socket.broadcast.emit('killuser', data.killuser);

      arr.push(data);
      arr.sort(function(a, b) {
        if(a.kill == b.kill){
          return a.time - b.time;
        }
        else{
          return b.kill - a.kill;
        }
      });
      for(var i = 3; i < arr.length; ++i){
        arr.splice(i,1);
      }
      var datajson = JSON.stringify(arr);
      fs.writeFileSync('arr.json', datajson);
    });
    
    socket.on('disconnect', function(reason){
      console.log(`${socket.id}님이 ${reason}의 이유로 퇴장하셨습니다.`);
      endGame(socket.id);
      socket.broadcast.emit('leave_user', socket.id);
    });
});

http.listen(port, function(){ 
  console.log("listening on *: http://localhost:" + port);
});
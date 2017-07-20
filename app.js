var express = require ('express');
var app = express();
var serv = require('http').Server (app);
var firstAidVisible = true;

app.get ('/',function(reg,res) {
	console.log('index.html');
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
app.use(express.static(__dirname + '/public'));

serv.listen(process.env.PORT || 2001);

var SOCKET_LIST = [];
var MAPRIGHT = 10000;
var MAPBOTTOM = 50000;

function randomLocation (maxRight, maxBottom) {
   var x = Math.random () * maxRight;
   var y = Math.random () * maxBottom;
   location = {};
   location.x = Math.floor(x) + 100;
   location.y = Math.floor(y) + 100;
   return location;
} 

var io = require ('socket.io') (serv,{});

io.sockets.on('connection',function(socket){
   console.log ('connect');
   socket.x                = 100;
   socket.y                = 100;
   socket.id               = SOCKET_LIST.length;
   socket.angle            = 0;
   socket.bulletAngle      = 0;
   socket.firing           = false;
   socket.died             = false;
   socket.level            = 0;
   socket.bulletStopped    = true;
   socket.name             = '';
   socket.message          = '';
   socket.health           = 100;
   socket.speed            = 10;
   SOCKET_LIST [socket.id] = socket;
   console.log('connection request');
   socket.emit('socketId',socket.id);	
   
   socket.on('keyPress', function (data) {
      if (data.inputId === 'left') {
         var speed = SOCKET_LIST[socket.id].speed;
         SOCKET_LIST[socket.id].x = SOCKET_LIST[socket.id].x - speed;
         //console.log ( 'left' );
      }   
      if (data.inputId === 'right') {
         var speed = SOCKET_LIST[socket.id].speed;
         SOCKET_LIST[socket.id].x = SOCKET_LIST[socket.id].x + speed;			
         //console.log ('right');
      }   
      if (data.inputId === 'up') {
         var speed = SOCKET_LIST[socket.id].speed;
         SOCKET_LIST[socket.id].y = SOCKET_LIST[socket.id].y - speed;	
         //console.log ( 'up' );
      }   
      if (data.inputId === 'down') {
         var speed = SOCKET_LIST[socket.id].speed;
         SOCKET_LIST[socket.id].y = SOCKET_LIST[socket.id].y + speed;
         //console.log ( 'down');
      } 
   });
   
   socket.on('name', function (data) {
      SOCKET_LIST[socket.id].name = data.name;
      console.log ( 'Got name: ' + socket.name );
   });
   
   socket.on('angle', function (data) {
      socket.angle = data.angle;	
      SOCKET_LIST[socket.id].angle = data.angle;	  
   });
   
   socket.on('fire', function() {
      SOCKET_LIST[socket.id].firing = true;
      SOCKET_LIST[socket.id].bulletStopped = false;
   });
   
   socket.on('speak', function(data) {
      SOCKET_LIST[socket.id].message = data.message;
      console.log ( 'Got a message: ' + data.message );
   }); 
   
   socket.on('quiet', function() {
      console.log ( 'Clearing message: ' + SOCKET_LIST[socket.id].message);
      SOCKET_LIST[socket.id].message = "";
   });
   
   socket.on('disconnect', function () {
      SOCKET_LIST[socket.id].died = true;
      console.log ( 'Got a disconnect, socket has died' );
   });
   
   socket.on('killbullet', function () {
     console.log ( 'Player[' + socket.id + ']s bullet has hit something' );
     SOCKET_LIST[socket.id].bulletStopped = true;
   });
   
   socket.on ('kill', function (data) {
      console.log ( 'kill: ' + data.id );
      SOCKET_LIST[data.id].emit ( 'die' );
      SOCKET_LIST[data.id].died = true;
   });
     
   socket.on ('heal', function () {
      SOCKET_LIST[socket.id].health = 100;
      firstAidVisible = false;
      setTimeout ( function () { firstAidVisible = true; }, 3000 );
   });
   
   socket.on ('shot', function (data) {    
      console.log ( 'shot: ' + data.id );
      if (SOCKET_LIST[data.id].health > 0) {  // Todo: Error here when data.id is not correct....
          SOCKET_LIST[data.id].health = SOCKET_LIST[data.id].health - 10;
      }
      
      if (SOCKET_LIST[data.id].health == 0) { 
         SOCKET_LIST[data.id].emit ( 'die' );
         SOCKET_LIST[data.id].died = true;
      }   
    
   });
   
   socket.on('tele', function() {
    
      location = randomLocation(2000, 2000); // MAPRIGHT, MAPBOTTOM);
      
      console.log ( 'tele port to: [' + location.x + ',' + location.y + ']');        
      SOCKET_LIST[socket.id].x = location.x;
      SOCKET_LIST[socket.id].y = location.y;
   });   

   socket.on('speedup', function() {
      var speed = SOCKET_LIST[socket.id].speed +10;
      console.log ( 'Speed set to: ' + speed );
      SOCKET_LIST[socket.id].speed = speed;
   });    
   console.log ( "Got a connection!" + SOCKET_LIST.length );
});

setInterval (function(){
   var pack = [];
   for(var i in SOCKET_LIST){        
      var socket = SOCKET_LIST[i];
        
      if (socket.firing){
         console.log('firing'+socket.firing);
      }

      pack.push({
           x             : socket.x,
           y             : socket.y,
           id            : socket.id,
           angle         : socket.angle,
           died          : socket.died,
           firing        : socket.firing,	
           bulletStopped : socket.bulletStopped,
           name          : socket.name,       
           message       : socket.message,
           health        : socket.health,
           level         : socket.level, 
           speed         : socket.speed           
      });
      SOCKET_LIST[i].firing = false;   
    }
    for (var i in SOCKET_LIST){
       var socket = SOCKET_LIST[i];
       socket.emit('newPositions',pack);
       socket.emit('events',{firstAid:firstAidVisible});
    }
},1000/25);

console.log ( 'Ready my dogs' );
		
		
	
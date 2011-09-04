
var express = require('express');
var game = new require('./game');

var server = express.createServer();
var io = require('socket.io').listen(server);

server.use(express.static(__dirname));
server.get('/', function(req, res){
    //res.send('Hello World');
    res.render('index.html');
});
server.listen(process.env.C9_PORT, "0.0.0.0"); // Cloud9
console.log("Server is running, ready for accepting players ^^");

io.sockets.on('connection', function (socket) {
    round = new game.Game();
    var winnerMsg = null;
    
    var hasWinner = function() {
        if (round.isFinished() && round.winner !== undefined) {
            winnerMsg = (round.winner=="X" ? "Player" : "Bot") + " win the Game!";
            return true;
        } else if(round.isFinished()) {
            winnerMsg = "No winner";
            return true;
        }
        return false;
    };
    
    socket.emit('message', { 'message': 'Your turn' });
    socket.on('try', function (data) {
        if(round.winner) {
            socket.emit('message', { 'type':'error', 'message':'What are you trying to do ;-)' });
            return;
        }
        var isValid = round.take(data.pos);
        if(!isValid) {
            socket.emit('message', { 'type':'error', 'message':'Bad move, play somewhere else' });
            return;
        }
        socket.emit('play', { 'message':'Player plays on '+data.pos, 'pos':data.pos, 'icon':round.otherPlayer() });
        if(hasWinner()) {
            socket.emit('message', { 'type':'winner', 'message': winnerMsg });
            return;
        }
        var firstPositionAvailable = round.getFirstPositionAvailable();
        round.take(firstPositionAvailable);
        socket.emit('play', { 'message':'Bot plays on '+firstPositionAvailable, 'pos':firstPositionAvailable, 'icon':round.otherPlayer() });
        if(hasWinner()) {
            socket.emit('message', { 'type':'winner', 'message': winnerMsg });
            return;
        }
    });
});

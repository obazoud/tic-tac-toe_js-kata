var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app);
var game = new require('./game');

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
    res.sendfile(__dirname + '/index.html');
});
app.listen(process.env.C9_PORT, "0.0.0.0"); // Cloud9
console.log("Server is running, ready for accepting players ^^");

var players = 0;
var round = new game.Game();

var locked = false;
var start = function() { locked = false; };
var isLocked = function(player) { return locked || round.currentPlayer() != player; };
var lock = function() {  locked = true; };
var unlock = function() { locked = false; };

io.sockets.on('connection', function (socket) {
    players += 1;
    if(players > 2) {
        socket.emit('message', { 'type':'error', 'message':'Too late, try later...' });
        return;
    }
    
    var player = (players == 1 ? "X" : "O");
    socket.set('player', player, function () {
        socket.join('room');
        if('X' == player) {
            socket.emit('message', { 'type':'info', 'message':'Please wait for your opponent...' });
            return;
        } else {
            socket.broadcast.to('room').emit('message', { 'type':'info', 'message': 'It is your turn to play !' });
            socket.emit('message', { 'type':'info', 'message':'Please wait for your opponent to play...' });
            start();
        }
    });
    
    var hasWinner = function(player) {
        if (round.isFinished() && round.winner !== undefined) {
            if(round.winner == player) {
                socket.emit('message', { 'type':'winner', 'message':'You win \\o/' });
                socket.broadcast.to('room').emit('message', { 'type':'winner', 'message': 'You lose :\'(' });
            } else {
                socket.emit('message', { 'type':'winner', 'message':'You lose :\'(' });
                socket.broadcast.to('room').emit('message', { 'type':'winner', 'message': 'You win \\o/' });
            }
            return true;
        } else if(round.isFinished()) {
            io.sockets.in('room').emit('message', { 'type':'winner', 'message': "No winner" });
            return true;
        }
        return false;
    };
    
    socket.on('try', function (data) {
        socket.get('player', function(err, player) {
            if(isLocked(player)) {
                if(round.winner) socket.emit('message', { 'type':'error', 'message':'What are you trying to do ;-)' });
                else socket.emit('message', { 'type':'error', 'message':'Please wait before playing again...' });
                return;
            }
            lock();
            var isValid = round.take(data.pos);
            if(!isValid) {
                socket.emit('message', { 'type':'error', 'message':'Bad move, play somewhere else' });
                unlock();
                return;
            }
            io.sockets.in('room').emit('play', { 'message':player+' plays on '+data.pos, 'pos':data.pos, 'icon':round.otherPlayer() });
            if(hasWinner(player)) {
                return;
            }
            unlock();
        });
    });
});

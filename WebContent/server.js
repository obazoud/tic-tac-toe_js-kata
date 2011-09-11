var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app);
var game = require('./game');
var lock = require('./lock');

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
    res.sendfile(__dirname + '/index.html');
});
app.listen(process.env.C9_PORT, "0.0.0.0"); // Cloud9
console.log("Server is running, ready for accepting players ^^");

var players = 0;
var rounds = {};
var lockers = {};

io.sockets.on('connection', function (socket) {
    players += 1;
    
    var room = "room" + (players%2 == 1 ? players : (players-1));
    var player = (players%2 == 1 ? "X" : "O");
    var info = [room, player];
    
    var round = new game.Game();
    rounds[room] = round;
    var locker = new lock.Locker();
    lockers[room] = locker;
    
    socket.set('info', info, function () {
        socket.join(room);
        if('X' == player) {
            socket.emit('message', { 'type':'info', 'message':'Please wait for your opponent...' });
            return;
        } else {
            socket.broadcast.to(room).emit('message', { 'type':'info', 'message': 'It is your turn to play !' });
            socket.emit('message', { 'type':'info', 'message':'Please wait for your opponent to play...' });
            lockers[room] = locker.unlock();
        }
    });
    
    var hasWinner = function(room, player, round) {
        if (round.isFinished() && round.winner !== undefined) {
            if(round.winner == player) {
                socket.emit('message', { 'type':'winner', 'message':'You win \\o/' });
                socket.broadcast.to(room).emit('message', { 'type':'winner', 'message': 'You lose :\'(' });
            } else {
                socket.emit('message', { 'type':'winner', 'message':'You lose :\'(' });
                socket.broadcast.to(room).emit('message', { 'type':'winner', 'message': 'You win \\o/' });
            }
            return true;
        } else if(round.isFinished()) {
            io.sockets.in(room).emit('message', { 'type':'winner', 'message': "No winner" });
            return true;
        }
        return false;
    };
    
    socket.on('try', function (data) {
        socket.get('info', function(err, info) {
            var room = info[0];
            var player = info[1];
            var round = rounds[room];
            var locker = lockers[room];
            if(locker.isLocked(player, round)) {
                if(round.winner) socket.emit('message', { 'type':'error', 'message':'What are you trying to do ;-)' });
                else socket.emit('message', { 'type':'error', 'message':'Please wait before playing again...' });
                return;
            }
            lockers[room] = locker.lock();
            var isValid = round.take(data.pos);
            if(!isValid) {
                socket.emit('message', { 'type':'error', 'message':'Bad move, play somewhere else' });
                lockers[room] = locker.unlock();
                return;
            }
            io.sockets.in(room).emit('play', { 'message':player+' plays on '+data.pos, 'pos':data.pos, 'icon':round.otherPlayer() });
            if(hasWinner(room, player, round)) {
                return;
            }
            lockers[room] = locker.unlock();
        });
    });
    
    socket.on('disconnect', function () {
        socket.get('info', function(err, info) {
            var room = info[0];
            var locker = lockers[room];
            lockers[room] = locker.lock();
            socket.broadcast.to(room).emit('message', { 'type':'refresh', 'message': 'Your opponent logged out, please refresh to replay' });
        });
    });
});

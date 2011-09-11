
var Locker = function() {
    this.locked = false;
};

Locker.prototype = {
    lock: function() {
        this.locked = true;
        return this;
    },
    unlock: function() {
        this.locked = false;
        return this;
    },
    isLocked: function(player, round) {
        return this.locked || round.currentPlayer() != player;
    }
};

exports.Locker = Locker;

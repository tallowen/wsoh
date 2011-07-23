﻿var
    path = require('path'),
    fs = require('fs'),
    nowjs = require("now"),
    express = require("express"),
    redislib = require("redis"),
    util = require("util"),

    PORT = 8003,
    WEBROOT = path.join(path.dirname(__filename), '/webroot'),
    redis = redislib.createClient();

//Error handler for REDIS
redis.on("error", function (err) {
    console.log("Redis connection error to " + redis.host + ":" + redis.port + " - " + err);
});

//Asyncronous Get Wrapper for redis
var redis_get= function(key,callback){
    redis.GET(key, function(err, res){
        callback(res);
    });
}

//Create express server
var server = express.createServer();
//Define static files
server.use('/static',express.static(WEBROOT));
//Define route for the homepage
server.get('/',function(req, response){
    fs.readFile(WEBROOT+'/index.html', function(err, data){
        response.writeHead(200, {'Content-Type':'text/html'});
        response.write(data);
        response.end();
    });
});
//Define route for a playlist
server.get('/playlist/*',function(req, response){
    fs.readFile(WEBROOT+'/playlist.html', function(err, data){
        response.writeHead(200, {'Content-Type':'text/html'});
        response.write(data);
        response.end();
    });
});
server.listen(8080);

//Setup nowjs
var nowjs = require("now");
var everyone = nowjs.initialize(server);

//#####INTERESTING STUFF STARTS BETLOW#####//

//Playlist objects start with "playlist:"
function set_playlist(ID,playlist){
    redis.SET('playlist:'+ID,playlist);
}

everyone.now.iWantToBeThePlayer = function() {
    util.log("iWantToBeThePlayer");
    var group = nowjs.getGroup(this.now.roomID);
    var clientId = this.user.clientId;
    // Check if the player asking is not already the current player
    if (clientId !== group.now.player) {
        // If there is no current player, the client becomes the player
        if (!group.now.player) {
            this.now.youAreThePlayerNow();
            group.now.player = this.user.clientId;
            util.log("New player: " + playerId);
        }
        // Otherwise ask the current player if he agrees on changing
        else {
            nowjs.getClient(group.now.player, function() {
                this.now.someoneWantsToBeThePlayer(clientId);
            });
        }
    }
}

everyone.now.changeThePlayerTo = function(playerId) {
    util.log("changeThePlayerTo: " + playerId);
    var group = nowjs.getGroup(this.now.roomID);
    nowjs.getClient(playerId, function() {
        this.now.youAreThePlayerNow();
        group.now.player = playerId;
        util.log("New player: " + playerId);
    });
}

// Add a user to a group
function joinGroup(groupId, client) {
    var group = nowjs.getGroup(groupId);
    if (!group.now.player) {
        group.now.player = client.user.clientId;
    }
    group.addUser(client.user.clientId);
    util.log("Client " + client.user.clientId + " was added to group " + groupId);
}

//Server side listener for global distribution

everyone.on('connect', function() {
    joinGroup(this.now.roomID, this);
    redis_get('playlist:'+this.now.roomID,this.now.setup)
});

everyone.on('disconnect', function() {
    var group = nowjs.getGroup(this.now.roomID);
    if (group.now.player == this.user.clientId) {
        group.now.player = null;
    }
});


//Owen
everyone.now.pause = function(){
    nowjs.getGroup(this.now.roomID).now.receivePause()
}

everyone.now.play = function(){
    nowjs.getGroup(this.now.roomID).now.receivePlay()
}

everyone.now.nextSong = function(){
    nowjs.getGroup(this.now.roomID).now.receiveNextSong()
}

everyone.now.previousSong = function(){
    nowjs.getGroup(this.now.roomID).now.receivePreviousSong()
}

everyone.now.updateTime = function(seconds){
    nowjs.getGroup(this.now.roomID).now.receiveUpdateTime(seconds)
}

everyone.now.updatePlaylist = function(data){
    set_playlist(this.now.roomID, data);
    nowjs.getGroup(this.now.roomID).now.receiveUpdatePlaylist(data);
}

everyone.now.updateVolume = function(volume){
    nowjs.getGroup(this.now.roomID).now.receiveUpdateVolume(volume)
}

'use strict'

var _ = require('underscore');
var GameEngine = require('../../shared/game_engine.js');
var EntityFactory = require('../core/entity_factory.js');
var EntityCreator = require('../core/entity_creator.js');
var GameComponent = require('../../shared/core/component.js');
var SnapshotManager = require('../../shared/core/snapshot_manager.js');

function PlayState(game, socket) {
    this.game = game;

    console.log("In PlayState constructor");
    if(this.game) console.log("this.game setted");
    
    this.outSnapshotManager = new SnapshotManager();
    this.snapshot = null;
    this.socket = socket;
    this.selfPlayer = null;
    this.numberOfConnectedPlayers = 1;

    var data = { game:      this.game,
                 socket:    this.socket };

    EntityFactory.init(data);
    EntityCreator.init(data);
};


///
PlayState.prototype = Object.create(Phaser.State.prototype);
PlayState.prototype.constructor = PlayState;

///
//Phaser Methods

//Init is the first function called when starting the State
//Param comes from game.state.start()
PlayState.prototype.init = function(param) {
    console.log(param);
};

PlayState.prototype.preload = function() {
    this.setPhaserPreferences();
};

PlayState.prototype.create = function() {
    
    this.game.world.setBounds(0, 0, 2000, 2000);
    this.assignAssets();
    //this.game.map.setCollisionBetween(1, 100000, true, 'islandsLayer');
    this.createTexts();
    this.createInitialEntities(); 
    this.assignNetworkCallbacks();
    
    // setInterval(this.debugUpdate.bind(this), 1000);
    this.socket.emit('player.ready');
};

//update loop - runs at 60fps
PlayState.prototype.update = function() {
    this.applySyncFromServer();
    GameEngine.getInstance().gameStep();
};

PlayState.prototype.render = function() {
    this.updateTexts();
};

//////////////////////////////////////
// Functions in alphabetical order: //
//////////////////////////////////////
PlayState.prototype.applySyncFromServer = function() {
    // console.log("Starting applySyncFromServer");
    var lastSnapshot = this.outSnapshotManager.getLast();
    // console.log(lastSnapshot);
    if (lastSnapshot) {
        this.outSnapshotManager.clear();
        // console.log("snapshot true");
        for (var key in lastSnapshot.players) {
            // console.log("for var key in snapshot", key);
            if (!GameEngine.getInstance().entities[key]) {
                // console.log("creating remote player");
                EntityFactory.createRemotePlayer({ id: key });
            }
            GameEngine.getInstance().entities[key].sync(lastSnapshot.players[key]);
        }
        for (var key in lastSnapshot.bullets) {
            if (!GameEngine.getInstance().entities[key]) {
                EntityCreator.createRemoteBullet(lastSnapshot.bullets[key]);
            }
            else {
                GameEngine.getInstance().entities[key].sync(lastSnapshot.bullets[key]);
            }
        }
    }
}

PlayState.prototype.assignAssets = function() {  
    this.game.map = this.game.add.tilemap('backgroundmap');
    this.game.map.addTilesetImage('watertile', 'gameTiles');
    this.game.backgroundlayer = this.game.map.createLayer('backgroundLayer');
    this.game.blockedLayer = this.game.map.createLayer('islandLayer');
}

PlayState.prototype.assignNetworkCallbacks = function() {    
    this.socket.on('game.sync', this.onGameSync.bind(this));
    this.socket.on('player.create', this.onPlayerCreate.bind(this));
}

PlayState.prototype.createInitialEntities = function() {
    // Create turrets, bases, creeps...
    EntityFactory.createStronghold(0);
    EntityFactory.createStronghold(1);
}

PlayState.prototype.createTexts = function() {
    // Creating debug text
    this.text = this.game.add.text(0, 0, "0 Players Connected", {
        font: "20px Arial",
        fill: "#ff0044",
        align: "center"
    });
    this.text.fixedToCamera = true;
    this.text.cameraOffset.setTo(310,100);

    this.fpsText = this.game.add.text(0, 0, "FPS: 0", {
        font: "12px Arial",
        fill: "#000000",
        align: "center"
    });
    this.fpsText.fixedToCamera = true;
    this.fpsText.cameraOffset.setTo(750,10);
}

PlayState.prototype.debugUpdate = function() {    
    /////////////////// NOOOOO!!! FIND A WAY TO REMOVE THIS IF, PLEASE!!!
    if (this.selfPlayer) {
        console.log("");
        console.log("STARTING applySyncFromServer");
        this.applySyncFromServer();;
        console.log("ENDING applySyncFromServer");
        console.log("STARTING gameStep");
        GameEngine.getInstance().gameStep();
        console.log("ENDING gameStep");
        console.log("STARTING emit");
        console.log("ENDING emit");
    }
};

PlayState.prototype.onGameSync = function(snapshot) {
    this.outSnapshotManager.add(snapshot);
}

PlayState.prototype.onPlayerCreate = function(data) {    
    console.log("Creating a new player!");
    this.selfPlayer = EntityFactory.createLocalPlayer({ id: data.id });
    // MPTemp
    this.temp = EntityFactory.createTemp();
    this.temp.setFather(this.selfPlayer, 0, 0, 45);
    this.game.camera.follow(this.selfPlayer.components.get("sprite").sprite);
}

PlayState.prototype.setPhaserPreferences = function() {    
    // this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    // this.game.scale.pageAlignHorizontally = true;
    // this.game.scale.pageAlignVertically = false;
    // this.game.scale.setMinMax(1024/2, 672/2, 1024*2, 672*2);

    // Enable phaser to run its steps even on an unfocused window
    this.game.stage.disableVisibilityChange = true;

    // Enable FPS of game shown on the screen
    this.game.time.advancedTiming = true;
}

PlayState.prototype.updateTexts = function() {
    // Debugging purposes
    this.game.debug.cameraInfo(this.game.camera, 32, 32);
    this.fpsText.setText("FPS: " + this.game.time.fps);
}

module.exports = PlayState;
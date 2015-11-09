
let THREE = require('three');
let Physijs = require('../lib/physi');
let buzz = require('../lib/buzz');
let SPE = require('../lib/shader-particle-engine');
let kt = require('kutility');
let TWEEN = require('tween.js');
let $ = require('jquery');

var SheenMesh = require('../sheen-mesh');
var geometryUtil = require('../geometry-util');
var parametricGeometries = require('../parametric-geometries');
import {GalleryLayout} from './gallery-layout.es6';
import {ScoreKeeper} from '../scorekeeper.es6';

export class RainRoom extends GalleryLayout {

  constructor(options) {
    super(options);

    this.domMode = options.domMode || false;

    // size config
    this.roomLength = options.roomLength || 300;
    this.wallHeight = options.wallHeight || 666;
    this.emittersPerWall = options.emittersPerWall || 12;
    this.spacePerEmitter = this.roomLength / this.emittersPerWall;

    // rain particle config
    this.initialRainParticleY = options.initialRaindropParticleY || 300;
    this.maxParticlesPerEmitter = options.maxParticlesPerEmitter || 1000;
    this.initialParticlesPerEmitter = options.initialParticlesPerEmitter || 250;
    this.timeToReachMaxParticleTarget = options.timeToReachMaxParticleTarget || 600 * 1000; // 10 minutes
    this.rainParticleSize = options.rainParticleSize || 1;
    this.initialRainParticleSizeDelay = options.initialRainParticleSizeDelay || 45 * 1000;
    this.rainParticleSizeIncrement = options.rainParticleSizeIncrement || 0.05;
    this.rainParticleSizeInterval = options.rainParticleSizeInterval || 4000;
    this.maxParticleSize = options.maxParticleSize || 6;
    this.initialParticleSpread = options.maxParticleSize || 6;
    this.maxParticleSpread = options.maxParticleSize || 20;
    this.rainParticleSpreadIncrement = options.maxParticleSize || 1;
    this.rainParticleSpreadInterval = options.rainParticleSizeInterval || 15000;

    // raindrop mesh config
    this.initialRaindropY = options.initialRaindropY || this.wallHeight - 5;
    this.initialRaindropTime = options.initialRaindropTime || 3000;
    this.removeRaindropTime = options.removeRaindropTime || 60000 * 7; // 7 minutes
    this.timeBetweenRaindrops = options.timeBetweenRaindrops || 3000;
    this.raindropTimeDecayRate = options.raindropTimeDecayRate || 0.96;
    this.timeBetweenRaindropsDecrement = options.timeBetweenRaindropsDecrement || 30; // number of ms to deceremnt time between raindrops on every rain fall
    this.raindropSizeVariance = options.raindropSizeVariance || 1;
    this.raindropSizeVarianceGrowthRate = options.raindropSizeVarianceGrowthRate || 1.005;
    this.raindropSizeVarianceIncrement = options.raindropSizeVarianceIncrement || 0.035; // number of "space units" to increment raindrop size variance each time raindrop is createed
    this.raindropMaxRadius = options.raindropMaxRadius || 15;
    this.minimumTimeBetweenRaindrops = options.minimumTimeBetweenRaindrops || 200;
    this.useAcceleration = options.useAcceleration || true;
    this.numActiveMeshes = options.numActiveMeshes || 500;

    // ghost / trash / alternative media config
    this.timeToAddAlternativeMedia = options.timeToAddAlternativeMedia || 180 * 1000;
    this.ghostSizeVariance = options.ghostSizeVariance || 20;
    this.ghostSizeVarianceGrowthRate = options.ghostSizeVarianceGrowthRate || 1.004;
    this.ghostSizeVarianceIncrement = options.ghostSizeVarianceIncrement || 0.05; // number of "space units" to increment ghost size variance each time ghost is created
    this.maxGhostLength = options.maxGhostLength || 36;

    // constriction config
    this.groundBeginToRiseDelay = options.groundBeginToRiseDelay || this.removeRaindropTime + 60000; // 1 minute after drops are removed
    this.maxGroundY = options.maxGroundY || this.wallHeight - 125;
    this.groundAscensionTime = options.groundAscensionTime || 60000 * 3; // 6 minutes

    // wall update config
    this.timeBetweenWallUpdates = options.timeBetweenWallUpdates || 2000;
    this.delayForRapidTimeBetweenWallUpdates = options.delayForRapidTimeBetweenWallUpdates || this.groundBeginToRiseDelay + this.groundAscensionTime - 60000;
    this.minimumTimeBetweenWallUpdates = options.minimumTimeBetweenWallUpdates || 10;
    this.wallMediaIndex = 0;

    // particle texture config
    this.delayForImagesAsRainParticles = options.delayForImagesAsRainParticles || this.removeRaindropTime;
    this.timeBetweenRainParticleImages = options.timeBetweenRainParticleImages || 45000;
    this.minimumTimeBetweenRainParticleUpdates = options.minimumTimeBetweenRainParticleUpdates || 10000;

    // jump config
    this.jumpLevels = options.jumpLevels || [{delay: 300000, boost: 150}, {delay: 800000, boost: 200}, {delay: 1000000, boost: 250}];

    // non-configurable state properties
    this.hasStarted = false;
    this.emitters = [];
    this.canAddAlternativeMedia = false;
    this.nextWallToUpdateIndex = 0;
    this.scorekeeper = new ScoreKeeper();
    this.rainCollisionSet = {};
    this.activeMeshes = [];

    if (!this.domMode) {
      var groundTexture = THREE.ImageUtils.loadTexture('/media/lino007b.jpg');
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(20, 20);
      var groundMaterial = new THREE.MeshPhongMaterial({
        bumpMap: skindisp,
        bumpScale: 0.7,
        map: groundTexture,
        color: 0x101010,
        side: THREE.DoubleSide
      });
      this.ground = createPlane(this.roomLength, this.yLevel, groundMaterial, (otherObject) => {
        // only add score if this is the first time object hits ground
        if (otherObject._media && !this.rainCollisionSet[otherObject._media.id]) {
          this.scorekeeper.addScore(1);
          this.rainCollisionSet[otherObject._media.id] = true;
        }
      });
      this.ground.addTo(this.container);

      var ceilingTexture = THREE.ImageUtils.loadTexture('/media/ceiling.jpg');
      var ceilingMaterial = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        map: ceilingTexture
      });
      this.ceiling = createPlane(this.roomLength, this.yLevel + this.wallHeight, ceilingMaterial);
      this.ceiling.addTo(this.container);

      this.walls = [
        createWall({direction: 'back', roomLength: this.roomLength, wallHeight: this.wallHeight}),
        createWall({direction: 'left', roomLength: this.roomLength, wallHeight: this.wallHeight}),
        createWall({direction: 'right', roomLength: this.roomLength, wallHeight: this.wallHeight}),
        createWall({direction: 'front', roomLength: this.roomLength, wallHeight: this.wallHeight})
      ];
      this.walls.forEach((wall) => {
        wall.addTo(this.container);
      });
      this.updateCurrentWall();
      this.updateCurrentWall();
      this.updateCurrentWall();
      this.updateCurrentWall();

      // rain particles...
      this.setupRainParticleSystem();

      // let the control object always be 10 units above ground
      this.ground.mesh.add(this.controlObject);
      this.controlObject.position.y = 10;
    }
    else {
      this.domImages = [];
    }
  }

  toggleVoiceover() {
    console.log('toggle the voiceover...');
  }

  start() {
    this.hasStarted = true;

    // set up the layout waterfall
    setTimeout(() => {
      this.nextMediaToAddIndex = 0;
      this.layoutNextMedia();
    }, this.initialRaindropTime);

    if (!this.domMode) {
      // set up trash delay
      setTimeout(() => {
        this.canAddAlternativeMedia = true;
      }, this.timeToAddAlternativeMedia);

      // set up jump level delays
      this.jumpLevels.forEach((jumpLevel) => {
        setTimeout(() => {
          this.controls.jumpVelocityBoost = jumpLevel.boost;
        }, jumpLevel.delay);
      });

      // set up rain particle size interval
      setTimeout(() => {
        this.particleSizeInterval = setInterval(()=> {
          if (this.rainParticleSize < this.maxParticleSize) {
            this.rainParticleSize = this.rainParticleSize + this.rainParticleSizeIncrement;
            this.updateParticleSize(this.rainParticleSize);
            console.log('current rain size ' + this.rainParticleSize);
          }
          else {
            clearInterval(this.particleSizeInterval);
          }
        }, this.rainParticleSizeInterval);
      }, this.initialRainParticleSizeDelay);

      // set up number of particles per emitter interval
      var particleGrowthStartTime = new Date();
      this.particleGrowthInterval = setInterval(() => {
        var timeElapsed = (new Date() - particleGrowthStartTime);
        var percentageOfMaxTimeElapsed = timeElapsed / this.timeToReachMaxParticleTarget;
        var totalParticlesToGrow = this.maxParticlesPerEmitter - this.initialParticlesPerEmitter;
        var currentNumberOfParticles = this.initialParticlesPerEmitter + Math.round(percentageOfMaxTimeElapsed * totalParticlesToGrow);
        console.log('number of particles per emitter: ' + currentNumberOfParticles);
        this.updateParticlesPerEmitter(Math.min(this.maxParticlesPerEmitter, currentNumberOfParticles));

        if (currentNumberOfParticles >= this.maxParticlesPerEmitter) {
          clearInterval(this.particleGrowthInterval);
        }
      }, 2000); // update every 2 seconds

      // set up ground ascension
      setTimeout(() => {
        console.log('the ground begins to rise..');
        var groundPosition = {y: this.ground.mesh.position.y};
        var ascensionTarget = {y: this.maxGroundY};
        var tween = new TWEEN.Tween(groundPosition).to(ascensionTarget, this.groundAscensionTime);
        tween.easing(TWEEN.Easing.Cubic.InOut);
        tween.onUpdate(() => {
          this.ground.mesh.position.y = groundPosition.y;
          this.ground.mesh.__dirtyPosition = true;
        });
        tween.onComplete(() => {
          console.log('you, are, at, the, top......');
        });
        tween.start();
      }, this.groundBeginToRiseDelay);

      // set up the wall waterfall
      var updateWall = () => {
        this.updateCurrentWall();

        if (this.flashingWallsRapidly) {
          this.timeBetweenWallUpdates = Math.max(this.minimumTimeBetweenWallUpdates, this.timeBetweenWallUpdates - 10);
          console.log('time between wall updates: ' + this.timeBetweenWallUpdates);
        }

        setTimeout(updateWall, this.timeBetweenWallUpdates);
      };
      updateWall();

      // eventually the wall flashes faster
      setTimeout(() => {
        this.flashingWallsRapidly = true;
      }, this.delayForRapidTimeBetweenWallUpdates);

      // rain becomes images
      setTimeout(() => {
        var updateRainParticles = () => {
          if (this.wallMediaIndex >= this.media.length) {
            this.wallMediaIndex = 0;
          }
          var media = this.media[this.wallMediaIndex];
          this.rainParticleGroup.uniforms.texture.value = this.createTexture(media);

          this.timeBetweenRainParticleImages = Math.max(this.minimumTimeBetweenRainParticleUpdates, this.timeBetweenRainParticleImages - 2000);
          console.log('time between rain particle updates: ' + this.timeBetweenRainParticleImages);

          setTimeout(updateRainParticles, this.timeBetweenRainParticleImages);
        };
        updateRainParticles();
      }, this.delayForImagesAsRainParticles);
    }

    // remove raindrop meshes
    setTimeout(() => {
      console.log('Removing raindrops... ');
      this.stopCreatingRainMeshes = true;

      var cleanMeshesInterval = setInterval(() => {
        if (this.activeMeshes.length > 0) {
          var deadMesh = this.activeMeshes.shift();
          this.container.remove(deadMesh);
        }
        else {
          clearInterval(cleanMeshesInterval);
        }
      }, 64);
    }, this.removeRaindropTime);

    // image rain spread increases
    setTimeout(() => {
      this.particleSpreadInterval = setInterval(()=> {
        if (this.particleSpread < this.maxParticleSpread) {
          this.particleSpread = this.particleSpread + this.rainParticleSpreadIncrement;
          this.updateParticleSpread(this.particleSpread);
          console.log('current rain spread: ' + this.particleSpread);
        }
        else {
          clearInterval(this.particleSpreadInterval);
        }
      }, this.rainParticleSpreadInterval);
    }, this.delayForImagesAsRainParticles + 90000);
  }

  update(dt){
    super.update();

    if (!this.hasStarted) {
      return;
    }

    if (this.domMode) {
      var cleanImages = [];
      for (var i = 0; i < this.domImages.length; i++) {
        var $img = this.domImages[i];
        $img._vel += 1.75;
        var y = $img._y + $img._vel;
        $img.css('top', y);

        if (y > window.innerHeight) {
          $img.remove();
        }
        else {
          cleanImages.push($img);
        }
      }
      this.domImages = cleanImages;

      return;
    }

    this.rainParticleGroup.tick(dt);

    var nearDistance = (this.spacePerEmitter/1.5) * (this.spacePerEmitter/1.5);

    for (var i = 0; i < this.emitters.length; i++) {
      var iEmitters = this.emitters[i];
      for (var j = 0; j < iEmitters.length; j++) {
        var emitter = iEmitters[j];
        var controlBelowThisEmitter = this.controlObject.position.distanceToSquared(emitter.__position) < nearDistance;
        emitter.opacity.value = controlBelowThisEmitter ? 0.0 : 1.0;
      }
    }
  }

  layoutNextMedia() {
    if (this.stopCreatingRainMeshes) {
      return;
    }

    // layout media
    var media = this.media[this.nextMediaToAddIndex];
    this.layoutMedia(this.nextMediaToAddIndex, media);
    this.nextMediaToAddIndex += 1;

    // set up next media layout
    if (this.useAcceleration){
      this.timeBetweenRaindrops = Math.max(this.minimumTimeBetweenRaindrops, this.timeBetweenRaindrops * this.raindropTimeDecayRate);
    }
    else {
      this.timeBetweenRaindrops = Math.max(this.minimumTimeBetweenRaindrops, this.timeBetweenRaindrops - this.timeBetweenRaindropsDecrement);
    }
    setTimeout(() => {
      this.layoutNextMedia();
    }, this.timeBetweenRaindrops);
  }

  layoutMedia(index, media) {
    if (!media) {
      return;
    }

    if (this.domMode) {
      var $image = $('<img style="display: block; position: absolute; background-color: white; z-index: 1000; box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);"></img>');
      var width = (Math.random() * window.innerWidth * 0.4) + (window.innerWidth * 0.08);
      $image.css('width', width + 'px');
      var left = Math.random() * window.innerWidth * 0.8;
      $image.css('left', left + 'px');
      $image._y = -100;
      $image.css('top', $image._y + 'px');
      $image._vel = (Math.random() * 30) + 1;

      var imageURL = media.type === 'image' ? media.media.url : media.thumbnail.url;
      $image.attr('src', imageURL);

      $('body').append($image);
      this.domImages.push($image);
      return;
    }

    var mesh;
    if (!this.canAddAlternativeMedia || Math.random() < 0.67) { // raindrops 2/3 of the time
      mesh = this.createRaindrop(media);
      mesh.position.set(this.randomPointInRoom(), this.initialRaindropY, this.randomPointInRoom());
    }
    else {
      var creators = [
        () => { return this.createGarbage(media); },
        () => { return this.createBox(media); }
      ];
      mesh = kt.choice(creators)();
      mesh.position.set(this.randomPointInRoom(), this.initialRaindropY / 2, this.randomPointInRoom());
    }

    this.container.add(mesh);

    // #PerfMatters
    this.activeMeshes.push(mesh);
    if (this.activeMeshes.length > this.numActiveMeshes) {
      var deadMesh = this.activeMeshes.shift();
      this.container.remove(deadMesh);
    }
  }

  randomPointInRoom() {
    return (Math.random() - 0.5) * this.roomLength;
  }

  updateCurrentWall() {
    if (this.wallMediaIndex >= this.media.length) {
      this.wallMediaIndex = 0;
    }

    var media = this.media[this.wallMediaIndex];
    this.wallMediaIndex += 1;

    var wall = this.walls[this.nextWallToUpdateIndex];
    if (wall.mesh.material.map) {
      wall.mesh.material.map = this.createTexture(media);
      wall.mesh.material.needsUpdate = true;
    }
    else {
      wall.mesh.material = new THREE.MeshBasicMaterial({
        map: this.createTexture(media),
        bumpMap: skindisp,
        side: THREE.DoubleSide,
      });
      wall.mesh.needsUpdate = true;
    }

    // score keep only if no more rain meshes
    if (this.stopCreatingRainMeshes) {
      this.scorekeeper.addScore(1);
    }

    this.nextWallToUpdateIndex += 1;
    if (this.nextWallToUpdateIndex >= this.walls.length) {
      this.nextWallToUpdateIndex = 0;
    }
  }

  createRaindrop(media) {
    var radius = Math.min(this.raindropMaxRadius, Math.round(Math.random() * this.raindropSizeVariance + 2));

    if (this.useAcceleration){
      this.raindropSizeVariance *= this.raindropSizeVarianceGrowthRate;
    }
    else{
      this.raindropSizeVariance += this.raindropSizeVarianceIncrement;
    }

    var geometry = parametricGeometries.createRaindrop({radius: radius});

    var material = this.createRainMaterial(media);
    material.opacity = Math.random() * 0.25 + 0.7; // opacity between 0.7 and 0.95
    var physicsMaterial = Physijs.createMaterial(material, 0.4, 0.2); // material, "friction", "restitution"

    var mesh = new Physijs.BoxMesh(geometry, physicsMaterial, 20); // geometry, material, "mass"
    mesh.castShadow = true;
    mesh._media = media;

    return mesh;
  }

  createGarbage(media) {
    var length = Math.min(this.maxGhostLength, Math.round(Math.random() * this.ghostSizeVariance + 2));

    if (this.useAcceleration){
    this.ghostSizeVariance *= this.ghostSizeVarianceGrowthRate;
    }
    else{
    this.ghostSizeVariance += this.ghostSizeVarianceIncrement;
    }

    var geometry = parametricGeometries.createCrumpledGarbage({radius: length});

    var material = this.createRainMaterial(media, skindisp);
    material.opacity = Math.random() * 0.2 + 0.4; // opacity between 0.4 and 0.6
    var physicsMaterial = Physijs.createMaterial(material, 0.4, 0.5); // material, "friction", "restitution"

    var mesh = new Physijs.BoxMesh(geometry, physicsMaterial, 20); // geometry, material, "mass"
    mesh.castShadow = true;
    mesh._media = media;

    return mesh;
  }

  createBox(media) {
    var length = Math.min(this.maxGhostLength, Math.round(Math.random() * this.ghostSizeVariance + 2));
    this.ghostSizeVariance *= this.ghostSizeVarianceGrowthRate;

    var geometry = new THREE.BoxGeometry(length, length * 0.75, 0.1);

    var material = this.createRainMaterial(media, skindisp);
    material.opacity = Math.random() * 0.2 + 0.4; // opacity between 0.4 and 0.6
    var physicsMaterial = Physijs.createMaterial(material, 0.4, 0.4); // material, "friction", "restitution"

    var mesh = new Physijs.BoxMesh(geometry, physicsMaterial, 20); // geometry, material, "mass"
    mesh.castShadow = true;
    mesh._media = media;

    return mesh;
  }

  createRainMaterial(media, bumpMap) {
    return new THREE.MeshPhongMaterial({
      map: this.createTexture(media),
      bumpMap: bumpMap ? bumpMap : null,
      side: THREE.DoubleSide,
      shininess: 100,
      transparent: true
    });
  }

  setupRainParticleSystem() {
    this.rainParticleGroup = new SPE.Group({
      texture: {value: THREE.ImageUtils.loadTexture('/media/rain.png')},
      maxParticleCount: 1 + this.maxParticlesPerEmitter * this.emittersPerWall * this.emittersPerWall,
      fog: true
    });

    this.dummyEmitter = new SPE.Emitter({
      maxAge: {value: 0.5},
      position: {value: new THREE.Vector3(0, 0, -10)},
      opacity: {value: 0},
      size: {value: 0.1},
      particleCount: 1
    });
    this.rainParticleGroup.addEmitter(this.dummyEmitter);

    for (var i = 0; i < this.emittersPerWall; i++) {
      var iEmitters = [];
      var x = -this.roomLength/2 + (i * this.spacePerEmitter);

      for (var j = 0; j < this.emittersPerWall; j++) {
        var z = -this.roomLength/2 + (j * this.spacePerEmitter);

        var emitter = new SPE.Emitter({
          maxAge: {value: 8},
          position: {
            value: new THREE.Vector3(x, this.initialRainParticleY, z),
            spread: new THREE.Vector3(this.spacePerEmitter, 0, this.spacePerEmitter)
          },
          acceleration: {
            value: new THREE.Vector3(0, -10, 0),
            spread: new THREE.Vector3(0, 0, 0)
          },
          velocity: {
            value: new THREE.Vector3(0, -10, 0),
            spread: new THREE.Vector3(1, 0, 1)
          },
          wiggle: {spread: 10},
          rotation: {angleSpread: 1},
          color: {value: [new THREE.Color(0x0000ff), new THREE.Color(0xffffff)]},
          size: {value: this.rainParticleSize, spread: 2},
          particleCount: this.maxParticlesPerEmitter, // have to initialize with the max potential
          activeMultiplier: this.initialParticlesPerEmitter / this.maxParticlesPerEmitter // this is a value between 0 and 1 that sets how many particles actually used
        });
        emitter.__position = new THREE.Vector3(x, 0, z);

        iEmitters.push(emitter);
        this.rainParticleGroup.addEmitter(emitter);
      }

      this.emitters.push(iEmitters);
    }

    this.ground.mesh.add(this.rainParticleGroup.mesh);
  }

  updateParticlesPerEmitter(numParticles) {
    for (var i = 0; i < this.emitters.length; i++) {
      var iEmitters = this.emitters[i];
      for (var j = 0; j < iEmitters.length; j++) {
        var emitter = iEmitters[j];
        emitter.activeMultiplier = numParticles / this.maxParticlesPerEmitter;
      }
    }
  }

  updateParticleSize(particleSize) {
    for (var i = 0; i < this.emitters.length; i++) {
      var iEmitters = this.emitters[i];
      for (var j = 0; j < iEmitters.length; j++) {
        var emitter = iEmitters[j];
        emitter.size.value = particleSize;
        emitter.size.spread = particleSize;
      }
    }
  }

  updateParticleSpread(particleSpread) {
    for (var i = 0; i < this.emitters.length; i++) {
      var iEmitters = this.emitters[i];
      for (var j = 0; j < iEmitters.length; j++) {
        var emitter = iEmitters[j];
        emitter.size.spread = particleSpread;
      }
    }
  }

}

var styromap = THREE.ImageUtils.loadTexture( "/media/styrofoam-disp.png" );
styromap.wrapS = THREE.RepeatWrapping;
styromap.wrapT = THREE.RepeatWrapping;
styromap.repeat.set( 20, 20 );

var skindisp = THREE.ImageUtils.loadTexture( "/media/skindisp.png" );
skindisp.wrapS = THREE.RepeatWrapping;
skindisp.wrapT = THREE.RepeatWrapping;
skindisp.repeat.set( 100, 100 );

function createPlane(length, y, rawMaterial, collisionHandler) {
  return new SheenMesh({
    meshCreator: (callback) => {
      let geometry = new THREE.BoxGeometry(length, 0.1, length);
      geometryUtil.computeShit(geometry);

      // lets go high friction, low restitution
      let material = Physijs.createMaterial(rawMaterial, 0.8, 0.4);

      let mesh = new Physijs.BoxMesh(geometry, material, 0);

      mesh.receiveShadow = true;

      callback(geometry, material, mesh);
    },

    position: new THREE.Vector3(0, y, 0),

    collisionHandler: collisionHandler
  });
}

function createWall(options) {
  var direction = options.direction || 'left';
  var roomLength = options.roomLength || 100;
  var wallHeight = options.wallHeight || 100;

  var position = new THREE.Vector3();
  switch (direction) {
    case 'left':
      position.set(-roomLength/2, wallHeight/2 , 0);
      break;

    case 'right':
      position.set(roomLength/2, wallHeight/2 , 0);
      break;

    case 'back':
      position.set(0, wallHeight/2, -roomLength/2);
      break;

    case 'front':
      position.set(0, wallHeight/2, roomLength/2);
      break;
  }

  return new SheenMesh({
    meshCreator: (callback) => {
      var geometry;
      switch (direction) {
        case 'left':
        case 'right':
          geometry = new THREE.BoxGeometry(1, wallHeight, roomLength);
          break;

        case 'back':
        case 'front':
          geometry = new THREE.BoxGeometry(roomLength, wallHeight, 1);
          break;
      }

      if (!geometry) {
        callback(null, null, null);
        return;
      }

      geometryUtil.computeShit(geometry);

      let rawMaterial = new THREE.MeshLambertMaterial({
        color: 0x101010,
        side: THREE.DoubleSide
      });

      // lets go high friction, low restitution
      let material = Physijs.createMaterial(rawMaterial, 0.8, 0.4);

      let mesh = new Physijs.BoxMesh(geometry, material, 0);

      callback(geometry, material, mesh);
    },

    position: position,

    collisionHandler: () => {}
  });
}

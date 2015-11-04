
let THREE = require('three');
let Physijs = require('../lib/physi');
let SPE = require('../lib/shader-particle-engine');
let kt = require('kutility');

var SheenMesh = require('../sheen-mesh');
var geometryUtil = require('../geometry-util');
var parametricGeometries = require('../parametric-geometries');
import {GalleryLayout} from './gallery-layout.es6';
import {ScoreKeeper} from '../scorekeeper.es6';

/* TODO:
 * 1) maybe do hands
 * 5) physical switch that flips when garbage is added
 */

export class RainRoom extends GalleryLayout {

  constructor(options) {
    super(options);

    this.domMode = options.domMode || false;

    // size config
    this.roomLength = options.roomLength || 300;
    this.emittersPerWall = options.emittersPerWall || 12;
    this.spacePerEmitter = this.roomLength / this.emittersPerWall;

    // rain particle config
    this.initialRainParticleY = options.initialRaindropParticleY || 300;
    this.maxParticlesPerEmitter = options.maxParticlesPerEmitter || 1000;
    this.initialParticlesPerEmitter = options.initialParticlesPerEmitter || 300;
    this.timeToReachMaxParticleTarget = options.timeToReachMaxParticleTarget || 300 * 1000; // 5 minutes
    this.rainParticleSize = options.rainParticleSize || 1;
    this.maxParticleSize = options.maxParticleSize || 10;

    // raindrop mesh config
    this.initialRaindropY = options.initialRaindropY || this.roomLength - 5;
    this.initialRaindropTime = options.initialRaindropTime || 5000;
    this.timeBetweenRaindrops = options.timeBetweenRaindrops || 3000;
    this.timeBetweenRaindropsDecrement = options.timeBetweenRaindropsDecrement || 30; // number of ms to deceremnt time between raindrops on every rain fall
    this.raindropSizeVariance = options.raindropSizeVariance || 1;
    this.raindropSizeVarianceIncrement = options.raindropSizeVarianceIncrement || 0.035; // number of "space units" to increment raindrop size variance each time raindrop is createed
    this.raindropMaxRadius = options.raindropMaxRadius || 15;
    this.minimumTimeBetweenRaindrops = options.minimumTimeBetweenRaindrops || 250;

    // ghost / trash / alternative media config
    this.timeToAddAlternativeMedia = options.timeToAddAlternativeMedia || 140 * 1000;
    this.ghostSizeVariance = options.ghostSizeVariance || 6;
    this.ghostSizeVarianceIncrement = options.ghostSizeVarianceIncrement || 0.05; // number of "space units" to increment ghost size variance each time ghost is created
    this.maxGhostLength = options.maxGhostLength || 18;

    // wall update config
    this.timeBetweenWallUpdates = options.timeBetweenWallUpdates || 1666;
    this.numActiveMeshes = options.numActiveMeshes || 500;

    // jump config
    this.jumpLevels = options.jumpLevels || [{delay: 800000, boost: 150}, {delay: 1600000, boost: 200}];

    // non-configurable state properties
    this.hasStarted = false;
    this.emitters = [];
    this.canAddAlternativeMedia = false;
    this.nextWallToUpdateIndex = 0;
    this.lastWallUpdateTime = 0;
    this.scorekeeper = new ScoreKeeper();
    this.rainCollisionSet = {};
    this.activeMeshes = [];

    if (!this.domMode) {
      this.setupRainParticleSystem();

      this.ground = createGround(this.roomLength, this.yLevel, (otherObject) => {
        //this.container.remove(otherObject);

        // only add score if this is the first time object hits ground
        if (otherObject._media && !this.rainCollisionSet[otherObject._media.id]) {
          this.scorekeeper.addScore(1);
          this.rainCollisionSet[otherObject._media.id] = true;
        }
      });
      this.ground.addTo(this.container);

      this.ceiling = createGround(this.roomLength, this.yLevel + this.roomLength);
      this.ceiling.addTo(this.container);

      this.walls = [
        createWall({direction: 'back', roomLength: this.roomLength, wallHeight: this.roomLength}),
        createWall({direction: 'left', roomLength: this.roomLength, wallHeight: this.roomLength}),
        createWall({direction: 'right', roomLength: this.roomLength, wallHeight: this.roomLength}),
        createWall({direction: 'front', roomLength: this.roomLength, wallHeight: this.roomLength})
      ];
      this.walls.forEach((wall) => {
        wall.addTo(this.container);
      });

      // move up
      this.controlObject.position.y = 10;
    }
    else {
      // DO DOM
    }
  }

  start() {
    this.hasStarted = true;

    if (this.domMode) {
      // DO DOM
    }
    else {
      // set up trash delay
      setTimeout(() => {
        this.canAddAlternativeMedia = true;
      }, this.timeToAddAlternativeMedia);

      // set up the layout waterfall
      setTimeout(() => {
        this.nextMediaToAddIndex = 0;
        this.layoutNextMedia();
      }, this.initialRaindropTime);

      // set up jump level delays
      this.jumpLevels.forEach((jumpLevel) => {
        setTimeout(() => {
          console.log('new jump velocity boost: ' + jumpLevel.boost);
          this.controls.jumpVelocityBoost = jumpLevel.boost;
        }, jumpLevel.delay);
      });

      // set up rain particle growth interval

      setInterval(()=> {
        if (this.rainParticleSize != this.maxParticleSize) {
          this.rainParticleSize = this.rainParticleSize + 1;
        }

        }, 50000);

      var particleGrowthStartTime = new Date();
      this.particleGrowthInterval = setInterval(() => {
        var timeElapsed = (new Date() - particleGrowthStartTime);
        var percentageOfMaxTimeElapsed = timeElapsed / this.timeToReachMaxParticleTarget;
        var totalParticlesToGrow = this.maxParticlesPerEmitter - this.initialParticlesPerEmitter;
        var currentNumberOfParticles = this.initialParticlesPerEmitter + Math.round(percentageOfMaxTimeElapsed * totalParticlesToGrow);
        console.log('number of particles per emitter: ' + currentNumberOfParticles);
        this.updateParticlesPerEmitter(Math.min(this.maxParticlesPerEmitter, currentNumberOfParticles));

        /*var totalParticleSize = this.maxParticleSize - this.rainParticleSize;
        var currentSizeOfParticles = this.rainParticleSize + Math.round(percentageOfMaxTimeElapsed * totalParticleSize);
        console.log('Current particle size: ' + currentSizeOfParticles);
        this.updateParticleSize(Math.min(this.maxParticlesSize, currentSizeOfParticles)); */

        if (currentNumberOfParticles >= this.maxParticlesPerEmitter) {
          clearInterval(this.particleGrowthInterval);
        }
      }, 2000); // update every 2 seconds
    }
  }

  update(dt) {
    super.update();

    if (!this.hasStarted) {
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
    // layout media
    var media = this.media[this.nextMediaToAddIndex];
    this.layoutMedia(this.nextMediaToAddIndex, media);
    this.nextMediaToAddIndex += 1;

    // do wall update
    var now = new Date();
    if (now - this.lastWallUpdateTime > this.timeBetweenWallUpdates) {
      this.updateCurrentWall(media);
      this.lastWallUpdateTime = now;
    }

    // set up next media layout
    this.timeBetweenRaindrops = Math.max(this.minimumTimeBetweenRaindrops, this.timeBetweenRaindrops - this.timeBetweenRaindropsDecrement);
    console.log('new raindrop in: ' + this.timeBetweenRaindrops);
    setTimeout(() => {
      this.layoutNextMedia();
    }, this.timeBetweenRaindrops);
  }

  layoutMedia(index, media) {
    if (!media) {
      return;
    }

    //console.log('laying out: ' + index);

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

  updateCurrentWall(media) {
    var wall = this.walls[this.nextWallToUpdateIndex];
    if (wall.mesh.material.map) {
      wall.mesh.material.map = this.createTexture(media);
      wall.mesh.material.needsUpdate = true;
    }
    else {
      wall.mesh.material = new THREE.MeshPhongMaterial({
        map: this.createTexture(media),
        bumpMap: skindisp,
        side: THREE.DoubleSide,
      });
      wall.mesh.needsUpdate = true;
    }

    this.nextWallToUpdateIndex += 1;
    if (this.nextWallToUpdateIndex >= this.walls.length) {
      this.nextWallToUpdateIndex = 0;
    }
  }

  createRaindrop(media) {
    var radius = Math.min(this.raindropMaxRadius, Math.round(Math.random() * this.raindropSizeVariance + 2));
    this.raindropSizeVariance += this.raindropSizeVarianceIncrement;
    console.log('raindrop size variance: ' + this.raindropSizeVariance);

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
    this.ghostSizeVariance += this.ghostSizeVarianceIncrement;

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

    this.container.add(this.rainParticleGroup.mesh);
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

  updateParticleSize(ParticleSize) {
    for (var i = 0; i < this.emitters.length; i++) {
      var iEmitters = this.emitters[i];
      for (var j = 0; j < iEmitters.length; j++) {
        var emitter = iEmitters[j];
        emitter.activeMultiplier = ParticleSize / this.maxpar;
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

function createGround(length, y, collisionHandler) {
  return new SheenMesh({
    meshCreator: (callback) => {
      let geometry = new THREE.PlaneBufferGeometry(length, length);
      geometryUtil.computeShit(geometry);
      var groundTexture = THREE.ImageUtils.loadTexture('/media/lino007b.jpg');
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set( 20, 20 );

      let rawMaterial = new THREE.MeshPhongMaterial({
        bumpMap: skindisp,
        bumpScale: 0.7,
        map: groundTexture,
        color: 0x101010,
        side: THREE.DoubleSide
      });

      // lets go high friction, low restitution
      let material = Physijs.createMaterial(rawMaterial, 0.8, 0.4);

      let mesh = new Physijs.BoxMesh(geometry, material, 0);
      mesh.rotation.x = -Math.PI / 2;
      mesh.__dirtyRotation = true;

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

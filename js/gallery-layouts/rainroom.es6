
let THREE = require('three');
let Physijs = require('../lib/physi');
let SPE = require('../lib/shader-particle-engine');

var SheenMesh = require('../sheen-mesh');
var geometryUtil = require('../geometry-util');
var parametricGeometries = require('../parametric-geometries');
import {GalleryLayout} from './gallery-layout.es6';

export class RainRoom extends GalleryLayout {

  constructor(options) {
    super(options);

    this.domMode = options.domMode || false;
    this.xPosition = options.xPosition || 0;
    this.zPosition = options.zPosition || 0;
    this.roomLength = options.roomLength || 300;
    this.emittersPerWall = options.emittersPerWall || 12;
    this.spacePerEmitter = this.roomLength / this.emittersPerWall;
    this.initialRaindropY = options.initialRaindropY || this.roomLength - 5;
    this.initialRainParticleY = options.initialRaindropY || 50;

    this.hasStarted = false;
    this.emitters = [];

    if (!this.domMode) {
      // perform initial layout
      for (var i = 0; i < 100; i++) {
        var media = this.media[i];
        this.layoutMedia(i, media);
      }
      this.nextMediaToAddIndex = i + 1;

      this.setupRainParticleSystem();

      this.ground = createGround(this.roomLength, this.yLevel);
      this.ground.addTo(this.container);

      this.ceiling = createGround(this.roomLength, this.yLevel + this.roomLength);
      this.ceiling.addTo(this.container);

      this.walls = [
        createWall({direction: 'left', roomLength: this.roomLength, wallHeight: this.roomLength}),
        createWall({direction: 'right', roomLength: this.roomLength, wallHeight: this.roomLength}),
        createWall({direction: 'front', roomLength: this.roomLength, wallHeight: this.roomLength}),
        createWall({direction: 'back', roomLength: this.roomLength, wallHeight: this.roomLength}),
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

  setupRainParticleSystem() {
    var particlesPerEmitter = 666;

    this.rainParticleGroup = new SPE.Group({
      texture: {value: THREE.ImageUtils.loadTexture('/media/rain.png')},
      maxParticleCount: particlesPerEmitter * this.emittersPerWall * this.emittersPerWall,
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
          maxAge: {value: 3},
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
          size: {value: 1, spread: 2},
      		particleCount: particlesPerEmitter
      	});
        emitter.__position = new THREE.Vector3(x, 0, z);

        iEmitters.push(emitter);
        this.rainParticleGroup.addEmitter(emitter);
      }

      this.emitters.push(iEmitters);
    }

    this.container.add(this.rainParticleGroup.mesh);
  }

  start() {
    this.hasStarted = true;

    if (this.domMode) {
      // DO DOM
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

  layoutMedia(index, media) {
    if (!media) {
      return;
    }

    //console.log('laying out: ' + index);

    var mesh = this.createRaindrop(media);

    mesh.position.set(this.randomPointInRoom(), this.initialRaindropY, this.randomPointInRoom());

    this.container.add(mesh);
  }

  randomPointInRoom() {
    return (Math.random() - 0.5) * (this.roomLength / 2);
  }

  createRaindrop(media) {
    var radius = Math.round(Math.random() * 5 + 1);
    var geometry = parametricGeometries.createRaindrop({radius: radius});

    var material = new THREE.MeshPhongMaterial({
      map: this.createTexture(media),
      side: THREE.DoubleSide,
      shininess: 100,
      transparent: true, opacity: Math.random() * 0.15 + 0.8, // opacity between 0.8 and 0.95
      specular: 0x0084dd, // give off a bright blue light
      wireframe: Math.random() > 0.95 // 5% of the time do a wireframe because, chill 3d computer
    });
    var physicsMaterial = Physijs.createMaterial(material, 0.4, 0.6); // material, "friction", "restitution"

    var mesh = new Physijs.BoxMesh(geometry, physicsMaterial, 5); // geometry, material, "mass"
    mesh.castShadow = true;

    return mesh;
  }

  createGhost(media) {
    return this.createRaindrop(media); // temp
  }

}

function createGround(length, y) {
  return new SheenMesh({
    meshCreator: (callback) => {
      let geometry = new THREE.PlaneBufferGeometry(length, length);
      geometryUtil.computeShit(geometry);

      let rawMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
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

    collisionHandler: () => {}
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

      let rawMaterial = new THREE.MeshBasicMaterial({
        color: 0x111111,
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


let THREE = require('three');
let $ = require('jquery');
let Physijs = require('../lib/physi');
let SPE = require('../lib/shader-particle-engine');
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
    this.initialRaindropY = options.initialRaindropY || 500;
    this.initialRainParticleY = options.initialRaindropY || 50;

    this.hasStarted = false;
    this.emitters = [];

    if (!this.domMode) {
      // perform initial layout
      for (var i = 0; i < 100; i++) {
        var media = this.media[i];
        //this.layoutMedia(i, media);
      }
      this.nextMediaToAddIndex = i + 1;

      this.setupRainParticleSystem();
    }
    else {
      // DO DOM
    }
  }

  setupRainParticleSystem() {
    var particlesPerEmitter = 666;

    this.rainParticleGroup = new SPE.Group({
      texture: {value: THREE.ImageUtils.loadTexture('/media/rain.png')},
      maxParticleCount: particlesPerEmitter * this.emittersPerWall * this.emittersPerWall
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

    var mesh = this.createRaindrop(media, 10);

    mesh.position.set(this.randomPointInRoom(), this.initialRaindropY, this.randomPointInRoom());

    this.container.add(mesh);
  }

  randomPointInRoom() {
    return (Math.random() - 0.5) * (this.roomLength / 2);
  }

  createRaindrop(media, length) {
    var geometry = new THREE.SphereGeometry(length, 32, 32);

    var texture = this.createTexture(media);
    var material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide}); // want shiny? maybe l8r
    var physicsMaterial = Physijs.createMaterial(material, 0.4, 0.6); // material, "friction", "restitution"

    var mesh = new Physijs.BoxMesh(geometry, physicsMaterial, 5); // geometry, material, "mass"
    mesh.castShadow = true;

    return mesh;
  }

  createGhost(media) {
    return this.createRaindrop(media, 40); // temp
  }

}

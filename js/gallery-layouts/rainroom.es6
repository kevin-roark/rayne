
let THREE = require('three');
let $ = require('jquery');
let Physijs = require('../lib/physi.js');
import {GalleryLayout} from './gallery-layout.es6';

export class RainRoom extends GalleryLayout {

  constructor(options) {
    super(options);

    this.domMode = options.domMode || false;
    this.xPosition = options.xPosition || 0;
    this.zPosition = options.zPosition || 0;
    this.roomLength = options.roomLength || 350;
    this.initialRaindropY = options.initialRaindropY || 500;

    this.hasStarted = false;

    if (!this.domMode) {
      // perform initial layout
      for (var i = 0; i < 100; i++) {
        var media = this.media[i];
        this.layoutMedia(i, media);
      }
      this.nextMediaToAddIndex = i + 1;
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
  }

  update() {
    super.update();

    if (!this.hasStarted) {
      return;
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

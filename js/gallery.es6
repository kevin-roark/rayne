
let THREE = require('three');
let Physijs = require('./lib/physi.js');
let $ = require('jquery');
let kt = require('kutility');
let SheenMesh = require('./sheen-mesh');
let imageUtil = require('./image-util');
let geometryUtil = require('./geometry-util');

import {RainRoom} from './gallery-layouts/rainroom.es6';

export class Gallery {

  constructor(scene, options) {
    this.scene = scene;
    this.controlObject = options.controlObject;
    this.pitchObject = options.pitchObject;
    this.domMode = options.domMode;
    this.yLevel = options.yLevel || 0;
    this.layoutCreator = (options) => { return new RainRoom(options); };

    this.meshContainer = new THREE.Object3D();

    //this.ground = createGround(500, this.yLevel);
    //this.ground.addTo(this.meshContainer);

    this.scene.add(this.meshContainer);
  }

  create(callback) {
    var filename = '/media/dz_media.json';
    $.getJSON(filename, (data) => {
      this.layout = this.layoutCreator({
        domMode: this.domMode,
        container: this.scene, // NOTE: very important that container is the scene for physics to work
        controlObject: this.controlObject,
        pitchObject: this.pitchObject,
        media: data,
        yLevel: this.yLevel
      });

      if (callback) {
        callback();
      }
    });
  }

  update(dt) {
    if (this.layout) {
      this.layout.update(dt);
    }
  }

  destroy() {
    this.scene.remove(this.meshContainer);
  }

}

function createGround(length, y) {
  return new SheenMesh({
    meshCreator: (callback) => {
      let geometry = new THREE.PlaneBufferGeometry(length, length);
      geometryUtil.computeShit(geometry);

      let rawMaterial = new THREE.MeshBasicMaterial({
        color: 0xeeeeee,
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

    collisionHandler: () => {

    }
  });
}


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

let THREE = require("three");
let $ = require("jquery");

import { RainRoom } from "./gallery-layouts/rainroom.es6";

export class Gallery {
  constructor(scene, options) {
    this.scene = scene;
    this.controls = options.controls;
    this.domMode = options.domMode;
    this.yLevel = options.yLevel || 0;
    this.layoutCreator = options => {
      return new RainRoom(options);
    };

    this.meshContainer = new THREE.Object3D();

    this.scene.add(this.meshContainer);
  }

  create(callback) {
    var filename = "/media/rayne_media_new.json";
    $.getJSON(filename, data => {
      this.layout = this.layoutCreator({
        domMode: this.domMode,
        container: this.scene, // NOTE: very important that container is the scene for physics to work
        controls: this.controls,
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

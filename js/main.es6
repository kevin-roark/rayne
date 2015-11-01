
let $ = require('jquery');
let THREE = require('three');
let Physijs = require('./lib/physi.js');

import {ThreeBoiler} from './three-boiler.es6';
import {MainScene} from './main-scene.es6';

let FlyControls = require('./controls/fly-controls');

var ON_PHONE = (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

class Sheen extends ThreeBoiler {
  constructor() {
    super({
      antialias: true,
      alpha: true,
      onPhone: ON_PHONE
    });

    var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (!isChrome) {
      $('#splash-please-use-chrome').show();
    }

    if (this.renderer) {
      this.renderer.shadowMapEnabled = true;
      this.renderer.shadowMapCullFace = THREE.CullFaceBack;
      this.renderer.shadowMapType = THREE.PCFSoftShadowMap;

      this.renderer.gammaInput = true;
  	  this.renderer.gammaOutput = true;

      this.renderer.setClearColor(0x000000, 1);
    }

    this.controls = new FlyControls(this.camera, {allowYMovement: true});
    this.scene.add(this.controls.getObject());

    this.mainScene = new MainScene(this.renderer, this.camera, this.scene, {onPhone: ON_PHONE});
    this.mainScene.controlObject = this.controls.getObject();
    this.mainScene.pitchObject = this.controls.pitchObject();

    this.clock = new THREE.Clock();

    $(document).click((ev) => {
      if ($(ev.target).is('a')) {
        return;
      }

      if (this.controls.requestPointerlock) {
        this.controls.requestPointerlock();
      }
      this.controls.enabled = true;

      this.mainScene.click();
    });
  }

  createScene() {
    var scene = new Physijs.Scene();

    scene.setGravity(new THREE.Vector3(0, -5, 0));

    scene.addEventListener('update', function() {
      // here wanna apply new forces to objects and things based on state
      scene.simulate(undefined, 1);
    });

    scene.fog = new THREE.Fog(0xffffff, 1, 500);

    return scene;
  }

  activate() {
    super.activate();

    this.scene.simulate();

    this.mainScene.startScene();
  }

  render() {
    super.render();

    this.controls.update();
    this.mainScene.update(this.clock.getDelta());
  }

  keypress(keycode) {
    super.keypress(keycode);

    switch (keycode) {
      case 113: /* q */
        break;

      case 114: /* r */
        break;

      case 112: /* p */
        break;
    }
  }

  spacebarPressed() {
    this.mainScene.spacebarPressed();
  }

}

$(function() {
  var sheen = new Sheen();
  sheen.activate();
});

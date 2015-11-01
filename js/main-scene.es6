
let THREE = require('three');
let $ = require('jquery');
let buzz = require('./lib/buzz.js');
let kt = require('kutility');

import {SheenScene} from './sheen-scene.es6';
import {Gallery} from './gallery.es6';

var $splashStatus = $('#splash-status');
var BaseLoadingText = 'is loading';

export class MainScene extends SheenScene {

  /// Init

  constructor(renderer, camera, scene, options) {
    super(renderer, camera, scene, options);

    this.name = "Rayne";
    this.onPhone = options.onPhone || false;
  }

  /// Overrides

  enter() {
    super.enter();

    this.loading = true;
    this.updateLoadingView();

    // this.sound = new buzz.sound('/media/falling3', {
    //   formats: ["mp3", "ogg"],
    //   webAudioApi: true,
    //   volume: 100
    // });
    buzz.defaults.duration = 2000;

    this.makeLights();

    // make all the galleries here
    this.rayne = new Gallery(this.scene, {
      domMode: this.onPhone,
      controlObject: this.controlObject,
      pitchObject: this.pitchObject,
      yLevel: 0
    });
  }

  doTimedWork() {
    super.doTimedWork();

    this.rayne.create(() => {
      this.galleryDidLoad();
    });
  }

  exit() {
    super.exit();

    this.rayne.destroy();
  }

  children() {
    return [this.lightContainer];
  }

  update(dt) {
    super.update(dt);

    if (this.lightContainer) {
      this.lightContainer.position.y = this.camera.position.y - 5;
    }

    if (this.rayne) {
      this.rayne.update(dt);
    }
  }

  // Interaction

  spacebarPressed() {

  }

  click() {
    if (this.loading || this.hasStarted) {
      return;
    }

    this.start();
  }

  updateLoadingView() {
    if (!this.loading) {
      return;
    }

    var currentText = $splashStatus.text();
    if (currentText.length < BaseLoadingText.length + 3) {
      currentText += '.';
      $splashStatus.text(currentText);
    }
    else {
      $splashStatus.text(BaseLoadingText);
    }

    setTimeout(() => {
      this.updateLoadingView();
    }, 250);
  }

  galleryDidLoad() {
    this.loading = false;

    $splashStatus.text('is ready');
    $splashStatus.css('font-style', 'italic');

    if (this.onPhone) {
      $('#mobile-error-overlay').fadeIn(1000);
    }
    else {
      setTimeout(() => {
        if (!this.hasStarted) {
          $('#splash-controls').fadeIn(1000);
        }
      }, 250);
      setTimeout(() => {
        if (!this.hasStarted) {
          $('#click-to-start').fadeIn(1000);
        }
      }, 1750);
    }
  }

  start() {
    $('.splash-overlay').fadeOut(1000);
    if (this.onPhone) {
      $('#mobile-error-overlay').fadeOut(1000);
    }

    //this.sound.loop().play().fadeIn().fadeOut();

    this.rayne.layout.start();

    this.hasStarted = true;

    if (!this.onPhone) {
      // after 43 seconds show the first key hint
      setTimeout(function() {
        $('#key-hint-1').fadeIn(666);
        setTimeout(function() {
          $('#key-hint-1').fadeOut(666);
        }, 9666);
      }, 43 * 1000);

      // after 3.5 minutes show the second key hint
      setTimeout(() => {
        $('#key-hint-2').fadeIn(666);
        setTimeout(function() {
          $('#key-hint-2').fadeOut(666);
        }, 9666);
      }, 210 * 1000);
    }
  }

  // Creation

  makeLights() {
    let container = new THREE.Object3D();
    this.scene.add(container);
    this.lightContainer = container;

    this.frontLight = makeDirectionalLight();
    this.frontLight.position.set(-40, 125, 200);
    setupShadow(this.frontLight);

    this.backLight = makeDirectionalLight();
    this.backLight.position.set(40, 125, -200);

    this.leftLight = makeDirectionalLight();
    this.leftLight.position.set(-200, 75, -45);

    this.rightLight = makeDirectionalLight();
    this.rightLight.position.set(200, 75, -45);
    this.rightLight.shadowDarkness = 0.05;

    this.spotLight = new THREE.SpotLight(0xff0000);
    this.spotLight.position.set(0, 200, -20);
    setupShadow(this.spotLight);
    this.spotLight.shadowCameraFov = 30;
    container.add(this.spotLight);

    this.lights = [this.frontLight, this.backLight, this.leftLight, this.rightLight, this.spotLight];

    function makeDirectionalLight() {
      var light = new THREE.DirectionalLight( 0xffffff, 0.9);
      light.color.setHSL( 0.1, 1, 0.95 );

      container.add(light);
      return light;
    }

    function setupShadow(light) {
      light.castShadow = true;
      light.shadowCameraFar = 500;
      light.shadowDarkness = 0.6;
      light.shadowMapWidth = light.shadowMapHeight = 2048;
    }

  }

}

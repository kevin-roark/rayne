let THREE = require("three");
let $ = require("jquery");
let buzz = require("./lib/buzz");
let kt = require("kutility");
let RainyDay = require("./lib/rainyday");

import { SheenScene } from "./sheen-scene.es6";
import { Gallery } from "./gallery.es6";

var $splashStatus = $("#splash-status");
var BaseLoadingText = "is loading";

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

    this.sound = new buzz.sound("/media/raindrops", {
      formats: ["mp3", "ogg"],
      webAudioApi: true,
      volume: 100
    });
    buzz.defaults.duration = 3000;

    this.makeLights();

    // make all the galleries here
    this.rayne = new Gallery(this.scene, {
      domMode: this.onPhone,
      controls: this.controls,
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

  spacebarPressed() {}

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
      currentText += ".";
      $splashStatus.text(currentText);
    } else {
      $splashStatus.text(BaseLoadingText);
    }

    setTimeout(() => {
      this.updateLoadingView();
    }, 250);
  }

  galleryDidLoad() {
    this.loading = false;

    $splashStatus.text("is ready");
    $splashStatus.css("font-style", "italic");

    if (this.onPhone) {
      $("#mobile-error-overlay").fadeIn(1000);
    } else {
      setTimeout(() => {
        if (!this.hasStarted) {
          $("#splash-controls").fadeIn(1000);
        }
      }, 250);
      setTimeout(() => {
        if (!this.hasStarted) {
          $("#click-to-start").fadeIn(1000);
        }
      }, 1750);
    }
  }

  start() {
    $(".splash-overlay").fadeOut(1000);
    if (this.onPhone) {
      $("#mobile-error-overlay").fadeOut(1000);
    }

    this.sound
      .loop()
      .play()
      .fadeIn()
      .fadeOut();

    this.rayne.layout.start();

    setTimeout(() => {
      this.rainEngine = new RainyDay({
        blur: null,
        opacity: 0.0,
        enableCollisions: true,
        image: document.getElementById("rain-screen-background"),
        showImage: false
      });

      // add 1 drop of size from 5 - 9, every 1000ms
      this.rainEngine.rain([[5, 4, 1]], 1000);

      var rainOpacityInterval = setInterval(() => {
        this.rainEngine.options.opacity += 0.001;
        if (this.rainEngine.options.opacity >= 0.67) {
          clearInterval(rainOpacityInterval);
        }
      }, 100);
    }, 1000);

    this.hasStarted = true;
  }

  // Creation

  makeLights() {
    let container = new THREE.Object3D();
    this.scene.add(container);
    this.lightContainer = container;

    this.frontLight = makeDirectionalLight();
    this.frontLight.position.set(0, 125, 148);

    this.backLight = makeDirectionalLight();
    this.backLight.position.set(0, 125, -148);

    this.leftLight = makeDirectionalLight();
    this.leftLight.position.set(-148, 125, 0);

    this.rightLight = makeDirectionalLight();
    this.rightLight.position.set(148, 125, 0);

    this.spotLight = new THREE.SpotLight(0xffffff, 10.0, 220, 20, 20); // color, intensity, distance, angle, exponent, decay
    this.spotLight.position.set(0, 150, 0);
    this.spotLight.shadowCameraFov = 20;
    this.spotLight.shadowCameraNear = 1;
    setupShadow(this.spotLight);
    container.add(this.spotLight);

    this.lights = [
      this.frontLight,
      this.backLight,
      this.leftLight,
      this.rightLight,
      this.spotLight
    ];

    function makeDirectionalLight() {
      var light = new THREE.DirectionalLight(0xffffff, 0.03);
      light.color.setHSL(0.1, 1, 0.95);

      container.add(light);
      return light;
    }

    function setupShadow(light) {
      light.castShadow = true;
      //light.shadowCameraFar = 500;
      light.shadowDarkness = 0.6;
      light.shadowMapWidth = light.shadowMapHeight = 2048;
    }
  }
}

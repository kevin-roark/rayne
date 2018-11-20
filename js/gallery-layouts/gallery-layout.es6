let THREE = require("three");
let imageUtil = require("../image-util");

export class GalleryLayout {
  constructor(options) {
    // mandatory config
    this.container = options.container;
    this.media = options.media;
    this.controls = options.controls;
    this.controlObject = this.controls.getObject();
    this.pitchObject = this.controls.pitchObject();

    // optional config
    this.yLevel = options.yLevel || 0;
  }

  update() {}

  layoutMedia(index, media) {
    // override this
  }

  createTexture(media) {
    var imageURL = media.imgSrc;
    var texture = imageUtil.loadTexture(imageURL, false);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
}

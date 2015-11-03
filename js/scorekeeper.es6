
var $ = require('jquery');
var Odometer = require('odometer');

export class ScoreKeeper {
  constructor(options) {
    if (!options) options = {};
    this.$scoreZone = options.$scoreZone || $('.score-zone');
    this.$scoreEl = options.$scoreEl || $('#rain-score');
    this.score = options.initialScore ||  0;
    this.isShowing = false;

    this.odometer = new Odometer({
      el: this.$scoreEl.get(0),
      value: this.score,
      theme: 'default',
      duration: 1500
    });
  }

  show(dur) {
    if (!dur) {
      this.$scoreZone.show();
      this.isShowing = true;
    }
    else {
      this.$scoreZone.fadeIn(dur, () => {
        this.isShowing = true;
      });
    }
  }

  hide(dur) {
    if (!dur) {
      this.$scoreZone.hide();
      this.isShowing = false;
    }
    else {
      this.$scoreZone.fadeOut(dur, () => {
        this.isShowing = false;
      });
    }
  }

  addScore(increment) {
    this.setScore(increment + this.score);
  }

  drain() {
    this.setScore(0);
  }

  setScore(score) {
    if (!this.isShowing) {
      this.show();
    }

    this.score = score;
    this.odometer.update(score);
  }
}

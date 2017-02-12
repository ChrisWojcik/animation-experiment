'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.CSSRenderer = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.tweenProps = tweenProps;

var _easing = require('./easing');

var _Engine = require('./Engine');

var _Engine2 = _interopRequireDefault(_Engine);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CSSRenderer = exports.CSSRenderer = function () {
    function CSSRenderer(target, fromTo, options, onTick) {
        _classCallCheck(this, CSSRenderer);

        // Handle NodeLists
        this.target = [];
        if (target.length) this.target = target;else this.target.push(target);

        this.fromTo = fromTo;
        this.currentState = tweenProps(0, this.fromTo[0], this.fromTo[1]);
        this.currentTime = 0;
        this.playbackRate = 1;
        this.running = false;
        this.paused = false;

        this.onTick = onTick;
        this.easer = (0, _easing.createEaser)(options);
        this.duration = parseFloat(this.easer.duration);
    }

    _createClass(CSSRenderer, [{
        key: 'tick',
        value: function tick(time) {
            if (this.paused || !this.running) return;

            var currentTime = void 0;
            if (this.playbackRate > 0) currentTime = this.currentTime + time;else currentTime = this.currentTime - time;
            this.seek(currentTime);

            if (this.playbackRate < 0 && this.easer.currentValue <= 0) this.running = false;else if (this.playbackRate >= 0 && this.easer.currentValue >= 1) this.running = false;

            if (this.onTick) this.onTick(this.easer.progress, this.currentTime, this.running);
            return this;
        }
    }, {
        key: 'render',
        value: function render(state) {
            if (state) this.currentState = state;

            for (var i = 0, l = this.target.length; i < l; i++) {
                this.target[i].style[_Engine2.default.transformStyleProp] = 'translate3d(' + this.currentState.translateX[0] + this.currentState.translateX[1] + ', ' + this.currentState.translateY[0] + this.currentState.translateY[1] + ', ' + this.currentState.translateZ[0] + this.currentState.translateZ[1] + ') ' + 'rotateX(' + this.currentState.rotateX[0] + this.currentState.rotateX[1] + ') ' + 'rotateY(' + this.currentState.rotateY[0] + this.currentState.rotateY[1] + ') ' + 'rotateZ(' + this.currentState.rotateZ[0] + this.currentState.rotateZ[1] + ') ' + 'scale3d(' + this.currentState.scaleX[0] + ', ' + this.currentState.scaleY[0] + ', ' + this.currentState.scaleY[0] + ') ' + 'skew(' + this.currentState.skewX[0] + this.currentState.skewX[1] + ', ' + this.currentState.skewY[0] + this.currentState.skewY[1] + ')';

                if (this.currentState.opacity) this.target[i].style.opacity = Math.min(Math.max(this.currentState.opacity[0], 0), 1);
            }

            return this;
        }
    }, {
        key: 'play',
        value: function play() {
            this.running = true;
            this.paused = false;
            return this;
        }
    }, {
        key: 'pause',
        value: function pause() {
            this.paused = true;
            return this;
        }
    }, {
        key: 'stop',
        value: function stop() {
            this.running = false;
            this.paused = false;
            return this;
        }
    }, {
        key: 'seek',
        value: function seek(val) {
            if (val >= this.duration) val = this.duration;
            if (isNaN(val) || val <= 0) val = 0;

            this.running = true;
            this.currentTime = val;
            this.easer.tick(this.currentTime);
            this.currentState = tweenProps(this.easer.progress, this.fromTo[0], this.fromTo[1]);
        }
    }]);

    return CSSRenderer;
}();

function tweenProps(tweenValue, fromState, toState) {
    var state = {};
    var props = Object.keys(fromState);

    for (var i = 0, l = props.length; i < l; i++) {
        state[props[i]] = fromState[props[i]].slice(0);
        state[props[i]][0] = state[props[i]][0] + tweenValue * (toState[props[i]][0] - state[props[i]][0]);
    }

    return state;
}
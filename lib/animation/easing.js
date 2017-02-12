'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.createEaser = createEaser;

var _BezierEasing = require('./BezierEasing');

var _BezierEasing2 = _interopRequireDefault(_BezierEasing);

var _Spring = require('../physics/Spring');

var _Spring2 = _interopRequireDefault(_Spring);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_DURATION = '400';
var DEFAULT_EASING = 'ease';
var DEFAULT_SPRING_CONSTANT = 100;
var DEFAULT_SPRING_DAMPING = 20;
var DEFAULT_SPRING_MASS = 1;

var Easings = {};

[["linear", [0.00, 0.0, 1.00, 1.0]], ["ease", [0.25, 0.1, 0.25, 1.0]], ["ease-in", [0.42, 0.0, 1.00, 1.0]], ["ease-out", [0.00, 0.0, 0.58, 1.0]], ["ease-in-out", [0.42, 0.0, 0.58, 1.0]]].forEach(function (array) {
    Easings[array[0]] = _BezierEasing2.default.apply(null, array[1]);
});

function createEaser(options) {
    var type = void 0;

    if (Object.keys(Easings).indexOf(options.easing) !== -1 || options.easing === 'spring') {
        type = options.easing;
    } else {
        type = DEFAULT_EASING;
    }

    if (type === 'spring') return new SpringEaser(options);else return new BezierEaser(type, options);
}

var BezierEaser = function () {
    function BezierEaser(type, options) {
        _classCallCheck(this, BezierEaser);

        this.progress = 0;
        this.currentValue = 0;
        this.duration = options.duration || DEFAULT_DURATION;
        this.easingFn = Easings[type];
    }

    _createClass(BezierEaser, [{
        key: 'tick',
        value: function tick(value) {
            value /= this.duration;

            if (this.duration === 0.0 || value >= 1) {
                this.progress = 1;
                this.currentValue = 1;
            } else {
                this.progress = this.easingFn(value);
                this.currentValue = value;
            }
        }
    }]);

    return BezierEaser;
}();

var SpringEaser = function () {
    function SpringEaser(options) {
        _classCallCheck(this, SpringEaser);

        var k = options.stiffness || DEFAULT_SPRING_CONSTANT;
        var c = options.damping || DEFAULT_SPRING_DAMPING;
        var m = options.mass || DEFAULT_SPRING_MASS;
        var v = options.velocity || 0;

        this.spring = new _Spring2.default(m, k, c, 0, 1, v);
        this.duration = this.spring.duration * 1000; // spring code reports time in s
        this.progress = 0;
        this.currentValue = 0;
    }

    _createClass(SpringEaser, [{
        key: 'tick',
        value: function tick(value) {
            if (this.duration === 0.0 || value / this.duration >= 1) {
                this.currentValue = 1;
                this.progress = 1;
            } else {
                this.currentValue = value / this.duration;
                this.progress = this.spring.x(value / 1000);
            }
        }
    }]);

    return SpringEaser;
}();
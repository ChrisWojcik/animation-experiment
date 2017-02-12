(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

var _Engine = require('./Engine');

var _Engine2 = _interopRequireDefault(_Engine);

var _EventEmitter = require('../events/EventEmitter');

var _EventEmitter2 = _interopRequireDefault(_EventEmitter);

var _rendering = require('./rendering');

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var DEFAULT_TRANSFORM = {
    translateX: [0, 'px'],
    translateY: [0, 'px'],
    translateZ: [0, 'px'],
    scaleX: [1],
    scaleY: [1],
    scaleZ: [1],
    rotateX: [0, 'deg'],
    rotateY: [0, 'deg'],
    rotateZ: [0, 'deg'],
    skewX: [0, 'deg'],
    skewY: [0, 'deg']
};

/**
 * An Animator allows you to animate changes to the css properties of one or more DOM Elements.
 * You can control the rate of playback using timing parameters, or create an interactive animation
 * by scrubbing through the property values manually.
 *
 * @class
 */

var Animator = function () {

    /**
     * @constructor
     * @param {(HTMLElement|NodeList)} target - The Element or NodeList being animated.
     * @param {Object} props - The start and end values for the css properties being animated.
     * @param {AnimationPropertyList} props.to - The start state of the animation.
     * @param {AnimationPropertyList} props.from - The end state of the animation.
     * @param {TimingParameters} [timingParameters={}] - Playback and timing options.
     *
     * @example
     * var animator = new Animator(box, {
     *      from: { translateX: 0,   rotate: 0   },
     *      to:   { translateX: 100, rotate: 360 }
     * }, {
     *      easing: 'spring',
     *      stiffness: 100,
     *      damping: 20
     * });
     */
    function Animator(target, props) {
        var timingParameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        _classCallCheck(this, Animator);

        if (!isElementOrNodeList(target)) {
            throw new TypeError('Target must be an HTMLElement or a NodeList.');
        }

        if (!props.from || !props.to) {
            throw new TypeError('Invalid property values.');
        }

        this._events = new _EventEmitter2.default();

        this._playState = 'idle';
        this._progress = 0;
        this._isReversed = false;

        // Keep track of what the state of the main timeline is
        this._defaultTimingParameters = timingParameters;
        this._onMainTimeline = true;

        this._target = {
            element: target,
            values: [parseCSSProps(target, props.from), parseCSSProps(target, props.to)]
        };

        var defaultTransformProps = Object.keys(DEFAULT_TRANSFORM),
            toProps = Object.keys(this._target.values[1]),
            i = void 0,
            l = void 0,
            p = void 0;

        for (i = 0, l = defaultTransformProps.length; i < l; i++) {
            if (typeof this._target.values[0][defaultTransformProps[i]] === 'undefined') {
                this._target.values[0][defaultTransformProps[i]] = DEFAULT_TRANSFORM[defaultTransformProps[i]].slice(0);
            }
            if (typeof this._target.values[1][defaultTransformProps[i]] === 'undefined') {
                this._target.values[1][defaultTransformProps[i]] = DEFAULT_TRANSFORM[defaultTransformProps[i]].slice(0);
            }
        }

        for (i = 0, l = toProps.length; i < l; i++) {
            if (typeof toProps[i] === 'undefined') throw new Error('Target value for "' + toProps[i] + '" not specified.');
        }

        this._renderer = new _rendering.CSSRenderer(target, this._target.values, timingParameters, this._createTickHandler(0));

        this._duration = this._renderer.duration;
    }

    /**
     * The value of this property (between 0.0 and 1.0) represents the progress of the Animator between its start 
     * and end states. The value is independent of time. For example, if an "ease-out" timing function is used, 
     * the value may increase more quickly at the start of an animation and slow down as it reaches its end. 
     * In some cases, the value may be less than 0.0 or greater than 1.0. When using spring physics, a property 
     * may overshoot its target value and oscillate before settling at an equilibirum position. Changing the 
     * value of this property interrupts the Animator and moves it to the "stopped" state.
     *
     * @type {Number} The completion percentage.
     *
     * @example
     * console.log(animator.progress) // read
     * animator.progress = 0.5;       // write
     */

    _createClass(Animator, [{
        key: 'play',

        /**
         * Resume playback of the animation.
         *
         * @method
         * @returns {Animator}
         */
        value: function play() {
            if (this.playState === 'stopped' || this.playState === 'running') return;

            if (this.playState === 'idle' || this.playState === 'finished') {
                _Engine2.default.runningAnimations.push(this._renderer);
            }

            this._renderer.play();
            this._playState = 'running';
            this._events.emit('play');
            return this;
        }

        /**
         * Pause playback of the animation.
         *
         * @method
         * @returns {Animator}
         */

    }, {
        key: 'pause',
        value: function pause() {
            if (this.playState !== 'running') return;

            this._renderer.pause();
            this._playState = 'paused';
            this._events.emit('pause');
            return this;
        }

        /**
         * Stop playback of the animation and remove its timeline. The Animator will need to be
         * re-configured by calling "continue" in order for playback to be resumed.
         *
         * @method
         * @returns {Animator}
         */

    }, {
        key: 'stop',
        value: function stop() {
            this._renderer.stop();
            this._playState = 'stopped';
            return this;
        }

        /**
         * Stop the animation and temporarily create a new one that proceeds in the same 
         * direction (based on the current value of "isReversed"). Useful if you need to 
         * interrupt an animation (For example during a user gesture), and send the target 
         * element towards the start or end state with a different set of timing parameters. 
         * When the new animation reaches its "finished" state, control is returned to the 
         * main timeline.
         *
         * @method
         * @param {TimingParameters} [timingParameters={}] - Playback and timing options.
         * @returns {Animator}
         *
         * @example
         * animator.continue({
         *      easing: 'spring',
         *      stiffness: 100,
         *      damping: 20
         * });
         */

    }, {
        key: 'continue',
        value: function _continue() {
            var timingParameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            this._onMainTimeline = false;
            this._playState = 'idle';
            this._renderer.stop();

            var startState = (0, _rendering.tweenProps)(this._progress, this._target.values[0], this._target.values[1]);
            var endState = !this._isReversed ? this._target.values[1] : this._target.values[0];

            this._renderer = new _rendering.CSSRenderer(this._target.element, [startState, endState], timingParameters, this._createTickHandler(this.progress));

            this.play();
            return this;
        }

        /**
         * Add an event listener to the Animator.
         *
         * @method
         * @param {AnimationEvent} label - The type of event to listen for.
         * @param {Function} callback - A callback function.
         * @returns {Animator}
         *
         * @example
         * animator.on('finish', function(progress) {
         *      if (progress === 1) console.log('finished.');
         *      if (progress === 0) console.log('finished in reverse.');
         * });
         */

    }, {
        key: 'on',
        value: function on(label, callback) {
            this._events.addListener(label, callback);
            return this;
        }

        /**
         * Remove an event listener from the Animator.
         *
         * @method
         * @param {AnimationEvent} label - The type of event to listen for.
         * @param {Function} callback - A reference to the callback function to be removed.
         * @returns {Animator}
         */

    }, {
        key: 'off',
        value: function off(label, callback) {
            this._events.removeListener(label, callback);
            return this;
        }
    }, {
        key: '_createTickHandler',
        value: function _createTickHandler(startingProgress) {
            var _this = this;

            return function (progress, currentTime, running) {
                if (!_this._isReversed) {
                    _this._progress = startingProgress + progress * (1 - startingProgress);
                } else {
                    _this._progress = startingProgress - progress * startingProgress;
                }

                if (!running) {
                    _this._playState = 'finished';
                    _this._events.emit('finish', _this.progress);

                    // return control to the main timeline
                    if (!_this._onMainTimeline) {
                        if (_this.progress >= 1) _this.currentTime = _this.duration;else _this.currentTime = 0;
                    }
                }
            };
        }
    }, {
        key: 'progress',
        get: function get() {
            return this._progress;
        },
        set: function set(val) {
            if (isNaN(val)) return;

            this._playState = 'stopped';
            this._progress = parseFloat(val);

            this._renderer.stop();
            _Engine2.default.queuedActions.push(this._renderer.render.bind(this._renderer, (0, _rendering.tweenProps)(this._progress, this._target.values[0], this._target.values[1])));
        }

        /**
         * The current play state of the Animator (Read Only). An Animator is "idle" when it is first created before any 
         * commands have been sent. After the "play" method is first called, it is in the "running" state when playing
         * and in the "paused" state when paused. When an animation reaches its target value the Animator is in the
         * "finished" state. If the stop method is called, the Animator is in the "stopped" state.
         *
         * @type {String} The current state of the Animator.
         * @readonly
         *
         * @example
         * console.log(animator.playState); // e.g. 'running'
         * animator.playState = 'paused';   // NO EFFECT! - READ ONLY
         */

    }, {
        key: 'playState',
        get: function get() {
            return this._playState;
        }

        /**
         * If true, the Animator is animating in reverse, back towards its original values.
         *
         * @type {Boolean} Is the Animator running in reverse?
         *
         * @example
         * console.log(animator.isReversed); // e.g. false
         * animator.isReversed = true;       // play backwards
         */

    }, {
        key: 'isReversed',
        get: function get() {
            return this._isReversed;
        },
        set: function set(bool) {
            this._isReversed = !!bool;

            if (this.playState !== 'stopped') {
                this._renderer.playbackRate *= -1;
            } else {
                if (!this._onMainTimeline) {
                    this._renderer.stop();
                    this._playState = 'stopped';
                }
            }
        }

        /**
         * A number representing the current time of the running animation in milliseconds or null or 
         * if the Animator is in the "stopped" state.
         *
         * @type {?Number} The current time.
         *
         * @example
         * console.log(animator.currentTime); // e.g. 300
         * animator.currentTime = 400;        // seek to timestamp
         */

    }, {
        key: 'currentTime',
        get: function get() {
            if (this.playState === 'stopped') return null;
            return this._renderer.currentTime;
        },
        set: function set(val) {
            if (!this._onMainTimeline) {
                this._renderer.stop();

                this._renderer = new _rendering.CSSRenderer(this._target.element, this._target.values, this._defaultTimingParameters, this._createTickHandler(0));

                this._renderer.pause();
                _Engine2.default.runningAnimations.push(this._renderer);
                this._playState = this.playState === 'finished' ? 'finished' : 'paused';
            }

            this._renderer.seek(parseFloat(val));

            if (!this._onMainTimeline) {
                this._renderer.playbackRate = this._isReversed ? -1 : 1;
            }

            if (this.playState === 'idle' || this.playState === 'finished') {
                _Engine2.default.queuedActions.push(this._renderer.render.bind(this._renderer));
            }

            // compute current progress based on the animation's progress
            // after a seek
            if (!this._onMainTimeline) {
                this._progress = this._renderer.easer.progress;
                this._onMainTimeline = true;
            }
        }

        /**
         * A number (Read Only) representing the duration of the Animator's main timeline 
         * in milliseconds.
         *
         * @type {Number} The duration.
         * @readonly
         *
         * @example
         * console.log(animator.duration); // e.g. 300
         * animator.duration = 400;        // NO EFFECT - READ ONLY
         */

    }, {
        key: 'duration',
        get: function get() {
            return this._duration;
        }

        /**
         * An object (Read Only) with the current value of each css property being animated. 
         *
         * @type {Object} The current values.
         * @readonly
         *
         * @example
         * console.log(animator.currentState); // e.g. { translateX: 300, translateY: 50 }
         * animator.currentState = {};         // NO EFFECT - READ ONLY
         */

    }, {
        key: 'currentState',
        get: function get() {
            var state = this._renderer.currentState;
            var props = Object.keys(state);
            var obj = {};

            for (var i = 0, l = props.length; i < l; i++) {
                obj[props[i]] = state[props[i]][0];
                if (state[props[i]][1]) obj[props[i]] += state[props[i]][1];
            }

            return obj;
        }
    }]);

    return Animator;
}();

function parseCSSProps(target, props) {
    var finalProps = {},
        prop = void 0;

    for (var p in props) {
        var val = props[p];

        switch (p) {
            case 'translateX':
            case 'translateY':
            case 'translateZ':
                if (isNaN(parseFloat(val))) break;
                finalProps[p] = [parseFloat(val)];
                finalProps[p][1] = typeof val === 'string' && val.indexOf('%') !== -1 ? '%' : 'px';
                break;
            case 'scale':
            case 'scaleX':
            case 'scaleY':
            case 'scaleZ':

                // normalize short-hand values
                if (p === 'scale') {
                    finalProps.scaleX = [parseFloat(val)];
                    finalProps.scaleY = [parseFloat(val)];
                } else {
                    if (typeof props.scale === 'undefined') {
                        finalProps[p] = [parseFloat(val)];
                    }
                }
                break;
            case 'opacity':
                finalProps[p] = [parseFloat(val)];
                break;
            case 'rotate':
            case 'rotateX':
            case 'rotateY':
            case 'rotateZ':
            case 'skew':
            case 'skewX':
            case 'skewY':

                // normalize short-hand values
                if (p === 'skew') prop = 'skewX';else if (p === 'rotate') prop = 'rotateZ';else prop = p;

                finalProps[prop] = [parseFloat(val)];
                finalProps[prop][1] = typeof val === 'string' && val.indexOf('rad') !== -1 ? 'rad' : 'deg';
                break;
            default:
                break;
        }
    }
    return Object.assign({}, finalProps);
}

// Function to test if an object is an HTMLElement or a NodeList using
// duck-typing.
function isElementOrNodeList(target) {
    try {
        if (!target) return false;
        return "style" in target || target.length > 0 && "style" in target[0];
    } catch (e) {
        return false;
    }
}

exports.default = Animator;

/**
 * Timing parameters for an animation.
 * @typedef {Object} TimingParameters
 *
 * @property {TimingFunction} [easing='ease'] - The timing function to apply.
 * @property {Number} [duration=400] - The duration for the animation. (Ignored if easing is set to 'spring').
 * @property {Number} [stiffness=100] - The stiffness (spring constant) of the spring.
 * @property {Number} [damping=20] - The damping (frictional force) applied to the spring.
 * @property {Number} [velocity=0] - The initial velocity of the spring.
 * @property {Number} [mass=1] - The mass of the spring.
 */

/**
 * A timing function: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "spring"
 * @typedef {String} TimingFunction
 */

/**
* An event fired by an Animator: "play" | "pause" | "finish"
* @typedef {String} AnimationEvent
*/

/**
 * A set of css properties and their values, defining a state or key frame of an animation.
 * @typedef {Object} AnimationPropertyList
 *
 * @property {Length} [translateX=0] - translateX. 
 * @property {Length} [translateY=0] - translateY.
 * @property {Length} [translateZ=0] - translateZ.
 * @property {Number} [scale=1] - A shorthand for scaleX and scaleY. Ignored if another scale-related property 
 *      is specified.
 * @property {Number} [scaleX=1] - scaleX.
 * @property {Number} [scaleY=1] - scaleY.
 * @property {Number} [opacity] - opacity.
 * @property {Angle} [rotate=0] - A shorthand for rotateZ. Ignored if another rotation-related property is specified.
 * @property {Angle} [rotateX=0] - rotateX.
 * @property {Angle} [rotateY=0] - rotateY.
 * @property {Angle} [rotateZ=0] - rotateZ.
 * @property {Angle} [skew=0] - A shorthand for skewX. Ignored if another skew-related property is specified.
 * @property {Angle} [skewX=0] - skewX.
 * @property {Angle} [skewY=0] - skewY.
 */

/**
 * A Length is a data type available to certain animatable css properties. It can be specified as a number (of pixels) or
 * a percentage. If no units are specified, px will be assumed.
 * @typedef {(Number|String)} Length
 *
 * @example
 * ...
 * {
 *      translateY: '50%',
 *      translateZ: 100
 *  }
 * ...
 */

/**
 * An Angle is a data type available to certain animatable css properties. It can be specified as a number (of degrees),
 * or in radians (e.g. '3.14rad').
 * @typedef {(Number|String)} Angle
 *
 * @example
 * ...
 * {
 *      rotate: 360,
 *      skewX: '2rad'
 * }
 * ...
 */

},{"../events/EventEmitter":6,"./Engine":3,"./rendering":5}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (mX1, mY1, mX2, mY2) {
    if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
        throw new Error('bezier x values must be in [0, 1] range');
    }

    // Precompute samples table
    var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
    if (mX1 !== mY1 || mX2 !== mY2) {
        for (var i = 0; i < kSplineTableSize; ++i) {
            sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
        }
    }

    function getTForX(aX) {
        var intervalStart = 0.0;
        var currentSample = 1;
        var lastSample = kSplineTableSize - 1;

        for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
            intervalStart += kSampleStepSize;
        }
        --currentSample;

        // Interpolate to provide an initial guess for t
        var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
        var guessForT = intervalStart + dist * kSampleStepSize;

        var initialSlope = getSlope(guessForT, mX1, mX2);
        if (initialSlope >= NEWTON_MIN_SLOPE) {
            return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
        } else if (initialSlope === 0.0) {
            return guessForT;
        } else {
            return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
        }
    }

    return function BezierEasing(x) {
        if (mX1 === mY1 && mX2 === mY2) {
            return x; // linear
        }
        // Because JavaScript number are imprecise, we should guarantee the extremes are right.
        if (x === 0) {
            return 0;
        }
        if (x === 1) {
            return 1;
        }
        return calcBezier(getTForX(x), mY1, mY2);
    };
};

/*
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

// These values are established by empiricism with tests (tradeoff: performance VS precision)
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = 0.001;
var SUBDIVISION_PRECISION = 0.0000001;
var SUBDIVISION_MAX_ITERATIONS = 10;

var kSplineTableSize = 11;
var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

var float32ArraySupported = typeof Float32Array === 'function';

function A(aA1, aA2) {
    return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}
function B(aA1, aA2) {
    return 3.0 * aA2 - 6.0 * aA1;
}
function C(aA1) {
    return 3.0 * aA1;
}

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier(aT, aA1, aA2) {
    return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope(aT, aA1, aA2) {
    return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}

function binarySubdivide(aX, aA, aB, mX1, mX2) {
    var currentX,
        currentT,
        i = 0;
    do {
        currentT = aA + (aB - aA) / 2.0;
        currentX = calcBezier(currentT, mX1, mX2) - aX;
        if (currentX > 0.0) {
            aB = currentT;
        } else {
            aA = currentT;
        }
    } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
    return currentT;
}

function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
    for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
        var currentSlope = getSlope(aGuessT, mX1, mX2);
        if (currentSlope === 0.0) {
            return aGuessT;
        }
        var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
        aGuessT -= currentX / currentSlope;
    }
    return aGuessT;
}

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var Engine = {
	windowWidth: window.innerWidth,
	windowHeight: window.innerHeight,
	runningAnimations: [],
	queuedActions: [],
	transformStyleProp: getPrefix('transform')
};

var lastTick = -1;

// Global handler for resize events
function handleResize() {
	Engine.windowWidth = window.innerWidth;
	Engine.windowHeight = window.innerHeight;
}

function stepAnimations(time) {
	if (lastTick === -1) lastTick = time;
	var i = void 0,
	    l = void 0;

	for (i = 0, l = Engine.runningAnimations.length; i < l; i++) {
		Engine.runningAnimations[i].tick(time - lastTick);
		Engine.runningAnimations[i].render();
	}

	for (i = 0, l = Engine.queuedActions.length; i < l; i++) {
		Engine.queuedActions.shift()();
	}

	Engine.runningAnimations = Engine.runningAnimations.filter(function (animation) {
		return animation.running;
	});
	lastTick = time;
	window.requestAnimationFrame(stepAnimations);
}

function getPrefix(prop) {
	var styles = document.createElement('p').style;
	var vendors = ['ms', 'O', 'Moz', 'Webkit'];

	if (styles[prop] === '') return prop;
	prop = prop.charAt(0).toUpperCase() + prop.slice(1);

	for (var i = vendors.length; i--;) {
		if (styles[vendors[i] + prop] === '') {
			return vendors[i] + prop;
		}
	}
}

window.addEventListener('resize', handleResize, false);
window.requestAnimationFrame(stepAnimations);

exports.default = Engine;

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

exports.createEaser = createEaser;

var _BezierEasing = require('./BezierEasing');

var _BezierEasing2 = _interopRequireDefault(_BezierEasing);

var _Spring = require('../physics/Spring');

var _Spring2 = _interopRequireDefault(_Spring);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

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

},{"../physics/Spring":8,"./BezierEasing":2}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.CSSRenderer = undefined;

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

exports.tweenProps = tweenProps;

var _easing = require('./easing');

var _Engine = require('./Engine');

var _Engine2 = _interopRequireDefault(_Engine);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

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

},{"./Engine":3,"./easing":4}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

/*
 * Based on:
 * https://gist.github.com/datchley/37353d6a2cb629687eb9
 */

var EventEmitter = function () {
	function EventEmitter() {
		_classCallCheck(this, EventEmitter);

		this.listeners = {};
	}

	_createClass(EventEmitter, [{
		key: 'addListener',
		value: function addListener(label, callback) {
			this.listeners[label] = this.listeners[label] || [];
			this.listeners[label].push(callback);
		}
	}, {
		key: 'removeListener',
		value: function removeListener(label, callback) {
			var listeners = this.listeners[label],
			    index = void 0;

			if (listeners && listeners.length) {
				index = listeners.reduce(function (i, listener, index) {
					return typeof listener === 'function' && listener === callback ? i = index : i;
				}, -1);

				if (index > -1) {
					listeners.splice(index, 1);
					this.listeners[label] = listeners;
					return true;
				}
			}
			return false;
		}
	}, {
		key: 'emit',
		value: function emit(label) {
			for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				args[_key - 1] = arguments[_key];
			}

			var listeners = this.listeners[label];

			if (listeners && listeners.length) {
				listeners.forEach(function (listener) {
					listener.apply(undefined, args);
				});
				return true;
			}
			return false;
		}
	}]);

	return EventEmitter;
}();

exports.default = EventEmitter;

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Animator = undefined;

var _Object = require('./polyfills/Object.assign');

var _Object2 = _interopRequireDefault(_Object);

var _isArray = require('./polyfills/isArray');

var _isArray2 = _interopRequireDefault(_isArray);

var _Animator = require('./animation/Animator');

var _Animator2 = _interopRequireDefault(_Animator);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

(0, _Object2.default)();
(0, _isArray2.default)();

window.Animator = _Animator2.default;
exports.Animator = _Animator2.default;

},{"./animation/Animator":1,"./polyfills/Object.assign":9,"./polyfills/isArray":10}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
/*
 * Adapted from:
 * http://iamralpht.github.io/physics/
 *
 * Simple Spring implementation -- this implements a damped spring using a symbolic integration
 * of Hooke's law: F = -kx - cv. This solution is significantly more performant and less code than
 * a numerical approach such as Facebook Rebound which uses RK4.
 *
 * This physics textbook explains the model:
 *  http://www.stewartcalculus.com/data/CALCULUS%20Concepts%20and%20Contexts/upfiles/3c3-AppsOf2ndOrders_Stu.pdf
 *
 * A critically damped spring has: damping*damping - 4 * mass * springConstant == 0. If it's greater than zero
 * then the spring is overdamped, if it's less than zero then it's underdamped.
 */
function Spring(mass, springConstant, damping, x, equilibrium, initialVelocity) {
    var _this = this;

    this.start = x;
    this.end = equilibrium; // equilibrium
    this._solution = null;

    var m = mass;
    var k = springConstant;
    var c = damping;
    var initial = x - equilibrium;
    var velocity = initialVelocity;

    // Solve the quadratic equation; root = (-c +/- sqrt(c^2 - 4mk)) / 2m.
    var cmk = c * c - 4 * m * k;

    // To compute the duration of the animation, we can look at two
    // functions which create an "envelope" bounding our position funciton x(t)
    // and thereby control the rate of exponential decay
    //
    //
    // They are of the form:
    // y1(t) =  A * e^rt   AND
    // y2(t) = -A * e^rt
    //
    // where A is the amplitude (maximum displacement) and r is one of the roots.
    //
    // When the value of these functions is within some threshold (epsilon) of
    // the equilibrium value, we can approximate that the system is both
    // close to its final value and that its oscillations have died down

    if (cmk === 0) {
        (function () {
            // The spring is critically damped.
            // x = (c1 + c2*t) * e ^(-c/2m)*t
            var r = -c / (2 * m);
            var c1 = initial;
            var c2 = velocity / (r * initial);

            var A = Math.sqrt(Math.pow(c1, 2) + Math.pow(c2, 2));
            var epsilon = 0.001;
            _this.duration = Math.log(epsilon / A) / r;

            _this._solution = {
                x: function x(t) {
                    return (c1 + c2 * t) * Math.pow(Math.E, r * t);
                },
                velocity: function velocity(t) {
                    var pow = Math.pow(Math.E, r * t);return r * (c1 + c2 * t) * pow + c2 * pow;
                }
            };
        })();
    } else if (cmk > 0) {
        (function () {
            // The spring is overdamped; no bounces.
            // x = c1*e^(r1*t) + c2*e^(r2t)
            // Need to find r1 and r2, the roots, then solve c1 and c2.
            var r1 = (-c - Math.sqrt(cmk)) / (2 * m);
            var r2 = (-c + Math.sqrt(cmk)) / (2 * m);
            var c2 = (velocity - r1 * initial) / (r2 - r1);
            var c1 = initial - c2;

            var A = Math.sqrt(Math.pow(c1, 2) + Math.pow(c2, 2));

            // The root that has the higher value will control the rate of decay
            var r = Math.max(r1, r2);
            var epsilon = 0.00025;
            _this.duration = Math.log(epsilon / A) / r;

            _this._solution = {
                x: function x(t) {
                    return c1 * Math.pow(Math.E, r1 * t) + c2 * Math.pow(Math.E, r2 * t);
                },
                velocity: function velocity(t) {
                    return c1 * r1 * Math.pow(Math.E, r1 * t) + c2 * r2 * Math.pow(Math.E, r2 * t);
                }
            };
        })();
    } else {
        (function () {
            // The spring is underdamped, it has imaginary roots.
            // r = -(c / 2*m) +- w*i
            // w = sqrt(4mk - c^2) / 2m
            // x = (e^-(c/2m)t) * (c1 * cos(wt) + c2 * sin(wt))
            var w = Math.sqrt(4 * m * k - c * c) / (2 * m);
            var r = -(c / 2 * m);
            var c1 = initial;
            var c2 = (velocity - r * initial) / w;

            var A = Math.sqrt(Math.pow(c1, 2) + Math.pow(c2, 2));
            var epsilon = 0.001;
            _this.duration = Math.log(epsilon / A) / r;

            _this._solution = {
                x: function x(t) {
                    return Math.pow(Math.E, r * t) * (c1 * Math.cos(w * t) + c2 * Math.sin(w * t));
                },
                velocity: function velocity(t) {
                    var power = Math.pow(Math.E, r * t);
                    var cos = Math.cos(w * t);
                    var sin = Math.sin(w * t);
                    return power * (c2 * w * cos - c1 * w * sin) + r * power * (c2 * sin + c1 * cos);
                }
            };
        })();
    }
}

Spring.prototype.x = function (dt) {
    return this.end + this._solution.x(dt);
};

Spring.prototype.velocity = function (dt) {
    return this._solution.velocity(dt);
};

Spring.prototype.atRest = function (dt, x) {
    return dt >= this.duration;
};

exports.default = Spring;

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function () {
    if (typeof Object.assign != 'function') {
        Object.assign = function (target) {
            'use strict';

            if (target == null) {
                // jshint ignore:line
                throw new TypeError('Cannot convert undefined or null to object');
            }

            target = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var source = arguments[index];
                if (source != null) {
                    // jshint ignore:line
                    for (var key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            target[key] = source[key];
                        }
                    }
                }
            }
            return target;
        };
    }
};

},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function () {
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }
};

},{}]},{},[7])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYW5pbWF0aW9uL0FuaW1hdG9yLmpzIiwic3JjL2FuaW1hdGlvbi9CZXppZXJFYXNpbmcuanMiLCJzcmMvYW5pbWF0aW9uL0VuZ2luZS5qcyIsInNyYy9hbmltYXRpb24vZWFzaW5nLmpzIiwic3JjL2FuaW1hdGlvbi9yZW5kZXJpbmcuanMiLCJzcmMvZXZlbnRzL0V2ZW50RW1pdHRlci5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9waHlzaWNzL1NwcmluZy5qcyIsInNyYy9wb2x5ZmlsbHMvT2JqZWN0LmFzc2lnbi5qcyIsInNyYy9wb2x5ZmlsbHMvaXNBcnJheS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7Ozs7OztBQUVBLElBQU07Z0JBQ1UsQ0FBQSxBQUFDLEdBRFMsQUFDVixBQUFJLEFBQ2hCO2dCQUFZLENBQUEsQUFBQyxHQUZTLEFBRVYsQUFBSSxBQUNoQjtnQkFBWSxDQUFBLEFBQUMsR0FIUyxBQUdWLEFBQUksQUFDaEI7WUFBUSxDQUpjLEFBSWQsQUFBQyxBQUNUO1lBQVEsQ0FMYyxBQUtkLEFBQUMsQUFDVDtZQUFRLENBTmMsQUFNZCxBQUFDLEFBQ1Q7YUFBUyxDQUFBLEFBQUMsR0FQWSxBQU9iLEFBQUksQUFDYjthQUFTLENBQUEsQUFBQyxHQVJZLEFBUWIsQUFBSSxBQUNiO2FBQVMsQ0FBQSxBQUFDLEdBVFksQUFTYixBQUFJLEFBQ2I7V0FBTyxDQUFBLEFBQUMsR0FWYyxBQVVmLEFBQUksQUFDWDtXQUFPLENBQUEsQUFBQyxHQVhaLEFBQTBCLEFBV2YsQUFBSTtBQVhXLEFBQ3RCOztBQWFKOzs7Ozs7OztJLEFBT00sdUJBRUY7O0FBa0JBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7c0JBQUEsQUFBWSxRQUFaLEFBQW9CLE9BQThCO1lBQXZCLEFBQXVCLHVGQUFKLEFBQUk7OzhCQUM5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QixBQUllOzs7Ozs7Ozs7a0JDbkhBLFlBQVcsQUFDdEI7UUFBSSxPQUFPLE9BQVAsQUFBYyxVQUFsQixBQUE0QixZQUFZLEFBQ3BDO2VBQUEsQUFBTyxTQUFTLFVBQUEsQUFBUyxRQUFRLEFBQzdCO0FBQ0E7O2dCQUFJLFVBQUosQUFBYyxNQUFNLEFBQUU7QUFDbEI7c0JBQU0sSUFBQSxBQUFJLFVBQVYsQUFBTSxBQUFjLEFBQ3ZCO0FBRUQ7O3FCQUFTLE9BQVQsQUFBUyxBQUFPLEFBQ2hCO2lCQUFLLElBQUksUUFBVCxBQUFpQixHQUFHLFFBQVEsVUFBNUIsQUFBc0MsUUFBdEMsQUFBOEMsU0FBUyxBQUNuRDtvQkFBSSxTQUFTLFVBQWIsQUFBYSxBQUFVLEFBQ3ZCO29CQUFJLFVBQUosQUFBYyxNQUFNLEFBQUU7QUFDbEI7eUJBQUssSUFBTCxBQUFTLE9BQVQsQUFBZ0IsUUFBUSxBQUNwQjs0QkFBSSxPQUFBLEFBQU8sVUFBUCxBQUFpQixlQUFqQixBQUFnQyxLQUFoQyxBQUFxQyxRQUF6QyxBQUFJLEFBQTZDLE1BQU0sQUFDbkQ7bUNBQUEsQUFBTyxPQUFPLE9BQWQsQUFBYyxBQUFPLEFBQ3hCO0FBQ0o7QUFDSjtBQUNKO0FBQ0Q7bUJBQUEsQUFBTyxBQUNWO0FBbEJELEFBbUJIO0FBQ0o7QTs7Ozs7Ozs7O2tCQ3RCYyxZQUFXLEFBQ3RCO1FBQUksQ0FBQyxNQUFMLEFBQVcsU0FBUyxBQUNoQjtjQUFBLEFBQU0sVUFBVSxVQUFBLEFBQVMsS0FBSyxBQUMxQjttQkFBTyxPQUFBLEFBQU8sVUFBUCxBQUFpQixTQUFqQixBQUEwQixLQUExQixBQUErQixTQUF0QyxBQUErQyxBQUNsRDtBQUZELEFBR0g7QUFDSjtBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBFbmdpbmUgZnJvbSAnLi9FbmdpbmUnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuLi9ldmVudHMvRXZlbnRFbWl0dGVyJztcbmltcG9ydCB7IENTU1JlbmRlcmVyLCB0d2VlblByb3BzIH0gZnJvbSAnLi9yZW5kZXJpbmcnO1xuXG5jb25zdCBERUZBVUxUX1RSQU5TRk9STSA9IHtcbiAgICB0cmFuc2xhdGVYOiBbMCwgJ3B4J10sXG4gICAgdHJhbnNsYXRlWTogWzAsICdweCddLFxuICAgIHRyYW5zbGF0ZVo6IFswLCAncHgnXSxcbiAgICBzY2FsZVg6IFsxXSxcbiAgICBzY2FsZVk6IFsxXSxcbiAgICBzY2FsZVo6IFsxXSxcbiAgICByb3RhdGVYOiBbMCwgJ2RlZyddLFxuICAgIHJvdGF0ZVk6IFswLCAnZGVnJ10sXG4gICAgcm90YXRlWjogWzAsICdkZWcnXSxcbiAgICBza2V3WDogWzAsICdkZWcnXSxcbiAgICBza2V3WTogWzAsICdkZWcnXVxufTtcblxuLyoqXG4gKiBBbiBBbmltYXRvciBhbGxvd3MgeW91IHRvIGFuaW1hdGUgY2hhbmdlcyB0byB0aGUgY3NzIHByb3BlcnRpZXMgb2Ygb25lIG9yIG1vcmUgRE9NIEVsZW1lbnRzLlxuICogWW91IGNhbiBjb250cm9sIHRoZSByYXRlIG9mIHBsYXliYWNrIHVzaW5nIHRpbWluZyBwYXJhbWV0ZXJzLCBvciBjcmVhdGUgYW4gaW50ZXJhY3RpdmUgYW5pbWF0aW9uXG4gKiBieSBzY3J1YmJpbmcgdGhyb3VnaCB0aGUgcHJvcGVydHkgdmFsdWVzIG1hbnVhbGx5LlxuICpcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBBbmltYXRvciB7XG5cbiAgICAvKipcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0geyhIVE1MRWxlbWVudHxOb2RlTGlzdCl9IHRhcmdldCAtIFRoZSBFbGVtZW50IG9yIE5vZGVMaXN0IGJlaW5nIGFuaW1hdGVkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcm9wcyAtIFRoZSBzdGFydCBhbmQgZW5kIHZhbHVlcyBmb3IgdGhlIGNzcyBwcm9wZXJ0aWVzIGJlaW5nIGFuaW1hdGVkLlxuICAgICAqIEBwYXJhbSB7QW5pbWF0aW9uUHJvcGVydHlMaXN0fSBwcm9wcy50byAtIFRoZSBzdGFydCBzdGF0ZSBvZiB0aGUgYW5pbWF0aW9uLlxuICAgICAqIEBwYXJhbSB7QW5pbWF0aW9uUHJvcGVydHlMaXN0fSBwcm9wcy5mcm9tIC0gVGhlIGVuZCBzdGF0ZSBvZiB0aGUgYW5pbWF0aW9uLlxuICAgICAqIEBwYXJhbSB7VGltaW5nUGFyYW1ldGVyc30gW3RpbWluZ1BhcmFtZXRlcnM9e31dIC0gUGxheWJhY2sgYW5kIHRpbWluZyBvcHRpb25zLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiB2YXIgYW5pbWF0b3IgPSBuZXcgQW5pbWF0b3IoYm94LCB7XG4gICAgICogICAgICBmcm9tOiB7IHRyYW5zbGF0ZVg6IDAsICAgcm90YXRlOiAwICAgfSxcbiAgICAgKiAgICAgIHRvOiAgIHsgdHJhbnNsYXRlWDogMTAwLCByb3RhdGU6IDM2MCB9XG4gICAgICogfSwge1xuICAgICAqICAgICAgZWFzaW5nOiAnc3ByaW5nJyxcbiAgICAgKiAgICAgIHN0aWZmbmVzczogMTAwLFxuICAgICAqICAgICAgZGFtcGluZzogMjBcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQsIHByb3BzLCB0aW1pbmdQYXJhbWV0ZXJzID0ge30pIHtcbiAgICAgICAgaWYgKCFpc0VsZW1lbnRPck5vZGVMaXN0KHRhcmdldCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RhcmdldCBtdXN0IGJlIGFuIEhUTUxFbGVtZW50IG9yIGEgTm9kZUxpc3QuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXByb3BzLmZyb20gfHwgIXByb3BzLnRvKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHByb3BlcnR5IHZhbHVlcy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2V2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgICAgICB0aGlzLl9wbGF5U3RhdGUgID0gJ2lkbGUnO1xuICAgICAgICB0aGlzLl9wcm9ncmVzcyAgID0gMDtcbiAgICAgICAgdGhpcy5faXNSZXZlcnNlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEtlZXAgdHJhY2sgb2Ygd2hhdCB0aGUgc3RhdGUgb2YgdGhlIG1haW4gdGltZWxpbmUgaXNcbiAgICAgICAgdGhpcy5fZGVmYXVsdFRpbWluZ1BhcmFtZXRlcnMgPSB0aW1pbmdQYXJhbWV0ZXJzO1xuICAgICAgICB0aGlzLl9vbk1haW5UaW1lbGluZSA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5fdGFyZ2V0ID0geyBcbiAgICAgICAgICAgIGVsZW1lbnQ6IHRhcmdldCwgXG4gICAgICAgICAgICB2YWx1ZXM6IFtcbiAgICAgICAgICAgICAgICBwYXJzZUNTU1Byb3BzKHRhcmdldCwgcHJvcHMuZnJvbSksIFxuICAgICAgICAgICAgICAgIHBhcnNlQ1NTUHJvcHModGFyZ2V0LCBwcm9wcy50bylcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgZGVmYXVsdFRyYW5zZm9ybVByb3BzID0gT2JqZWN0LmtleXMoREVGQVVMVF9UUkFOU0ZPUk0pLFxuICAgICAgICAgICAgdG9Qcm9wcyA9IE9iamVjdC5rZXlzKHRoaXMuX3RhcmdldC52YWx1ZXNbMV0pLFxuICAgICAgICAgICAgaSwgbCwgcDtcblxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gZGVmYXVsdFRyYW5zZm9ybVByb3BzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl90YXJnZXQudmFsdWVzWzBdW2RlZmF1bHRUcmFuc2Zvcm1Qcm9wc1tpXV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFyZ2V0LnZhbHVlc1swXVtkZWZhdWx0VHJhbnNmb3JtUHJvcHNbaV1dID0gREVGQVVMVF9UUkFOU0ZPUk1bZGVmYXVsdFRyYW5zZm9ybVByb3BzW2ldXS5zbGljZSgwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fdGFyZ2V0LnZhbHVlc1sxXVtkZWZhdWx0VHJhbnNmb3JtUHJvcHNbaV1dID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhcmdldC52YWx1ZXNbMV1bZGVmYXVsdFRyYW5zZm9ybVByb3BzW2ldXSA9IERFRkFVTFRfVFJBTlNGT1JNW2RlZmF1bHRUcmFuc2Zvcm1Qcm9wc1tpXV0uc2xpY2UoMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gdG9Qcm9wcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdG9Qcm9wc1tpXSA9PT0gJ3VuZGVmaW5lZCcpIHRocm93IG5ldyBFcnJvcignVGFyZ2V0IHZhbHVlIGZvciBcIicrdG9Qcm9wc1tpXSsnXCIgbm90IHNwZWNpZmllZC4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSBuZXcgQ1NTUmVuZGVyZXIoXG4gICAgICAgICAgICB0YXJnZXQsIFxuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0LnZhbHVlcywgXG4gICAgICAgICAgICB0aW1pbmdQYXJhbWV0ZXJzLCBcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVRpY2tIYW5kbGVyKDApXG4gICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5fZHVyYXRpb24gPSB0aGlzLl9yZW5kZXJlci5kdXJhdGlvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eSAoYmV0d2VlbiAwLjAgYW5kIDEuMCkgcmVwcmVzZW50cyB0aGUgcHJvZ3Jlc3Mgb2YgdGhlIEFuaW1hdG9yIGJldHdlZW4gaXRzIHN0YXJ0IFxuICAgICAqIGFuZCBlbmQgc3RhdGVzLiBUaGUgdmFsdWUgaXMgaW5kZXBlbmRlbnQgb2YgdGltZS4gRm9yIGV4YW1wbGUsIGlmIGFuIFwiZWFzZS1vdXRcIiB0aW1pbmcgZnVuY3Rpb24gaXMgdXNlZCwgXG4gICAgICogdGhlIHZhbHVlIG1heSBpbmNyZWFzZSBtb3JlIHF1aWNrbHkgYXQgdGhlIHN0YXJ0IG9mIGFuIGFuaW1hdGlvbiBhbmQgc2xvdyBkb3duIGFzIGl0IHJlYWNoZXMgaXRzIGVuZC4gXG4gICAgICogSW4gc29tZSBjYXNlcywgdGhlIHZhbHVlIG1heSBiZSBsZXNzIHRoYW4gMC4wIG9yIGdyZWF0ZXIgdGhhbiAxLjAuIFdoZW4gdXNpbmcgc3ByaW5nIHBoeXNpY3MsIGEgcHJvcGVydHkgXG4gICAgICogbWF5IG92ZXJzaG9vdCBpdHMgdGFyZ2V0IHZhbHVlIGFuZCBvc2NpbGxhdGUgYmVmb3JlIHNldHRsaW5nIGF0IGFuIGVxdWlsaWJpcnVtIHBvc2l0aW9uLiBDaGFuZ2luZyB0aGUgXG4gICAgICogdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eSBpbnRlcnJ1cHRzIHRoZSBBbmltYXRvciBhbmQgbW92ZXMgaXQgdG8gdGhlIFwic3RvcHBlZFwiIHN0YXRlLlxuICAgICAqXG4gICAgICogQHR5cGUge051bWJlcn0gVGhlIGNvbXBsZXRpb24gcGVyY2VudGFnZS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc29sZS5sb2coYW5pbWF0b3IucHJvZ3Jlc3MpIC8vIHJlYWRcbiAgICAgKiBhbmltYXRvci5wcm9ncmVzcyA9IDAuNTsgICAgICAgLy8gd3JpdGVcbiAgICAgKi9cbiAgICBnZXQgcHJvZ3Jlc3MoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcm9ncmVzcztcbiAgICB9XG5cbiAgICBzZXQgcHJvZ3Jlc3ModmFsKSB7XG4gICAgICAgIGlmIChpc05hTih2YWwpKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy5fcGxheVN0YXRlID0gJ3N0b3BwZWQnO1xuICAgICAgICB0aGlzLl9wcm9ncmVzcyAgPSBwYXJzZUZsb2F0KHZhbCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9yZW5kZXJlci5zdG9wKCk7XG4gICAgICAgIEVuZ2luZS5xdWV1ZWRBY3Rpb25zLnB1c2goIFxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyZXIucmVuZGVyLmJpbmQodGhpcy5fcmVuZGVyZXIsIFxuICAgICAgICAgICAgICAgIHR3ZWVuUHJvcHModGhpcy5fcHJvZ3Jlc3MsIHRoaXMuX3RhcmdldC52YWx1ZXNbMF0sIHRoaXMuX3RhcmdldC52YWx1ZXNbMV0pXG4gICAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGN1cnJlbnQgcGxheSBzdGF0ZSBvZiB0aGUgQW5pbWF0b3IgKFJlYWQgT25seSkuIEFuIEFuaW1hdG9yIGlzIFwiaWRsZVwiIHdoZW4gaXQgaXMgZmlyc3QgY3JlYXRlZCBiZWZvcmUgYW55IFxuICAgICAqIGNvbW1hbmRzIGhhdmUgYmVlbiBzZW50LiBBZnRlciB0aGUgXCJwbGF5XCIgbWV0aG9kIGlzIGZpcnN0IGNhbGxlZCwgaXQgaXMgaW4gdGhlIFwicnVubmluZ1wiIHN0YXRlIHdoZW4gcGxheWluZ1xuICAgICAqIGFuZCBpbiB0aGUgXCJwYXVzZWRcIiBzdGF0ZSB3aGVuIHBhdXNlZC4gV2hlbiBhbiBhbmltYXRpb24gcmVhY2hlcyBpdHMgdGFyZ2V0IHZhbHVlIHRoZSBBbmltYXRvciBpcyBpbiB0aGVcbiAgICAgKiBcImZpbmlzaGVkXCIgc3RhdGUuIElmIHRoZSBzdG9wIG1ldGhvZCBpcyBjYWxsZWQsIHRoZSBBbmltYXRvciBpcyBpbiB0aGUgXCJzdG9wcGVkXCIgc3RhdGUuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7U3RyaW5nfSBUaGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgQW5pbWF0b3IuXG4gICAgICogQHJlYWRvbmx5XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnNvbGUubG9nKGFuaW1hdG9yLnBsYXlTdGF0ZSk7IC8vIGUuZy4gJ3J1bm5pbmcnXG4gICAgICogYW5pbWF0b3IucGxheVN0YXRlID0gJ3BhdXNlZCc7ICAgLy8gTk8gRUZGRUNUISAtIFJFQUQgT05MWVxuICAgICAqL1xuICAgIGdldCBwbGF5U3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5U3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSWYgdHJ1ZSwgdGhlIEFuaW1hdG9yIGlzIGFuaW1hdGluZyBpbiByZXZlcnNlLCBiYWNrIHRvd2FyZHMgaXRzIG9yaWdpbmFsIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtCb29sZWFufSBJcyB0aGUgQW5pbWF0b3IgcnVubmluZyBpbiByZXZlcnNlP1xuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zb2xlLmxvZyhhbmltYXRvci5pc1JldmVyc2VkKTsgLy8gZS5nLiBmYWxzZVxuICAgICAqIGFuaW1hdG9yLmlzUmV2ZXJzZWQgPSB0cnVlOyAgICAgICAvLyBwbGF5IGJhY2t3YXJkc1xuICAgICAqL1xuICAgIGdldCBpc1JldmVyc2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNSZXZlcnNlZDtcbiAgICB9XG5cbiAgICBzZXQgaXNSZXZlcnNlZChib29sKSB7XG4gICAgICAgIHRoaXMuX2lzUmV2ZXJzZWQgPSAhIWJvb2w7XG5cbiAgICAgICAgaWYgKHRoaXMucGxheVN0YXRlICE9PSAnc3RvcHBlZCcpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVyLnBsYXliYWNrUmF0ZSAqPSAtMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fb25NYWluVGltZWxpbmUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJlci5zdG9wKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGxheVN0YXRlID0gJ3N0b3BwZWQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQSBudW1iZXIgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IHRpbWUgb2YgdGhlIHJ1bm5pbmcgYW5pbWF0aW9uIGluIG1pbGxpc2Vjb25kcyBvciBudWxsIG9yIFxuICAgICAqIGlmIHRoZSBBbmltYXRvciBpcyBpbiB0aGUgXCJzdG9wcGVkXCIgc3RhdGUuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7P051bWJlcn0gVGhlIGN1cnJlbnQgdGltZS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc29sZS5sb2coYW5pbWF0b3IuY3VycmVudFRpbWUpOyAvLyBlLmcuIDMwMFxuICAgICAqIGFuaW1hdG9yLmN1cnJlbnRUaW1lID0gNDAwOyAgICAgICAgLy8gc2VlayB0byB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBnZXQgY3VycmVudFRpbWUoKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXlTdGF0ZSA9PT0gJ3N0b3BwZWQnKSByZXR1cm4gbnVsbDtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlbmRlcmVyLmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHNldCBjdXJyZW50VGltZSh2YWwpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vbk1haW5UaW1lbGluZSkge1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVyZXIuc3RvcCgpO1xuXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlciA9IG5ldyBDU1NSZW5kZXJlcihcbiAgICAgICAgICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudCxcbiAgICAgICAgICAgICAgICB0aGlzLl90YXJnZXQudmFsdWVzLFxuICAgICAgICAgICAgICAgIHRoaXMuX2RlZmF1bHRUaW1pbmdQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVRpY2tIYW5kbGVyKDApXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlci5wYXVzZSgpO1xuICAgICAgICAgICAgRW5naW5lLnJ1bm5pbmdBbmltYXRpb25zLnB1c2godGhpcy5fcmVuZGVyZXIpO1xuICAgICAgICAgICAgdGhpcy5fcGxheVN0YXRlID0gKHRoaXMucGxheVN0YXRlID09PSAnZmluaXNoZWQnKSA/ICdmaW5pc2hlZCcgOiAncGF1c2VkJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIuc2VlayggcGFyc2VGbG9hdCh2YWwpICk7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9vbk1haW5UaW1lbGluZSkge1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVyZXIucGxheWJhY2tSYXRlID0gKHRoaXMuX2lzUmV2ZXJzZWQpID8gLTEgOiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMucGxheVN0YXRlID09PSAnaWRsZScgfHwgdGhpcy5wbGF5U3RhdGUgPT09ICdmaW5pc2hlZCcpIHtcbiAgICAgICAgICAgIEVuZ2luZS5xdWV1ZWRBY3Rpb25zLnB1c2godGhpcy5fcmVuZGVyZXIucmVuZGVyLmJpbmQodGhpcy5fcmVuZGVyZXIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbXB1dGUgY3VycmVudCBwcm9ncmVzcyBiYXNlZCBvbiB0aGUgYW5pbWF0aW9uJ3MgcHJvZ3Jlc3NcbiAgICAgICAgLy8gYWZ0ZXIgYSBzZWVrXG4gICAgICAgIGlmICghdGhpcy5fb25NYWluVGltZWxpbmUpIHtcbiAgICAgICAgICAgIHRoaXMuX3Byb2dyZXNzID0gdGhpcy5fcmVuZGVyZXIuZWFzZXIucHJvZ3Jlc3M7XG4gICAgICAgICAgICB0aGlzLl9vbk1haW5UaW1lbGluZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBIG51bWJlciAoUmVhZCBPbmx5KSByZXByZXNlbnRpbmcgdGhlIGR1cmF0aW9uIG9mIHRoZSBBbmltYXRvcidzIG1haW4gdGltZWxpbmUgXG4gICAgICogaW4gbWlsbGlzZWNvbmRzLlxuICAgICAqXG4gICAgICogQHR5cGUge051bWJlcn0gVGhlIGR1cmF0aW9uLlxuICAgICAqIEByZWFkb25seVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zb2xlLmxvZyhhbmltYXRvci5kdXJhdGlvbik7IC8vIGUuZy4gMzAwXG4gICAgICogYW5pbWF0b3IuZHVyYXRpb24gPSA0MDA7ICAgICAgICAvLyBOTyBFRkZFQ1QgLSBSRUFEIE9OTFlcbiAgICAgKi9cbiAgICBnZXQgZHVyYXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kdXJhdGlvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBbiBvYmplY3QgKFJlYWQgT25seSkgd2l0aCB0aGUgY3VycmVudCB2YWx1ZSBvZiBlYWNoIGNzcyBwcm9wZXJ0eSBiZWluZyBhbmltYXRlZC4gXG4gICAgICpcbiAgICAgKiBAdHlwZSB7T2JqZWN0fSBUaGUgY3VycmVudCB2YWx1ZXMuXG4gICAgICogQHJlYWRvbmx5XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnNvbGUubG9nKGFuaW1hdG9yLmN1cnJlbnRTdGF0ZSk7IC8vIGUuZy4geyB0cmFuc2xhdGVYOiAzMDAsIHRyYW5zbGF0ZVk6IDUwIH1cbiAgICAgKiBhbmltYXRvci5jdXJyZW50U3RhdGUgPSB7fTsgICAgICAgICAvLyBOTyBFRkZFQ1QgLSBSRUFEIE9OTFlcbiAgICAgKi9cbiAgICBnZXQgY3VycmVudFN0YXRlKCkge1xuICAgICAgICBsZXQgc3RhdGUgPSB0aGlzLl9yZW5kZXJlci5jdXJyZW50U3RhdGU7XG4gICAgICAgIGxldCBwcm9wcyA9IE9iamVjdC5rZXlzKHN0YXRlKTtcbiAgICAgICAgbGV0IG9iaiAgID0ge307XG5cbiAgICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHByb3BzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgb2JqW3Byb3BzW2ldXSA9IHN0YXRlW3Byb3BzW2ldXVswXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZVtwcm9wc1tpXV1bMV0pIG9ialtwcm9wc1tpXV0gKz0gc3RhdGVbcHJvcHNbaV1dWzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXN1bWUgcGxheWJhY2sgb2YgdGhlIGFuaW1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBtZXRob2RcbiAgICAgKiBAcmV0dXJucyB7QW5pbWF0b3J9XG4gICAgICovXG4gICAgcGxheSgpIHtcbiAgICAgICAgaWYgKHRoaXMucGxheVN0YXRlID09PSAnc3RvcHBlZCcgfHwgdGhpcy5wbGF5U3RhdGUgPT09ICdydW5uaW5nJykgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnBsYXlTdGF0ZSA9PT0gJ2lkbGUnIHx8IHRoaXMucGxheVN0YXRlID09PSAnZmluaXNoZWQnKSB7XG4gICAgICAgICAgICBFbmdpbmUucnVubmluZ0FuaW1hdGlvbnMucHVzaCh0aGlzLl9yZW5kZXJlcik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9yZW5kZXJlci5wbGF5KCk7XG4gICAgICAgIHRoaXMuX3BsYXlTdGF0ZSA9ICdydW5uaW5nJztcbiAgICAgICAgdGhpcy5fZXZlbnRzLmVtaXQoJ3BsYXknKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGF1c2UgcGxheWJhY2sgb2YgdGhlIGFuaW1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBtZXRob2RcbiAgICAgKiBAcmV0dXJucyB7QW5pbWF0b3J9XG4gICAgICovXG4gICAgcGF1c2UoKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXlTdGF0ZSAhPT0gJ3J1bm5pbmcnKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy5fcmVuZGVyZXIucGF1c2UoKTtcbiAgICAgICAgdGhpcy5fcGxheVN0YXRlID0gJ3BhdXNlZCc7XG4gICAgICAgIHRoaXMuX2V2ZW50cy5lbWl0KCdwYXVzZScpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdG9wIHBsYXliYWNrIG9mIHRoZSBhbmltYXRpb24gYW5kIHJlbW92ZSBpdHMgdGltZWxpbmUuIFRoZSBBbmltYXRvciB3aWxsIG5lZWQgdG8gYmVcbiAgICAgKiByZS1jb25maWd1cmVkIGJ5IGNhbGxpbmcgXCJjb250aW51ZVwiIGluIG9yZGVyIGZvciBwbGF5YmFjayB0byBiZSByZXN1bWVkLlxuICAgICAqXG4gICAgICogQG1ldGhvZFxuICAgICAqIEByZXR1cm5zIHtBbmltYXRvcn1cbiAgICAgKi9cbiAgICBzdG9wKCkgeyAgICAgXG4gICAgICAgIHRoaXMuX3JlbmRlcmVyLnN0b3AoKTsgXG4gICAgICAgIHRoaXMuX3BsYXlTdGF0ZSA9ICdzdG9wcGVkJztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RvcCB0aGUgYW5pbWF0aW9uIGFuZCB0ZW1wb3JhcmlseSBjcmVhdGUgYSBuZXcgb25lIHRoYXQgcHJvY2VlZHMgaW4gdGhlIHNhbWUgXG4gICAgICogZGlyZWN0aW9uIChiYXNlZCBvbiB0aGUgY3VycmVudCB2YWx1ZSBvZiBcImlzUmV2ZXJzZWRcIikuIFVzZWZ1bCBpZiB5b3UgbmVlZCB0byBcbiAgICAgKiBpbnRlcnJ1cHQgYW4gYW5pbWF0aW9uIChGb3IgZXhhbXBsZSBkdXJpbmcgYSB1c2VyIGdlc3R1cmUpLCBhbmQgc2VuZCB0aGUgdGFyZ2V0IFxuICAgICAqIGVsZW1lbnQgdG93YXJkcyB0aGUgc3RhcnQgb3IgZW5kIHN0YXRlIHdpdGggYSBkaWZmZXJlbnQgc2V0IG9mIHRpbWluZyBwYXJhbWV0ZXJzLiBcbiAgICAgKiBXaGVuIHRoZSBuZXcgYW5pbWF0aW9uIHJlYWNoZXMgaXRzIFwiZmluaXNoZWRcIiBzdGF0ZSwgY29udHJvbCBpcyByZXR1cm5lZCB0byB0aGUgXG4gICAgICogbWFpbiB0aW1lbGluZS5cbiAgICAgKlxuICAgICAqIEBtZXRob2RcbiAgICAgKiBAcGFyYW0ge1RpbWluZ1BhcmFtZXRlcnN9IFt0aW1pbmdQYXJhbWV0ZXJzPXt9XSAtIFBsYXliYWNrIGFuZCB0aW1pbmcgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7QW5pbWF0b3J9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGFuaW1hdG9yLmNvbnRpbnVlKHtcbiAgICAgKiAgICAgIGVhc2luZzogJ3NwcmluZycsXG4gICAgICogICAgICBzdGlmZm5lc3M6IDEwMCxcbiAgICAgKiAgICAgIGRhbXBpbmc6IDIwXG4gICAgICogfSk7XG4gICAgICovXG4gICAgY29udGludWUodGltaW5nUGFyYW1ldGVycyA9IHt9KSB7XG4gICAgICAgIHRoaXMuX29uTWFpblRpbWVsaW5lID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3BsYXlTdGF0ZSAgPSAnaWRsZSc7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyLnN0b3AoKTtcblxuICAgICAgICBsZXQgc3RhcnRTdGF0ZSA9IHR3ZWVuUHJvcHModGhpcy5fcHJvZ3Jlc3MsIHRoaXMuX3RhcmdldC52YWx1ZXNbMF0sIHRoaXMuX3RhcmdldC52YWx1ZXNbMV0pO1xuICAgICAgICBsZXQgZW5kU3RhdGUgICA9ICghdGhpcy5faXNSZXZlcnNlZCkgPyB0aGlzLl90YXJnZXQudmFsdWVzWzFdIDogdGhpcy5fdGFyZ2V0LnZhbHVlc1swXTtcblxuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IG5ldyBDU1NSZW5kZXJlcihcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LFxuICAgICAgICAgICAgWyBzdGFydFN0YXRlLCBlbmRTdGF0ZSBdLFxuICAgICAgICAgICAgdGltaW5nUGFyYW1ldGVycyxcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVRpY2tIYW5kbGVyKHRoaXMucHJvZ3Jlc3MpXG4gICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBhbiBldmVudCBsaXN0ZW5lciB0byB0aGUgQW5pbWF0b3IuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kXG4gICAgICogQHBhcmFtIHtBbmltYXRpb25FdmVudH0gbGFiZWwgLSBUaGUgdHlwZSBvZiBldmVudCB0byBsaXN0ZW4gZm9yLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7QW5pbWF0b3J9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGFuaW1hdG9yLm9uKCdmaW5pc2gnLCBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAqICAgICAgaWYgKHByb2dyZXNzID09PSAxKSBjb25zb2xlLmxvZygnZmluaXNoZWQuJyk7XG4gICAgICogICAgICBpZiAocHJvZ3Jlc3MgPT09IDApIGNvbnNvbGUubG9nKCdmaW5pc2hlZCBpbiByZXZlcnNlLicpO1xuICAgICAqIH0pO1xuICAgICAqL1xuICAgIG9uKGxhYmVsLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9ldmVudHMuYWRkTGlzdGVuZXIobGFiZWwsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGFuIGV2ZW50IGxpc3RlbmVyIGZyb20gdGhlIEFuaW1hdG9yLlxuICAgICAqXG4gICAgICogQG1ldGhvZFxuICAgICAqIEBwYXJhbSB7QW5pbWF0aW9uRXZlbnR9IGxhYmVsIC0gVGhlIHR5cGUgb2YgZXZlbnQgdG8gbGlzdGVuIGZvci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEEgcmVmZXJlbmNlIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSByZW1vdmVkLlxuICAgICAqIEByZXR1cm5zIHtBbmltYXRvcn1cbiAgICAgKi9cbiAgICBvZmYobGFiZWwsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcihsYWJlbCwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBfY3JlYXRlVGlja0hhbmRsZXIoc3RhcnRpbmdQcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gKHByb2dyZXNzLCBjdXJyZW50VGltZSwgcnVubmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1JldmVyc2VkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvZ3Jlc3MgPSBzdGFydGluZ1Byb2dyZXNzICsgKHByb2dyZXNzICogKDEgLSBzdGFydGluZ1Byb2dyZXNzKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb2dyZXNzID0gc3RhcnRpbmdQcm9ncmVzcyAtIChwcm9ncmVzcyAqIHN0YXJ0aW5nUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wbGF5U3RhdGUgPSAnZmluaXNoZWQnO1xuICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50cy5lbWl0KCdmaW5pc2gnLCB0aGlzLnByb2dyZXNzKTtcblxuICAgICAgICAgICAgICAgIC8vIHJldHVybiBjb250cm9sIHRvIHRoZSBtYWluIHRpbWVsaW5lXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9vbk1haW5UaW1lbGluZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wcm9ncmVzcyA+PSAxKSB0aGlzLmN1cnJlbnRUaW1lID0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0aGlzLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTU1Byb3BzKHRhcmdldCwgcHJvcHMpIHtcbiAgICBsZXQgZmluYWxQcm9wcyA9IHt9LCBwcm9wO1xuXG4gICAgZm9yICh2YXIgcCBpbiBwcm9wcykge1xuICAgICAgICBsZXQgdmFsID0gcHJvcHNbcF07XG5cbiAgICAgICAgc3dpdGNoKHApIHtcbiAgICAgICAgICAgIGNhc2UgJ3RyYW5zbGF0ZVgnOlxuICAgICAgICAgICAgY2FzZSAndHJhbnNsYXRlWSc6XG4gICAgICAgICAgICBjYXNlICd0cmFuc2xhdGVaJzpcbiAgICAgICAgICAgICAgICBpZiAoIGlzTmFOKHBhcnNlRmxvYXQodmFsKSkgKSBicmVhaztcbiAgICAgICAgICAgICAgICBmaW5hbFByb3BzW3BdID0gW3BhcnNlRmxvYXQodmFsKV07XG4gICAgICAgICAgICAgICAgZmluYWxQcm9wc1twXVsxXSA9ICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJyAmJiB2YWwuaW5kZXhPZignJScpICE9PSAtMSkgPyAnJScgOiAncHgnOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjYWxlJzpcbiAgICAgICAgICAgIGNhc2UgJ3NjYWxlWCc6XG4gICAgICAgICAgICBjYXNlICdzY2FsZVknOlxuICAgICAgICAgICAgY2FzZSAnc2NhbGVaJzpcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBub3JtYWxpemUgc2hvcnQtaGFuZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAocCA9PT0gJ3NjYWxlJykge1xuICAgICAgICAgICAgICAgICAgICBmaW5hbFByb3BzLnNjYWxlWCA9IFtwYXJzZUZsb2F0KHZhbCldO1xuICAgICAgICAgICAgICAgICAgICBmaW5hbFByb3BzLnNjYWxlWSA9IFtwYXJzZUZsb2F0KHZhbCldO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcHMuc2NhbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFByb3BzW3BdID0gW3BhcnNlRmxvYXQodmFsKV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvcGFjaXR5JzpcbiAgICAgICAgICAgICAgICBmaW5hbFByb3BzW3BdID0gW3BhcnNlRmxvYXQodmFsKV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyb3RhdGUnOlxuICAgICAgICAgICAgY2FzZSAncm90YXRlWCc6XG4gICAgICAgICAgICBjYXNlICdyb3RhdGVZJzpcbiAgICAgICAgICAgIGNhc2UgJ3JvdGF0ZVonOlxuICAgICAgICAgICAgY2FzZSAnc2tldyc6XG4gICAgICAgICAgICBjYXNlICdza2V3WCc6XG4gICAgICAgICAgICBjYXNlICdza2V3WSc6XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gbm9ybWFsaXplIHNob3J0LWhhbmQgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKHAgPT09ICdza2V3JykgcHJvcCA9ICdza2V3WCc7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocCA9PT0gJ3JvdGF0ZScpIHByb3AgPSAncm90YXRlWic7XG4gICAgICAgICAgICAgICAgZWxzZSBwcm9wID0gcDtcblxuICAgICAgICAgICAgICAgIGZpbmFsUHJvcHNbcHJvcF0gPSBbcGFyc2VGbG9hdCh2YWwpXTtcbiAgICAgICAgICAgICAgICBmaW5hbFByb3BzW3Byb3BdWzFdID0gKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnICYmIHZhbC5pbmRleE9mKCdyYWQnKSAhPT0gLTEpID8gJ3JhZCcgOiAnZGVnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGZpbmFsUHJvcHMpOyAgIFxufVxuXG4vLyBGdW5jdGlvbiB0byB0ZXN0IGlmIGFuIG9iamVjdCBpcyBhbiBIVE1MRWxlbWVudCBvciBhIE5vZGVMaXN0IHVzaW5nXG4vLyBkdWNrLXR5cGluZy5cbmZ1bmN0aW9uIGlzRWxlbWVudE9yTm9kZUxpc3QodGFyZ2V0KSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKCF0YXJnZXQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIFwic3R5bGVcIiBpbiB0YXJnZXQgfHwgKHRhcmdldC5sZW5ndGggPiAwICYmIFwic3R5bGVcIiBpbiB0YXJnZXRbMF0pO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBbmltYXRvcjtcblxuLyoqXG4gKiBUaW1pbmcgcGFyYW1ldGVycyBmb3IgYW4gYW5pbWF0aW9uLlxuICogQHR5cGVkZWYge09iamVjdH0gVGltaW5nUGFyYW1ldGVyc1xuICpcbiAqIEBwcm9wZXJ0eSB7VGltaW5nRnVuY3Rpb259IFtlYXNpbmc9J2Vhc2UnXSAtIFRoZSB0aW1pbmcgZnVuY3Rpb24gdG8gYXBwbHkuXG4gKiBAcHJvcGVydHkge051bWJlcn0gW2R1cmF0aW9uPTQwMF0gLSBUaGUgZHVyYXRpb24gZm9yIHRoZSBhbmltYXRpb24uIChJZ25vcmVkIGlmIGVhc2luZyBpcyBzZXQgdG8gJ3NwcmluZycpLlxuICogQHByb3BlcnR5IHtOdW1iZXJ9IFtzdGlmZm5lc3M9MTAwXSAtIFRoZSBzdGlmZm5lc3MgKHNwcmluZyBjb25zdGFudCkgb2YgdGhlIHNwcmluZy5cbiAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBbZGFtcGluZz0yMF0gLSBUaGUgZGFtcGluZyAoZnJpY3Rpb25hbCBmb3JjZSkgYXBwbGllZCB0byB0aGUgc3ByaW5nLlxuICogQHByb3BlcnR5IHtOdW1iZXJ9IFt2ZWxvY2l0eT0wXSAtIFRoZSBpbml0aWFsIHZlbG9jaXR5IG9mIHRoZSBzcHJpbmcuXG4gKiBAcHJvcGVydHkge051bWJlcn0gW21hc3M9MV0gLSBUaGUgbWFzcyBvZiB0aGUgc3ByaW5nLlxuICovXG5cbi8qKlxuICogQSB0aW1pbmcgZnVuY3Rpb246IFwibGluZWFyXCIgfCBcImVhc2VcIiB8IFwiZWFzZS1pblwiIHwgXCJlYXNlLW91dFwiIHwgXCJlYXNlLWluLW91dFwiIHwgXCJzcHJpbmdcIlxuICogQHR5cGVkZWYge1N0cmluZ30gVGltaW5nRnVuY3Rpb25cbiAqL1xuXG4gLyoqXG4gKiBBbiBldmVudCBmaXJlZCBieSBhbiBBbmltYXRvcjogXCJwbGF5XCIgfCBcInBhdXNlXCIgfCBcImZpbmlzaFwiXG4gKiBAdHlwZWRlZiB7U3RyaW5nfSBBbmltYXRpb25FdmVudFxuICovXG5cbi8qKlxuICogQSBzZXQgb2YgY3NzIHByb3BlcnRpZXMgYW5kIHRoZWlyIHZhbHVlcywgZGVmaW5pbmcgYSBzdGF0ZSBvciBrZXkgZnJhbWUgb2YgYW4gYW5pbWF0aW9uLlxuICogQHR5cGVkZWYge09iamVjdH0gQW5pbWF0aW9uUHJvcGVydHlMaXN0XG4gKlxuICogQHByb3BlcnR5IHtMZW5ndGh9IFt0cmFuc2xhdGVYPTBdIC0gdHJhbnNsYXRlWC4gXG4gKiBAcHJvcGVydHkge0xlbmd0aH0gW3RyYW5zbGF0ZVk9MF0gLSB0cmFuc2xhdGVZLlxuICogQHByb3BlcnR5IHtMZW5ndGh9IFt0cmFuc2xhdGVaPTBdIC0gdHJhbnNsYXRlWi5cbiAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBbc2NhbGU9MV0gLSBBIHNob3J0aGFuZCBmb3Igc2NhbGVYIGFuZCBzY2FsZVkuIElnbm9yZWQgaWYgYW5vdGhlciBzY2FsZS1yZWxhdGVkIHByb3BlcnR5IFxuICogICAgICBpcyBzcGVjaWZpZWQuXG4gKiBAcHJvcGVydHkge051bWJlcn0gW3NjYWxlWD0xXSAtIHNjYWxlWC5cbiAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBbc2NhbGVZPTFdIC0gc2NhbGVZLlxuICogQHByb3BlcnR5IHtOdW1iZXJ9IFtvcGFjaXR5XSAtIG9wYWNpdHkuXG4gKiBAcHJvcGVydHkge0FuZ2xlfSBbcm90YXRlPTBdIC0gQSBzaG9ydGhhbmQgZm9yIHJvdGF0ZVouIElnbm9yZWQgaWYgYW5vdGhlciByb3RhdGlvbi1yZWxhdGVkIHByb3BlcnR5IGlzIHNwZWNpZmllZC5cbiAqIEBwcm9wZXJ0eSB7QW5nbGV9IFtyb3RhdGVYPTBdIC0gcm90YXRlWC5cbiAqIEBwcm9wZXJ0eSB7QW5nbGV9IFtyb3RhdGVZPTBdIC0gcm90YXRlWS5cbiAqIEBwcm9wZXJ0eSB7QW5nbGV9IFtyb3RhdGVaPTBdIC0gcm90YXRlWi5cbiAqIEBwcm9wZXJ0eSB7QW5nbGV9IFtza2V3PTBdIC0gQSBzaG9ydGhhbmQgZm9yIHNrZXdYLiBJZ25vcmVkIGlmIGFub3RoZXIgc2tldy1yZWxhdGVkIHByb3BlcnR5IGlzIHNwZWNpZmllZC5cbiAqIEBwcm9wZXJ0eSB7QW5nbGV9IFtza2V3WD0wXSAtIHNrZXdYLlxuICogQHByb3BlcnR5IHtBbmdsZX0gW3NrZXdZPTBdIC0gc2tld1kuXG4gKi9cblxuLyoqXG4gKiBBIExlbmd0aCBpcyBhIGRhdGEgdHlwZSBhdmFpbGFibGUgdG8gY2VydGFpbiBhbmltYXRhYmxlIGNzcyBwcm9wZXJ0aWVzLiBJdCBjYW4gYmUgc3BlY2lmaWVkIGFzIGEgbnVtYmVyIChvZiBwaXhlbHMpIG9yXG4gKiBhIHBlcmNlbnRhZ2UuIElmIG5vIHVuaXRzIGFyZSBzcGVjaWZpZWQsIHB4IHdpbGwgYmUgYXNzdW1lZC5cbiAqIEB0eXBlZGVmIHsoTnVtYmVyfFN0cmluZyl9IExlbmd0aFxuICpcbiAqIEBleGFtcGxlXG4gKiAuLi5cbiAqIHtcbiAqICAgICAgdHJhbnNsYXRlWTogJzUwJScsXG4gKiAgICAgIHRyYW5zbGF0ZVo6IDEwMFxuICogIH1cbiAqIC4uLlxuICovXG5cbi8qKlxuICogQW4gQW5nbGUgaXMgYSBkYXRhIHR5cGUgYXZhaWxhYmxlIHRvIGNlcnRhaW4gYW5pbWF0YWJsZSBjc3MgcHJvcGVydGllcy4gSXQgY2FuIGJlIHNwZWNpZmllZCBhcyBhIG51bWJlciAob2YgZGVncmVlcyksXG4gKiBvciBpbiByYWRpYW5zIChlLmcuICczLjE0cmFkJykuXG4gKiBAdHlwZWRlZiB7KE51bWJlcnxTdHJpbmcpfSBBbmdsZVxuICpcbiAqIEBleGFtcGxlXG4gKiAuLi5cbiAqIHtcbiAqICAgICAgcm90YXRlOiAzNjAsXG4gKiAgICAgIHNrZXdYOiAnMnJhZCdcbiAqIH1cbiAqIC4uLlxuICovIiwiLypcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9ncmUvYmV6aWVyLWVhc2luZ1xuICogQmV6aWVyRWFzaW5nIC0gdXNlIGJlemllciBjdXJ2ZSBmb3IgdHJhbnNpdGlvbiBlYXNpbmcgZnVuY3Rpb25cbiAqIGJ5IEdhw6t0YW4gUmVuYXVkZWF1IDIwMTQgLSAyMDE1IOKAkyBNSVQgTGljZW5zZVxuICovXG5cbi8vIFRoZXNlIHZhbHVlcyBhcmUgZXN0YWJsaXNoZWQgYnkgZW1waXJpY2lzbSB3aXRoIHRlc3RzICh0cmFkZW9mZjogcGVyZm9ybWFuY2UgVlMgcHJlY2lzaW9uKVxudmFyIE5FV1RPTl9JVEVSQVRJT05TID0gNDtcbnZhciBORVdUT05fTUlOX1NMT1BFID0gMC4wMDE7XG52YXIgU1VCRElWSVNJT05fUFJFQ0lTSU9OID0gMC4wMDAwMDAxO1xudmFyIFNVQkRJVklTSU9OX01BWF9JVEVSQVRJT05TID0gMTA7XG5cbnZhciBrU3BsaW5lVGFibGVTaXplID0gMTE7XG52YXIga1NhbXBsZVN0ZXBTaXplID0gMS4wIC8gKGtTcGxpbmVUYWJsZVNpemUgLSAxLjApO1xuXG52YXIgZmxvYXQzMkFycmF5U3VwcG9ydGVkID0gdHlwZW9mIEZsb2F0MzJBcnJheSA9PT0gJ2Z1bmN0aW9uJztcblxuZnVuY3Rpb24gQSAoYUExLCBhQTIpIHsgcmV0dXJuIDEuMCAtIDMuMCAqIGFBMiArIDMuMCAqIGFBMTsgfVxuZnVuY3Rpb24gQiAoYUExLCBhQTIpIHsgcmV0dXJuIDMuMCAqIGFBMiAtIDYuMCAqIGFBMTsgfVxuZnVuY3Rpb24gQyAoYUExKSAgICAgIHsgcmV0dXJuIDMuMCAqIGFBMTsgfVxuXG4vLyBSZXR1cm5zIHgodCkgZ2l2ZW4gdCwgeDEsIGFuZCB4Miwgb3IgeSh0KSBnaXZlbiB0LCB5MSwgYW5kIHkyLlxuZnVuY3Rpb24gY2FsY0JlemllciAoYVQsIGFBMSwgYUEyKSB7IHJldHVybiAoKEEoYUExLCBhQTIpICogYVQgKyBCKGFBMSwgYUEyKSkgKiBhVCArIEMoYUExKSkgKiBhVDsgfVxuXG4vLyBSZXR1cm5zIGR4L2R0IGdpdmVuIHQsIHgxLCBhbmQgeDIsIG9yIGR5L2R0IGdpdmVuIHQsIHkxLCBhbmQgeTIuXG5mdW5jdGlvbiBnZXRTbG9wZSAoYVQsIGFBMSwgYUEyKSB7IHJldHVybiAzLjAgKiBBKGFBMSwgYUEyKSAqIGFUICogYVQgKyAyLjAgKiBCKGFBMSwgYUEyKSAqIGFUICsgQyhhQTEpOyB9XG5cbmZ1bmN0aW9uIGJpbmFyeVN1YmRpdmlkZSAoYVgsIGFBLCBhQiwgbVgxLCBtWDIpIHtcbiAgICB2YXIgY3VycmVudFgsIGN1cnJlbnRULCBpID0gMDtcbiAgICBkbyB7XG4gICAgICAgIGN1cnJlbnRUID0gYUEgKyAoYUIgLSBhQSkgLyAyLjA7XG4gICAgICAgIGN1cnJlbnRYID0gY2FsY0JlemllcihjdXJyZW50VCwgbVgxLCBtWDIpIC0gYVg7XG4gICAgICAgIGlmIChjdXJyZW50WCA+IDAuMCkge1xuICAgICAgICAgICAgYUIgPSBjdXJyZW50VDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFBID0gY3VycmVudFQ7XG4gICAgICAgIH1cbiAgICB9IHdoaWxlIChNYXRoLmFicyhjdXJyZW50WCkgPiBTVUJESVZJU0lPTl9QUkVDSVNJT04gJiYgKytpIDwgU1VCRElWSVNJT05fTUFYX0lURVJBVElPTlMpO1xuICAgIHJldHVybiBjdXJyZW50VDtcbn1cblxuZnVuY3Rpb24gbmV3dG9uUmFwaHNvbkl0ZXJhdGUgKGFYLCBhR3Vlc3NULCBtWDEsIG1YMikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTkVXVE9OX0lURVJBVElPTlM7ICsraSkge1xuICAgICAgICB2YXIgY3VycmVudFNsb3BlID0gZ2V0U2xvcGUoYUd1ZXNzVCwgbVgxLCBtWDIpO1xuICAgICAgICBpZiAoY3VycmVudFNsb3BlID09PSAwLjApIHtcbiAgICAgICAgICAgIHJldHVybiBhR3Vlc3NUO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjdXJyZW50WCA9IGNhbGNCZXppZXIoYUd1ZXNzVCwgbVgxLCBtWDIpIC0gYVg7XG4gICAgICAgIGFHdWVzc1QgLT0gY3VycmVudFggLyBjdXJyZW50U2xvcGU7XG4gICAgfVxuICAgIHJldHVybiBhR3Vlc3NUO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtWDEsIG1ZMSwgbVgyLCBtWTIpIHtcbiAgICBpZiAoISgwIDw9IG1YMSAmJiBtWDEgPD0gMSAmJiAwIDw9IG1YMiAmJiBtWDIgPD0gMSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiZXppZXIgeCB2YWx1ZXMgbXVzdCBiZSBpbiBbMCwgMV0gcmFuZ2UnKTtcbiAgICB9XG5cbiAgICAvLyBQcmVjb21wdXRlIHNhbXBsZXMgdGFibGVcbiAgICB2YXIgc2FtcGxlVmFsdWVzID0gZmxvYXQzMkFycmF5U3VwcG9ydGVkID8gbmV3IEZsb2F0MzJBcnJheShrU3BsaW5lVGFibGVTaXplKSA6IG5ldyBBcnJheShrU3BsaW5lVGFibGVTaXplKTtcbiAgICBpZiAobVgxICE9PSBtWTEgfHwgbVgyICE9PSBtWTIpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrU3BsaW5lVGFibGVTaXplOyArK2kpIHtcbiAgICAgICAgICAgIHNhbXBsZVZhbHVlc1tpXSA9IGNhbGNCZXppZXIoaSAqIGtTYW1wbGVTdGVwU2l6ZSwgbVgxLCBtWDIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VEZvclggKGFYKSB7XG4gICAgICAgIHZhciBpbnRlcnZhbFN0YXJ0ID0gMC4wO1xuICAgICAgICB2YXIgY3VycmVudFNhbXBsZSA9IDE7XG4gICAgICAgIHZhciBsYXN0U2FtcGxlID0ga1NwbGluZVRhYmxlU2l6ZSAtIDE7XG5cbiAgICAgICAgZm9yICg7IGN1cnJlbnRTYW1wbGUgIT09IGxhc3RTYW1wbGUgJiYgc2FtcGxlVmFsdWVzW2N1cnJlbnRTYW1wbGVdIDw9IGFYOyArK2N1cnJlbnRTYW1wbGUpIHtcbiAgICAgICAgICAgIGludGVydmFsU3RhcnQgKz0ga1NhbXBsZVN0ZXBTaXplO1xuICAgICAgICB9XG4gICAgICAgIC0tY3VycmVudFNhbXBsZTtcblxuICAgICAgICAvLyBJbnRlcnBvbGF0ZSB0byBwcm92aWRlIGFuIGluaXRpYWwgZ3Vlc3MgZm9yIHRcbiAgICAgICAgdmFyIGRpc3QgPSAoYVggLSBzYW1wbGVWYWx1ZXNbY3VycmVudFNhbXBsZV0pIC8gKHNhbXBsZVZhbHVlc1tjdXJyZW50U2FtcGxlICsgMV0gLSBzYW1wbGVWYWx1ZXNbY3VycmVudFNhbXBsZV0pO1xuICAgICAgICB2YXIgZ3Vlc3NGb3JUID0gaW50ZXJ2YWxTdGFydCArIGRpc3QgKiBrU2FtcGxlU3RlcFNpemU7XG5cbiAgICAgICAgdmFyIGluaXRpYWxTbG9wZSA9IGdldFNsb3BlKGd1ZXNzRm9yVCwgbVgxLCBtWDIpO1xuICAgICAgICBpZiAoaW5pdGlhbFNsb3BlID49IE5FV1RPTl9NSU5fU0xPUEUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXd0b25SYXBoc29uSXRlcmF0ZShhWCwgZ3Vlc3NGb3JULCBtWDEsIG1YMik7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5pdGlhbFNsb3BlID09PSAwLjApIHtcbiAgICAgICAgICAgIHJldHVybiBndWVzc0ZvclQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYmluYXJ5U3ViZGl2aWRlKGFYLCBpbnRlcnZhbFN0YXJ0LCBpbnRlcnZhbFN0YXJ0ICsga1NhbXBsZVN0ZXBTaXplLCBtWDEsIG1YMik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gQmV6aWVyRWFzaW5nICh4KSB7XG4gICAgICAgIGlmIChtWDEgPT09IG1ZMSAmJiBtWDIgPT09IG1ZMikge1xuICAgICAgICAgICAgcmV0dXJuIHg7IC8vIGxpbmVhclxuICAgICAgICB9XG4gICAgICAgIC8vIEJlY2F1c2UgSmF2YVNjcmlwdCBudW1iZXIgYXJlIGltcHJlY2lzZSwgd2Ugc2hvdWxkIGd1YXJhbnRlZSB0aGUgZXh0cmVtZXMgYXJlIHJpZ2h0LlxuICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHggPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxjQmV6aWVyKGdldFRGb3JYKHgpLCBtWTEsIG1ZMik7XG4gICAgfTtcbn0iLCJjb25zdCBFbmdpbmUgPSB7XG5cdHdpbmRvd1dpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCxcblx0d2luZG93SGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQsXG5cdHJ1bm5pbmdBbmltYXRpb25zOiBbXSxcblx0cXVldWVkQWN0aW9uczogW10sXG5cdHRyYW5zZm9ybVN0eWxlUHJvcDogZ2V0UHJlZml4KCd0cmFuc2Zvcm0nKVxufTtcblxubGV0IGxhc3RUaWNrID0gLTE7XG5cbi8vIEdsb2JhbCBoYW5kbGVyIGZvciByZXNpemUgZXZlbnRzXG5mdW5jdGlvbiBoYW5kbGVSZXNpemUoKSB7XG4gICAgRW5naW5lLndpbmRvd1dpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgRW5naW5lLndpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbn1cblxuZnVuY3Rpb24gc3RlcEFuaW1hdGlvbnModGltZSkge1xuXHRpZiAobGFzdFRpY2sgPT09IC0xKSBsYXN0VGljayA9IHRpbWU7XG5cdGxldCBpLCBsO1xuXG5cdGZvciAoaSA9IDAsIGwgPSBFbmdpbmUucnVubmluZ0FuaW1hdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG5cdFx0RW5naW5lLnJ1bm5pbmdBbmltYXRpb25zW2ldLnRpY2sodGltZSAtIGxhc3RUaWNrKTtcblx0XHRFbmdpbmUucnVubmluZ0FuaW1hdGlvbnNbaV0ucmVuZGVyKCk7XG5cdH1cblxuXHRmb3IgKGkgPSAwLCBsID0gRW5naW5lLnF1ZXVlZEFjdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG5cdFx0KEVuZ2luZS5xdWV1ZWRBY3Rpb25zLnNoaWZ0KCkpKCk7XG5cdH1cblxuXHRFbmdpbmUucnVubmluZ0FuaW1hdGlvbnMgPSBFbmdpbmUucnVubmluZ0FuaW1hdGlvbnMuZmlsdGVyKChhbmltYXRpb24pID0+IGFuaW1hdGlvbi5ydW5uaW5nKTtcblx0bGFzdFRpY2sgPSB0aW1lO1xuXHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXBBbmltYXRpb25zKTtcbn1cblxuZnVuY3Rpb24gZ2V0UHJlZml4KHByb3ApIHtcblx0Y29uc3Qgc3R5bGVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpLnN0eWxlO1xuXHRjb25zdCB2ZW5kb3JzID0gWydtcycsICdPJywgJ01veicsICdXZWJraXQnXTtcblxuXHRpZiAoc3R5bGVzW3Byb3BdID09PSAnJykgcmV0dXJuIHByb3A7XG5cdHByb3AgPSBwcm9wLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcHJvcC5zbGljZSgxKTtcblxuICBcdGZvciAobGV0IGkgPSB2ZW5kb3JzLmxlbmd0aDsgaS0tOykge1xuICAgIFx0aWYgKHN0eWxlc1t2ZW5kb3JzW2ldICsgcHJvcF0gPT09ICcnKSB7XG4gICAgICBcdFx0cmV0dXJuICh2ZW5kb3JzW2ldICsgcHJvcCk7XG4gICAgXHR9XG4gIFx0fVxufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgaGFuZGxlUmVzaXplLCBmYWxzZSk7XG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXBBbmltYXRpb25zKTtcblxuZXhwb3J0IGRlZmF1bHQgRW5naW5lOyIsImltcG9ydCBCZXppZXJFYXNpbmcgZnJvbSAnLi9CZXppZXJFYXNpbmcnO1xuaW1wb3J0IFNwcmluZyBmcm9tICcuLi9waHlzaWNzL1NwcmluZyc7XG5cbmNvbnN0IERFRkFVTFRfRFVSQVRJT04gPSAnNDAwJztcbmNvbnN0IERFRkFVTFRfRUFTSU5HICAgPSAnZWFzZSc7XG5jb25zdCBERUZBVUxUX1NQUklOR19DT05TVEFOVCA9IDEwMDtcbmNvbnN0IERFRkFVTFRfU1BSSU5HX0RBTVBJTkcgID0gMjA7XG5jb25zdCBERUZBVUxUX1NQUklOR19NQVNTICAgICA9IDE7XG5cbmxldCBFYXNpbmdzID0ge307XG5cbltcbiAgICBbXCJsaW5lYXJcIixcdFx0WzAuMDAsIDAuMCwgMS4wMCwgMS4wXV0sXG4gICAgW1wiZWFzZVwiLCAgICAgICAgWzAuMjUsIDAuMSwgMC4yNSwgMS4wXV0sIFxuICAgIFtcImVhc2UtaW5cIiwgICAgIFswLjQyLCAwLjAsIDEuMDAsIDEuMF1dLFxuICAgIFtcImVhc2Utb3V0XCIsICAgIFswLjAwLCAwLjAsIDAuNTgsIDEuMF1dLFxuICAgIFtcImVhc2UtaW4tb3V0XCIsIFswLjQyLCAwLjAsIDAuNTgsIDEuMF1dXG5dLmZvckVhY2goZnVuY3Rpb24oYXJyYXkpIHtcbiAgICBFYXNpbmdzW2FycmF5WzBdXSA9IEJlemllckVhc2luZy5hcHBseShudWxsLCBhcnJheVsxXSk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVhc2VyKG9wdGlvbnMpIHtcbiAgICBsZXQgdHlwZTtcblxuICAgIGlmIChPYmplY3Qua2V5cyhFYXNpbmdzKS5pbmRleE9mKG9wdGlvbnMuZWFzaW5nKSAhPT0gLTEgfHwgb3B0aW9ucy5lYXNpbmcgPT09ICdzcHJpbmcnKSB7XG4gICAgICAgIHR5cGUgPSBvcHRpb25zLmVhc2luZztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlID0gREVGQVVMVF9FQVNJTkc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICdzcHJpbmcnKSByZXR1cm4gbmV3IFNwcmluZ0Vhc2VyKG9wdGlvbnMpO1xuICAgIGVsc2UgcmV0dXJuIG5ldyBCZXppZXJFYXNlcih0eXBlLCBvcHRpb25zKTtcbn1cblxuY2xhc3MgQmV6aWVyRWFzZXIge1xuICAgIGNvbnN0cnVjdG9yKHR5cGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5wcm9ncmVzcyA9IDA7XG4gICAgICAgIHRoaXMuY3VycmVudFZhbHVlID0gMDtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgREVGQVVMVF9EVVJBVElPTjtcbiAgICAgICAgdGhpcy5lYXNpbmdGbiA9IEVhc2luZ3NbdHlwZV07XG4gICAgfVxuXG4gICAgdGljayh2YWx1ZSkge1xuICAgICAgICB2YWx1ZSAvPSB0aGlzLmR1cmF0aW9uO1xuXG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uID09PSAwLjAgfHwgdmFsdWUgPj0gMSkge1xuICAgICAgICAgICAgdGhpcy5wcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRWYWx1ZSA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzID0gdGhpcy5lYXNpbmdGbih2YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBTcHJpbmdFYXNlciB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICBsZXQgayA9IG9wdGlvbnMuc3RpZmZuZXNzIHx8IERFRkFVTFRfU1BSSU5HX0NPTlNUQU5UO1xuICAgICAgICBsZXQgYyA9IG9wdGlvbnMuZGFtcGluZyAgIHx8IERFRkFVTFRfU1BSSU5HX0RBTVBJTkc7XG4gICAgICAgIGxldCBtID0gb3B0aW9ucy5tYXNzICAgICAgfHwgREVGQVVMVF9TUFJJTkdfTUFTUztcbiAgICAgICAgbGV0IHYgPSBvcHRpb25zLnZlbG9jaXR5ICB8fCAwO1xuXG4gICAgICAgIHRoaXMuc3ByaW5nID0gbmV3IFNwcmluZyhtLCBrLCBjLCAwLCAxLCB2KTtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IHRoaXMuc3ByaW5nLmR1cmF0aW9uICogMTAwMDsgLy8gc3ByaW5nIGNvZGUgcmVwb3J0cyB0aW1lIGluIHNcbiAgICAgICAgdGhpcy5wcm9ncmVzcyA9IDA7XG4gICAgICAgIHRoaXMuY3VycmVudFZhbHVlID0gMDtcbiAgICB9XG5cbiAgICB0aWNrKHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uID09PSAwLjAgfHwgdmFsdWUgLyB0aGlzLmR1cmF0aW9uID49IDEpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFZhbHVlID0gMTtcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3MgPSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VmFsdWUgPSB2YWx1ZSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzID0gdGhpcy5zcHJpbmcueCh2YWx1ZSAvIDEwMDApO1xuICAgICAgICB9XG4gICAgfVxufSIsImltcG9ydCB7IGNyZWF0ZUVhc2VyIH0gZnJvbSAnLi9lYXNpbmcnO1xuaW1wb3J0IEVuZ2luZSBmcm9tICcuL0VuZ2luZSc7XG5cbmV4cG9ydCBjbGFzcyBDU1NSZW5kZXJlciB7XG4gICAgY29uc3RydWN0b3IodGFyZ2V0LCBmcm9tVG8sIG9wdGlvbnMsIG9uVGljaykge1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIE5vZGVMaXN0c1xuICAgICAgICB0aGlzLnRhcmdldCA9IFtdO1xuICAgICAgICBpZiAodGFyZ2V0Lmxlbmd0aCkgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgIGVsc2UgdGhpcy50YXJnZXQucHVzaCh0YXJnZXQpO1xuXG4gICAgICAgIHRoaXMuZnJvbVRvID0gZnJvbVRvO1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHR3ZWVuUHJvcHMoMCwgdGhpcy5mcm9tVG9bMF0sIHRoaXMuZnJvbVRvWzFdKTtcbiAgICAgICAgdGhpcy5jdXJyZW50VGltZSAgPSAwO1xuICAgICAgICB0aGlzLnBsYXliYWNrUmF0ZSA9IDE7XG4gICAgICAgIHRoaXMucnVubmluZyAgICAgID0gZmFsc2U7XG4gICAgICAgIHRoaXMucGF1c2VkICAgICAgID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5vblRpY2sgPSBvblRpY2s7XG4gICAgICAgIHRoaXMuZWFzZXIgID0gY3JlYXRlRWFzZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBwYXJzZUZsb2F0KHRoaXMuZWFzZXIuZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHRpY2sodGltZSkge1xuICAgICAgICBpZiAodGhpcy5wYXVzZWQgfHwgIXRoaXMucnVubmluZykgcmV0dXJuO1xuXG4gICAgICAgIGxldCBjdXJyZW50VGltZTtcbiAgICAgICAgaWYgKHRoaXMucGxheWJhY2tSYXRlID4gMCkgY3VycmVudFRpbWUgPSB0aGlzLmN1cnJlbnRUaW1lICsgdGltZTtcbiAgICAgICAgZWxzZSBjdXJyZW50VGltZSA9IHRoaXMuY3VycmVudFRpbWUgLSB0aW1lO1xuICAgICAgICB0aGlzLnNlZWsoY3VycmVudFRpbWUpO1xuXG4gICAgICAgIGlmICh0aGlzLnBsYXliYWNrUmF0ZSA8IDAgJiYgdGhpcy5lYXNlci5jdXJyZW50VmFsdWUgPD0gMCkgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGVsc2UgaWYgKHRoaXMucGxheWJhY2tSYXRlID49IDAgJiYgdGhpcy5lYXNlci5jdXJyZW50VmFsdWUgPj0gMSkgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMub25UaWNrKSB0aGlzLm9uVGljayh0aGlzLmVhc2VyLnByb2dyZXNzLCB0aGlzLmN1cnJlbnRUaW1lLCB0aGlzLnJ1bm5pbmcpOyAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHJlbmRlcihzdGF0ZSkge1xuICAgICAgICBpZiAoc3RhdGUpIHRoaXMuY3VycmVudFN0YXRlID0gc3RhdGU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnRhcmdldC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0W2ldLnN0eWxlW0VuZ2luZS50cmFuc2Zvcm1TdHlsZVByb3BdID0gXG4gICAgICAgICAgICAgICAgJ3RyYW5zbGF0ZTNkKCcrXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlLnRyYW5zbGF0ZVhbMF0rdGhpcy5jdXJyZW50U3RhdGUudHJhbnNsYXRlWFsxXSsnLCAnK1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZS50cmFuc2xhdGVZWzBdK3RoaXMuY3VycmVudFN0YXRlLnRyYW5zbGF0ZVlbMV0rJywgJytcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUudHJhbnNsYXRlWlswXSt0aGlzLmN1cnJlbnRTdGF0ZS50cmFuc2xhdGVaWzFdKycpICcrIFxuICAgICAgICAgICAgICAgICdyb3RhdGVYKCcrXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlLnJvdGF0ZVhbMF0rdGhpcy5jdXJyZW50U3RhdGUucm90YXRlWFsxXSsnKSAnK1xuICAgICAgICAgICAgICAgICdyb3RhdGVZKCcrXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlLnJvdGF0ZVlbMF0rdGhpcy5jdXJyZW50U3RhdGUucm90YXRlWVsxXSsnKSAnK1xuICAgICAgICAgICAgICAgICdyb3RhdGVaKCcrXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlLnJvdGF0ZVpbMF0rdGhpcy5jdXJyZW50U3RhdGUucm90YXRlWlsxXSsnKSAnK1xuICAgICAgICAgICAgICAgICdzY2FsZTNkKCcrXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlLnNjYWxlWFswXSsnLCAnK1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZS5zY2FsZVlbMF0rJywgJytcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUuc2NhbGVZWzBdKycpICcgK1xuICAgICAgICAgICAgICAgICdza2V3KCcrXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlLnNrZXdYWzBdK3RoaXMuY3VycmVudFN0YXRlLnNrZXdYWzFdKycsICcrXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlLnNrZXdZWzBdK3RoaXMuY3VycmVudFN0YXRlLnNrZXdZWzFdKycpJztcblxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFN0YXRlLm9wYWNpdHkpIHRoaXMudGFyZ2V0W2ldLnN0eWxlLm9wYWNpdHkgPSBNYXRoLm1pbihNYXRoLm1heCh0aGlzLmN1cnJlbnRTdGF0ZS5vcGFjaXR5WzBdLCAwKSwxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHBsYXkoKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMucGF1c2VkICA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwYXVzZSgpIHtcbiAgICAgICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzdG9wKCkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wYXVzZWQgID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNlZWsodmFsKSB7XG4gICAgICAgIGlmICh2YWwgPj0gdGhpcy5kdXJhdGlvbikgdmFsID0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgaWYgKGlzTmFOKHZhbCkgfHwgdmFsIDw9IDApIHZhbCA9IDA7XG5cbiAgICAgICAgdGhpcy5ydW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jdXJyZW50VGltZSA9IHZhbDtcbiAgICAgICAgdGhpcy5lYXNlci50aWNrKHRoaXMuY3VycmVudFRpbWUpO1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHR3ZWVuUHJvcHModGhpcy5lYXNlci5wcm9ncmVzcywgdGhpcy5mcm9tVG9bMF0sIHRoaXMuZnJvbVRvWzFdKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2VlblByb3BzKHR3ZWVuVmFsdWUsIGZyb21TdGF0ZSwgdG9TdGF0ZSkge1xuICAgIGxldCBzdGF0ZSA9IHt9O1xuICAgIGxldCBwcm9wcyA9IE9iamVjdC5rZXlzKGZyb21TdGF0ZSk7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHByb3BzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBzdGF0ZVtwcm9wc1tpXV0gPSBmcm9tU3RhdGVbcHJvcHNbaV1dLnNsaWNlKDApO1xuICAgICAgICBzdGF0ZVtwcm9wc1tpXV1bMF0gPSBzdGF0ZVtwcm9wc1tpXV1bMF0gKyAodHdlZW5WYWx1ZSAqICh0b1N0YXRlW3Byb3BzW2ldXVswXSAtIHN0YXRlW3Byb3BzW2ldXVswXSkpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbn0iLCIvKlxuICogQmFzZWQgb246XG4gKiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kYXRjaGxleS8zNzM1M2Q2YTJjYjYyOTY4N2ViOVxuICovXG5cbmNsYXNzIEV2ZW50RW1pdHRlciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMubGlzdGVuZXJzID0ge307XG5cdH1cblxuXHRhZGRMaXN0ZW5lcihsYWJlbCwgY2FsbGJhY2spIHtcblx0XHR0aGlzLmxpc3RlbmVyc1tsYWJlbF0gPSB0aGlzLmxpc3RlbmVyc1tsYWJlbF0gfHwgW107XG5cdFx0dGhpcy5saXN0ZW5lcnNbbGFiZWxdLnB1c2goY2FsbGJhY2spO1xuXHR9XG5cblx0cmVtb3ZlTGlzdGVuZXIobGFiZWwsIGNhbGxiYWNrKSB7XG5cdFx0bGV0IGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzW2xhYmVsXSxcblx0XHRcdGluZGV4O1xuXHRcdFxuXHRcdGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzLmxlbmd0aCkge1xuXHRcdFx0aW5kZXggPSBsaXN0ZW5lcnMucmVkdWNlKChpLCBsaXN0ZW5lciwgaW5kZXgpID0+IHtcblx0XHRcdFx0cmV0dXJuICh0eXBlb2YgbGlzdGVuZXIgPT09ICdmdW5jdGlvbicgJiYgbGlzdGVuZXIgPT09IGNhbGxiYWNrKSA/XG5cdFx0XHRcdFx0aSA9IGluZGV4IDpcblx0XHRcdFx0XHRpO1xuXHRcdFx0fSwgLTEpO1xuXHRcdFx0XG5cdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0dGhpcy5saXN0ZW5lcnNbbGFiZWxdID0gbGlzdGVuZXJzO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdFxuXHRlbWl0KGxhYmVsLCAuLi5hcmdzKSB7XG5cdFx0bGV0IGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzW2xhYmVsXTtcblx0XHRcblx0XHRpZiAobGlzdGVuZXJzICYmIGxpc3RlbmVycy5sZW5ndGgpIHtcblx0XHRcdGxpc3RlbmVycy5mb3JFYWNoKChsaXN0ZW5lcikgPT4ge1xuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTsgXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRXZlbnRFbWl0dGVyOyIsImltcG9ydCBvYmplY3RBc3NpZ25Qb2xseWZpbGwgZnJvbSAnLi9wb2x5ZmlsbHMvT2JqZWN0LmFzc2lnbic7IG9iamVjdEFzc2lnblBvbGx5ZmlsbCgpO1xuaW1wb3J0IGlzQXJyYXlQb2xseWZpbGwgZnJvbSAnLi9wb2x5ZmlsbHMvaXNBcnJheSc7IGlzQXJyYXlQb2xseWZpbGwoKTtcbmltcG9ydCBBbmltYXRvciBmcm9tICcuL2FuaW1hdGlvbi9BbmltYXRvcic7XG5cbndpbmRvdy5BbmltYXRvciA9IEFuaW1hdG9yO1xuZXhwb3J0IHsgQW5pbWF0b3IgfTsiLCIvKlxuICogQWRhcHRlZCBmcm9tOlxuICogaHR0cDovL2lhbXJhbHBodC5naXRodWIuaW8vcGh5c2ljcy9cbiAqXG4gKiBTaW1wbGUgU3ByaW5nIGltcGxlbWVudGF0aW9uIC0tIHRoaXMgaW1wbGVtZW50cyBhIGRhbXBlZCBzcHJpbmcgdXNpbmcgYSBzeW1ib2xpYyBpbnRlZ3JhdGlvblxuICogb2YgSG9va2UncyBsYXc6IEYgPSAta3ggLSBjdi4gVGhpcyBzb2x1dGlvbiBpcyBzaWduaWZpY2FudGx5IG1vcmUgcGVyZm9ybWFudCBhbmQgbGVzcyBjb2RlIHRoYW5cbiAqIGEgbnVtZXJpY2FsIGFwcHJvYWNoIHN1Y2ggYXMgRmFjZWJvb2sgUmVib3VuZCB3aGljaCB1c2VzIFJLNC5cbiAqXG4gKiBUaGlzIHBoeXNpY3MgdGV4dGJvb2sgZXhwbGFpbnMgdGhlIG1vZGVsOlxuICogIGh0dHA6Ly93d3cuc3Rld2FydGNhbGN1bHVzLmNvbS9kYXRhL0NBTENVTFVTJTIwQ29uY2VwdHMlMjBhbmQlMjBDb250ZXh0cy91cGZpbGVzLzNjMy1BcHBzT2YybmRPcmRlcnNfU3R1LnBkZlxuICpcbiAqIEEgY3JpdGljYWxseSBkYW1wZWQgc3ByaW5nIGhhczogZGFtcGluZypkYW1waW5nIC0gNCAqIG1hc3MgKiBzcHJpbmdDb25zdGFudCA9PSAwLiBJZiBpdCdzIGdyZWF0ZXIgdGhhbiB6ZXJvXG4gKiB0aGVuIHRoZSBzcHJpbmcgaXMgb3ZlcmRhbXBlZCwgaWYgaXQncyBsZXNzIHRoYW4gemVybyB0aGVuIGl0J3MgdW5kZXJkYW1wZWQuXG4gKi9cbmZ1bmN0aW9uIFNwcmluZyhtYXNzLCBzcHJpbmdDb25zdGFudCwgZGFtcGluZywgeCwgZXF1aWxpYnJpdW0sIGluaXRpYWxWZWxvY2l0eSkge1xuICAgIHRoaXMuc3RhcnQgPSB4O1xuICAgIHRoaXMuZW5kID0gZXF1aWxpYnJpdW07IC8vIGVxdWlsaWJyaXVtXG4gICAgdGhpcy5fc29sdXRpb24gPSBudWxsO1xuXG4gICAgdmFyIG0gPSBtYXNzO1xuICAgIHZhciBrID0gc3ByaW5nQ29uc3RhbnQ7XG4gICAgdmFyIGMgPSBkYW1waW5nO1xuICAgIHZhciBpbml0aWFsID0geCAtIGVxdWlsaWJyaXVtO1xuICAgIHZhciB2ZWxvY2l0eSA9IGluaXRpYWxWZWxvY2l0eTtcblxuICAgIC8vIFNvbHZlIHRoZSBxdWFkcmF0aWMgZXF1YXRpb247IHJvb3QgPSAoLWMgKy8tIHNxcnQoY14yIC0gNG1rKSkgLyAybS5cbiAgICB2YXIgY21rID0gYyAqIGMgLSA0ICogbSAqIGs7XG5cbiAgICAvLyBUbyBjb21wdXRlIHRoZSBkdXJhdGlvbiBvZiB0aGUgYW5pbWF0aW9uLCB3ZSBjYW4gbG9vayBhdCB0d29cbiAgICAvLyBmdW5jdGlvbnMgd2hpY2ggY3JlYXRlIGFuIFwiZW52ZWxvcGVcIiBib3VuZGluZyBvdXIgcG9zaXRpb24gZnVuY2l0b24geCh0KVxuICAgIC8vIGFuZCB0aGVyZWJ5IGNvbnRyb2wgdGhlIHJhdGUgb2YgZXhwb25lbnRpYWwgZGVjYXlcbiAgICAvL1xuICAgIC8vXG4gICAgLy8gVGhleSBhcmUgb2YgdGhlIGZvcm06XG4gICAgLy8geTEodCkgPSAgQSAqIGVecnQgICBBTkRcbiAgICAvLyB5Mih0KSA9IC1BICogZV5ydFxuICAgIC8vXG4gICAgLy8gd2hlcmUgQSBpcyB0aGUgYW1wbGl0dWRlIChtYXhpbXVtIGRpc3BsYWNlbWVudCkgYW5kIHIgaXMgb25lIG9mIHRoZSByb290cy5cbiAgICAvL1xuICAgIC8vIFdoZW4gdGhlIHZhbHVlIG9mIHRoZXNlIGZ1bmN0aW9ucyBpcyB3aXRoaW4gc29tZSB0aHJlc2hvbGQgKGVwc2lsb24pIG9mXG4gICAgLy8gdGhlIGVxdWlsaWJyaXVtIHZhbHVlLCB3ZSBjYW4gYXBwcm94aW1hdGUgdGhhdCB0aGUgc3lzdGVtIGlzIGJvdGhcbiAgICAvLyBjbG9zZSB0byBpdHMgZmluYWwgdmFsdWUgYW5kIHRoYXQgaXRzIG9zY2lsbGF0aW9ucyBoYXZlIGRpZWQgZG93blxuXG4gICAgaWYgKGNtayA9PT0gMCkge1xuICAgICAgICAvLyBUaGUgc3ByaW5nIGlzIGNyaXRpY2FsbHkgZGFtcGVkLlxuICAgICAgICAvLyB4ID0gKGMxICsgYzIqdCkgKiBlIF4oLWMvMm0pKnRcbiAgICAgICAgbGV0IHIgPSAtYyAvICgyICogbSk7XG4gICAgICAgIGxldCBjMSA9IGluaXRpYWw7XG4gICAgICAgIGxldCBjMiA9IHZlbG9jaXR5IC8gKHIgKiBpbml0aWFsKTtcblxuICAgICAgICBsZXQgQSA9IE1hdGguc3FydChNYXRoLnBvdyhjMSwgMikgKyBNYXRoLnBvdyhjMiwgMikpO1xuICAgICAgICBsZXQgZXBzaWxvbiA9IDAuMDAxO1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gTWF0aC5sb2coZXBzaWxvbi9BKSAvIHI7XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9zb2x1dGlvbiA9ICB7XG4gICAgICAgICAgICB4OiBmdW5jdGlvbih0KSB7IHJldHVybiAoYzEgKyBjMiAqIHQpICogTWF0aC5wb3coTWF0aC5FLCByICogdCk7IH0sXG4gICAgICAgICAgICB2ZWxvY2l0eTogZnVuY3Rpb24odCkgeyB2YXIgcG93ID0gTWF0aC5wb3coTWF0aC5FLCByICogdCk7IHJldHVybiByICogKGMxICsgYzIgKiB0KSAqIHBvdyArIGMyICogcG93OyB9XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChjbWsgPiAwKSB7XG4gICAgICAgIC8vIFRoZSBzcHJpbmcgaXMgb3ZlcmRhbXBlZDsgbm8gYm91bmNlcy5cbiAgICAgICAgLy8geCA9IGMxKmVeKHIxKnQpICsgYzIqZV4ocjJ0KVxuICAgICAgICAvLyBOZWVkIHRvIGZpbmQgcjEgYW5kIHIyLCB0aGUgcm9vdHMsIHRoZW4gc29sdmUgYzEgYW5kIGMyLlxuICAgICAgICBsZXQgcjEgPSAoLWMgLSBNYXRoLnNxcnQoY21rKSkgLyAoMiAqIG0pO1xuICAgICAgICBsZXQgcjIgPSAoLWMgKyBNYXRoLnNxcnQoY21rKSkgLyAoMiAqIG0pO1xuICAgICAgICBsZXQgYzIgPSAodmVsb2NpdHkgLSByMSAqIGluaXRpYWwpIC8gKHIyIC0gcjEpO1xuICAgICAgICBsZXQgYzEgPSBpbml0aWFsIC0gYzI7XG4gICAgICAgIFxuICAgICAgICBsZXQgQSA9IE1hdGguc3FydChNYXRoLnBvdyhjMSwgMikgKyBNYXRoLnBvdyhjMiwgMikpO1xuXG4gICAgICAgIC8vIFRoZSByb290IHRoYXQgaGFzIHRoZSBoaWdoZXIgdmFsdWUgd2lsbCBjb250cm9sIHRoZSByYXRlIG9mIGRlY2F5XG4gICAgICAgIGxldCByID0gTWF0aC5tYXgocjEsIHIyKTtcbiAgICAgICAgbGV0IGVwc2lsb24gPSAwLjAwMDI1O1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gTWF0aC5sb2coZXBzaWxvbi9BKSAvIHI7XG5cbiAgICAgICAgdGhpcy5fc29sdXRpb24gPSB7XG4gICAgICAgICAgICB4OiBmdW5jdGlvbih0KSB7IHJldHVybiAoYzEgKiBNYXRoLnBvdyhNYXRoLkUsIHIxICogdCkgKyBjMiAqIE1hdGgucG93KE1hdGguRSwgcjIgKiB0KSk7IH0sXG4gICAgICAgICAgICB2ZWxvY2l0eTogZnVuY3Rpb24odCkgeyByZXR1cm4gKGMxICogcjEgKiBNYXRoLnBvdyhNYXRoLkUsIHIxICogdCkgKyBjMiAqIHIyICogTWF0aC5wb3coTWF0aC5FLCByMiAqIHQpKTsgfVxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBzcHJpbmcgaXMgdW5kZXJkYW1wZWQsIGl0IGhhcyBpbWFnaW5hcnkgcm9vdHMuXG4gICAgICAgIC8vIHIgPSAtKGMgLyAyKm0pICstIHcqaVxuICAgICAgICAvLyB3ID0gc3FydCg0bWsgLSBjXjIpIC8gMm1cbiAgICAgICAgLy8geCA9IChlXi0oYy8ybSl0KSAqIChjMSAqIGNvcyh3dCkgKyBjMiAqIHNpbih3dCkpXG4gICAgICAgIGxldCB3ID0gTWF0aC5zcXJ0KDQqbSprIC0gYypjKSAvICgyICogbSk7XG4gICAgICAgIGxldCByID0gLShjIC8gMiptKTtcbiAgICAgICAgbGV0IGMxPSBpbml0aWFsO1xuICAgICAgICBsZXQgYzI9ICh2ZWxvY2l0eSAtIHIgKiBpbml0aWFsKSAvIHc7XG4gICAgICAgIFxuICAgICAgICBsZXQgQSA9IE1hdGguc3FydChNYXRoLnBvdyhjMSwgMikgKyBNYXRoLnBvdyhjMiwgMikpO1xuICAgICAgICBsZXQgZXBzaWxvbiA9IDAuMDAxO1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gTWF0aC5sb2coZXBzaWxvbi9BKSAvIHI7XG4gICAgICAgICAgICBcbiAgICAgICAgdGhpcy5fc29sdXRpb24gPSB7XG4gICAgICAgICAgICB4OiBmdW5jdGlvbih0KSB7IHJldHVybiBNYXRoLnBvdyhNYXRoLkUsIHIgKiB0KSAqIChjMSAqIE1hdGguY29zKHcgKiB0KSArIGMyICogTWF0aC5zaW4odyAqIHQpKTsgfSxcbiAgICAgICAgICAgIHZlbG9jaXR5OiBmdW5jdGlvbih0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvd2VyID0gIE1hdGgucG93KE1hdGguRSwgciAqIHQpO1xuICAgICAgICAgICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyh3ICogdCk7XG4gICAgICAgICAgICAgICAgdmFyIHNpbiA9IE1hdGguc2luKHcgKiB0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcG93ZXIgKiAoYzIgKiB3ICogY29zIC0gYzEgKiB3ICogc2luKSArIHIgKiBwb3dlciAqIChjMiAqIHNpbiArIGMxICogY29zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG59XG5cblNwcmluZy5wcm90b3R5cGUueCA9IGZ1bmN0aW9uKGR0KSB7XG4gICAgcmV0dXJuIHRoaXMuZW5kICsgdGhpcy5fc29sdXRpb24ueChkdCk7XG59O1xuXG5TcHJpbmcucHJvdG90eXBlLnZlbG9jaXR5ID0gZnVuY3Rpb24oZHQpIHtcbiAgICByZXR1cm4gdGhpcy5fc29sdXRpb24udmVsb2NpdHkoZHQpO1xufTtcblxuU3ByaW5nLnByb3RvdHlwZS5hdFJlc3QgPSBmdW5jdGlvbihkdCwgeCkge1xuICAgIHJldHVybiBkdCA+PSB0aGlzLmR1cmF0aW9uO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgU3ByaW5nOyIsIi8vIE9iamVjdC5hc3NpZ24gcG9seWZpbGxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgICAgIGlmICh0YXJnZXQgPT0gbnVsbCkgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3QnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFyZ2V0ID0gT2JqZWN0KHRhcmdldCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2UgIT0gbnVsbCkgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgfTtcbiAgICB9XG59IiwiLy8gaXNBcnJheSBwb2x5ZmlsbFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICAgIEFycmF5LmlzQXJyYXkgPSBmdW5jdGlvbihhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJnKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgICAgfTtcbiAgICB9XG59Il19

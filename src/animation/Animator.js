import Engine from './Engine';
import EventEmitter from '../events/EventEmitter';
import { CSSRenderer, tweenProps } from './rendering';

const DEFAULT_TRANSFORM = {
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
class Animator {

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
    constructor(target, props, timingParameters = {}) {
        if (!isElementOrNodeList(target)) {
            throw new TypeError('Target must be an HTMLElement or a NodeList.');
        }

        if (!props.from || !props.to) {
            throw new TypeError('Invalid property values.');
        }

        this._events = new EventEmitter();

        this._playState  = 'idle';
        this._progress   = 0;
        this._isReversed = false;

        // Keep track of what the state of the main timeline is
        this._defaultTimingParameters = timingParameters;
        this._onMainTimeline = true;

        this._target = { 
            element: target, 
            values: [
                parseCSSProps(target, props.from), 
                parseCSSProps(target, props.to)
            ]
        };

        let defaultTransformProps = Object.keys(DEFAULT_TRANSFORM),
            toProps = Object.keys(this._target.values[1]),
            i, l, p;

        for (i = 0, l = defaultTransformProps.length; i < l; i++) {
            if (typeof this._target.values[0][defaultTransformProps[i]] === 'undefined') {
                this._target.values[0][defaultTransformProps[i]] = DEFAULT_TRANSFORM[defaultTransformProps[i]].slice(0);
            }
            if (typeof this._target.values[1][defaultTransformProps[i]] === 'undefined') {
                this._target.values[1][defaultTransformProps[i]] = DEFAULT_TRANSFORM[defaultTransformProps[i]].slice(0);
            }
        }

        for (i = 0, l = toProps.length; i < l; i++) {
            if (typeof toProps[i] === 'undefined') throw new Error('Target value for "'+toProps[i]+'" not specified.');
        }
        
        this._renderer = new CSSRenderer(
            target, 
            this._target.values, 
            timingParameters, 
            this._createTickHandler(0)
        );

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
    get progress() {
        return this._progress;
    }

    set progress(val) {
        if (isNaN(val)) return;

        this._playState = 'stopped';
        this._progress  = parseFloat(val);
        
        this._renderer.stop();
        Engine.queuedActions.push( 
            this._renderer.render.bind(this._renderer, 
                tweenProps(this._progress, this._target.values[0], this._target.values[1])
            )
        );
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
    get playState() {
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
    get isReversed() {
        return this._isReversed;
    }

    set isReversed(bool) {
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
    get currentTime() {
        if (this.playState === 'stopped') return null;
        return this._renderer.currentTime;
    }

    set currentTime(val) {
        if (!this._onMainTimeline) {
            this._renderer.stop();

            this._renderer = new CSSRenderer(
                this._target.element,
                this._target.values,
                this._defaultTimingParameters,
                this._createTickHandler(0)
            );

            this._renderer.pause();
            Engine.runningAnimations.push(this._renderer);
            this._playState = (this.playState === 'finished') ? 'finished' : 'paused';
        }
        
        this._renderer.seek( parseFloat(val) );

        if (!this._onMainTimeline) {
            this._renderer.playbackRate = (this._isReversed) ? -1 : 1;
        }

        if (this.playState === 'idle' || this.playState === 'finished') {
            Engine.queuedActions.push(this._renderer.render.bind(this._renderer));
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
    get duration() {
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
    get currentState() {
        let state = this._renderer.currentState;
        let props = Object.keys(state);
        let obj   = {};

        for(var i = 0, l = props.length; i < l; i++) {
            obj[props[i]] = state[props[i]][0];
            if (state[props[i]][1]) obj[props[i]] += state[props[i]][1];
        }

        return obj;
    }

    /**
     * Resume playback of the animation.
     *
     * @method
     * @returns {Animator}
     */
    play() {
        if (this.playState === 'stopped' || this.playState === 'running') return;
            
        if (this.playState === 'idle' || this.playState === 'finished') {
            Engine.runningAnimations.push(this._renderer);
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
    pause() {
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
    stop() {     
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
    continue(timingParameters = {}) {
        this._onMainTimeline = false;
        this._playState  = 'idle';
        this._renderer.stop();

        let startState = tweenProps(this._progress, this._target.values[0], this._target.values[1]);
        let endState   = (!this._isReversed) ? this._target.values[1] : this._target.values[0];

        this._renderer = new CSSRenderer(
            this._target.element,
            [ startState, endState ],
            timingParameters,
            this._createTickHandler(this.progress)
        );

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
    on(label, callback) {
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
    off(label, callback) {
        this._events.removeListener(label, callback);
        return this;
    }

    _createTickHandler(startingProgress) {
        return (progress, currentTime, running) => {
            if (!this._isReversed) {
                this._progress = startingProgress + (progress * (1 - startingProgress));
            } else {
                this._progress = startingProgress - (progress * startingProgress);
            }

            if (!running) {
                this._playState = 'finished';
                this._events.emit('finish', this.progress);

                // return control to the main timeline
                if (!this._onMainTimeline) {
                    if (this.progress >= 1) this.currentTime = this.duration;
                    else this.currentTime = 0;
                }
            }
        };
    }
}

function parseCSSProps(target, props) {
    let finalProps = {}, prop;

    for (var p in props) {
        let val = props[p];

        switch(p) {
            case 'translateX':
            case 'translateY':
            case 'translateZ':
                if ( isNaN(parseFloat(val)) ) break;
                finalProps[p] = [parseFloat(val)];
                finalProps[p][1] = (typeof val === 'string' && val.indexOf('%') !== -1) ? '%' : 'px';                
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
                if (p === 'skew') prop = 'skewX';
                else if (p === 'rotate') prop = 'rotateZ';
                else prop = p;

                finalProps[prop] = [parseFloat(val)];
                finalProps[prop][1] = (typeof val === 'string' && val.indexOf('rad') !== -1) ? 'rad' : 'deg';
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
        return "style" in target || (target.length > 0 && "style" in target[0]);
    } catch(e) {
        return false;
    }
}

export default Animator;

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
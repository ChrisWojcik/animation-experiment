import BezierEasing from './BezierEasing';
import Spring from '../physics/Spring';

const DEFAULT_DURATION = '400';
const DEFAULT_EASING   = 'ease';
const DEFAULT_SPRING_CONSTANT = 100;
const DEFAULT_SPRING_DAMPING  = 20;
const DEFAULT_SPRING_MASS     = 1;

let Easings = {};

[
    ["linear",		[0.00, 0.0, 1.00, 1.0]],
    ["ease",        [0.25, 0.1, 0.25, 1.0]], 
    ["ease-in",     [0.42, 0.0, 1.00, 1.0]],
    ["ease-out",    [0.00, 0.0, 0.58, 1.0]],
    ["ease-in-out", [0.42, 0.0, 0.58, 1.0]]
].forEach(function(array) {
    Easings[array[0]] = BezierEasing.apply(null, array[1]);
});

export function createEaser(options) {
    let type;

    if (Object.keys(Easings).indexOf(options.easing) !== -1 || options.easing === 'spring') {
        type = options.easing;
    } else {
        type = DEFAULT_EASING;
    }

    if (type === 'spring') return new SpringEaser(options);
    else return new BezierEaser(type, options);
}

class BezierEaser {
    constructor(type, options) {
        this.progress = 0;
        this.currentValue = 0;
        this.duration = options.duration || DEFAULT_DURATION;
        this.easingFn = Easings[type];
    }

    tick(value) {
        value /= this.duration;

        if (this.duration === 0.0 || value >= 1) {
            this.progress = 1;
            this.currentValue = 1;
        } else {
            this.progress = this.easingFn(value);
            this.currentValue = value;
        }
    }
}

class SpringEaser {
    constructor(options) {
        let k = options.stiffness || DEFAULT_SPRING_CONSTANT;
        let c = options.damping   || DEFAULT_SPRING_DAMPING;
        let m = options.mass      || DEFAULT_SPRING_MASS;
        let v = options.velocity  || 0;

        this.spring = new Spring(m, k, c, 0, 1, v);
        this.duration = this.spring.duration * 1000; // spring code reports time in s
        this.progress = 0;
        this.currentValue = 0;
    }

    tick(value) {
        if (this.duration === 0.0 || value / this.duration >= 1) {
            this.currentValue = 1;
            this.progress = 1;
        } else {
            this.currentValue = value / this.duration;
            this.progress = this.spring.x(value / 1000);
        }
    }
}
import { createEaser } from './easing';
import Engine from './Engine';

export class CSSRenderer {
    constructor(target, fromTo, options, onTick) {
        
        // Handle NodeLists
        this.target = [];
        if (target.length) this.target = target;
        else this.target.push(target);

        this.fromTo = fromTo;
        this.currentState = tweenProps(0, this.fromTo[0], this.fromTo[1]);
        this.currentTime  = 0;
        this.playbackRate = 1;
        this.running      = false;
        this.paused       = false;

        this.onTick = onTick;
        this.easer  = createEaser(options);
        this.duration = parseFloat(this.easer.duration);
    }

    tick(time) {
        if (this.paused || !this.running) return;

        let currentTime;
        if (this.playbackRate > 0) currentTime = this.currentTime + time;
        else currentTime = this.currentTime - time;
        this.seek(currentTime);

        if (this.playbackRate < 0 && this.easer.currentValue <= 0) this.running = false;
        else if (this.playbackRate >= 0 && this.easer.currentValue >= 1) this.running = false;

        if (this.onTick) this.onTick(this.easer.progress, this.currentTime, this.running);        
        return this;
    }

    render(state) {
        if (state) this.currentState = state;

        for (var i = 0, l = this.target.length; i < l; i++) {
            this.target[i].style[Engine.transformStyleProp] = 
                'translate3d('+
                    this.currentState.translateX[0]+this.currentState.translateX[1]+', '+
                    this.currentState.translateY[0]+this.currentState.translateY[1]+', '+
                    this.currentState.translateZ[0]+this.currentState.translateZ[1]+') '+ 
                'rotateX('+
                    this.currentState.rotateX[0]+this.currentState.rotateX[1]+') '+
                'rotateY('+
                    this.currentState.rotateY[0]+this.currentState.rotateY[1]+') '+
                'rotateZ('+
                    this.currentState.rotateZ[0]+this.currentState.rotateZ[1]+') '+
                'scale3d('+
                    this.currentState.scaleX[0]+', '+
                    this.currentState.scaleY[0]+', '+
                    this.currentState.scaleY[0]+') ' +
                'skew('+
                    this.currentState.skewX[0]+this.currentState.skewX[1]+', '+
                    this.currentState.skewY[0]+this.currentState.skewY[1]+')';

            if (this.currentState.opacity) this.target[i].style.opacity = Math.min(Math.max(this.currentState.opacity[0], 0),1);
        }

        return this;
    }

    play() {
        this.running = true;
        this.paused  = false;
        return this;
    }

    pause() {
        this.paused = true;
        return this;
    }

    stop() {
        this.running = false;
        this.paused  = false;
        return this;
    }

    seek(val) {
        if (val >= this.duration) val = this.duration;
        if (isNaN(val) || val <= 0) val = 0;

        this.running = true;
        this.currentTime = val;
        this.easer.tick(this.currentTime);
        this.currentState = tweenProps(this.easer.progress, this.fromTo[0], this.fromTo[1]);
    }
}

export function tweenProps(tweenValue, fromState, toState) {
    let state = {};
    let props = Object.keys(fromState);

    for (var i = 0, l = props.length; i < l; i++) {
        state[props[i]] = fromState[props[i]].slice(0);
        state[props[i]][0] = state[props[i]][0] + (tweenValue * (toState[props[i]][0] - state[props[i]][0]));
    }

    return state;
}
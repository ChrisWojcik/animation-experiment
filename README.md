# Animation Experiment

This project contains an experimental library for creating interactive, interruptible animations. It will only animate css properties that can be hardware accelerated. This project is a work in progress and the API is still being developed. Complex animation sequences are not yet supported. I took inspiration from Greensock, the (still experimental) Web Animations API, and iOS's UIViewPropertyAnimator.

## Getting Started

The library currently exposes one global: `Animator.` Initialize an Animator with a target DOM node, a starting and ending state, and a set of timing parameters.

```javascript
var animator = new Animator(box, {
	from: { translateX: 0 },
	to:   { translateX: 100 }
}, {
	easing: 'ease-out',
	duration: 400
});
```

In addition to the standard CSS easing functions, the library allows you to make use of spring physics by modeling a [Damped Harmonic Oscillator](http://hyperphysics.phy-astr.gsu.edu/hbase/oscda.html).

```javascript
var animator = new Animator(box, {
	from: { translateX: 0 },
	to: { translateX: 100 }
}, {
	easing: 'spring',
	stiffness: 100,
	damping: 10,
	velocity: 0
});
```

The default is a "critically damped" spring. When spring physics are used, the duration property is ignored and the duration of the animation is computed based on the characteristics of the spring.

Animations can be played, paused, reversed, and seeked.

```javascript
animator.play();
animator.pause();
animator.isReversed = true; // play backwards
animator.currentTime = 250; // seek (ms)
```

You can also interrupt an animation, and continue it towards its target using a new set of timing parameters. When the animation finishes, control is returned to the Animator's original timeline and the original timing parameters are restored.

```javascript
animator.pause();
animator.continue({
	easing: 'ease-out',
	duration: 400
});
```

You can also manually "scrub" an animation's `progress` towards its target values. A timing function, like 'ease' controls the value of a css property as a function of time, by mapping both in the range 0.0 to 1.0:

![Timing Function](https://mdn.mozillademos.org/files/3428/cubic-bezier,ease-in-out.png)

By manipulating an animation's `progress` you are manipulating the y axis in this diagram, NOT time. For example, consider an animation that animates opacity from 1 to 0 in 400ms.

```javascript
animator.progress = 0.5; // Animator is halfway towards its final values, opacity is 0.5
```

Adjusting an Animator's `currentTime` will result in different values for a css property at the same timestamp depending on the easing funciton used. But setting `progress = 0.5` will ALWAYS set the animation to values halfway between the starting and ending values.

**NOTE:** Adjusting an animation's progress currently puts the Animator into the "stopped" state. `continue` must be called to re-initialize the Animator.

See the examples and API Documentation for further explanation.

## Local Development

Working with the animation library requires the main js file located at `dist/index.js`.

To try out the library locally, first install dev dependencies:

```
npm install
```

A gulp task is provided that serves the project statically and sets up a watcher on the `src` folder which runs `jshint` and re-compiles the library via **browserify** using the **ES2015 preset**.

```
gulp serve
```

Open your browser to `http://localhost:9000`

## Documentation

Full API documentation is also available by running a separate gulp task that serves the contents of the `docs` folder.

```
gulp docs
```

Open your browser to `http://localhost:9001`
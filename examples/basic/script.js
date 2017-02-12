window.downEvt = window.ontouchstart !== undefined ? 'touchstart' : 'mousedown';
window.upEvt = window.ontouchend !== undefined ? 'touchend' : 'mouseup';

// wait for images to load so dimensions are correct
window.addEventListener('load', () => {

// PHOTO BOUNCE
var bouncePhoto = document.getElementById('bounce-photo');
var bouncePhotoImg = document.querySelector('#bounce-photo img');

var photoBounce = new Animator(bouncePhotoImg, {
	from: { scale: 1,    translateY: '0%' },
	to:   { scale: 0.65, translateY: '10%' }
});

bouncePhoto.addEventListener(downEvt, () => {
	photoBounce.pause();
	photoBounce.isReversed = false;
	photoBounce.continue({
		easing: 'spring',
		stiffness: 75,
		damping: 3
	});
});

bouncePhoto.addEventListener(upEvt, () => {
	photoBounce.pause();
	photoBounce.isReversed = true;
	photoBounce.continue({
		easing: 'spring',
		stiffness: 75,
		damping: 3
	});
});

// PHOTO SWIPE
var photoDragArea = document.getElementById('drag-photo');
var photoDragImg = document.querySelector('#drag-photo img');

var photoDragHammer = new Hammer.Manager(photoDragArea);
var photoHammerPan  = new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL });
photoDragHammer.add(photoHammerPan);

function makePhotoDragSpringTimingFunction(velocity) {
	return {
		easing: 'spring',
		stiffness: 100,
		damping: 20,
		velocity: velocity || 0
	}
}

var photoDrag = new Animator(photoDragImg, {
	from: { translateX: 0 },
	to:   { translateX: photoDragArea.offsetWidth - photoDragImg.offsetWidth }
}, 
	makePhotoDragSpringTimingFunction()
);

photoDrag.on('finish', function(progress) {
	if (progress === 1) console.log('reached end.');
	if (progress === 0) console.log('reached beginning.');
});

var photoDragProgress = 0;
var startPosition = 0;
var totalDistance = photoDragArea.offsetWidth - photoDragImg.offsetWidth;

photoDragHammer.on('panstart panmove panend pancancel', (ev) => {
	var delta     = ev.deltaX;
	var velocity  = ev.velocityX * 1000; // Hammer reports in px/ms but we need px/s

	if (ev.type === 'panstart') {
		photoDragProgress = photoDrag.progress;
		startPosition = photoDragProgress;
	}

	if (ev.type === 'panmove' || ev.type === 'panstart') {
		if (Math.abs(delta) > 0) {
			var percent = delta / totalDistance;
			photoDragProgress = Math.min(Math.max(startPosition + percent, -0.25), 1.25);
		}

		photoDrag.progress = photoDragProgress;
	}

	if (ev.type == 'panend' || ev.type == 'pancancel') {
		if (photoDragProgress >=  1  || 
			photoDragProgress <  0.5 && photoDragProgress > 0 && velocity >= 100 || 
			photoDragProgress >= 0.5 && velocity >= 0) {

			// We need to normalize our velocity by dividing by the distance traveled during the 
			// animation and setting the sign of the velocity to be positive. Negative velocity 
			// would mean the spring started moving "backwards" relative to the direction of 
			// the animation itself
			var d = Math.abs(1 - photoDragProgress) * totalDistance;
			var normalizedVelocity = Math.abs(velocity / d);
			photoDrag.isReversed = false;
		} else {
			var d = Math.abs(photoDragProgress) * totalDistance;
			var normalizedVelocity = Math.abs(velocity / d);
			photoDrag.isReversed = true;
		}

		photoDrag.continue( makePhotoDragSpringTimingFunction(normalizedVelocity) );
	}
});

var box = document.getElementById('box');
var boxPlay = document.getElementById('box-move-play');
var boxPause = document.getElementById('box-move-pause');
var boxReset = document.getElementById('box-move-reset');

var boxMove = new Animator(box, {
	from: { translateX: 0, rotate: 0, scale: 1 },
	to:   { translateX: window.innerWidth - (box.offsetWidth * 2), rotate: 360, scale: 2 }
}, {
	easing: 'spring',
	stiffness: 100,
	damping: 10,
	velocity: 0
});

boxMove.on('play',   function() { console.log('playing box animation.');  });
boxMove.on('pause',  function() { console.log('paused box animation.');   });
boxMove.on('finish', function() { console.log('finished box animation.'); })

boxPlay.addEventListener('click', function() { boxMove.play(); }, false);
boxPause.addEventListener('click', function() { boxMove.pause(); }, false);
boxReset.addEventListener('click', function() { boxMove.currentTime = 0; }, false);

});
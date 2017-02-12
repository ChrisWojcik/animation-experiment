/*
 * Adapted from:
 * http://iamralpht.github.io/physics/
 *
 * Friction physics simulation. Friction is actually just a simple
 * power curve; the only trick is taking the natural log of the
 * initial drag so that we can express the answer in terms of time.
 */
function Friction(drag, x, initialVelocity) {
    this._drag = drag;
    this._dragLog = Math.log(drag);
    this._x = x;
    this._v = initialVelocity;
}

Friction.prototype.x = function(dt) {
    return this._x + (this._v * Math.pow(this._drag, dt) / this._dragLog - this._v / this._dragLog);
};

Friction.prototype.velocity = function(dt) {
    return this._v * Math.pow(this._drag, dt);
};

Friction.prototype.atRest = function(dt, x) {
    return Math.abs(this.velocity(dt)) < 1;
};

export default Friction;
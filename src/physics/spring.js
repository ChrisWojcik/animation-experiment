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
        // The spring is critically damped.
        // x = (c1 + c2*t) * e ^(-c/2m)*t
        let r = -c / (2 * m);
        let c1 = initial;
        let c2 = velocity / (r * initial);

        let A = Math.sqrt(Math.pow(c1, 2) + Math.pow(c2, 2));
        let epsilon = 0.001;
        this.duration = Math.log(epsilon/A) / r;
        
        this._solution =  {
            x: function(t) { return (c1 + c2 * t) * Math.pow(Math.E, r * t); },
            velocity: function(t) { var pow = Math.pow(Math.E, r * t); return r * (c1 + c2 * t) * pow + c2 * pow; }
        };
    } else if (cmk > 0) {
        // The spring is overdamped; no bounces.
        // x = c1*e^(r1*t) + c2*e^(r2t)
        // Need to find r1 and r2, the roots, then solve c1 and c2.
        let r1 = (-c - Math.sqrt(cmk)) / (2 * m);
        let r2 = (-c + Math.sqrt(cmk)) / (2 * m);
        let c2 = (velocity - r1 * initial) / (r2 - r1);
        let c1 = initial - c2;
        
        let A = Math.sqrt(Math.pow(c1, 2) + Math.pow(c2, 2));

        // The root that has the higher value will control the rate of decay
        let r = Math.max(r1, r2);
        let epsilon = 0.00025;
        this.duration = Math.log(epsilon/A) / r;

        this._solution = {
            x: function(t) { return (c1 * Math.pow(Math.E, r1 * t) + c2 * Math.pow(Math.E, r2 * t)); },
            velocity: function(t) { return (c1 * r1 * Math.pow(Math.E, r1 * t) + c2 * r2 * Math.pow(Math.E, r2 * t)); }
        };
    } else {
        // The spring is underdamped, it has imaginary roots.
        // r = -(c / 2*m) +- w*i
        // w = sqrt(4mk - c^2) / 2m
        // x = (e^-(c/2m)t) * (c1 * cos(wt) + c2 * sin(wt))
        let w = Math.sqrt(4*m*k - c*c) / (2 * m);
        let r = -(c / 2*m);
        let c1= initial;
        let c2= (velocity - r * initial) / w;
        
        let A = Math.sqrt(Math.pow(c1, 2) + Math.pow(c2, 2));
        let epsilon = 0.001;
        this.duration = Math.log(epsilon/A) / r;
            
        this._solution = {
            x: function(t) { return Math.pow(Math.E, r * t) * (c1 * Math.cos(w * t) + c2 * Math.sin(w * t)); },
            velocity: function(t) {
                var power =  Math.pow(Math.E, r * t);
                var cos = Math.cos(w * t);
                var sin = Math.sin(w * t);
                return power * (c2 * w * cos - c1 * w * sin) + r * power * (c2 * sin + c1 * cos);
            }
        };
    }
}

Spring.prototype.x = function(dt) {
    return this.end + this._solution.x(dt);
};

Spring.prototype.velocity = function(dt) {
    return this._solution.velocity(dt);
};

Spring.prototype.atRest = function(dt, x) {
    return dt >= this.duration;
};

export default Spring;
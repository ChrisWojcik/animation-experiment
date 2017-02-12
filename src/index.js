import objectAssignPollyfill from './polyfills/Object.assign'; objectAssignPollyfill();
import isArrayPollyfill from './polyfills/isArray'; isArrayPollyfill();
import Animator from './animation/Animator';

window.Animator = Animator;
export { Animator };
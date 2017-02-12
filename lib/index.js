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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _Object2.default)();
(0, _isArray2.default)();


window.Animator = _Animator2.default;
exports.Animator = _Animator2.default;
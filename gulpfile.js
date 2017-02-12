var gulp = require('gulp');
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var babel = require('gulp-babel');
var jshint = require('gulp-jshint');
var documentation = require('gulp-documentation');
var packageJson = require('./package.json');

var bundler = function() {
    return browserify({
        entries: './src/index.js',
        debug: true
    }).transform(babelify.configure({
        presets: ['es2015']
    }));    
};

var watcher = watchify(bundler());
watcher.on('log', gutil.log);

function bundle(pkg) {
    return pkg.bundle()
        .on('error', function (err) {
            gutil.log(err.message);
            this.emit("end");
        })
        .pipe(source('index.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./dist'));
}

gulp.task('jshint', function() {
  return gulp.src('./src/**/*.js')
    .pipe(jshint({
        esversion: 6
    }))
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('watch:browser', function() {
    watcher.on('update', bundle.bind(null, watcher));
    return bundle(watcher);
});

gulp.task('build:browser', ['jshint'], bundle.bind(null, bundler()));

gulp.task('build:commonjs', ['jshint'], function() {
    gulp.src(['./src/**/*.js'])
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('lib'));
});

gulp.task('build:docs', function () {
    gulp.src(['./src/**/*.js'])
        .pipe(documentation('html', {}, {
            name: 'Animation Experiment',
            version: packageJson.version
        }))
        .pipe(gulp.dest('docs'));
});

gulp.task('connect:dev', ['watch:browser'], function () {
    connect.server({
        port: 9000,
        middleware: function(connect, opt) {
            return [function(req, res, next) {
                if (req.url === '/') {
                    res.statusCode = 301;
                    res.setHeader('Location', 'http://localhost:9000/examples/basic/');
                    res.end('Redirecting...');
                } else {
                    next();
                }
            }]
        }
    });

    gulp.watch(['./src/**/*.js'], ['jshint']);
});

gulp.task('connect:docs', function () {
    connect.server({
        port: 9001,
        root: ['docs']
    });
});

gulp.task('serve', ['connect:dev']);
gulp.task('docs', ['build:docs', 'connect:docs']);
gulp.task('build', ['build:browser', 'build:commonjs', 'build:docs']);
gulp.task('default', ['build']);
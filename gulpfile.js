/**
 * @author Anton.Filin
 */
'use strict';

var gulp      = require('gulp'),
    gutil     = require('gulp-util'),
    source    = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    sequence  = require('run-sequence'),
    clean     = require('gulp-clean'),
    prod      = gulp.env.prod;

var BUILD_PATH = 'build/';
var APP_PATH = 'app/';

function buildPath(relativePath) {
    if (relativePath === undefined) return BUILD_PATH;
    return BUILD_PATH  + relativePath;
}

gulp.task('setProduction', function () {
    prod = true;
});

gulp.task('cleanjs', function () {
    gulp.src(buildPath('js'), {read: false})
        .pipe(clean({force: true}));
});

gulp.task('cleancss', function () {
    gulp.src(buildPath('css/*'), {read: false})
        .pipe(clean({force: true}));
});

gulp.task('stylus', ['cleancss'], function () {
    var stylus = require('gulp-stylus'),
        prefix = require('gulp-autoprefixer'),
        minify = require('gulp-minify-css');

    gulp.src(APP_PATH + 'styles/main.styl')
        .pipe(stylus({linenos: !prod}))
        .pipe(prefix())
        .pipe(prod ? minify() : gutil.noop())
        .pipe(gulp.dest(buildPath('css')));
});

gulp.task('html', function () {
    gulp.src([APP_PATH + 'index.html'])
        .pipe(gulp.dest(buildPath()));
});
gulp.task('sources', function () {
    gulp.src([ APP_PATH + 'images/*'])
        .pipe(gulp.dest(buildPath('images')));
    gulp.src([ APP_PATH + 'javaScript/libs/*'])
        .pipe(gulp.dest(buildPath('js/lib')));
    gulp.src([ APP_PATH + 'vendor/*' ])
        .pipe(gulp.dest(buildPath('vendor')));
    gulp.src([ APP_PATH + 'templates/*' ])
        .pipe(gulp.dest(buildPath('templates')));

});

gulp.task('hint', function () {
    var cached  = require('gulp-cached'),
        jshint  = require('gulp-jshint'),
        stylish = require('jshint-stylish');

    return gulp.src(APP_PATH + 'javaScript/**/*.js')
        .pipe(cached('hinting'))
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

gulp.task('js', ['cleanjs', 'hint'], function () {
    var browserify = require('browserify'),
        uglify     = require('gulp-uglify');

    return browserify(APP_PATH + 'javaScript/main.js', {
        transform: ['hbsfy'],
        debug: !prod,
        noparse: ['jquery', 'lodash']
    })
        .bundle()
        .pipe(source('main.js'))
        .pipe(prod ? streamify(uglify()) : gutil.noop())
        .pipe(gulp.dest(buildPath('js')));
});

gulp.task('build', ['stylus', 'js', 'html', 'sources']);

gulp.task('prod', function () {
    sequence('setProduction', ['stylus', 'js'])
});

gulp.task('watch', ['stylus'] ,function () {
    var watchify   = require('watchify'),
        browserify = require('browserify'),
        bundler    = watchify(browserify(APP_PATH + 'javaScript/main.js', {
            cache: {},
            packageCache: {},
            fullPaths: true,
            transform: ['hbsfy'],
            debug: true,
            noparse: ['jquery', 'underscore', 'jdataview']
        }));

    function rebundle() {
        var t = Date.now();
        gutil.log(gutil.colors.green('Starting Watchify rebundle'));
        return bundler.bundle()
            .pipe(source('main.js'))
            .pipe(gulp.dest(buildPath('js')))
            .on('end', function () {
                gutil.log(gutil.colors.green('Finished bundling after:'), gutil.colors.magenta(Date.now() - t + ' ms'));
            });
    }
    bundler.on('update', rebundle);
    gulp.watch(APP_PATH + 'javaScript/**/*.js', function(){
        sequence('hint');
    });
    gulp.watch(APP_PATH + 'styles/**/*.styl', function(){
        sequence('stylus');
    });
    gulp.watch(APP_PATH + 'styles/**/*.html', function(){
        sequence('html');
    });

    return rebundle();
});

gulp.task('default', ['build', 'watch']);
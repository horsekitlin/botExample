const gulp = require("gulp");
const fs = require("fs");
const nodemon = require("gulp-nodemon");
const babel = require("gulp-babel");
const del = require("del");

gulp.task("clean", () => {
  return del(["./build"]);
});

gulp.task("compile", () => {
  return gulp
    .src("./src/**/*.js")
    .pipe(
      babel({
        presets: ["es2015", "stage-2"],
        plugins: [
          "transform-flow-strip-types",
          "transform-runtime",
          "syntax-async-generators"
        ]
      })
    )
    .pipe(gulp.dest("./build"));
});

gulp.task("watch", ["compile"], () => {
  return nodemon({
    script: "build/bin/www", // run ES5 code
    watch: "src", // watch ES2015 code
    tasks: ["compile"], // compile synchronously onChange
    env: { NODE_ENV: "development" }
  });
});

gulp.task("default", ["watch"]);

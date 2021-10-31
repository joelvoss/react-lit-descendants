#!/bin/bash

set -e
PATH=./node_modules/.bin:$PATH

# Export environment variables from `.env`
if [ -f .env ]
then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

# //////////////////////////////////////////////////////////////////////////////
# START tasks

build() {
  jvdx build --clean -f modern,cjs,esm --no-sourcemap
}

format() {
  jvdx format $*
}

lint() {
  jvdx lint $*
}

test() {
  jvdx test \
    --testPathPattern=/tests \
    --passWithNoTests \
    --env=jsdom $*
}

validate() {
  lint $*
  test $*
}

clean() {
  jvdx clean $*
}

run_examples() {
  EXAMPLES_CACHE=.examples

  parcel "examples/**/*.html" \
    --no-source-maps \
    --dist-dir ${EXAMPLES_CACHE}/.dist \
    --cache-dir ${EXAMPLES_CACHE}/.cache

  rm -rf ${EXAMPLES_CACHE}
}

default() {
  build
}

# END tasks
# //////////////////////////////////////////////////////////////////////////////

${@:-default}

#!/bin/bash
#


BIN_PATH=$(cd "$(dirname "$0")"; pwd -P)
WORK_PATH=${BIN_PATH}/../

git clone https://github.com/darwinia-network/osx-commons

cd osx-commons/configs

yarn install

yarn build

mv dist/ ${WORK_PATH}/node_modules/@aragon/osx-commons-configs/

cd ../../
rm -rf osx-commons

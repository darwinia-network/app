#!/bin/bash
#

set -ex

BIN_PATH=$(cd "$(dirname "$0")"; pwd -P)
WORK_PATH=${BIN_PATH}/../

git clone https://github.com/darwinia-network/osx-commons

cd osx-commons/configs

git checkout -b dawrinia origin/darwinia || true

yarn install

yarn build

rm -rf ${WORK_PATH}/node_modules/@aragon/osx-commons-configs/dist/
mv dist/ ${WORK_PATH}/node_modules/@aragon/osx-commons-configs/

cd ../../
rm -rf osx-commons


ls -la ${WORK_PATH}/node_modules/@aragon/osx-commons-configs/dist/deployments/json


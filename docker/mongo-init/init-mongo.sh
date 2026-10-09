#!/bin/bash
# Runs once, automatically, the first time the mongo container's data
# volume is initialized (see docker-entrypoint-initdb.d in the official
# mongo image docs). Creates an application-scoped user with only
# readWrite on the app database, instead of handing the app the root
# credentials.
set -e

mongosh --quiet <<EOF
use ${MONGO_INITDB_DATABASE}

db.createUser({
  user: '${MONGO_APP_USERNAME}',
  pwd: '${MONGO_APP_PASSWORD}',
  roles: [
    { role: 'readWrite', db: '${MONGO_INITDB_DATABASE}' }
  ]
});

print('Application database user created: ' + '${MONGO_APP_USERNAME}');
EOF

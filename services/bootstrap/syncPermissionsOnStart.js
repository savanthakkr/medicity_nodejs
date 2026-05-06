var PermissionRepo = require("../repositories/PermissionRepository.js");
var permissionRegistry = require("./permissionRegistry.js");

function syncPermissionsOnStart() {
  return new Promise(function (resolve, reject) {
    try {
      var items = permissionRegistry.getAll(); // [{ key, action, description, isSystem }]
      var keys = [];
      var i;

      for (i = 0; i < items.length; i++) {
        keys.push(items[i].key);
      }

      if (!keys.length) {
        return resolve({ total: 0, missing: 0, inserted: 0 });
      }

      PermissionRepo.findByKeys(keys)
        .then(function (existing) {
          var existingKeyMap = {};
          var j;

          for (j = 0; j < existing.length; j++) {
            existingKeyMap[existing[j].permission_Key] = existing[j];
          }

          var missing = [];
          for (j = 0; j < items.length; j++) {
            if (!existingKeyMap[items[j].key]) {
              missing.push(items[j]);
            }
          }

          PermissionRepo.insertManyIgnore(missing)
            .then(function (insertResult) {
              var reviveKeys = [];
              var k;

              for (k = 0; k < existing.length; k++) {
                if (existing[k].is_deleted === 1 || existing[k].is_active === 0) {
                  reviveKeys.push(existing[k].permission_Key);
                }
              }

              if (!reviveKeys.length) {
                return resolve({
                  total: items.length,
                  missing: missing.length,
                  inserted: insertResult.inserted || 0,
                  revived: 0
                });
              }

              PermissionRepo.reactivateByKeys(reviveKeys)
                .then(function (reviveResult) {
                  resolve({
                    total: items.length,
                    missing: missing.length,
                    inserted: insertResult.inserted || 0,
                    revived: reviveResult.updated || 0
                  });
                })
                .catch(reject);
            })
            .catch(reject);
        })
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  syncPermissionsOnStart: syncPermissionsOnStart
};

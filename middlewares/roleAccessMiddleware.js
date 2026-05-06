const utility = require('../helpers/utility');
const { register } = require('../services/bootstrap/permissionRegistry.js');
const { permissionDependencies } = require('./permissionDependencies.js');

function resolvePermissionDependencies(permission, visited = new Set()) {
  if (visited.has(permission)) return [];
  visited.add(permission);

  const permConfig = permissionDependencies[permission];
  if (!permConfig) return [permission];

  const dependencies = permConfig.dependencies || [];
  const allPermissions = [permission];

  dependencies.forEach((dep) => {
    const resolved = resolvePermissionDependencies(dep, visited);
    allPermissions.push(...resolved);
  });

  return [...new Set(allPermissions)];
}

function getEffectivePermissions(userPermissions) {
  const effective = new Set();

  userPermissions.forEach((permission) => {
    const resolved = resolvePermissionDependencies(permission);
    resolved.forEach((p) => effective.add(p));
  });

  return [...effective];
}

module.exports = function roleAccessMiddleware(requiredPermissions = [], meta = {}) {
  // Normalize input -> { anyOf: [], allOf: [] }
  const normalized = (() => {
    if (Array.isArray(requiredPermissions)) return { allOf: requiredPermissions, anyOf: [] };
    if (requiredPermissions && typeof requiredPermissions === 'object') {
      const anyOf = Array.isArray(requiredPermissions.anyOf) ? requiredPermissions.anyOf : [];
      const allOf = Array.isArray(requiredPermissions.allOf) ? requiredPermissions.allOf : [];
      return { anyOf, allOf };
    }
    return { allOf: [], anyOf: [] };
  })();

  // Register both anyOf + allOf for bootstrap DB sync
  const toRegister = [...normalized.allOf, ...normalized.anyOf].filter(Boolean);
  if (toRegister.length) {
    register(toRegister, meta);
  }

  return (req, res, next) => {
    const user = req.locals.userData;

    if (utility.checkEmpty(user)) {
      return utility.sendError(res, req, null, 'Unauthorized', 401);
    }

    const userPermissions = user.permissions || [];

    // wildcard permission
    if (userPermissions.includes('*')) return next();

    const effectivePermissions = getEffectivePermissions(userPermissions);

    // AND check (allOf)
    const hasAll =
      normalized.allOf.length === 0 ? true : normalized.allOf.every((p) => effectivePermissions.includes(p));

    // OR check (anyOf)
    const hasAny =
      normalized.anyOf.length === 0 ? true : normalized.anyOf.some((p) => effectivePermissions.includes(p));

    // If anyOf provided => must pass hasAny, plus also allOf if present
    const allowed = hasAll && hasAny;

    if (!allowed) {
      return utility.sendError(res, req, null, 'Access denied', 403);
    }

    next();
  };
};

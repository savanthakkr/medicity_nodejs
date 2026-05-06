const registry = new Map();

/**
 * Registers permissions dynamically during route load
 *
 * @param {string[]|string} keys
 * @param {Object} meta
 * meta = {
 *   action?: string,
 *   description?: string,
 *   isSystem?: boolean
 * }
 */
exports.register = (keys = [], meta = {}) => {
  const arr = Array.isArray(keys) ? keys : [keys];

  for (const key of arr) {
    if (!key) continue;

    const permissionKey = String(key).trim();
    if (!permissionKey) continue;

    if (registry.has(permissionKey)) continue;

    // Auto-derive action from key
    // e.g. "designation.create" → "create"
    const derivedAction = permissionKey.includes(".")
      ? permissionKey.split(".").pop()
      : null;

    registry.set(permissionKey, {
      key: permissionKey,
      action: meta.action || derivedAction,
      description:
        meta.description || `Auto generated permission: ${permissionKey}`,
      isSystem: meta.isSystem === true ? 1 : 0
    });
  }
};

/**
 * Returns all registered permissions for bootstrap
 */
exports.getAll = () => Array.from(registry.values());

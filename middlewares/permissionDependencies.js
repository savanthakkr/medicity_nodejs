exports.permissionDependencies = {
    // CONTACT
    'contact.create': { dependencies: ['contact.list'], fullAccess: false },
    'contact.update': { dependencies: ['contact.list'], fullAccess: false },
    'contact.delete': { dependencies: ['contact.list'], fullAccess: false },
    'contact.read': { dependencies: ['contact.list'], fullAccess: false },
    'contact.list': { dependencies: [], fullAccess: false },
    'contact.all': { dependencies: ['contact.create', 'contact.update', 'contact.delete', 'contact.list', 'contact.read'], fullAccess: true },

    // PERMISSION
    'permission.create': { dependencies: ['permission.list'], fullAccess: false },
    'permission.update': { dependencies: ['permission.list'], fullAccess: false },
    'permission.delete': { dependencies: ['permission.list'], fullAccess: false },
    'permission.read': { dependencies: ['permission.list'], fullAccess: false },
    'permission.list': { dependencies: [], fullAccess: false },
    'permission.status.update': { dependencies: ['permission.list'], fullAccess: false },
    'permission.all': { dependencies: ['permission.create', 'permission.update', 'permission.delete', 'permission.list', 'permission.read', 'permission.status.update'], fullAccess: true },

    // ROLE
    'role.create': { dependencies: ['role.list'], fullAccess: false },
    'role.update': { dependencies: ['role.list'], fullAccess: false },
    'role.delete': { dependencies: ['role.list'], fullAccess: false },
    'role.read': { dependencies: ['role.list'], fullAccess: false },
    'role.list': { dependencies: [], fullAccess: false },
    'role.permission.add': { dependencies: ['role.update', 'role.list'], fullAccess: false },
    'role.permission.remove': { dependencies: ['role.update', 'role.list'], fullAccess: false },
    'role.status.update': { dependencies: ['role.list'], fullAccess: false },
    'role.all': { dependencies: ['role.create', 'role.update', 'role.delete', 'role.list', 'role.read', 'role.permission.add', 'role.permission.remove', 'role.status.update'], fullAccess: true },

    // TAG
    'tag.create': { dependencies: ['tag.list'], fullAccess: false },
    'tag.update': { dependencies: ['tag.list'], fullAccess: false },
    'tag.delete': { dependencies: ['tag.list'], fullAccess: false },
    'tag.read': { dependencies: ['tag.list'], fullAccess: false },
    'tag.list': { dependencies: [], fullAccess: false },
    'tag.assign': { dependencies: ['tag.list'], fullAccess: false },
    'tag.all': { dependencies: ['tag.create', 'tag.update', 'tag.delete', 'tag.list', 'tag.read', 'tag.assign'], fullAccess: true },

    // USER
    'user.create': { dependencies: ['user.list'], fullAccess: false },
    'user.update': { dependencies: ['user.list'], fullAccess: false },
    'user.delete': { dependencies: ['user.list'], fullAccess: false },
    'user.read': { dependencies: ['user.list'], fullAccess: false },
    'user.list': { dependencies: [], fullAccess: false },
    'user.auth.read': { dependencies: ['user.list'], fullAccess: false },
    'user.all': { dependencies: ['user.create', 'user.update', 'user.delete', 'user.list', 'user.read', 'user.auth.read'], fullAccess: true },

    // DESIGNATION
    'designation.create': { dependencies: ['designation.list'], fullAccess: false },
    'designation.update': { dependencies: ['designation.list'], fullAccess: false },
    'designation.delete': { dependencies: ['designation.list'], fullAccess: false },
    'designation.read': { dependencies: ['designation.list'], fullAccess: false },
    'designation.list': { dependencies: [], fullAccess: false },
    'designation.all': { dependencies: ['designation.create', 'designation.update', 'designation.delete', 'designation.list', 'designation.read'], fullAccess: true },

    // NOTIFICATION
    'notification.read': { dependencies: ['notification.list'], fullAccess: false },
    'notification.update': { dependencies: ['notification.read', 'notification.list'], fullAccess: false },
    'notification.list': { dependencies: [], fullAccess: false },
    'notification.all': { dependencies: ['notification.read', 'notification.update', 'notification.list'], fullAccess: true },
};

// Permission Registry
// Maps permission IDs to permission names for the RBAC system

module.exports = {
  // Admin Permissions
  ADMIN_CREATE: 1,
  ADMIN_EDIT: 2,
  ADMIN_DELETE: 3,
  ADMIN_VIEW: 4,

  // Employee Permissions
  EMPLOYEE_CREATE: 5,
  EMPLOYEE_EDIT: 6,
  EMPLOYEE_DELETE: 7,
  EMPLOYEE_VIEW: 8,

  // Client Permissions
  CLIENT_VIEW: 9,
  CLIENT_EDIT: 10,
  CLIENT_CREATE: 11,
  CLIENT_DELETE: 12,

  // Role Hierarchy
  ROLES: {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    EMPLOYEE: 3
  },

  // Role Descriptions
  ROLE_NAMES: {
    1: "Super Admin",
    2: "Admin",
    3: "Employee"
  },

  // Permission Descriptions
  PERMISSION_NAMES: {
    1: "Create Admin",
    2: "Edit Admin",
    3: "Delete Admin",
    4: "View Admin",
    5: "Create Employee",
    6: "Edit Employee",
    7: "Delete Employee",
    8: "View Employee",
    9: "View Client",
    10: "Edit Client",
    11: "Create Client",
    12: "Delete Client"
  }
};

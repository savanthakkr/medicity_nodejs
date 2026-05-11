-- Role-Based Access Control System Database Schema
-- Based on the requirements for Super Admin, Admin, and Employee roles

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

--
-- Table structure for table `users`
-- Main user table supporting all three roles: Super Admin, Admin, Employee
--

CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `parent_user_id` int DEFAULT NULL COMMENT 'For Admin->Super Admin, Employee->Admin relationship',
  `is_active` tinyint(1) DEFAULT '1',
  `is_delete` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  KEY `parent_user_id` (`parent_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
-- Defines the three main roles
--

CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hierarchy_level` int NOT NULL COMMENT '1=Super Admin, 2=Admin, 3=Employee',
  `is_active` tinyint(1) DEFAULT '1',
  `is_delete` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
-- Granular permissions for different modules and actions
--

CREATE TABLE `permissions` (
  `permission_id` int NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_delete` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `permission_key` (`permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
-- Junction table for role-permission assignments
-- Super Admin gets all permissions by default
--

CREATE TABLE `role_permissions` (
  `role_permission_id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_permission_id`),
  UNIQUE KEY `role_permission_unique` (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
-- Junction table for user-specific permission assignments
-- Used when Admin assigns limited permissions to Employees
--

CREATE TABLE `user_permissions` (
  `user_permission_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `assigned_by` int NOT NULL COMMENT 'User ID who assigned this permission',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_permission_id`),
  UNIQUE KEY `user_permission_unique` (`user_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  KEY `assigned_by` (`assigned_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_token`
-- Authentication tokens following the existing pattern
--

CREATE TABLE `user_token` (
  `user_token_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `jwt_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `firebase_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_delete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_token_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_activity_log`
-- Track user activities for audit purposes
--

CREATE TABLE `user_activity_log` (
  `activity_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`),
  KEY `user_id` (`user_id`),
  KEY `action` (`action`),
  KEY `module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Add foreign key constraints
--

ALTER TABLE `users`
  ADD CONSTRAINT `users_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `users_parent_user_id_fk` FOREIGN KEY (`parent_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_permission_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE;

ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_permissions_permission_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_permissions_assigned_by_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

ALTER TABLE `user_token`
  ADD CONSTRAINT `user_token_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

ALTER TABLE `user_activity_log`
  ADD CONSTRAINT `user_activity_log_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

-- --------------------------------------------------------

--
-- Insert initial data for roles
--

INSERT INTO `roles` (`role_id`, `role_name`, `role_description`, `hierarchy_level`, `is_active`, `is_delete`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'Full system access with all permissions', 1, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Admin', 'Limited access as assigned by Super Admin', 2, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Employee', 'Restricted access as assigned by Admin', 3, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- --------------------------------------------------------

--
-- Insert permissions for different modules and actions
--

INSERT INTO `permissions` (`permission_id`, `permission_name`, `permission_key`, `module`, `action`, `description`, `is_active`, `is_delete`, `created_at`, `updated_at`) VALUES
-- Admin Management Permissions
(1, 'Create Admin', 'admin_create', 'admin', 'create', 'Create new admin users', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'View Admin List', 'admin_view', 'admin', 'view', 'View list of admin users', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Edit Admin', 'admin_edit', 'admin', 'edit', 'Edit admin user details', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Delete Admin', 'admin_delete', 'admin', 'delete', 'Delete admin users', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Employee Management Permissions
(5, 'Create Employee', 'employee_create', 'employee', 'create', 'Create new employee users', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'View Employee List', 'employee_view', 'employee', 'view', 'View list of employee users', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'Edit Employee', 'employee_edit', 'employee', 'edit', 'Edit employee user details', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'Delete Employee', 'employee_delete', 'employee', 'delete', 'Delete employee users', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'Assign Employee Permissions', 'employee_assign_permissions', 'employee', 'assign_permissions', 'Assign permissions to employees', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Client Module Permissions
(10, 'Create Client', 'client_create', 'client', 'create', 'Create new clients', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'View Client List', 'client_view', 'client', 'view', 'View list of clients', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'Edit Client', 'client_edit', 'client', 'edit', 'Edit client details', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'Delete Client', 'client_delete', 'client', 'delete', 'Delete clients', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Reports Module Permissions
(14, 'View Reports', 'reports_view', 'reports', 'view', 'View system reports', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'Generate Reports', 'reports_generate', 'reports', 'generate', 'Generate new reports', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(16, 'Export Reports', 'reports_export', 'reports', 'export', 'Export reports to various formats', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Settings Module Permissions
(17, 'View Settings', 'settings_view', 'settings', 'view', 'View system settings', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'Edit Settings', 'settings_edit', 'settings', 'edit', 'Edit system settings', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Dashboard Permissions
(19, 'View Dashboard', 'dashboard_view', 'dashboard', 'view', 'View main dashboard', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- --------------------------------------------------------

--
-- Assign permissions to roles
-- Super Admin gets all permissions
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `is_active`, `created_at`) VALUES
-- Super Admin (role_id = 1) gets all permissions
(1, 1, 1, CURRENT_TIMESTAMP), (1, 2, 1, CURRENT_TIMESTAMP), (1, 3, 1, CURRENT_TIMESTAMP), (1, 4, 1, CURRENT_TIMESTAMP),
(1, 5, 1, CURRENT_TIMESTAMP), (1, 6, 1, CURRENT_TIMESTAMP), (1, 7, 1, CURRENT_TIMESTAMP), (1, 8, 1, CURRENT_TIMESTAMP), (1, 9, 1, CURRENT_TIMESTAMP),
(1, 10, 1, CURRENT_TIMESTAMP), (1, 11, 1, CURRENT_TIMESTAMP), (1, 12, 1, CURRENT_TIMESTAMP), (1, 13, 1, CURRENT_TIMESTAMP),
(1, 14, 1, CURRENT_TIMESTAMP), (1, 15, 1, CURRENT_TIMESTAMP), (1, 16, 1, CURRENT_TIMESTAMP),
(1, 17, 1, CURRENT_TIMESTAMP), (1, 18, 1, CURRENT_TIMESTAMP),
(1, 19, 1, CURRENT_TIMESTAMP),

-- Admin (role_id = 2) gets limited permissions as per requirements
(2, 5, 1, CURRENT_TIMESTAMP), -- Create Employee
(2, 6, 1, CURRENT_TIMESTAMP), -- View Employee List
(2, 7, 1, CURRENT_TIMESTAMP), -- Edit Employee
(2, 9, 1, CURRENT_TIMESTAMP), -- Assign Employee Permissions
(2, 10, 1, CURRENT_TIMESTAMP), -- Create Client
(2, 11, 1, CURRENT_TIMESTAMP), -- View Client List
(2, 12, 1, CURRENT_TIMESTAMP), -- Edit Client
(2, 14, 1, CURRENT_TIMESTAMP), -- View Reports
(2, 19, 1, CURRENT_TIMESTAMP); -- View Dashboard

-- Employee (role_id = 3) gets no default permissions
-- Permissions will be assigned individually by Admins

-- --------------------------------------------------------

--
-- Create sample users
--

-- Sample Super Admin (password: admin123)
INSERT INTO `users` (`user_id`, `name`, `email`, `mobile_no`, `password`, `role_id`, `parent_user_id`, `is_active`, `is_delete`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'superadmin@example.com', '9999999999', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdJrGwVOlJyXKvJJfZKZb5J2u2J2G', 1, NULL, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Sample Admin (password: admin123)
INSERT INTO `users` (`user_id`, `name`, `email`, `mobile_no`, `password`, `role_id`, `parent_user_id`, `is_active`, `is_delete`, `created_at`, `updated_at`) VALUES
(2, 'Admin User', 'admin@example.com', '8888888888', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdJrGwVOlJyXKvJJfZKZb5J2u2J2G', 2, 1, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Sample Employee (password: emp123)
INSERT INTO `users` (`user_id`, `name`, `email`, `mobile_no`, `password`, `role_id`, `parent_user_id`, `is_active`, `is_delete`, `created_at`, `updated_at`) VALUES
(3, 'Employee User', 'employee@example.com', '7777777777', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdJrGwVOlJyXKvJJfZKZb5J2u2J2G', 3, 2, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- --------------------------------------------------------

--
-- Sample user permissions (Admin assigning permissions to Employee)
-- Employee gets Client View and Client Edit permissions only
--

INSERT INTO `user_permissions` (`user_id`, `permission_id`, `assigned_by`, `is_active`, `created_at`) VALUES
(3, 11, 2, 1, CURRENT_TIMESTAMP), -- Client View permission
(3, 12, 2, 1, CURRENT_TIMESTAMP); -- Client Edit permission

-- --------------------------------------------------------

--
-- Create views for easier permission checking
--

-- View to get all permissions for a user (role + user-specific)
CREATE OR REPLACE VIEW `user_all_permissions` AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    r.role_name,
    p.permission_id,
    p.permission_name,
    p.permission_key,
    p.module,
    p.action,
    CASE 
        WHEN rp.permission_id IS NOT NULL THEN 'role'
        WHEN up.permission_id IS NOT NULL THEN 'user'
        ELSE NULL
    END as permission_source
FROM users u
JOIN roles r ON u.role_id = r.role_id
LEFT JOIN role_permissions rp ON r.role_id = rp.role_id AND rp.is_active = 1
LEFT JOIN permissions p ON (rp.permission_id = p.permission_id OR p.permission_id IN (
    SELECT permission_id FROM user_permissions up2 WHERE up2.user_id = u.user_id AND up2.is_active = 1
))
LEFT JOIN user_permissions up ON u.user_id = up.user_id AND up.permission_id = p.permission_id AND up.is_active = 1
WHERE u.is_active = 1 AND u.is_delete = 0 AND p.is_active = 1 AND p.is_delete = 0
GROUP BY u.user_id, p.permission_id;

-- View to check if user has specific permission
CREATE OR REPLACE VIEW `user_permission_check` AS
SELECT 
    u.user_id,
    p.permission_key,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM role_permissions rp 
            JOIN permissions p2 ON rp.permission_id = p2.permission_id 
            WHERE rp.role_id = u.role_id AND rp.is_active = 1 
            AND p2.permission_key = p.permission_key AND p2.is_active = 1
        ) THEN 1
        WHEN EXISTS (
            SELECT 1 FROM user_permissions up 
            JOIN permissions p2 ON up.permission_id = p2.permission_id 
            WHERE up.user_id = u.user_id AND up.is_active = 1 
            AND p2.permission_key = p.permission_key AND p2.is_active = 1
        ) THEN 1
        ELSE 0
    END as has_permission
FROM users u
CROSS JOIN permissions p
WHERE u.is_active = 1 AND u.is_delete = 0;

COMMIT;

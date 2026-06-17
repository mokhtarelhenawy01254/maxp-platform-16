const permissionService = require('../services/permissionService');

exports.listPermissions = async (req, res) => {
  try {
    const { domain } = req.query;
    const permissions = await permissionService.getPermissions(domain);
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('[PermissionController] listPermissions error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
};

exports.listRoles = async (req, res) => {
  try {
    const { companyId } = req.params;
    const roles = await permissionService.getCompanyRoles(companyId);
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('[PermissionController] listRoles error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { key, name, description, permissions } = req.body;
    if (!key || !name) {
      return res.status(400).json({ success: false, error: 'Role key and name are required' });
    }
    const role = await permissionService.createCustomRole(companyId, { key, name, description, permissionKeys: permissions || [] }, req.user.id);
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    console.error('[PermissionController] createRole error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { companyId, roleId } = req.params;
    const { name, description, permissions } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Role name is required' });
    }
    const role = await permissionService.updateCustomRole(companyId, roleId, { name, description, permissionKeys: permissions || [] }, req.user.id);
    res.json({ success: true, data: role });
  } catch (error) {
    if (error.message === 'Custom role not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    console.error('[PermissionController] updateRole error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { companyId, roleId } = req.params;
    await permissionService.deleteCustomRole(companyId, roleId, req.user.id);
    res.json({ success: true, message: 'تم حذف الدور بنجاح' });
  } catch (error) {
    if (error.message === 'Custom role not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    console.error('[PermissionController] deleteRole error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete role' });
  }
};

exports.setUserRole = async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { roleId } = req.body;
    if (!roleId) {
      return res.status(400).json({ success: false, error: 'Role ID is required' });
    }
    await permissionService.setUserRole(userId, companyId, roleId, req.user.id);
    res.json({ success: true, message: 'تم تعيين الدور بنجاح' });
  } catch (error) {
    console.error('[PermissionController] setUserRole error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

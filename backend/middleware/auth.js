// 角色继承顺序
const ROLE_LEVEL = { guest: 0, student: 1, admin: 2 };

/**
 * 从请求头 X-User-Role 读取角色
 */
function attachUser(req, res, next) {
  console.log('📥 收到请求:', req.method, req.url);
  console.log('📥 请求头 x-user-role:', req.headers['x-user-role']);
  
  const role = req.headers['x-user-role'] || 'student';
  const validRole = (role === 'admin') ? 'admin' : 'student';
  
  req.user = {
    user_id: 1,
    username: validRole === 'admin' ? '管理员' : 'test_student',
    user_role: validRole
  };
  console.log('👤 设置用户角色:', req.user.user_role);
  next();
}

function requireRole(minRole) {
  const minLevel = ROLE_LEVEL[minRole];
  return (req, res, next) => {
    const userLevel = ROLE_LEVEL[req.user?.user_role] ?? 0;
    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: minRole === 'admin' ? '需要管理员权限' : '请先登录后再操作',
      });
    }
    next();
  };
}

module.exports = { attachUser, requireRole, ROLE_LEVEL };
/**
 * 权限配置
 * 定义系统中所有可用的权限代码和对应的菜单/功能
 */

export const PERMISSIONS = {
  // 仪表板
  DASHBOARD_VIEW: 'dashboard.view',
  
  // 差旅管理
  TRAVEL_VIEW: 'travel.view',
  TRAVEL_CREATE: 'travel.create',
  TRAVEL_EDIT: 'travel.edit',
  TRAVEL_DELETE: 'travel.delete',
  TRAVEL_APPROVE: 'travel.approve',
  
  // 费用管理
  EXPENSE_VIEW: 'expense.view',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_EDIT: 'expense.edit',
  EXPENSE_DELETE: 'expense.delete',
  EXPENSE_APPROVE: 'expense.approve',
  
  // 审批管理
  APPROVAL_VIEW: 'approval.view',
  APPROVAL_APPROVE: 'approval.approve',
  APPROVAL_REJECT: 'approval.reject',
  
  // 报告分析
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',
  
  // 差旅标准查询
  TRAVEL_STANDARD_QUERY: 'travel.standard.query',
  
  // 差旅标准管理
  TRAVEL_STANDARD_VIEW: 'travel.standard.view',
  TRAVEL_STANDARD_CREATE: 'travel.standard.create',
  TRAVEL_STANDARD_EDIT: 'travel.standard.edit',
  TRAVEL_STANDARD_DELETE: 'travel.standard.delete',
  
  // 费用项目管理
  EXPENSE_ITEM_VIEW: 'expense.item.view',
  EXPENSE_ITEM_CREATE: 'expense.item.create',
  EXPENSE_ITEM_EDIT: 'expense.item.edit',
  EXPENSE_ITEM_DELETE: 'expense.item.delete',
  
  // 位置管理
  LOCATION_VIEW: 'location.view',
  LOCATION_CREATE: 'location.create',
  LOCATION_EDIT: 'location.edit',
  LOCATION_DELETE: 'location.delete',
  
  // 国际化监控
  I18N_VIEW: 'i18n.view',
  
  // 角色管理
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_EDIT: 'role.edit',
  ROLE_DELETE: 'role.delete',
  
  // 职位管理
  POSITION_VIEW: 'position.view',
  POSITION_CREATE: 'position.create',
  POSITION_EDIT: 'position.edit',
  POSITION_DELETE: 'position.delete',
  
  // 用户管理
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  
  // 审批工作流管理
  APPROVAL_WORKFLOW_VIEW: 'approval.workflow.view',
  APPROVAL_WORKFLOW_CREATE: 'approval.workflow.create',
  APPROVAL_WORKFLOW_EDIT: 'approval.workflow.edit',
  APPROVAL_WORKFLOW_DELETE: 'approval.workflow.delete',
  
  // 审批统计
  APPROVAL_STATISTICS_VIEW: 'approval.statistics.view',
  
  // 设置
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
};

/**
 * 菜单权限映射
 * 将路由路径映射到对应的权限代码
 */
export const MENU_PERMISSIONS = {
  '/dashboard': PERMISSIONS.DASHBOARD_VIEW,
  '/travel': PERMISSIONS.TRAVEL_VIEW,
  '/expenses': PERMISSIONS.EXPENSE_VIEW,
  '/approvals': PERMISSIONS.APPROVAL_VIEW,
  '/reports': PERMISSIONS.REPORT_VIEW,
  '/travel-standards/query': PERMISSIONS.TRAVEL_STANDARD_QUERY,
  '/travel-standards': PERMISSIONS.TRAVEL_STANDARD_VIEW,
  '/expense-items': PERMISSIONS.EXPENSE_ITEM_VIEW,
  '/location': PERMISSIONS.LOCATION_VIEW,
  '/locations': PERMISSIONS.LOCATION_VIEW,
  '/i18n': PERMISSIONS.I18N_VIEW,
  '/roles': PERMISSIONS.ROLE_VIEW,
  '/positions': PERMISSIONS.POSITION_VIEW,
  '/users': PERMISSIONS.USER_VIEW,
  '/approval-workflows': PERMISSIONS.APPROVAL_WORKFLOW_VIEW,
  '/approval-statistics': PERMISSIONS.APPROVAL_STATISTICS_VIEW,
  '/settings': PERMISSIONS.SETTINGS_VIEW,
};













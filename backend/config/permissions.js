/**
 * 权限配置
 * 定义系统中所有可用的权限代码和对应的菜单/功能
 */

const PERMISSIONS = {
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
 * 权限分组配置
 * 用于前端权限选择器的分组显示
 */
const PERMISSION_GROUPS = [
  {
    name: 'dashboard',
    label: '仪表板',
    labelEn: 'Dashboard',
    labelJa: 'ダッシュボード',
    labelKo: '대시보드',
    permissions: [
      { code: PERMISSIONS.DASHBOARD_VIEW, label: '查看仪表板', labelEn: 'View Dashboard', labelJa: 'ダッシュボードを表示', labelKo: '대시보드 보기' }
    ]
  },
  {
    name: 'travel',
    label: '差旅管理',
    labelEn: 'Travel Management',
    labelJa: '出張管理',
    labelKo: '출장 관리',
    permissions: [
      { code: PERMISSIONS.TRAVEL_VIEW, label: '查看差旅', labelEn: 'View Travel', labelJa: '出張を表示', labelKo: '출장 보기' },
      { code: PERMISSIONS.TRAVEL_CREATE, label: '创建差旅', labelEn: 'Create Travel', labelJa: '出張を作成', labelKo: '출장 생성' },
      { code: PERMISSIONS.TRAVEL_EDIT, label: '编辑差旅', labelEn: 'Edit Travel', labelJa: '出張を編集', labelKo: '출장 편집' },
      { code: PERMISSIONS.TRAVEL_DELETE, label: '删除差旅', labelEn: 'Delete Travel', labelJa: '出張を削除', labelKo: '출장 삭제' },
      { code: PERMISSIONS.TRAVEL_APPROVE, label: '审批差旅', labelEn: 'Approve Travel', labelJa: '出張を承認', labelKo: '출장 승인' }
    ]
  },
  {
    name: 'expense',
    label: '费用管理',
    labelEn: 'Expense Management',
    labelJa: '経費管理',
    labelKo: '비용 관리',
    permissions: [
      { code: PERMISSIONS.EXPENSE_VIEW, label: '查看费用', labelEn: 'View Expense', labelJa: '経費を表示', labelKo: '비용 보기' },
      { code: PERMISSIONS.EXPENSE_CREATE, label: '创建费用', labelEn: 'Create Expense', labelJa: '経費を作成', labelKo: '비용 생성' },
      { code: PERMISSIONS.EXPENSE_EDIT, label: '编辑费用', labelEn: 'Edit Expense', labelJa: '経費を編集', labelKo: '비용 편집' },
      { code: PERMISSIONS.EXPENSE_DELETE, label: '删除费用', labelEn: 'Delete Expense', labelJa: '経費を削除', labelKo: '비용 삭제' },
      { code: PERMISSIONS.EXPENSE_APPROVE, label: '审批费用', labelEn: 'Approve Expense', labelJa: '経費を承認', labelKo: '비용 승인' }
    ]
  },
  {
    name: 'approval',
    label: '审批管理',
    labelEn: 'Approval Management',
    labelJa: '承認管理',
    labelKo: '승인 관리',
    permissions: [
      { code: PERMISSIONS.APPROVAL_VIEW, label: '查看审批', labelEn: 'View Approval', labelJa: '承認を表示', labelKo: '승인 보기' },
      { code: PERMISSIONS.APPROVAL_APPROVE, label: '审批通过', labelEn: 'Approve', labelJa: '承認', labelKo: '승인' },
      { code: PERMISSIONS.APPROVAL_REJECT, label: '审批拒绝', labelEn: 'Reject', labelJa: '却下', labelKo: '거부' }
    ]
  },
  {
    name: 'report',
    label: '报告分析',
    labelEn: 'Reports & Analytics',
    labelJa: 'レポート分析',
    labelKo: '보고서 분석',
    permissions: [
      { code: PERMISSIONS.REPORT_VIEW, label: '查看报告', labelEn: 'View Reports', labelJa: 'レポートを表示', labelKo: '보고서 보기' },
      { code: PERMISSIONS.REPORT_EXPORT, label: '导出报告', labelEn: 'Export Reports', labelJa: 'レポートをエクスポート', labelKo: '보고서 내보내기' }
    ]
  },
  {
    name: 'travelStandard',
    label: '差旅标准',
    labelEn: 'Travel Standards',
    labelJa: '出張基準',
    labelKo: '출장 기준',
    permissions: [
      { code: PERMISSIONS.TRAVEL_STANDARD_QUERY, label: '查询差旅标准', labelEn: 'Query Travel Standards', labelJa: '出張基準を検索', labelKo: '출장 기준 조회' },
      { code: PERMISSIONS.TRAVEL_STANDARD_VIEW, label: '查看差旅标准', labelEn: 'View Travel Standards', labelJa: '出張基準を表示', labelKo: '출장 기준 보기' },
      { code: PERMISSIONS.TRAVEL_STANDARD_CREATE, label: '创建差旅标准', labelEn: 'Create Travel Standards', labelJa: '出張基準を作成', labelKo: '출장 기준 생성' },
      { code: PERMISSIONS.TRAVEL_STANDARD_EDIT, label: '编辑差旅标准', labelEn: 'Edit Travel Standards', labelJa: '出張基準を編集', labelKo: '출장 기준 편집' },
      { code: PERMISSIONS.TRAVEL_STANDARD_DELETE, label: '删除差旅标准', labelEn: 'Delete Travel Standards', labelJa: '出張基準を削除', labelKo: '출장 기준 삭제' }
    ]
  },
  {
    name: 'expenseItem',
    label: '费用项目',
    labelEn: 'Expense Items',
    labelJa: '経費項目',
    labelKo: '비용 항목',
    permissions: [
      { code: PERMISSIONS.EXPENSE_ITEM_VIEW, label: '查看费用项目', labelEn: 'View Expense Items', labelJa: '経費項目を表示', labelKo: '비용 항목 보기' },
      { code: PERMISSIONS.EXPENSE_ITEM_CREATE, label: '创建费用项目', labelEn: 'Create Expense Items', labelJa: '経費項目を作成', labelKo: '비용 항목 생성' },
      { code: PERMISSIONS.EXPENSE_ITEM_EDIT, label: '编辑费用项目', labelEn: 'Edit Expense Items', labelJa: '経費項目を編集', labelKo: '비용 항목 편집' },
      { code: PERMISSIONS.EXPENSE_ITEM_DELETE, label: '删除费用项目', labelEn: 'Delete Expense Items', labelJa: '経費項目を削除', labelKo: '비용 항목 삭제' }
    ]
  },
  {
    name: 'location',
    label: '位置管理',
    labelEn: 'Location Management',
    labelJa: '場所管理',
    labelKo: '위치 관리',
    permissions: [
      { code: PERMISSIONS.LOCATION_VIEW, label: '查看位置', labelEn: 'View Locations', labelJa: '場所を表示', labelKo: '위치 보기' },
      { code: PERMISSIONS.LOCATION_CREATE, label: '创建位置', labelEn: 'Create Locations', labelJa: '場所を作成', labelKo: '위치 생성' },
      { code: PERMISSIONS.LOCATION_EDIT, label: '编辑位置', labelEn: 'Edit Locations', labelJa: '場所を編集', labelKo: '위치 편집' },
      { code: PERMISSIONS.LOCATION_DELETE, label: '删除位置', labelEn: 'Delete Locations', labelJa: '場所を削除', labelKo: '위치 삭제' }
    ]
  },
  {
    name: 'i18n',
    label: '国际化',
    labelEn: 'Internationalization',
    labelJa: '国際化',
    labelKo: '국제화',
    permissions: [
      { code: PERMISSIONS.I18N_VIEW, label: '查看国际化', labelEn: 'View I18n', labelJa: '国際化を表示', labelKo: '국제화 보기' }
    ]
  },
  {
    name: 'role',
    label: '角色管理',
    labelEn: 'Role Management',
    labelJa: '役割管理',
    labelKo: '역할 관리',
    permissions: [
      { code: PERMISSIONS.ROLE_VIEW, label: '查看角色', labelEn: 'View Roles', labelJa: '役割を表示', labelKo: '역할 보기' },
      { code: PERMISSIONS.ROLE_CREATE, label: '创建角色', labelEn: 'Create Roles', labelJa: '役割を作成', labelKo: '역할 생성' },
      { code: PERMISSIONS.ROLE_EDIT, label: '编辑角色', labelEn: 'Edit Roles', labelJa: '役割を編集', labelKo: '역할 편집' },
      { code: PERMISSIONS.ROLE_DELETE, label: '删除角色', labelEn: 'Delete Roles', labelJa: '役割を削除', labelKo: '역할 삭제' }
    ]
  },
  {
    name: 'position',
    label: '职位管理',
    labelEn: 'Position Management',
    labelJa: '職位管理',
    labelKo: '직위 관리',
    permissions: [
      { code: PERMISSIONS.POSITION_VIEW, label: '查看职位', labelEn: 'View Positions', labelJa: '職位を表示', labelKo: '직위 보기' },
      { code: PERMISSIONS.POSITION_CREATE, label: '创建职位', labelEn: 'Create Positions', labelJa: '職位を作成', labelKo: '직위 생성' },
      { code: PERMISSIONS.POSITION_EDIT, label: '编辑职位', labelEn: 'Edit Positions', labelJa: '職位を編集', labelKo: '직위 편집' },
      { code: PERMISSIONS.POSITION_DELETE, label: '删除职位', labelEn: 'Delete Positions', labelJa: '職位を削除', labelKo: '직위 삭제' }
    ]
  },
  {
    name: 'user',
    label: '用户管理',
    labelEn: 'User Management',
    labelJa: 'ユーザー管理',
    labelKo: '사용자 관리',
    permissions: [
      { code: PERMISSIONS.USER_VIEW, label: '查看用户', labelEn: 'View Users', labelJa: 'ユーザーを表示', labelKo: '사용자 보기' },
      { code: PERMISSIONS.USER_CREATE, label: '创建用户', labelEn: 'Create Users', labelJa: 'ユーザーを作成', labelKo: '사용자 생성' },
      { code: PERMISSIONS.USER_EDIT, label: '编辑用户', labelEn: 'Edit Users', labelJa: 'ユーザーを編集', labelKo: '사용자 편집' },
      { code: PERMISSIONS.USER_DELETE, label: '删除用户', labelEn: 'Delete Users', labelJa: 'ユーザーを削除', labelKo: '사용자 삭제' }
    ]
  },
  {
    name: 'approvalWorkflow',
    label: '审批工作流',
    labelEn: 'Approval Workflows',
    labelJa: '承認ワークフロー',
    labelKo: '승인 워크플로우',
    permissions: [
      { code: PERMISSIONS.APPROVAL_WORKFLOW_VIEW, label: '查看工作流', labelEn: 'View Workflows', labelJa: 'ワークフローを表示', labelKo: '워크플로우 보기' },
      { code: PERMISSIONS.APPROVAL_WORKFLOW_CREATE, label: '创建工作流', labelEn: 'Create Workflows', labelJa: 'ワークフローを作成', labelKo: '워크플로우 생성' },
      { code: PERMISSIONS.APPROVAL_WORKFLOW_EDIT, label: '编辑工作流', labelEn: 'Edit Workflows', labelJa: 'ワークフローを編集', labelKo: '워크플로우 편집' },
      { code: PERMISSIONS.APPROVAL_WORKFLOW_DELETE, label: '删除工作流', labelEn: 'Delete Workflows', labelJa: 'ワークフローを削除', labelKo: '워크플로우 삭제' }
    ]
  },
  {
    name: 'approvalStatistics',
    label: '审批统计',
    labelEn: 'Approval Statistics',
    labelJa: '承認統計',
    labelKo: '승인 통계',
    permissions: [
      { code: PERMISSIONS.APPROVAL_STATISTICS_VIEW, label: '查看统计', labelEn: 'View Statistics', labelJa: '統計を表示', labelKo: '통계 보기' }
    ]
  },
  {
    name: 'settings',
    label: '设置',
    labelEn: 'Settings',
    labelJa: '設定',
    labelKo: '설정',
    permissions: [
      { code: PERMISSIONS.SETTINGS_VIEW, label: '查看设置', labelEn: 'View Settings', labelJa: '設定を表示', labelKo: '설정 보기' },
      { code: PERMISSIONS.SETTINGS_EDIT, label: '编辑设置', labelEn: 'Edit Settings', labelJa: '設定を編集', labelKo: '설정 편집' }
    ]
  }
];

/**
 * 菜单权限映射
 * 将路由路径映射到对应的权限代码
 */
const MENU_PERMISSIONS = {
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

module.exports = {
  PERMISSIONS,
  PERMISSION_GROUPS,
  MENU_PERMISSIONS
};


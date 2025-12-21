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
  
  // 机票管理
  FLIGHT_SEARCH: 'flight.search',
  FLIGHT_BOOKING_VIEW: 'flight.booking.view',
  FLIGHT_BOOKING_CREATE: 'flight.booking.create',
  FLIGHT_BOOKING_CANCEL: 'flight.booking.cancel',
  
  // 酒店管理
  HOTEL_SEARCH: 'hotel.search',
  HOTEL_BOOKING_VIEW: 'hotel.booking.view',
  HOTEL_BOOKING_CREATE: 'hotel.booking.create',
  HOTEL_BOOKING_CANCEL: 'hotel.booking.cancel',
  
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
  ROLE_TOGGLE_ACTIVE: 'role.toggleActive',
  
  // 职位管理
  POSITION_VIEW: 'position.view',
  POSITION_CREATE: 'position.create',
  POSITION_EDIT: 'position.edit',
  POSITION_DELETE: 'position.delete',
  POSITION_TOGGLE_ACTIVE: 'position.toggleActive',
  
  // 用户管理
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  USER_TOGGLE_ACTIVE: 'user.toggleActive',
  
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
  
  // 发票夹
  INVOICE_VIEW: 'invoice.view',
  INVOICE_CREATE: 'invoice.create',
  INVOICE_UPLOAD: 'invoice.upload',
  INVOICE_EDIT: 'invoice.edit',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_RECOGNIZE: 'invoice.recognize',
  
  // 通知管理
  NOTIFICATION_VIEW: 'notification.view',
  NOTIFICATION_MANAGE: 'notification.manage',
  
  // 城市级别管理
  CITY_LEVEL_VIEW: 'city.level.view',
  CITY_LEVEL_CREATE: 'city.level.create',
  CITY_LEVEL_EDIT: 'city.level.edit',
  CITY_LEVEL_DELETE: 'city.level.delete',
  
  // 职位级别管理
  JOB_LEVEL_VIEW: 'job.level.view',
  JOB_LEVEL_CREATE: 'job.level.create',
  JOB_LEVEL_EDIT: 'job.level.edit',
  JOB_LEVEL_DELETE: 'job.level.delete',
  
  // 币种管理
  CURRENCY_VIEW: 'currency.view',
  CURRENCY_CREATE: 'currency.create',
  CURRENCY_EDIT: 'currency.edit',
  CURRENCY_DELETE: 'currency.delete',
  CURRENCY_TOGGLE_ACTIVE: 'currency.toggleActive',
  
  // 标准匹配
  STANDARD_MATCH_VIEW: 'standard.match.view',
  STANDARD_MATCH_USE: 'standard.match.use',
  
  // 搜索功能
  SEARCH_VIEW: 'search.view',
  SEARCH_ADVANCED: 'search.advanced',
  
  // 预算管理
  BUDGET_VIEW: 'budget.view',
  
  // 推送通知
  PUSH_NOTIFICATION_SUBSCRIBE: 'push.notification.subscribe',
  
  // 日志管理
  LOG_VIEW: 'log.view',
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
    label: '差旅',
    labelEn: 'Travel',
    labelJa: '出張',
    labelKo: '출장',
    permissions: [
      { code: PERMISSIONS.TRAVEL_VIEW, label: '查看差旅', labelEn: 'View Travel', labelJa: '出張を表示', labelKo: '출장 보기' },
      { code: PERMISSIONS.TRAVEL_CREATE, label: '创建差旅', labelEn: 'Create Travel', labelJa: '出張を作成', labelKo: '출장 생성' },
      { code: PERMISSIONS.TRAVEL_EDIT, label: '编辑差旅', labelEn: 'Edit Travel', labelJa: '出張を編集', labelKo: '출장 편집' },
      { code: PERMISSIONS.TRAVEL_DELETE, label: '删除差旅', labelEn: 'Delete Travel', labelJa: '出張を削除', labelKo: '출장 삭제' },
      { code: PERMISSIONS.TRAVEL_APPROVE, label: '审批差旅', labelEn: 'Approve Travel', labelJa: '出張を承認', labelKo: '출장 승인' }
    ]
  },
  {
    name: 'flight',
    label: '机票管理',
    labelEn: 'Flight Management',
    labelJa: '航空券管理',
    labelKo: '항공권 관리',
    permissions: [
      { code: PERMISSIONS.FLIGHT_SEARCH, label: '搜索航班', labelEn: 'Search Flights', labelJa: 'フライトを検索', labelKo: '항공편 검색' },
      { code: PERMISSIONS.FLIGHT_BOOKING_VIEW, label: '查看预订', labelEn: 'View Bookings', labelJa: '予約を表示', labelKo: '예약 보기' },
      { code: PERMISSIONS.FLIGHT_BOOKING_CREATE, label: '创建预订', labelEn: 'Create Booking', labelJa: '予約を作成', labelKo: '예약 생성' },
      { code: PERMISSIONS.FLIGHT_BOOKING_CANCEL, label: '取消预订', labelEn: 'Cancel Booking', labelJa: '予約をキャンセル', labelKo: '예약 취소' }
    ]
  },
  {
    name: 'hotel',
    label: '酒店管理',
    labelEn: 'Hotel Management',
    labelJa: 'ホテル管理',
    labelKo: '호텔 관리',
    permissions: [
      { code: PERMISSIONS.HOTEL_SEARCH, label: '搜索酒店', labelEn: 'Search Hotels', labelJa: 'ホテルを検索', labelKo: '호텔 검색' },
      { code: PERMISSIONS.HOTEL_BOOKING_VIEW, label: '查看预订', labelEn: 'View Bookings', labelJa: '予約を表示', labelKo: '예약 보기' },
      { code: PERMISSIONS.HOTEL_BOOKING_CREATE, label: '创建预订', labelEn: 'Create Booking', labelJa: '予約を作成', labelKo: '예약 생성' },
      { code: PERMISSIONS.HOTEL_BOOKING_CANCEL, label: '取消预订', labelEn: 'Cancel Booking', labelJa: '予約をキャンセル', labelKo: '예약 취소' }
    ]
  },
  {
    name: 'expense',
    label: '费用',
    labelEn: 'Expense',
    labelJa: '経費',
    labelKo: '비용',
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
    label: '审批',
    labelEn: 'Approval',
    labelJa: '承認',
    labelKo: '승인',
    permissions: [
      { code: PERMISSIONS.APPROVAL_VIEW, label: '查看审批', labelEn: 'View Approval', labelJa: '承認を表示', labelKo: '승인 보기' },
      { code: PERMISSIONS.APPROVAL_APPROVE, label: '审批通过', labelEn: 'Approve', labelJa: '承認', labelKo: '승인' },
      { code: PERMISSIONS.APPROVAL_REJECT, label: '审批拒绝', labelEn: 'Reject', labelJa: '却下', labelKo: '거부' }
    ]
  },
  {
    name: 'report',
    label: '报告',
    labelEn: 'Reports',
    labelJa: 'レポート',
    labelKo: '보고서',
    permissions: [
      { code: PERMISSIONS.REPORT_VIEW, label: '查看报告', labelEn: 'View Reports', labelJa: 'レポートを表示', labelKo: '보고서 보기' },
      { code: PERMISSIONS.REPORT_EXPORT, label: '导出报告', labelEn: 'Export Reports', labelJa: 'レポートをエクスポート', labelKo: '보고서 내보내기' }
    ]
  },
  {
    name: 'travelStandard',
    label: '差旅标准管理',
    labelEn: 'Travel Standards Management',
    labelJa: '出張基準管理',
    labelKo: '출장 기준 관리',
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
    label: '费用项目维护',
    labelEn: 'Expense Items Maintenance',
    labelJa: '経費項目メンテナンス',
    labelKo: '비용 항목 유지보수',
    permissions: [
      { code: PERMISSIONS.EXPENSE_ITEM_VIEW, label: '查看费用项目', labelEn: 'View Expense Items', labelJa: '経費項目を表示', labelKo: '비용 항목 보기' },
      { code: PERMISSIONS.EXPENSE_ITEM_CREATE, label: '创建费用项目', labelEn: 'Create Expense Items', labelJa: '経費項目を作成', labelKo: '비용 항목 생성' },
      { code: PERMISSIONS.EXPENSE_ITEM_EDIT, label: '编辑费用项目', labelEn: 'Edit Expense Items', labelJa: '経費項目を編集', labelKo: '비용 항목 편집' },
      { code: PERMISSIONS.EXPENSE_ITEM_DELETE, label: '删除费用项目', labelEn: 'Delete Expense Items', labelJa: '経費項目を削除', labelKo: '비용 항목 삭제' }
    ]
  },
  {
    name: 'location',
    label: '地理位置管理',
    labelEn: 'Location Management',
    labelJa: '地理場所管理',
    labelKo: '지리 위치 관리',
    permissions: [
      { code: PERMISSIONS.LOCATION_VIEW, label: '查看位置', labelEn: 'View Locations', labelJa: '場所を表示', labelKo: '위치 보기' },
      { code: PERMISSIONS.LOCATION_CREATE, label: '创建位置', labelEn: 'Create Locations', labelJa: '場所を作成', labelKo: '위치 생성' },
      { code: PERMISSIONS.LOCATION_EDIT, label: '编辑位置', labelEn: 'Edit Locations', labelJa: '場所を編集', labelKo: '위치 편집' },
      { code: PERMISSIONS.LOCATION_DELETE, label: '删除位置', labelEn: 'Delete Locations', labelJa: '場所を削除', labelKo: '위치 삭제' }
    ]
  },
  {
    name: 'i18n',
    label: '国际化监控',
    labelEn: 'Internationalization Monitor',
    labelJa: '国際化監視',
    labelKo: '국제화 모니터',
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
      { code: PERMISSIONS.ROLE_DELETE, label: '删除角色', labelEn: 'Delete Roles', labelJa: '役割を削除', labelKo: '역할 삭제' },
      { code: PERMISSIONS.ROLE_TOGGLE_ACTIVE, label: '启用/禁用角色', labelEn: 'Toggle Role Active Status', labelJa: '役割を有効/無効化', labelKo: '역할 활성화/비활성화' }
    ]
  },
  {
    name: 'position',
    label: '岗位管理',
    labelEn: 'Position Management',
    labelJa: '職位管理',
    labelKo: '직위 관리',
    permissions: [
      { code: PERMISSIONS.POSITION_VIEW, label: '查看岗位', labelEn: 'View Positions', labelJa: '職位を表示', labelKo: '직위 보기' },
      { code: PERMISSIONS.POSITION_CREATE, label: '创建岗位', labelEn: 'Create Positions', labelJa: '職位を作成', labelKo: '직위 생성' },
      { code: PERMISSIONS.POSITION_EDIT, label: '编辑岗位', labelEn: 'Edit Positions', labelJa: '職位を編集', labelKo: '직위 편집' },
      { code: PERMISSIONS.POSITION_DELETE, label: '删除岗位', labelEn: 'Delete Positions', labelJa: '職位を削除', labelKo: '직위 삭제' },
      { code: PERMISSIONS.POSITION_TOGGLE_ACTIVE, label: '启用/禁用岗位', labelEn: 'Toggle Position Active Status', labelJa: '職位を有効/無効化', labelKo: '직위 활성화/비활성화' }
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
      { code: PERMISSIONS.USER_DELETE, label: '删除用户', labelEn: 'Delete Users', labelJa: 'ユーザーを削除', labelKo: '사용자 삭제' },
      { code: PERMISSIONS.USER_TOGGLE_ACTIVE, label: '启用/禁用用户', labelEn: 'Toggle User Active Status', labelJa: 'ユーザーを有効/無効化', labelKo: '사용자 활성화/비활성화' }
    ]
  },
  {
    name: 'approvalWorkflow',
    label: '审批流程管理',
    labelEn: 'Approval Workflow Management',
    labelJa: '承認プロセス管理',
    labelKo: '승인 프로세스 관리',
    permissions: [
      { code: PERMISSIONS.APPROVAL_WORKFLOW_VIEW, label: '查看工作流', labelEn: 'View Workflows', labelJa: 'ワークフローを表示', labelKo: '워크플로우 보기' },
      { code: PERMISSIONS.APPROVAL_WORKFLOW_CREATE, label: '创建工作流', labelEn: 'Create Workflows', labelJa: 'ワークフローを作成', labelKo: '워크플로우 생성' },
      { code: PERMISSIONS.APPROVAL_WORKFLOW_EDIT, label: '编辑工作流', labelEn: 'Edit Workflows', labelJa: 'ワークフローを編集', labelKo: '워크플로우 편집' },
      { code: PERMISSIONS.APPROVAL_WORKFLOW_DELETE, label: '删除工作流', labelEn: 'Delete Workflows', labelJa: 'ワークフローを削除', labelKo: '워크플로우 삭제' }
    ]
  },
  {
    name: 'approvalStatistics',
    label: '审批统计分析',
    labelEn: 'Approval Statistics & Analysis',
    labelJa: '承認統計分析',
    labelKo: '승인 통계 분석',
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
  },
  {
    name: 'invoice',
    label: '发票夹',
    labelEn: 'Invoice Folder',
    labelJa: '請求書フォルダ',
    labelKo: '인보이스 폴더',
    permissions: [
      { code: PERMISSIONS.INVOICE_VIEW, label: '查看发票', labelEn: 'View Invoices', labelJa: '請求書を表示', labelKo: '인보이스 보기' },
      { code: PERMISSIONS.INVOICE_CREATE, label: '创建发票', labelEn: 'Create Invoices', labelJa: '請求書を作成', labelKo: '인보이스 생성' },
      { code: PERMISSIONS.INVOICE_UPLOAD, label: '上传发票', labelEn: 'Upload Invoices', labelJa: '請求書をアップロード', labelKo: '인보이스 업로드' },
      { code: PERMISSIONS.INVOICE_EDIT, label: '编辑发票', labelEn: 'Edit Invoices', labelJa: '請求書を編集', labelKo: '인보이스 편집' },
      { code: PERMISSIONS.INVOICE_DELETE, label: '删除发票', labelEn: 'Delete Invoices', labelJa: '請求書を削除', labelKo: '인보이스 삭제' },
      { code: PERMISSIONS.INVOICE_RECOGNIZE, label: 'OCR识别', labelEn: 'OCR Recognition', labelJa: 'OCR認識', labelKo: 'OCR 인식' }
    ]
  },
  {
    name: 'notification',
    label: '通知管理',
    labelEn: 'Notification Management',
    labelJa: '通知管理',
    labelKo: '알림 관리',
    permissions: [
      { code: PERMISSIONS.NOTIFICATION_VIEW, label: '查看通知', labelEn: 'View Notifications', labelJa: '通知を表示', labelKo: '알림 보기' },
      { code: PERMISSIONS.NOTIFICATION_MANAGE, label: '管理通知', labelEn: 'Manage Notifications', labelJa: '通知を管理', labelKo: '알림 관리' }
    ]
  },
  {
    name: 'cityLevel',
    label: '城市级别',
    labelEn: 'City Levels',
    labelJa: '都市レベル',
    labelKo: '도시 레벨',
    permissions: [
      { code: PERMISSIONS.CITY_LEVEL_VIEW, label: '查看城市级别', labelEn: 'View City Levels', labelJa: '都市レベルを表示', labelKo: '도시 레벨 보기' },
      { code: PERMISSIONS.CITY_LEVEL_CREATE, label: '创建城市级别', labelEn: 'Create City Levels', labelJa: '都市レベルを作成', labelKo: '도시 레벨 생성' },
      { code: PERMISSIONS.CITY_LEVEL_EDIT, label: '编辑城市级别', labelEn: 'Edit City Levels', labelJa: '都市レベルを編集', labelKo: '도시 레벨 편집' },
      { code: PERMISSIONS.CITY_LEVEL_DELETE, label: '删除城市级别', labelEn: 'Delete City Levels', labelJa: '都市レベルを削除', labelKo: '도시 레벨 삭제' }
    ]
  },
  {
    name: 'jobLevel',
    label: '职位级别',
    labelEn: 'Job Levels',
    labelJa: '職位レベル',
    labelKo: '직위 레벨',
    permissions: [
      { code: PERMISSIONS.JOB_LEVEL_VIEW, label: '查看职位级别', labelEn: 'View Job Levels', labelJa: '職位レベルを表示', labelKo: '직위 레벨 보기' },
      { code: PERMISSIONS.JOB_LEVEL_CREATE, label: '创建职位级别', labelEn: 'Create Job Levels', labelJa: '職位レベルを作成', labelKo: '직위 레벨 생성' },
      { code: PERMISSIONS.JOB_LEVEL_EDIT, label: '编辑职位级别', labelEn: 'Edit Job Levels', labelJa: '職位レベルを編集', labelKo: '직위 레벨 편집' },
      { code: PERMISSIONS.JOB_LEVEL_DELETE, label: '删除职位级别', labelEn: 'Delete Job Levels', labelJa: '職位レベルを削除', labelKo: '직위 레벨 삭제' }
    ]
  },
  {
    name: 'currency',
    label: '币种管理',
    labelEn: 'Currency Management',
    labelJa: '通貨管理',
    labelKo: '통화 관리',
    permissions: [
      { code: PERMISSIONS.CURRENCY_VIEW, label: '查看币种', labelEn: 'View Currencies', labelJa: '通貨を表示', labelKo: '통화 보기' },
      { code: PERMISSIONS.CURRENCY_CREATE, label: '创建币种', labelEn: 'Create Currencies', labelJa: '通貨を作成', labelKo: '통화 생성' },
      { code: PERMISSIONS.CURRENCY_EDIT, label: '编辑币种', labelEn: 'Edit Currencies', labelJa: '通貨を編集', labelKo: '통화 편집' },
      { code: PERMISSIONS.CURRENCY_DELETE, label: '删除币种', labelEn: 'Delete Currencies', labelJa: '通貨を削除', labelKo: '통화 삭제' },
      { code: PERMISSIONS.CURRENCY_TOGGLE_ACTIVE, label: '启用/禁用币种', labelEn: 'Toggle Currency Active Status', labelJa: '通貨を有効/無効化', labelKo: '통화 활성화/비활성화' }
    ]
  },
  {
    name: 'standardMatch',
    label: '标准匹配',
    labelEn: 'Standard Matching',
    labelJa: '基準マッチング',
    labelKo: '기준 매칭',
    permissions: [
      { code: PERMISSIONS.STANDARD_MATCH_VIEW, label: '查看标准匹配', labelEn: 'View Standard Matching', labelJa: '基準マッチングを表示', labelKo: '기준 매칭 보기' },
      { code: PERMISSIONS.STANDARD_MATCH_USE, label: '使用标准匹配', labelEn: 'Use Standard Matching', labelJa: '基準マッチングを使用', labelKo: '기준 매칭 사용' }
    ]
  },
  {
    name: 'search',
    label: '搜索功能',
    labelEn: 'Search',
    labelJa: '検索機能',
    labelKo: '검색 기능',
    permissions: [
      { code: PERMISSIONS.SEARCH_VIEW, label: '查看搜索', labelEn: 'View Search', labelJa: '検索を表示', labelKo: '검색 보기' },
      { code: PERMISSIONS.SEARCH_ADVANCED, label: '高级搜索', labelEn: 'Advanced Search', labelJa: '高度な検索', labelKo: '고급 검색' }
    ]
  },
  {
    name: 'budget',
    label: '预算管理',
    labelEn: 'Budget Management',
    labelJa: '予算管理',
    labelKo: '예산 관리',
    permissions: [
      { code: PERMISSIONS.BUDGET_VIEW, label: '查看预算', labelEn: 'View Budget', labelJa: '予算を表示', labelKo: '예산 보기' }
    ]
  },
  {
    name: 'pushNotification',
    label: '推送通知',
    labelEn: 'Push Notifications',
    labelJa: 'プッシュ通知',
    labelKo: '푸시 알림',
    permissions: [
      { code: PERMISSIONS.PUSH_NOTIFICATION_SUBSCRIBE, label: '订阅推送通知', labelEn: 'Subscribe Push Notifications', labelJa: 'プッシュ通知を購読', labelKo: '푸시 알림 구독' }
    ]
  },
  {
    name: 'log',
    label: '日志管理',
    labelEn: 'Logs Management',
    labelJa: 'ログ管理',
    labelKo: '로그 관리',
    permissions: [
      { code: PERMISSIONS.LOG_VIEW, label: '查看日志', labelEn: 'View Logs', labelJa: 'ログを表示', labelKo: '로그 보기' }
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
  '/flight/search': PERMISSIONS.FLIGHT_SEARCH,
  '/flight/bookings': PERMISSIONS.FLIGHT_BOOKING_VIEW,
  '/hotel/search': PERMISSIONS.HOTEL_SEARCH,
  '/hotel/bookings': PERMISSIONS.HOTEL_BOOKING_VIEW,
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
  '/invoices': PERMISSIONS.INVOICE_VIEW,
  '/notifications': PERMISSIONS.NOTIFICATION_VIEW,
  '/city-levels': PERMISSIONS.CITY_LEVEL_VIEW,
  '/job-levels': PERMISSIONS.JOB_LEVEL_VIEW,
  '/currencies': PERMISSIONS.CURRENCY_VIEW,
  '/standard-match': PERMISSIONS.STANDARD_MATCH_VIEW,
  '/search': PERMISSIONS.SEARCH_VIEW,
  '/budgets': PERMISSIONS.BUDGET_VIEW,
  '/logs': PERMISSIONS.LOG_VIEW,
};

module.exports = {
  PERMISSIONS,
  PERMISSION_GROUPS,
  MENU_PERMISSIONS
};


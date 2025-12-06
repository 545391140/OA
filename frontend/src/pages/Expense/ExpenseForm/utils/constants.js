/**
 * ExpenseForm 常量定义
 */

// 获取分类选项
export const getCategories = (t) => [
  { value: 'transportation', label: t('expense.categories.transportation') },
  { value: 'accommodation', label: t('expense.categories.accommodation') },
  { value: 'meals', label: t('expense.categories.meals') },
  { value: 'entertainment', label: t('expense.categories.entertainment') },
  { value: 'communication', label: t('expense.categories.communication') },
  { value: 'office_supplies', label: t('expense.categories.office_supplies') },
  { value: 'training', label: t('expense.categories.training') },
  { value: 'other', label: t('expense.categories.other') }
];

// 获取子分类选项
export const getSubcategories = (t) => ({
  transportation: [
    t('expense.subcategories.transportation.flight'),
    t('expense.subcategories.transportation.train'),
    t('expense.subcategories.transportation.taxi'),
    t('expense.subcategories.transportation.rentalCar'),
    t('expense.subcategories.transportation.publicTransport'),
    t('expense.subcategories.transportation.parking'),
    t('expense.subcategories.transportation.fuel')
  ],
  accommodation: [
    t('expense.subcategories.accommodation.hotel'),
    t('expense.subcategories.accommodation.airbnb'),
    t('expense.subcategories.accommodation.hostel'),
    t('expense.subcategories.accommodation.apartmentRental')
  ],
  meals: [
    t('expense.subcategories.meals.breakfast'),
    t('expense.subcategories.meals.lunch'),
    t('expense.subcategories.meals.dinner'),
    t('expense.subcategories.meals.coffeeTea'),
    t('expense.subcategories.meals.snacks'),
    t('expense.subcategories.meals.businessMeal')
  ],
  entertainment: [
    t('expense.subcategories.entertainment.clientEntertainment'),
    t('expense.subcategories.entertainment.teamBuilding'),
    t('expense.subcategories.entertainment.conference'),
    t('expense.subcategories.entertainment.event')
  ],
  communication: [
    t('expense.subcategories.communication.phone'),
    t('expense.subcategories.communication.internet'),
    t('expense.subcategories.communication.mobileData'),
    t('expense.subcategories.communication.postage'),
    t('expense.subcategories.communication.courier')
  ],
  office_supplies: [
    t('expense.subcategories.office_supplies.stationery'),
    t('expense.subcategories.office_supplies.printing'),
    t('expense.subcategories.office_supplies.software'),
    t('expense.subcategories.office_supplies.hardware'),
    t('expense.subcategories.office_supplies.books')
  ],
  training: [
    t('expense.subcategories.training.course'),
    t('expense.subcategories.training.workshop'),
    t('expense.subcategories.training.certification'),
    t('expense.subcategories.training.conference'),
    t('expense.subcategories.training.onlineTraining')
  ],
  other: [
    t('expense.subcategories.other.miscellaneous'),
    t('expense.subcategories.other.bankFees'),
    t('expense.subcategories.other.insurance'),
    t('expense.subcategories.other.medical'),
    t('expense.subcategories.other.other')
  ]
});

// 获取项目选项
export const getProjects = (t) => [
  t('expense.projects.projectAlpha'),
  t('expense.projects.projectBeta'),
  t('expense.projects.projectGamma'),
  t('expense.projects.clientAEngagement'),
  t('expense.projects.clientBEngagement'),
  t('expense.projects.internalDevelopment')
];

// 获取成本中心选项
export const getCostCenters = (t) => [
  t('expense.costCenters.sales'),
  t('expense.costCenters.marketing'),
  t('expense.costCenters.engineering'),
  t('expense.costCenters.operations'),
  t('expense.costCenters.hr'),
  t('expense.costCenters.finance'),
  t('expense.costCenters.legal')
];

// 获取客户选项
export const getClients = (t) => [
  t('expense.clients.clientA'),
  t('expense.clients.clientB'),
  t('expense.clients.clientC'),
  t('expense.clients.internal'),
  t('expense.clients.prospectA'),
  t('expense.clients.prospectB')
];

// 获取常用标签
export const getCommonTags = (t) => [
  t('expense.tags.urgent'),
  t('expense.tags.clientRelated'),
  t('expense.tags.travel'),
  t('expense.tags.training'),
  t('expense.tags.equipment'),
  t('expense.tags.software'),
  t('expense.tags.hardware'),
  t('expense.tags.meeting'),
  t('expense.tags.conference')
];

// 初始表单数据
export const getInitialFormData = () => ({
  title: '',
  description: '',
  category: '',
  subcategory: '',
  amount: '',
  currency: 'USD',
  date: null,
  vendor: {
    name: '',
    address: '',
    taxId: ''
  },
  project: '',
  costCenter: '',
  client: '',
  tags: [],
  notes: '',
  receipts: []
});


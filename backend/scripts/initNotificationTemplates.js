const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/database');
const NotificationTemplate = require('../models/NotificationTemplate');

// 默认通知模板
const defaultTemplates = [
  {
    code: 'APPROVAL_REQUEST',
    name: '审批请求通知',
    type: 'approval_request',
    titleTemplate: '新的{{requestType}}审批请求',
    contentTemplate: '{{requesterName}} 提交了一个{{requestType}}申请"{{requestTitle}}"，请您审批。',
    emailTemplate: '<h2>新的{{requestType}}审批请求</h2><p>{{requesterName}} 提交了一个{{requestType}}申请"{{requestTitle}}"，请您审批。</p><p><a href="{{url}}">查看详情</a></p>',
    pushTemplate: '{{requesterName}} 提交了{{requestType}}申请"{{requestTitle}}"',
    variables: [
      { name: 'requesterName', description: '申请人姓名', example: '张三' },
      { name: 'requestType', description: '申请类型', example: '差旅' },
      { name: 'requestTitle', description: '申请标题', example: '北京出差' },
      { name: 'url', description: '详情链接', example: '/travel/123' }
    ],
    enabled: true,
    priority: 'high',
    sendEmail: true,
    sendPush: true,
    sendInApp: true,
    description: '当有新的审批请求时发送'
  },
  {
    code: 'APPROVAL_APPROVED',
    name: '审批通过通知',
    type: 'approval_approved',
    titleTemplate: '{{requestType}}申请已通过',
    contentTemplate: '您的{{requestType}}申请"{{requestTitle}}"已通过审批。审批人：{{approverName}}',
    emailTemplate: '<h2>{{requestType}}申请已通过</h2><p>您的{{requestType}}申请"{{requestTitle}}"已通过审批。</p><p>审批人：{{approverName}}</p><p><a href="{{url}}">查看详情</a></p>',
    pushTemplate: '您的{{requestType}}申请"{{requestTitle}}"已通过',
    variables: [
      { name: 'requestType', description: '申请类型', example: '差旅' },
      { name: 'requestTitle', description: '申请标题', example: '北京出差' },
      { name: 'approverName', description: '审批人姓名', example: '李四' },
      { name: 'url', description: '详情链接', example: '/travel/123' }
    ],
    enabled: true,
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    sendInApp: true,
    description: '当申请通过审批时发送'
  },
  {
    code: 'APPROVAL_REJECTED',
    name: '审批拒绝通知',
    type: 'approval_rejected',
    titleTemplate: '{{requestType}}申请已拒绝',
    contentTemplate: '您的{{requestType}}申请"{{requestTitle}}"已被拒绝。原因：{{comments}}',
    emailTemplate: '<h2>{{requestType}}申请已拒绝</h2><p>您的{{requestType}}申请"{{requestTitle}}"已被拒绝。</p><p>原因：{{comments}}</p><p>审批人：{{approverName}}</p><p><a href="{{url}}">查看详情</a></p>',
    pushTemplate: '您的{{requestType}}申请"{{requestTitle}}"已被拒绝',
    variables: [
      { name: 'requestType', description: '申请类型', example: '差旅' },
      { name: 'requestTitle', description: '申请标题', example: '北京出差' },
      { name: 'approverName', description: '审批人姓名', example: '李四' },
      { name: 'comments', description: '拒绝原因', example: '预算超支' },
      { name: 'url', description: '详情链接', example: '/travel/123' }
    ],
    enabled: true,
    priority: 'high',
    sendEmail: true,
    sendPush: true,
    sendInApp: true,
    description: '当申请被拒绝时发送'
  },
  {
    code: 'TRAVEL_SUBMITTED',
    name: '差旅提交通知',
    type: 'travel_submitted',
    titleTemplate: '差旅申请已提交',
    contentTemplate: '您的差旅申请"{{requestTitle}}"已成功提交，等待审批。',
    emailTemplate: '<h2>差旅申请已提交</h2><p>您的差旅申请"{{requestTitle}}"已成功提交，等待审批。</p><p><a href="{{url}}">查看详情</a></p>',
    pushTemplate: '差旅申请"{{requestTitle}}"已提交',
    variables: [
      { name: 'requestTitle', description: '申请标题', example: '北京出差' },
      { name: 'url', description: '详情链接', example: '/travel/123' }
    ],
    enabled: true,
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    sendInApp: true,
    description: '当差旅申请提交时发送'
  },
  {
    code: 'EXPENSE_SUBMITTED',
    name: '费用提交通知',
    type: 'expense_submitted',
    titleTemplate: '费用申请已提交',
    contentTemplate: '您的费用申请"{{requestTitle}}"已成功提交，等待审批。',
    emailTemplate: '<h2>费用申请已提交</h2><p>您的费用申请"{{requestTitle}}"已成功提交，等待审批。</p><p><a href="{{url}}">查看详情</a></p>',
    pushTemplate: '费用申请"{{requestTitle}}"已提交',
    variables: [
      { name: 'requestTitle', description: '申请标题', example: '差旅费用报销' },
      { name: 'url', description: '详情链接', example: '/expenses/123' }
    ],
    enabled: true,
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    sendInApp: true,
    description: '当费用申请提交时发送'
  }
];

const initTemplates = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    for (const templateData of defaultTemplates) {
      const existing = await NotificationTemplate.findOne({ code: templateData.code });
      if (existing) {
        console.log(`Template ${templateData.code} already exists, skipping...`);
        continue;
      }

      const template = await NotificationTemplate.create(templateData);
      console.log(`Created template: ${template.code} - ${template.name}`);
    }

    console.log('Notification templates initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing templates:', error);
    process.exit(1);
  }
};

initTemplates();






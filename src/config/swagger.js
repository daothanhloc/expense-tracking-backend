const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Couple Finance API',
      version: '1.0.0',
      description: 'API quản lý tài chính theo nhóm — đóng góp, chi tiêu, thống kê',
    },
    servers: [
      { url: '/api', description: 'Base API' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Nguyễn Văn A' },
            avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
            notificationEnabled: { type: 'boolean', example: true },
          },
        },
        Group: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Gia đình mình' },
            inviteCode: { type: 'string', example: 'A1B2C3' },
            members: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
            amount: { type: 'number', example: 100000 },
            category: {
              type: 'string',
              enum: ['Ăn uống', 'Đi lại', 'Nhà ở', 'Mua sắm', 'Giải trí', 'Sức khỏe', 'Khác'],
              example: 'Đi lại',
            },
            description: { type: 'string', example: 'Tiền xăng' },
            rawInput: { type: 'string', example: 'Mua 100k tiền xăng' },
            createdBy: { $ref: '#/components/schemas/User' },
            goalId: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['pending', 'confirmed'], example: 'confirmed' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Contribution: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            groupId: { type: 'string' },
            userId: { $ref: '#/components/schemas/User' },
            amount: { type: 'number', example: 15000000 },
            month: { type: 'string', example: '2026-05' },
            note: { type: 'string', example: 'Đóng góp tháng 2026-05' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FundSummary: {
          type: 'object',
          properties: {
            balance: { type: 'number', example: 5000000 },
            totalContributed: { type: 'number', example: 30000000 },
            totalSpent: { type: 'number', example: 25000000 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Lỗi xác thực' },
            error: { type: 'string', example: 'Token không hợp lệ' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 3 },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);

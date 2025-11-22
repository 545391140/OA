/**
 * 异步处理包装器
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 * 
 * @param {Function} fn - 异步函数
 * @returns {Function} Express 中间件函数
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;


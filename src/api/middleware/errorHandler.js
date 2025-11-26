// Global error handler middleware
// TODO: Implement per FR-026 (error logging with provider context)

const errorHandler = (err, req, res, next) => {
  console.error(JSON.stringify({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  }));

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    statusCode
  });
};

export default errorHandler;

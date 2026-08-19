function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  // Every route's request-body validation (createStore, createProduct,
  // createCategory, etc.) throws a raw ZodError via schema.parse() and
  // relies on next(err) landing here - without this, it fell through to
  // the generic 500 branch below with an unreadable JSON-dumped issues
  // array as the message, across every module in the app, not just this
  // one route.
  if (err.name === "ZodError") {
    const message = err.issues
      .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .join("; ");
    return res.status(400).json({ message });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { notFound, errorHandler };

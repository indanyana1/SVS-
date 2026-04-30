module.exports = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    runtime: 'vercel-serverless',
  });
};

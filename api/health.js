module.exports = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    runtime: 'vercel-serverless',
  });
};

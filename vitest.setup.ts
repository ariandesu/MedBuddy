// Force demo/fixture modes in tests — never use real DB or Muse key.
// Per AGENTS.md §4.4
delete process.env.MONGODB_URI;
delete process.env.MODEL_API_KEY;

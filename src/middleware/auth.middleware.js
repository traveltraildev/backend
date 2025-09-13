const { clerkClient } = require('@clerk/clerk-sdk-node');

// Middleware to check for admin role. First try session claims, then fall back to user publicMetadata.
const requireAdmin = async (req, res, next) => {
  try {
    // Prefer session claims if available
    const sessionRole = req.auth?.sessionClaims?.metadata?.role;
    if (sessionRole === 'admin') return next();

    // If no session claim, fetch user from Clerk and check publicMetadata
    const userId = req.auth?.userId;
    if (userId) {
      const user = await clerkClient.users.getUser(userId);
      const userRole = user?.publicMetadata?.role || user?.public_metadata?.role;
      if (userRole === 'admin') return next();
    }

    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { requireAdmin };

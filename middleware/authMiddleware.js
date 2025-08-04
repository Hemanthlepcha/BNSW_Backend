import { getAccessToken } from "../services/authService.js";

// Middleware to get NDI access token
export const authMiddleware = async (req, res, next) => {
  try {
    req.accessToken = await getAccessToken();
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Middleware to validate session token
export const validateToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    // For now, we'll just validate token presence
    // TODO: Implement proper token validation
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};
